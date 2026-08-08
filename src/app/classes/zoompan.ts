import { Renderer2 } from '@angular/core';

import { filter, fromEvent, Observable, Subject, takeUntil, tap, throttleTime } from 'rxjs';

import { IFsZoomPanFitOptions } from '../interfaces/zoom-pan-fit-options.interface';
import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';
import { FsZoomPanFit, FsZoomPanPosition } from '../types/zoom-pan-fit.type';

import { Pan } from './pan';
import { Zoom } from './zoom';

/** Where one axis of the fitted content sits relative to the view. */
type FitAlignment = 'start' | 'center' | 'end';

/** A named edge pins that edge and centres the other axis; a corner pins both. */
const FIT_ALIGNMENT: Record<FsZoomPanPosition, { horizontal: FitAlignment, vertical: FitAlignment }> = {
  'center': { horizontal: 'center', vertical: 'center' },
  'top': { horizontal: 'center', vertical: 'start' },
  'bottom': { horizontal: 'center', vertical: 'end' },
  'left': { horizontal: 'start', vertical: 'center' },
  'right': { horizontal: 'end', vertical: 'center' },
  'top-left': { horizontal: 'start', vertical: 'start' },
  'top-right': { horizontal: 'end', vertical: 'start' },
  'bottom-left': { horizontal: 'start', vertical: 'end' },
  'bottom-right': { horizontal: 'end', vertical: 'end' },
};

/**
 * Where each mode puts the content when nothing is asked for.
 *
 * `both` fits on both axes, so centring it is the whole answer. The single-axis modes let the other
 * axis overflow, and the default follows what reading the overflow is like: `width` overflows
 * downwards and starts at the top, where anything you read starts, while `height` overflows
 * sideways off both edges equally, so it centres.
 */
const FIT_DEFAULT_POSITION: Record<FsZoomPanFit, FsZoomPanPosition> = {
  both: 'center',
  width: 'top',
  height: 'center',
};

export class ZoomPan {

  private _destroy$ = new Subject();
  private _zoom: Zoom;
  private _pan: Pan;
  private _contentResize: ResizeObserver = null;
  private _fitSize = '';
  private _fitHeld = false;

  constructor(
    private _config: IFsZoomPanConfig,
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _renderer: Renderer2,
  ) {
    this._zoom = new Zoom(this._config, this._zoomElement, this._renderer);
    this._pan = new Pan(this._element, this._zoomElement, this._renderer);

    this.events();

    if (this._config.zoomFit) {
      this._fitHeld = true;
      this._fitContent();
    }
  }

  /**
   * Whether the content is still being held fitted through resizes. Starts true when `zoomFit` is
   * on, goes false the moment the user zooms or pans, and comes back on an explicit fit().
   */
  public get fitHeld(): boolean {
    return this._fitHeld;
  }

  public get moved$(): Observable<{ top: number, left: number }> {
    return this._pan.moved$;
  }

  public get zoomed$(): Observable<number> {
    return this._zoom.zoomed$;
  }

  public get config() {
    return this._config;
  }

  public get scale() {
    return this._zoom.scale;
  }

  public set scale(scale: number) {
    this.zoom(scale);
  }

  public get zoomElementLeft() {
    return this._pan.zoomElementLeft;
  }

  public get zoomElementTop() {
    return this._pan.zoomElementTop;
  }

  public get zoomFactor() {
    return this._zoom.zoomFactor;
  }

  /**
   * reset zoom and pan to default values
   */
  public reset() {
    this._releaseFit();
    this._zoom.reset();
    this._pan.reset();
  }

  /**
   * the user has taken the view over, so stop holding it fitted. every re-fit repositions the
   * content, and doing that underneath someone who has just chosen their own zoom or position
   * would take it straight back off them.
   */
  private _releaseFit() {
    this._fitHeld = false;
  }

  public destroy() {
    this._contentResize?.disconnect();
    this._pan.destroy();
    this._zoom.destroy();
    this._destroy$.next(null);
    this._destroy$.complete();
  }

  public disable() {
    this._zoom.disabled = true;
    this._pan.disabled = true;
  }

  public enable() {
    this._zoom.disabled = false;
    this._pan.disabled = false;
  }

  /**
   * move contents so that the element is centered in the viewport
   * @param el
   * @param options
   */
  public centerOnElement(
    el: HTMLElement,
    options: { horizontal?: boolean, vertical?: boolean, slide?: boolean } = {},
  ) {
    this.moveCenter(
      el.offsetLeft + (el.offsetWidth / 2),
      el.offsetTop + (el.offsetHeight / 2),
      options,
    );
  }

  public getElementCenter(el: HTMLElement) {
    return {
      x: el.offsetLeft + (el.offsetWidth / 2),
      y: el.offsetTop + (el.offsetHeight / 2),
    };
  }

  /**
   * get x,y coordinates at center of current view
   */
  public getCenter(): { x: number, y: number } {
    const origin = this._pan.getOrigin();
    const center = this._pan.getViewportCenter();

    return {
      x: (center.x - origin.x) / this._zoom.scale,
      y: (center.y - origin.y) / this._zoom.scale,
    };
  }

  /**
   * bounding box of the content, in the container's own unscaled coordinates. rects come back
   * in viewport pixels, so they are converted back through the origin and the current scale
   */
  public getContentBounds(): { left: number, top: number, width: number, height: number } {
    const box = {
      left: Infinity,
      top: Infinity,
      right: -Infinity,
      bottom: -Infinity,
    };

    this._measureContent(this._zoomElement, box);

    if (box.left === Infinity) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }

    const origin = this._pan.getOrigin();
    const scale = this._zoom.scale;

    return {
      left: (box.left - origin.x) / scale,
      top: (box.top - origin.y) / scale,
      width: (box.right - box.left) / scale,
      height: (box.bottom - box.top) / scale,
    };
  }

  /**
   * scale the content to the view and place it there. the resulting scale is still bound by
   * zoomMin/zoomMax.
   *
   * mode decides which axes have to be satisfied:
   *   both   (default) - whichever axis runs out of room first wins, so NOTHING is cut off
   *   width            - fills the width; the height may overflow
   *   height           - fills the height; the width may overflow
   *
   * position decides where it lands. each mode has a natural default (both/height centre, width
   * pins to the top) and any of the nine positions overrides it. on an axis the fit satisfied
   * exactly every position lands in the same place, so this only really speaks for an axis that
   * overflows or one with room to spare.
   *
   * an explicit fit() also re-arms the held fit when zoomFit is on: asking to be fitted is asking
   * to go back to being kept fitted.
   */
  public fit(options: IFsZoomPanFitOptions = {}) {
    const bounds = this.getContentBounds();

    if (!bounds.width || !bounds.height) {
      return;
    }

    const mode = options.mode ?? this._config.fitMode ?? 'both';
    const padding = options.padding ?? this._config.fitPadding ?? 0;
    const maxScale = options.maxScale ?? this._config.fitMaxScale;
    const position = options.position ?? this._config.fitPosition ?? FIT_DEFAULT_POSITION[mode];
    const viewport = this._pan.getViewportSize();
    const scales = [];

    if (mode !== 'height') {
      scales.push((viewport.width - (padding * 2)) / bounds.width);
    }

    if (mode !== 'width') {
      scales.push((viewport.height - (padding * 2)) / bounds.height);
    }

    if (maxScale !== undefined && maxScale !== null) {
      scales.push(maxScale);
    }

    // the smallest ratio is the one that keeps every constrained axis inside the view, and
    // maxScale rides along as one more thing the result must not exceed
    this._zoom.setScale(Math.min(...scales));

    // read the scale back rather than reusing the ratio, zoomMin/zoomMax may have clamped it
    const scale = this._zoom.scale;
    const alignment = FIT_ALIGNMENT[position];
    const left = this._fitOffset(alignment.horizontal, viewport.width, bounds.width * scale, padding);
    const top = this._fitOffset(alignment.vertical, viewport.height, bounds.height * scale, padding);

    // the offsets are viewport measurements, so they convert to content units to say which content
    // point belongs in the corner of the view
    this.moveTopLeft(bounds.left - (left / scale), bounds.top - (top / scale), options);

    this._fitHeld = this._config.zoomFit === true;
  }

  /**
   * where the content starts along one axis, in viewport pixels from the start of the view.
   * centring ignores padding - padding keeps content off an edge it is pinned to, and centred
   * content is not pinned to either. content bigger than the view yields a negative offset, which
   * is what puts the middle of an overflowing axis on screen rather than its start.
   */
  private _fitOffset(
    alignment: FitAlignment,
    viewport: number,
    content: number,
    padding: number,
  ): number {
    if (alignment === 'center') {
      return (viewport - content) / 2;
    }

    if (alignment === 'end') {
      return viewport - content - padding;
    }

    return padding;
  }

  /**
   * keep the content fitted while it is still settling into its final size. content is rarely
   * measurable on the first pass - an image has no dimensions until it loads, and the same goes
   * for fonts, lazily rendered children or anything else that arrives late - so instead of
   * guessing at a single moment to measure, every change of size is refitted
   */
  private _fitContent() {
    // load does not bubble, but it does capture. this catches every image, iframe and anything
    // else inside the content finishing, which is the point they stop measuring zero wide
    fromEvent(this._zoomElement, 'load', { capture: true })
      .pipe(
        tap(() => this._fitChangedContent()),
        takeUntil(this._destroy$),
      )
      .subscribe();

    // anything that lands late and changes the layout shows up here instead. observing also
    // delivers the size the content already has, so this is what fits content that was
    // rendered up front and never loads anything. the view is watched alongside the content
    // because a fit that survives until the window is resized and then quietly stops being a
    // fit is worse than no fit at all
    this._contentResize = new ResizeObserver(() => this._fitChangedContent());
    this._contentResize.observe(this._zoomElement);
    this._contentResize.observe(this._element);
  }

  /**
   * fit, but only when the content or the space it has to fit into really did end up a
   * different size. the triggers fire more than once and overlap with each other, so a size that
   * has not moved is not worth refitting.
   *
   * the fit is only still ours to redo while it is held. once the user has zoomed or panned the
   * view is theirs, and a container resize after that keeps whatever they set instead of snapping
   * the content back to fitted underneath them
   */
  private _fitChangedContent() {
    if (!this._fitHeld) {
      return;
    }

    const bounds = this.getContentBounds();
    const viewport = this._pan.getViewportSize();
    const size = [bounds.width, bounds.height, viewport.width, viewport.height].join('x');

    if (!bounds.width || size === this._fitSize) {
      return;
    }

    this._fitSize = size;

    this.fit();
  }

  /**
   * grow the box to cover everything rendered under parent.
   *
   * a block-level element fills whatever width it is given regardless of how wide its contents
   * are, so measuring the wrappers would only ever report the width of the view back. a child
   * that comes out exactly as wide as the space it sits in is therefore treated as a wrapper:
   * it contributes its height, which blocks do shrink to, and its own children are what settle
   * the horizontal extent. anything narrower is sized by its content and counts on both axes,
   * as does anything wider, which is content overflowing its wrapper
   */
  private _measureContent(
    parent: HTMLElement,
    box: { left: number, top: number, right: number, bottom: number },
  ) {
    const children = Array.from(parent.children) as HTMLElement[];

    children.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const wrapper = el.children.length && el.offsetWidth === parent.clientWidth;

      // hidden/collapsed elements report an empty rect at 0,0 and would drag the box
      // out to the top left corner of the viewport
      if (rect.width || rect.height) {
        if (!wrapper) {
          box.left = Math.min(box.left, rect.left);
          box.right = Math.max(box.right, rect.right);
        }

        box.top = Math.min(box.top, rect.top);
        box.bottom = Math.max(box.bottom, rect.bottom);
      }

      if (el.children.length) {
        this._measureContent(el, box);
      }
    });
  }

  /**
   * move top left corner of screen to new position
   * @param left
   * @param top
   */
  public move(left: number, top: number, options?: { slide?: boolean }) {
    this._pan.move(left, top, options);
  }

  /**
   * move so that the specified point is at the center of the viewport
   * @param x
   * @param y
   */
  public moveCenter(x: number, y: number, options?: { slide?: boolean }) {
    const origin = this._pan.getOrigin();
    const center = this._pan.getViewportCenter();

    // x,y currently renders at origin + x,y * scale. shift the container by whatever
    // puts it on the center of the view
    this.move(
      this._pan.getLeft() + (center.x - origin.x - (x * this._zoom.scale)),
      this._pan.getTop() + (center.y - origin.y - (y * this._zoom.scale)),
      options,
    );
  }

  /**
   * move so that the specified point sits at the top left corner of the view
   * @param x
   * @param y
   */
  public moveTopLeft(x: number, y: number, options?: { slide?: boolean }) {
    const origin = this._pan.getOrigin();
    const corner = this._pan.getViewportOrigin();

    // same shift as moveCenter, measured against the corner of the view instead of its center
    this.move(
      this._pan.getLeft() + (corner.x - origin.x - (x * this._zoom.scale)),
      this._pan.getTop() + (corner.y - origin.y - (y * this._zoom.scale)),
      options,
    );
  }

  /**
   * zoom to the specified scale, keeping the current center in the same position
   * @param scale
   */
  public zoom(scale: number) {
    this._releaseFit();
    const center = this.getCenter();
    this._zoom.setScale(scale);
    this.moveCenter(center.x, center.y);
  }

  /**
   * zoom in by one step, keeping the current center in the same position
   */
  public zoomIn() {
    this._releaseFit();
    const center = this.getCenter();
    this._zoom.zoomIn();
    this.moveCenter(center.x, center.y);
  }

  /**
   * zoom out by one step, keeping the current center in the same position
   */
  public zoomOut() {
    this._releaseFit();
    const center = this.getCenter();
    this._zoom.zoomOut();
    this.moveCenter(center.x, center.y);
  }

  /**
   * listen for mousewheel events.
   *
   * preventDefault has to happen on the events this actually zooms with and on no others -
   * a wheel event that is swallowed here never reaches the page, so under 'modifier' and
   * 'never' the events that are not ours are left entirely alone and the page scrolls past
   */
  public events() {
    // a pointer drag is the user taking the view over; a programmatic move is not, which is why
    // this listens to dragged$ rather than moved$
    this._pan.dragged$
      .pipe(
        takeUntil(this._destroy$),
      )
      .subscribe(() => this._releaseFit());

    if (this._config.wheel === 'never') {
      return;
    }

    fromEvent(this._element, 'wheel')
      .pipe(
        filter((event: WheelEvent) => this._zooms(event)),
        tap((event: WheelEvent) => event.preventDefault()),
        throttleTime(20),
        tap((event: WheelEvent) => this.wheel(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();
  }

  /**
   * trackpad pinch arrives as a wheel event with ctrlKey set, so 'modifier' covers the
   * pinch gesture as well as the deliberate Ctrl/⌘ + wheel
   */
  private _zooms(event: WheelEvent): boolean {
    return this._config.wheel !== 'modifier' || event.ctrlKey || event.metaKey;
  }

  /**
   * when mouse wheel is scrolled zoom in/out and move so that the mouse is at the same position
   * on the content afterwards
   */
  public wheel(event: WheelEvent) {
    if (this._zoom.disabled) {
      return;
    }

    const delta = event.deltaY || -event.detail; // @TODO process firefox event

    // a horizontal-only wheel event has no vertical delta and must not zoom
    if (!delta) {
      return;
    }

    this._releaseFit();

    // measured against the container's own origin, so no parent/page offsets are involved
    const origin = this._pan.getOrigin();
    const viewPosition = {
      x: event.clientX - origin.x,
      y: event.clientY - origin.y,
    };

    const previousScale = this._zoom.scale;

    this._zoom.adjustZoom(delta > 0 ? -1 : 1);
    this.alignPosition(viewPosition, previousScale);
  }

  /**
   * move the zoom-pan container so that the content that was under viewPosition before the
   * scale changed is under it again. viewPosition is relative to the container's origin, so
   * the content point is viewPosition / previousScale and it now sits that much further out
   * at the current scale - shifting the container by the difference cancels it exactly
   */
  public alignPosition(viewPosition: { x: number, y: number }, previousScale: number) {
    const ratio = this._zoom.scale / previousScale;

    this.move(
      this._pan.getLeft() + (viewPosition.x * (1 - ratio)),
      this._pan.getTop() + (viewPosition.y * (1 - ratio)),
    );
  }

}

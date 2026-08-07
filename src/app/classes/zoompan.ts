import { Renderer2 } from '@angular/core';

import { fromEvent, Observable, Subject, takeUntil, tap, throttleTime } from 'rxjs';

import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';

import { Pan } from './pan';
import { Zoom } from './zoom';

export class ZoomPan {

  private _destroy$ = new Subject();
  private _zoom: Zoom;
  private _pan: Pan;
  private _contentResize: ResizeObserver = null;
  private _fitSize = '';

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
      this._fitContent();
    }
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
    this._zoom.reset();
    this._pan.reset();
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
   * scale the content so that it fills the width of the view without overflowing it, and pin
   * its top left corner to the top left corner of the view. the resulting scale is still bound
   * by zoomMin/zoomMax
   * @param options horizontal: boolean - fit across the width (default true),
   * vertical: boolean - also keep the content inside the height so that none of it is cut off,
   * which makes it fit on whichever axis runs out of room first (default false),
   * padding: number - gap in pixels to leave between the content and the edges of the view
   */
  public fit(options: {
    horizontal?: boolean,
    vertical?: boolean,
    padding?: number,
    slide?: boolean,
  } = {}) {
    const bounds = this.getContentBounds();

    if (!bounds.width || !bounds.height) {
      return;
    }

    const viewport = this._pan.getViewportSize();
    const padding = options.padding ?? 0;
    const scales = [];

    if (options.horizontal !== false) {
      scales.push((viewport.width - (padding * 2)) / bounds.width);
    }

    if (options.vertical) {
      scales.push((viewport.height - (padding * 2)) / bounds.height);
    }

    if (!scales.length) {
      return;
    }

    // the smaller of the two ratios is the one that keeps both axes inside the view
    this._zoom.setScale(Math.min(...scales));

    // read the scale back rather than reusing the ratio, zoomMin/zoomMax may have clamped it.
    // the padding is a viewport measurement, so it converts to content units to sit outside
    // the corner the content is pinned to
    const gap = padding / this._zoom.scale;

    this.moveTopLeft(bounds.left - gap, bounds.top - gap, options);
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
   * different size. the triggers fire more than once and overlap with each other, and once
   * everything has settled they stop mattering entirely - which is what keeps this from
   * fighting the user for control of the view afterwards
   */
  private _fitChangedContent() {
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
    const center = this.getCenter();
    this._zoom.setScale(scale);
    this.moveCenter(center.x, center.y);
  }

  /**
   * zoom in by one step, keeping the current center in the same position
   */
  public zoomIn() {
    const center = this.getCenter();
    this._zoom.zoomIn();
    this.moveCenter(center.x, center.y);
  }

  /**
   * zoom out by one step, keeping the current center in the same position
   */
  public zoomOut() {
    const center = this.getCenter();
    this._zoom.zoomOut();
    this.moveCenter(center.x, center.y);
  }

  /**
   * listen for mousewheel events
   */
  public events() {
    fromEvent(this._element, 'wheel')
      .pipe(
        tap((event: WheelEvent) => event.preventDefault()),
        throttleTime(20),
        tap((event: WheelEvent) => this.wheel(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();
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

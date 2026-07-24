import { Renderer2 } from '@angular/core';

import { fromEvent, Observable, Subject, takeUntil, tap, throttleTime } from 'rxjs';

import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';

import { Pan } from './pan';
import { Zoom } from './zoom';

export class ZoomPan {

  private _destroy$ = new Subject();
  private _zoom: Zoom;
  private _pan: Pan;

  constructor(
    private _config: IFsZoomPanConfig,
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _renderer: Renderer2,
  ) {
    this._zoom = new Zoom(this._config, this._zoomElement, this._renderer);
    this._pan = new Pan(this._element, this._zoomElement, this._renderer);

    this.events();
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

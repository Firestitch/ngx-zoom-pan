import { NgZone, Renderer2 } from '@angular/core';

import { Subject } from 'rxjs';
import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';
import { Pan } from './pan';
import { Zoom } from './zoom';

export class ZoomPan {

  public zoomed$: Subject<boolean>;
  public moved$: Subject<{ top: number, left: number }>;

  private _zoom: Zoom;
  private _pan: Pan;
  private _config: IFsZoomPanConfig;


  private _wheelHandler: EventListener;

  // listeners
  private _wheelListener: Function;


  constructor(private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _zone: NgZone,
    private _renderer: Renderer2
  ) {
    this._zoom = new Zoom(this, this._element, this._zoomElement, this._zone, this._renderer);
    this._pan = new Pan(this, this._element, this._zoomElement, this._zone, this._renderer);

    this.moved$ = this._pan.moved$;
    this.zoomed$ = this._zoom.zoomed$;

    this.events();
  }





  get config() {
    return this._config;
  }


  public setConfig(config: IFsZoomPanConfig) {
    this._config = config;

    if (this._config.zoomDefault !== 1) {
      this.scale = this._config.zoomDefault;
    }
  }


  get scale() {
    return this._zoom.scale;
  }

  get zoomElementLeft() {
    return this._pan.zoomElementLeft;
  }

  get zoomElementTop() {
    return this._pan.zoomElementTop;
  }

  get zoomStep() {
    return this._zoom.step;
  }

  set scale(scale: number) {
    this._zoom.setScale(scale)
  }



  /**
   * reset zoom and pan to default values
   */
  public reset() {
    this._zoom.reset();
    this._pan.reset();
  }



  public destroy() {
    this._zoom.destroy();
    this._pan.destroy();
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
  public centerOnElement(el: HTMLElement, options: { horizontal?: boolean, vertical?: boolean, slide?: boolean } = {}) {
    this.moveCenter(
      el.offsetLeft + (el.offsetWidth / 2),
      el.offsetTop + (el.offsetHeight / 2),
      options
    );
  }

  public getElementCenter(el: HTMLElement) {
    return {
      x: el.offsetLeft + (el.offsetWidth / 2),
      y: el.offsetTop + (el.offsetHeight / 2)
    }
  }

  /**
   * get x,y coordinates at center of current view
   */
  public getCenter(): { x: number, y: number } {
    return {
      x: -(this._pan.getLeft() / this._zoom.scale) + (this._pan.getWidth() / 2 / this._zoom.scale),
      y: -(this._pan.getTop() / this._zoom.scale) + (this._pan.getHeight() / 2 / this._zoom.scale),
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
    x = x - (this._pan.getWidth() / 2 / this._zoom.scale);
    y = y - (this._pan.getHeight() / 2 / this._zoom.scale);

    const left = - (x * this._zoom.scale);
    const top = - (y * this._zoom.scale);
    this.move(left, top, options);
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
    this._wheelHandler = this.wheel.bind(this);

    this._zone.runOutsideAngular(() => {
      this._wheelListener = this._renderer.listen(
        this._element, 'wheel', this._wheelHandler
      );
    });
  }


  /**
   * when mouse wheel is scrolled zoom in/out and move so that the mouse is at the same position on the content afterwards
   */
  public wheel(event: WheelEvent) {
    if (!this._zoom.disabled) {
      event.preventDefault();

      let delta = event.deltaY || -event.detail; // @TODO process firefox event
      delta = delta > 1 ? -1 : 1;

      const viewPosition = {
        x: event.pageX - this._zoom.getOffset().left,
        y: event.pageY - this._zoom.getOffset().top,
      };

      const contentPosition = {
        x: (-this._pan.getLeft() / this._zoom.scale) + (viewPosition.x / this._zoom.scale),
        y: (-this._pan.getTop() / this._zoom.scale) + (viewPosition.y / this._zoom.scale),
      };

      this._zoom.adjustZoom(delta);
      this.alignPosition(contentPosition, viewPosition);
    }
  }

  /**
   * move the zoom-pan container so that the specified position is at the same position on the screen
   */
  public alignPosition(contentPosition: { x: number, y: number }, viewPosition: { x: number, y: number }) {
    const x = contentPosition.x - (viewPosition.x / this._zoom.scale);
    const y = contentPosition.y - (viewPosition.y / this._zoom.scale);

    const left = - (x * this._zoom.scale);
    const top = - (y * this._zoom.scale);

    this.move(left, top);
  }


}

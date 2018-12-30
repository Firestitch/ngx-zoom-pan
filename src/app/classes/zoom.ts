import { NgZone, Renderer2 } from '@angular/core';
import { ZoomPan } from './zoompan';

export class Zoom {
  // handlers
  private _wheelHandler: EventListener;

  // listeners
  private _wheelListener: Function;

  private _zoomScale = 1;
  private _zoomStep = 0.1;

  private _lastScreenCoords = { x: 0, y: 0 };
  private _lastElemCoords = { x: 0, y: 0 };

  private _offset: { top: number, left: number };

  constructor(private _zoomPan: ZoomPan,
              private _element: HTMLElement,
              private _zoomElement: HTMLElement,
              private _zone: NgZone,
              private _renderer: Renderer2) {
    this.events();
    this.setOffset();
  }

  get zoomElementTop(): number {
    return parseInt(this._zoomElement.style.top) || 0 // without 'px' sufix
  }

  get zoomElementLeft(): number {
    return parseInt(this._zoomElement.style.left) || 0 // without 'px' sufix
  }

  get scale() {
    return this._zoomScale;
  }

  public events() {
    this._wheelHandler = this.wheel.bind(this);

    this._zone.runOutsideAngular(() => {
      this._wheelListener = this._renderer.listen(
        this._element, 'wheel', this._wheelHandler
      );
    });
  }

  public reset() {
    this.setZoom(this._zoomPan.config.zoomDefault, { x: 0, y: 0 }, { x: 0, y: 0 });
  }

  public zoomIn() {
    const newScale = this._zoomScale + this._zoomStep;

    this.setZoom(
      newScale,
      { x: this._lastElemCoords.x, y: this._lastElemCoords.y },
      { x: 0, y: 0 }
    )
  }

  public zoomOut() {
    const newScale = this._zoomScale - this._zoomStep;

    this.setZoom(
      newScale,
      { x: this._lastElemCoords.x, y: this._lastElemCoords.y },
      { x: 0, y: 0 }
    )
  }


  public setScale(scale: number) {
    this.setZoom(scale,
      { x: this._lastElemCoords.x, y: this._lastElemCoords.y },
      { x: 0, y: 0 })
  }

  public destroy() {
    this._wheelListener();
  }

  public wheel(event: WheelEvent) {
    event.preventDefault();
    let delta = event.wheelDelta || -event.detail; // @TODO process firefox event
    delta = Math.max(-100, Math.min(100, (delta))) / 100;

    const pageX = event.pageX;
    const pageY = event.pageY;

    this.adjustZoom(delta, pageX, pageY);
  }

  private adjustZoom(delta: number, focusX: number, focusY: number) {
    // find current location on screen

    const xScreen = focusX - this._offset.left - this.zoomElementLeft;
    const yScreen = focusY - this._offset.top - this.zoomElementTop;

    this._lastElemCoords.x = this._lastElemCoords.x + ((xScreen - this._lastScreenCoords.x) / this._zoomScale);
    this._lastElemCoords.y = this._lastElemCoords.y + ((yScreen - this._lastScreenCoords.y) / this._zoomScale);

    const zoom = this.validateZoom(this._zoomScale + (delta * .2));

    // determine the location on the screen at the new scale
    const xNew = (xScreen - this._lastElemCoords.x) / zoom;
    const yNew = (yScreen - this._lastElemCoords.y) / zoom;

    // save the current screen location
    this._lastScreenCoords.x = xScreen;
    this._lastScreenCoords.y = yScreen;

    this.setZoom(zoom, { x: this._lastElemCoords.x, y: this._lastElemCoords.y }, { x: xNew, y: yNew });
  }

  private setZoom(zoom: number, origin: { x: number, y: number }, translate: { x: number, y: number}) {

    zoom = this.validateZoom(zoom);

    if (translate && origin) {
      this._renderer.setStyle(
        this._zoomElement,
        'transform',
        `translateZ(0) scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`
      );

      this._renderer.setStyle(
        this._zoomElement,
        'transform-origin',
        `${origin.x}px ${origin.y}px`
      );
    }

    this._zoomScale = zoom;
  }

  private validateZoom(zoom) {
    // keep within the limits
    if (this._zoomPan.config.zoomMin && zoom < this._zoomPan.config.zoomMin) {
      zoom = this._zoomPan.config.zoomMin;
    }
    if (this._zoomPan.config.zoomMax && zoom > this._zoomPan.config.zoomMax) {
      zoom = this._zoomPan.config.zoomMax;
    }

    return zoom;
  }

  private setOffset() {
    const rect = this._zoomElement.getBoundingClientRect();

    this._offset = {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft
    };
  }

}

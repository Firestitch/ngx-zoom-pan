import { NgZone, Renderer2 } from '@angular/core';

import { Subject } from 'rxjs';

import { ZoomPan } from './zoompan';

export class Zoom {

  public zoomed$ = new Subject<any>();
  public disabled = false;

  private _zoomScale = 1;
  private _zoomStep = 0.1;

  public _lastScreenCoords = { x: 0, y: 0 };
  public _lastElemCoords = { x: 0, y: 0 };

  public _lastZoomScale = 1;

  private _offset: { top: number, left: number };

  constructor(
    private _zoomPan: ZoomPan,
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _zone: NgZone,
    private _renderer: Renderer2
  ) {
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

  get step() {
    return this._zoomStep;
  }


  public reset() {
    this.setZoom(this._zoomPan.config.zoomDefault, { x: 0, y: 0 }, { x: 0, y: 0 });
  }

  public destroy() {

  }

  public zoomIn() {
    const newScale = this._zoomScale + this._zoomStep;

    this.setZoom(
      newScale,
      { x: this._lastElemCoords.x, y: this._lastElemCoords.y },
      { x: 0, y: 0 }
    );

    this.zoomed$.next(true);
  }

  public zoomOut() {
    const newScale = this.scale - this._zoomStep;

    this.setZoom(
      newScale,
      { x: this._lastElemCoords.x, y: this._lastElemCoords.y },
      { x: 0, y: 0 }
    );

    this.zoomed$.next(false);
  }


  public setScale(scale: number) {
    this.setZoom(scale,
      { x: this._lastElemCoords.x, y: this._lastElemCoords.y },
      { x: 0, y: 0 })
  }


  public adjustZoom(delta) {
    const zoom = this.validateZoom(this.scale + (delta * this.step));
    this.setZoom(zoom);
  }




  private setZoom(zoom: number, origin?: { x: number, y: number }, translate?: { x: number, y: number }) {

    zoom = this.validateZoom(zoom);

    this._lastZoomScale = this._zoomScale;

    origin = origin || { x: 0, y: 0 };
    translate = translate || { x: 0, y: 0 };

    this._renderer.setStyle(this._zoomElement, 'transform', `scale(${zoom})`);

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
    const rect = this._element.getBoundingClientRect();

    this._offset = {
      top: rect.top,
      left: rect.left
    };
  }

  public getOffset() {
    return this._offset;
  }

}

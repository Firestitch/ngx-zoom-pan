import { Renderer2 } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';


export class Zoom {

  public disabled = false;
  
  public _lastScreenCoords = { x: 0, y: 0 };
  public _lastElemCoords = { x: 0, y: 0 };
  public _lastZoomScale = 1;

  private _offset: { top: number, left: number };
  private _zoomScale = 1;
  private _zoomStep = 0.1;
  private _zoomed$ = new Subject<number>();

  constructor(
    private _config: IFsZoomPanConfig,
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _renderer: Renderer2,
  ) {
    this._setOffset();
  }

  public get zoomElementTop(): number {
    return parseInt(this._zoomElement.style.top) || 0; // without 'px' sufix
  }

  public get zoomElementLeft(): number {
    return parseInt(this._zoomElement.style.left) || 0; // without 'px' sufix
  }

  public get scale() {
    return this._zoomScale;
  }

  public get step() {
    return this._zoomStep;
  }

  public get zoomed$(): Observable<number> {
    return this._zoomed$.asObservable();
  }

  public reset() {
    this._setZoom(this._config.zoomDefault);
  }

  public zoomIn() {
    const newScale = this._zoomScale + this._zoomStep;

    this._setZoom(newScale);
  }

  public zoomOut() {
    const newScale = this.scale - this._zoomStep;

    this._setZoom(newScale);
  }

  public setScale(scale: number) {
    this._setZoom(scale);
  }

  public getOffset() {
    return this._offset;
  }

  public adjustZoom(delta) {
    const zoom = this._validateZoom(this.scale + (delta * this.step));
    this._setZoom(zoom);
  }

  private _setZoom(zoom: number) {
    zoom = this._validateZoom(zoom);
    this._lastZoomScale = this._zoomScale;
    this._renderer.setStyle(this._zoomElement, 'transform', `scale(${zoom})`);
    this._zoomScale = zoom;
    this._zoomed$.next(this._zoomScale);
  }

  private _validateZoom(zoom) {
    // keep within the limits
    if (this._config.zoomMin && zoom < this._config.zoomMin) {
      zoom = this._config.zoomMin;
    }
    if (this._config.zoomMax && zoom > this._config.zoomMax) {
      zoom = this._config.zoomMax;
    }

    return zoom;
  }

  private _setOffset() {
    const rect = this._element.getBoundingClientRect();

    this._offset = {
      top: rect.top,
      left: rect.left,
    };
  }

}

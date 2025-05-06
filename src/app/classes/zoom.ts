import { Renderer2 } from '@angular/core';

import { debounceTime, Observable, Subject, takeUntil } from 'rxjs';

import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';


export class Zoom {

  public disabled = false;
  public _lastScreenCoords = { x: 0, y: 0 };
  public _lastElemCoords = { x: 0, y: 0 };
  public _lastZoomScale = 1;
  public _defaultZoom = 1;

  private _offset: { top: number, left: number };
  private _zoomScale = 1;
  private _zoomFactor = 0.2;
  private _zoomed$ = new Subject<number>();
  private _destroy$ = new Subject<void>();

  constructor(
    private _config: IFsZoomPanConfig,
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _renderer: Renderer2,
  ) {
    this._zoomScale = this._config.zoomScale || 1;
    this._zoomFactor = this._config.zoomFactor || 0.2;  //0.2 = 20% increase per zoom step
    this._lastZoomScale = this._zoomScale;
    this._defaultZoom = this._config.zoomDefault || 1;
    this._listenOffset();


    if(this._defaultZoom !== 1) {
      this._setZoom(this._config.zoomDefault);
    }
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

  public get zoomFactor() {
    return this._zoomFactor;
  }

  public get zoomed$(): Observable<number> {
    return this._zoomed$.asObservable();
  }

  public reset() {
    this._setZoom(this._defaultZoom);
  }

  public zoomIn() {
    const newScale = this._zoomScale * (1 + this._zoomFactor);

    this._setZoom(newScale);
  }

  public zoomOut() {
    const newScale = this._zoomScale / (1 + this._zoomFactor);

    this._setZoom(newScale);
  }

  public setScale(scale: number) {
    this._setZoom(scale);
  }

  public getOffset() {
    return this._offset;
  }

  public adjustZoom(delta) {
    const zoom = this._zoomScale * Math.pow((1 + this._zoomFactor), delta);
    this._setZoom(zoom);
  }

  public destroy() {
    this._destroy$.next();
    this._destroy$.complete();
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

  private _listenOffset() {

    new Observable((subscriber) => {
      const ro = new ResizeObserver((entries) => {
        subscriber.next(entries);
      });

      // Observe one or multiple elements
      ro.observe(this._element.parentElement);

      return function unsubscribe() {
        ro.unobserve(this._element.parentElement);
      };
    })
      .pipe(
        debounceTime(100),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        const rect = this._element.parentElement.getBoundingClientRect();
        this._offset = {
          top: rect.top,
          left: rect.left,
        };
      });
  }

}

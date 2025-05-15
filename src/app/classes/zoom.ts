import { Renderer2 } from '@angular/core';

import { debounceTime, Observable, Subject, Subscriber, takeUntil } from 'rxjs';

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
    this._calculateOffset();
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

  public adjustZoom(delta: number) {
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

  private _validateZoom(zoom: number) {
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
    // calculate initial offset
    this._calculateOffset();

    // listen for changes to any parent element that may affect the offset and recalculate it
    let node = this._element.parentElement;
    const elements = [];
    while (node) {
      elements.unshift(node);
      node = node.parentElement;
    }

    new Observable((subscriber: Subscriber<MutationRecord[]>) => {
      const ro = new MutationObserver((mutations: MutationRecord[]) => {
        subscriber.next(mutations);
      });

      //look for style changes on any parent element
      elements.forEach((element: Element) => {
        ro.observe(element, {
          attributes: true,
          attributeFilter: ['style'],
        });
      });

      return function unsubscribe() {
        ro.disconnect();
      };
    })
      .pipe(
        debounceTime(100),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this._calculateOffset();
      });
  }

  private _calculateOffset() {
    const rect = this._element.parentElement.getBoundingClientRect();
    this._offset = {
      top: rect.top,
      left: rect.left,
    };
  }
}

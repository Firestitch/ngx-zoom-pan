import { NgZone, Renderer2 } from '@angular/core';

import { Zoom } from './zoom';
import { Pan } from './pan';
import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';
import { Subject } from 'rxjs';

export class ZoomPan {

  public zoomed$: Subject<boolean>;
  public moved$: Subject<{ top: number, left: number}>;

  private _zoom: Zoom;
  private _pan: Pan;
  private _config: IFsZoomPanConfig;

  constructor(private _element: HTMLElement,
              private _zoomElement: HTMLElement,
              private _zone: NgZone,
              private _renderer: Renderer2) {
    this._zoom = new Zoom(this, this._element, this._zoomElement, this._zone, this._renderer);
    this._pan = new Pan(this, this._element, this._zoomElement, this._zone, this._renderer);

    this.moved$ = this._pan.moved$;
    this.zoomed$ = this._zoom.zoomed$;
  }

  get config() {
    return this._config;
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

  public center(el: HTMLElement, options: { horizontal?: boolean, vertical?: boolean } = {}) {
    const leftCenter = el.offsetLeft + (el.offsetWidth / 2);
    const topCenter = el.offsetTop + (el.offsetHeight / 2);

    const x = this._pan.getWidth() / 2;
    const y = this._pan.getHeight() / 2;

    const left = (options.horizontal ?? true) ? (x - leftCenter) : this.zoomElementLeft;
    const top = (options.vertical ?? true) ? (y - topCenter) : this.zoomElementTop;

    this.reset();
    this.move(left, top);
  }

  public setConfig(config: IFsZoomPanConfig) {
    this._config = config;

    if (this._config.zoomDefault !== 1) {
      this.scale = this._config.zoomDefault;
    }
  }

  public move(left, top) {
    this._pan.move(left, top);
  }

  public reset() {
    this._zoom.reset();
    this._pan.reset();
  }

  public zoomIn() {
    this._zoom.zoomIn();
  }

  public zoomOut() {
    this._zoom.zoomOut();
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
}

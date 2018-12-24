import { NgZone, Renderer2 } from '@angular/core';
import { Zoom } from './zoom';
import { Pan } from './pan';
import { IFsZoomPanConfig } from '../interfaces/zoom-pan-config.interface';

export class ZoomPan {
  private _zoom: Zoom;
  private _pan: Pan;

  private _config: IFsZoomPanConfig;


  constructor(private _element: HTMLElement,
              private _zoomElement: HTMLElement,
              private _zone: NgZone,
              private _renderer: Renderer2) {
    this.initialization();
  }

  get config() {
    return this._config;
  }

  public initialization() {
    this._zoom = new Zoom(this, this._element, this._zoomElement, this._zone, this._renderer);
    this._pan = new Pan(this, this._element, this._zoomElement, this._zone, this._renderer);
  }

  public setConfig(config: IFsZoomPanConfig) {
    this._config = config;

    if (this._config.zoomDefault !== 1) {
      this.setZoomLevel(this._config.zoomDefault);
    }
  }

  public reset() {
    this._zoom.reset();
    this._pan.reset();
  }

  public setZoomLevel(scale: number) {
    this._zoom.setLevel(scale)
  }

  public destroy() {
    this._zoom.destroy();
    this._pan.destroy();
  }
}

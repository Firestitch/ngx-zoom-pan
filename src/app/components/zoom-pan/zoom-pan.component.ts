import {
  AfterViewInit, Component, ContentChild,
  ElementRef, Input, NgZone, OnDestroy,
  Renderer2, TemplateRef, ViewChild
} from '@angular/core';

import { ZoomPan } from '../../classes/zoompan';
import { FsZoomPanContentDirective } from '../../directives/fs-zoom-pan-content.directive';
import { IFsZoomPanConfig } from '../../interfaces/zoom-pan-config.interface';

@Component({
  selector: 'fs-zoom-pan',
  templateUrl: 'zoom-pan.component.html',
  styleUrls: ['zoom-pan.component.scss' ],
})
export class FsZoomPanComponent implements  AfterViewInit, OnDestroy {
  @Input() public zoomMax = 10;
  @Input() public zoomMin = 0.05;
  @Input() public zoomDefault = 1;

  @ViewChild('zoomable') public zoomable;
  @ContentChild(FsZoomPanContentDirective, { read: TemplateRef })
  public contentTemplate: TemplateRef<FsZoomPanContentDirective>;

  private _zoomPan: ZoomPan = null;

  constructor(private _element: ElementRef,
              private _zone: NgZone,
              private _renderer: Renderer2) {
  }

  get scale() {
    return this._zoomPan.zoomScale;
  }

  public ngAfterViewInit() {
    this._zoomPan = new ZoomPan(this._element.nativeElement, this.zoomable.nativeElement, this._zone, this._renderer);
    this.setConfig()
  }

  public reset() {
    this._zoomPan.reset();
  }

  public zoomIn() {
    this._zoomPan.zoomIn();
  }

  public zoomOut() {
    this._zoomPan.zoomOut();
  }

  public setZoomLevel(scale: number) {
    this._zoomPan && this._zoomPan.setZoomScale(scale);
  }

  public ngOnDestroy() {
    this._zoomPan.destroy();
  }

  private setConfig() {
    const config: IFsZoomPanConfig = {
      zoomMax: this.zoomMax,
      zoomMin: this.zoomMin,
      zoomDefault: this.zoomDefault
    };

    this._zoomPan.setConfig(config);
  }
}

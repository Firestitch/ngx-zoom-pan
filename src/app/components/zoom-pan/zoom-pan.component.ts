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
  @Input() public zoomMax = 1.5;
  @Input() public zoomMin = .3;
  @Input() public zoomDefault = 1;
  @Input() public top = 0;
  @Input() public left = 0;

  @ViewChild('zoomable') public zoomable;
  @ContentChild(FsZoomPanContentDirective, { read: TemplateRef })
  public contentTemplate: TemplateRef<FsZoomPanContentDirective>;

  private _zoomPan: ZoomPan = null;

  constructor(private _element: ElementRef,
              private _zone: NgZone,
              private _renderer: Renderer2) {
  }

  get scale() {
    return this._zoomPan.scale;
  }

  set scale(scale: number) {
    if (this._zoomPan) {
      this._zoomPan.scale = scale;
    }
  }

  public ngAfterViewInit() {
    this._zoomPan = new ZoomPan(this._element.nativeElement, this.zoomable.nativeElement, this._zone, this._renderer);

    if (this.top || this.left) {
      this._zoomPan.move(this.left, this.top);
    }

    this.setConfig();
  }

  public reset() {
    this._zoomPan.reset();
  }

  public center(el: HTMLElement) {
    this._zoomPan.center(el);
  }

  public zoomIn() {
    this._zoomPan.zoomIn();
  }

  public move(left, top) {
    this._zoomPan.move(left, top);
  }

  public zoomOut() {
    this._zoomPan.zoomOut();
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

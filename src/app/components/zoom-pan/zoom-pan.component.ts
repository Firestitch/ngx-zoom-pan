import {
  AfterViewInit, Component, ContentChild, ElementRef, Input, NgZone, OnChanges, OnDestroy,
  Renderer2, TemplateRef,
  ViewChild
} from '@angular/core';

import { ZoomPan } from '../../classes/zoompan';
import { FsZoomPanContentDirective } from '../../directives/fs-zoom-pan-content';

@Component({
  selector: 'fs-zoom-pan',
  templateUrl: 'zoom-pan.component.html',
  styleUrls: ['zoom-pan.component.scss' ],
})
export class FsZoomPanComponent implements  AfterViewInit, OnDestroy {
  @Input() public zoomMax = 10;
  @Input() public zoomMin = 0.1;

  @ViewChild('zoomable') public zoomable;
  @ContentChild(FsZoomPanContentDirective, { read: TemplateRef }) contentTemplate: TemplateRef<FsZoomPanContentDirective>;

  private _zoomPan: ZoomPan = null;

  constructor(private _element: ElementRef,
              private _zone: NgZone,
              private _renderer: Renderer2) {
  }

  public ngAfterViewInit() {
    this._zoomPan = new ZoomPan(this._element.nativeElement, this.zoomable.nativeElement, this._zone, this._renderer);
  }

  public reset() {
    this._zoomPan.reset();
  }

  public setZoomLevel(scale: number) {
    this._zoomPan && this._zoomPan.setZoomLevel(scale);
  }

  public ngOnDestroy() {
    this._zoomPan.destroy();
  }
}

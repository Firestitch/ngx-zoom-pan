import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnInit, Renderer2,
  ViewChild
} from '@angular/core';

import { ZoomPan } from '../../classes/zoompan';

@Component({
  selector: 'fs-zoom-pan',
  templateUrl: 'zoom-pan.component.html',
  styleUrls: ['zoom-pan.component.scss' ],
})
export class ZoomPanComponent implements  AfterViewInit, OnDestroy {
  @Input() public zoomMax = 10;
  @Input() public zoomMin = 0.1;

  @ViewChild('zoomable') public zoomable;

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

  public setLevel(level: number) {
    this._zoomPan.setZoomLevel(level);
  }

  public ngOnDestroy() {
    this._zoomPan.destroy();
  }
}

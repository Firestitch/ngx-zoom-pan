import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, Renderer2,
  ViewChild
} from '@angular/core';

import { Zoom } from '../../classes/zoom';

@Component({
  selector: 'fs-zoom-pan',
  templateUrl: 'zoom-pan.component.html',
  styleUrls: ['zoom-pan.component.scss' ],
})
export class ZoomPanComponent implements  AfterViewInit, OnDestroy {

  @ViewChild('zoomable') public zoomable;

  private _zoom: Zoom = null;

  constructor(private _element: ElementRef,
              private _zone: NgZone,
              private _renderer: Renderer2) {
  }

  public ngAfterViewInit() {
    this._zoom = new Zoom(this._element.nativeElement, this.zoomable.nativeElement, this._zone, this._renderer);
  }


  public reset() {
    this._zoom.reset();
  }

  public setLevel() {

  }

  public ngOnDestroy() {
    this._zoom.destroy();
  }
}

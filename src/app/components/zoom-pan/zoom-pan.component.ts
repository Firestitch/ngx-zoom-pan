import {
  AfterViewInit, Component, ContentChild,
  ElementRef, Input, NgZone, OnDestroy, Output,
  Renderer2, TemplateRef, ViewChild, EventEmitter, OnChanges, SimpleChanges,
} from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ZoomPan } from '../../classes/zoompan';
import { FsZoomPanContentDirective } from '../../directives/fs-zoom-pan-content.directive';
import { IFsZoomPanConfig } from '../../interfaces/zoom-pan-config.interface';

@Component({
  selector: 'fs-zoom-pan',
  templateUrl: 'zoom-pan.component.html',
  styleUrls: ['zoom-pan.component.scss' ],
})
export class FsZoomPanComponent implements  OnChanges, AfterViewInit, OnDestroy {

  @Input() public zoomMax = 2;
  @Input() public zoomMin = .1;
  @Input() public zoomDefault = 1;
  @Input() public top = 0;
  @Input() public left = 0;

  @Output() public moved = new EventEmitter();
  @Output() public zoomed = new EventEmitter();

  @ViewChild('zoomable', { static: true }) public zoomable;

  @ContentChild(FsZoomPanContentDirective, { read: TemplateRef })
  public contentTemplate: TemplateRef<FsZoomPanContentDirective>;

  private _destroy$ = new Subject();
  private _zoomPan: ZoomPan = null;

  constructor(
    private _element: ElementRef,
    private _zone: NgZone,
    private _renderer: Renderer2) {}

  get scale() {
    return this._zoomPan.scale;
  }

  set scale(scale: number) {
    if (this._zoomPan) {
      this._zoomPan.scale = scale;
    }
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.top.currentValue || changes.left.currentValue) {
      this._zoomPan?.move(this.left * this._zoomPan.scale, this.top * this._zoomPan.scale);
    }
  }

  public ngAfterViewInit() {
    this._zoomPan = new ZoomPan(this._element.nativeElement, this.zoomable.nativeElement, this._zone, this._renderer);

    if (this.top || this.left) {
      this._zoomPan.move(this.left, this.top);
    }

    this._zoomPan.zoomed$
      .pipe(
        takeUntil(this._destroy$),
      )
      .subscribe((data) => {
        this.zoomed.emit(data);

        const prevZoomScale = data
          ? this._zoomPan.scale - this._zoomPan.zoomStep
          : this._zoomPan.scale + this._zoomPan.zoomStep;

        this._zoomPan.move(
          this._zoomPan.zoomElementLeft,
          (this._zoomPan.zoomElementTop / prevZoomScale)  * this._zoomPan.scale
        )
      });

    this._zoomPan.moved$
      .pipe(
        takeUntil(this._destroy$),
      )
      .subscribe((data) => {
        this.moved.emit(data);
      });

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

  public ngOnDestroy(): void {
    this._zoomPan.destroy();
    this._destroy$.next();
    this._destroy$.complete();
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

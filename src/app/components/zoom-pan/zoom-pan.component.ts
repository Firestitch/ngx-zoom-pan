import {
  AfterViewInit, Component, ContentChild,
  ElementRef,
  EventEmitter,
  Input, NgZone,
  OnChanges,
  OnDestroy, Output,
  Renderer2,
  SimpleChanges,
  TemplateRef, ViewChild,
} from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ZoomPan } from '../../classes/zoompan';
import { FsZoomPanContentDirective } from '../../directives/fs-zoom-pan-content.directive';
import { IFsZoomPanConfig } from '../../interfaces/zoom-pan-config.interface';

@Component({
  selector: 'fs-zoom-pan',
  templateUrl: 'zoom-pan.component.html',
  styleUrls: ['zoom-pan.component.scss'],
})
export class FsZoomPanComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() public zoomMax = 2;
  @Input() public zoomMin = .1;
  @Input() public zoomDefault = 1;
  @Input() public top = 0;
  @Input() public left = 0;

  @Output() public moved = new EventEmitter();
  @Output() public zoomed = new EventEmitter();

  @ViewChild('container', { static: true })
  public container;

  @ContentChild(FsZoomPanContentDirective, { read: TemplateRef })
  public contentTemplate: TemplateRef<FsZoomPanContentDirective>;

  private _destroy$ = new Subject();
  private _zoomPan: ZoomPan = null;

  constructor(
    private _element: ElementRef,
    private _zone: NgZone,
    private _renderer: Renderer2
  ) { }


  get element() {
    return this._element;
  }

  get scale() {
    return this._zoomPan.scale;
  }

  set scale(scale: number) {
    if (this._zoomPan) {
      this._zoomPan.scale = scale;
    }
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.top || changes.left) {
      this._zoomPan?.move(this.left * this._zoomPan.scale, this.top * this._zoomPan.scale);
    }
  }

  public ngAfterViewInit() {
    this._zoomPan = new ZoomPan(this._element.nativeElement, this.container.nativeElement, this._zone, this._renderer);

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
          (this._zoomPan.zoomElementTop / prevZoomScale) * this._zoomPan.scale
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

  /**
   * move view to center on specified element
   * @param el element to center on
   * @param options horizontal: boolean - center horizonally (default true), vertical: boolean - center vertically (default true)
   */
  public centerOnElement(el: HTMLElement, options: { horizontal?: boolean, vertical?: boolean } = {}) {
    this._zoomPan.centerOnElement(el, options);
  }

  /**
   * get x,y coordinates at center of specified element
   * @param el
   */
  public getElementCenter(el: HTMLElement) {
    return this._zoomPan.getElementCenter(el);
  }

  /**
   * get x,y coordinates at center of current view
   */
  public getCenter(): { x: number, y: number } {
    return this._zoomPan.getCenter();
  }

  public zoom(scale: number) {
    this._zoomPan.zoom(scale);
  }

  public zoomIn() {
    this._zoomPan.zoomIn();
  }

  public zoomOut() {
    this._zoomPan.zoomOut();
  }


  public move(left, top) {
    this._zoomPan.move(left, top);
  }


  /**
   * move so specified coordinates are at center of view
   * @param x
   * @param y
   */
  public moveCenter(x: number, y: number, options?: { slide?: boolean }) {
    this._zoomPan.moveCenter(x, y, options);
  }


  public enable() {
    this._zoomPan.enable();
  }

  public disable() {
    this._zoomPan.disable();
  }

  public ngOnDestroy(): void {
    this._zoomPan.destroy();
    this._destroy$.next(null);
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

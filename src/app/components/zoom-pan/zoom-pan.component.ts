import {
  ChangeDetectionStrategy, Component, ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy, OnInit, Output,
  Renderer2,
  SimpleChanges,
  TemplateRef, ViewChild,
} from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IFsZoomPanConfig } from 'src/app/interfaces/zoom-pan-config.interface';

import { ZoomPan } from '../../classes/zoompan';
import { FsZoomPanContentDirective } from '../../directives/fs-zoom-pan-content.directive';


@Component({
  selector: 'fs-zoom-pan',
  templateUrl: './zoom-pan.component.html',
  styleUrls: ['./zoom-pan.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FsZoomPanComponent implements OnInit, OnChanges, OnDestroy {

  @Input() public zoomMax = 2;
  @Input() public zoomMin = .1;
  @Input() public zoomScale = 1;
  @Input() public zoomDefault = 1;
  @Input() public zoomFactor = .2;
  @Input() public top = 0;
  @Input() public left = 0;

  @Output() public moved = new EventEmitter<{ top: number, left: number }>();
  @Output() public zoomed = new EventEmitter<number>();

  @ViewChild('container', { static: true })
  public container;

  @ContentChild(FsZoomPanContentDirective, { read: TemplateRef })
  public contentTemplate: TemplateRef<FsZoomPanContentDirective>;

  private _destroy$ = new Subject();
  private _zoomPan: ZoomPan = null;

  constructor(
    private _element: ElementRef,
    private _renderer: Renderer2,
  ) { }

  public get element() {
    return this._element;
  }

  public get scale() {
    return this._zoomPan.scale;
  }

  public set scale(scale: number) {
    if (this._zoomPan) {
      this._zoomPan.scale = scale;
    }
  }

  public ngOnInit(): void {
    const config: IFsZoomPanConfig = {
      zoomMax: this.zoomMax,
      zoomMin: this.zoomMin,
      zoomDefault: this.zoomDefault,
      zoomScale: this.zoomScale,
      zoomFactor: this.zoomFactor,
    };

    this._zoomPan = new ZoomPan(
      config,
      this._element.nativeElement,
      this.container.nativeElement, 
      this._renderer);

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
          ? this._zoomPan.scale - this._zoomPan.zoomFactor
          : this._zoomPan.scale + this._zoomPan.zoomFactor;

        this._zoomPan.move(
          this._zoomPan.zoomElementLeft,
          (this._zoomPan.zoomElementTop / prevZoomScale) * this._zoomPan.scale,
        );
      });

    this._zoomPan.moved$
      .pipe(
        takeUntil(this._destroy$),
      )
      .subscribe((data) => {
        this.moved.emit(data);
      });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.top || changes.left) {
      this._zoomPan?.move(this.left * this._zoomPan.scale, this.top * this._zoomPan.scale);
    }
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

}

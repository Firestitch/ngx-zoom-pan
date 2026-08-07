import { ChangeDetectionStrategy, Component, ContentChild, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, TemplateRef, ViewChild, inject } from '@angular/core';

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
    standalone: true,
})
export class FsZoomPanComponent implements OnInit, OnChanges, OnDestroy {
  private _element = inject(ElementRef);
  private _renderer = inject(Renderer2);
  private _zone = inject(NgZone);


  @Input() public zoomMax = 2;
  @Input() public zoomMin = .1;
  @Input() public zoomScale = 1;
  @Input() public zoomDefault = 1;
  @Input() public zoomFactor = .2;

  /**
   * fit the content as soon as it has a size, and again while that size is still changing.
   * read once on init, alongside the rest of the zoom inputs
   */
  @Input() public zoomFit = false;

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
      zoomFit: this.zoomFit,
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
        // no repositioning here - every scale change is followed by an explicit re-anchor
        // (alignPosition on wheel, moveCenter on zoomIn/zoomOut/zoom)
        this._emit(() => this.zoomed.emit(data));
      });

    this._zoomPan.moved$
      .pipe(
        takeUntil(this._destroy$),
      )
      .subscribe((data) => {
        this._emit(() => this.moved.emit(data));
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

  /**
   * scale the content so that it fills the width of the view without overflowing it, and pin its
   * top left corner to the top left corner of the view. the scale is still bound by zoomMin/zoomMax
   * @param options horizontal: boolean - fit across the width (default true), vertical: boolean - also keep the content inside the height so that none of it is cut off (default false), padding: number - gap in pixels to leave around the content
   */
  public fit(options: {
    horizontal?: boolean,
    vertical?: boolean,
    padding?: number,
    slide?: boolean,
  } = {}) {
    this._zoomPan.fit(options);
  }

  /**
   * bounding box of the content in unscaled coordinates
   */
  public getContentBounds(): { left: number, top: number, width: number, height: number } {
    return this._zoomPan.getContentBounds();
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

  /**
   * zoomFit measures through a ResizeObserver, which zone.js does not patch, so a fit that
   * lands when content finishes rendering would otherwise emit from outside the angular zone
   * and leave an OnPush parent listening on (zoomed)/(moved) with no change detection to run
   */
  private _emit(emit: () => void): void {
    if (NgZone.isInAngularZone()) {
      emit();
    } else {
      this._zone.run(emit);
    }
  }

  public ngOnDestroy(): void {
    this._zoomPan.destroy();
    this._destroy$.next(null);
    this._destroy$.complete();
  }

}

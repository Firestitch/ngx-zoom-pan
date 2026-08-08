import { ChangeDetectionStrategy, Component, ContentChild, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, TemplateRef, ViewChild, inject } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IFsZoomPanConfig } from 'src/app/interfaces/zoom-pan-config.interface';

import { ZoomPan } from '../../classes/zoompan';
import { FsZoomPanContentDirective } from '../../directives/fs-zoom-pan-content.directive';
import { IFsZoomPanFitOptions } from '../../interfaces/zoom-pan-fit-options.interface';
import { FsZoomPanFit, FsZoomPanPosition } from '../../types/zoom-pan-fit.type';
import { FsZoomPanWheel } from '../../types/zoom-pan-wheel.type';


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
   * hold the content fitted: fit it as soon as it has a size, and re-fit it every time the content
   * or the view changes size, so resizing the container keeps the same view of the same thing.
   *
   * the hold ends the moment the user zooms or pans — from then on the view is theirs and a resize
   * leaves it alone. calling fit() puts the hold back on.
   *
   * read once on init, alongside the rest of the zoom inputs
   */
  @Input() public zoomFit = false;

  /** which axes a fit has to satisfy. `both` is the one that cannot cut anything off */
  @Input() public fitMode: FsZoomPanFit = 'both';

  /** where fitted content sits. defaults per mode: both/height centre, width pins to the top */
  @Input() public fitPosition: FsZoomPanPosition;

  /** gap in pixels between the content and the edges it is fitted against */
  @Input() public fitPadding = 0;

  /** ceiling on the fitted scale. 1 shrinks oversized content without magnifying content that fits */
  @Input() public fitMaxScale: number;

  /**
   * whether the mouse wheel zooms. defaults to 'always', which consumes every wheel event
   * over the element; use 'modifier' inside scrolling content so the page keeps scrolling
   * and only Ctrl/⌘ + wheel (or a trackpad pinch) zooms
   */
  @Input() public wheel: FsZoomPanWheel = 'always';

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
      fitMode: this.fitMode,
      fitPosition: this.fitPosition,
      fitPadding: this.fitPadding,
      fitMaxScale: this.fitMaxScale,
      wheel: this.wheel,
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
   * scale the content to the view and place it there. every option falls back to the matching
   * input, so a bare fit() does whatever the component was configured for.
   *
   * mode: 'both' (default) fits on both axes so nothing is cut off; 'width' and 'height' each
   * satisfy one axis and let the other overflow.
   * position: one of the nine named positions. defaults per mode — both/height centre, width pins
   * to the top.
   * padding: gap in pixels against the edges it is fitted to.
   * maxScale: ceiling on the resulting scale; 1 shrinks oversized content without magnifying
   * content that already fits.
   *
   * when zoomFit is on this also re-arms the hold, so the content goes back to being kept fitted
   * through resizes until the user zooms or pans again.
   */
  public fit(options: IFsZoomPanFitOptions = {}) {
    this._zoomPan.fit(options);
  }

  /**
   * whether the content is still being held fitted through resizes. false once the user has zoomed
   * or panned, true again after a fit()
   */
  public get fitHeld(): boolean {
    return this._zoomPan?.fitHeld ?? false;
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

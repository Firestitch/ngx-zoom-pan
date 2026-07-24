import { Renderer2 } from '@angular/core';

import { fromEvent, Observable, Subject, takeUntil, tap } from 'rxjs';


export class Pan {

  public disabled = false;

  private _positionCoord: { x: number, y: number };
  private _positionPage: { left: number, top: number };
  private _destroy$ = new Subject<void>();
  private _moved$ = new Subject<{ top: number, left: number }>();
  private _dragStart = false;
  private _left = 0;
  private _top = 0;

  constructor(
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _renderer: Renderer2,
  ) {
    // the offset is tracked as a number rather than re-read from style, which would
    // truncate fractional positions and let rounding accumulate over many moves
    this._left = parseFloat(this._zoomElement.style.left) || 0;
    this._top = parseFloat(this._zoomElement.style.top) || 0;

    this.events();
  }

  public get moved$(): Observable<{ top: number, left: number }> {
    return this._moved$.asObservable();
  }

  public get zoomElementTop(): number {
    return this._top;
  }

  public get zoomElementLeft(): number {
    return this._left;
  }

  public events() {
    fromEvent(this._element, 'mousedown')
      .pipe(
        tap((event: MouseEvent) => this.dragStart(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    fromEvent(this._element, 'mouseup')
      .pipe(
        tap(() => this.dragEnd()),
        takeUntil(this._destroy$),
      )
      .subscribe();

    fromEvent(this._element, 'mousemove')
      .pipe(
        tap((event: MouseEvent) => this.drag(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    fromEvent(this._element, 'mouseleave')
      .pipe(
        tap(() => this.dragEnd()),
        takeUntil(this._destroy$),
      )
      .subscribe();


    fromEvent(this._element, 'touchstart')
      .pipe(
        tap((event: TouchEvent) => this.dragStart(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    fromEvent(this._element, 'touchend')
      .pipe(
        tap(() => this.dragEnd()),
        takeUntil(this._destroy$),
      )
      .subscribe();

    fromEvent(this._element, 'touchmove')
      .pipe(
        tap((event: TouchEvent) => this.drag(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();
  }

  public dragStart(event: MouseEvent | TouchEvent) {
    if (!this.disabled) {
      this._positionCoord = this.pointerEventToXY(event);
      this._positionPage = {
        top: this._top,
        left: this._left,
      };

      this._dragStart = true;
    }
  }

  public drag(event: MouseEvent | TouchEvent) {
    if (!this._dragStart) {
      return;
    }

    event.preventDefault();

    const newPosition = this.pointerEventToXY(event);

    const newTop = (newPosition.y - this._positionCoord.y) + this._positionPage.top;
    const newLeft = (newPosition.x - this._positionCoord.x) + this._positionPage.left;

    this.move(newLeft, newTop);
  }

  /**
   * move top left corner of screen to new position
   * @param left
   * @param top
   */
  public move(left: number, top: number, options: { slide?: boolean } = {}) {
    if (options.slide) {
      this.enableSlide();
    }

    const moved = this._left !== left || this._top !== top;

    if (this._left !== left) {
      this._left = left;
      this._renderer.setStyle(this._zoomElement, 'left', `${left}px`);
    }

    if (this._top !== top) {
      this._top = top;
      this._renderer.setStyle(this._zoomElement, 'top', `${top}px`);
    }

    if (moved) {
      this._moved$.next({ left, top });
    }

    if (options.slide) {
      setTimeout(() => {
        this.disableSlide();
      }, 250);
    }
  }

  public dragEnd() {
    this._dragStart = false;
  }

  public reset() {
    this.move(0, 0);
  }

  public getWidth() {
    return this._element.offsetWidth;
  }

  public getHeight() {
    return this._element.offsetHeight;
  }

  /**
   * viewport coordinates of the container's transform origin. the container is scaled
   * with transform-origin: 0 0, so this corner stays put as the scale changes and
   * getBoundingClientRect() reports it correctly at any zoom level.
   *
   * a content point p (in the container's own unscaled coordinates) renders at
   * origin + p * scale, which is the only relationship the zoom math needs. reading it
   * fresh keeps it correct after page scroll, resize or any reflow.
   */
  public getOrigin(): { x: number, y: number } {
    const rect = this._zoomElement.getBoundingClientRect();

    return { x: rect.left, y: rect.top };
  }

  /**
   * viewport coordinates of the center of the visible area. clientLeft/clientWidth are
   * used so the center is measured on the padding box, which is what overflow clips to
   */
  public getViewportCenter(): { x: number, y: number } {
    const rect = this._element.getBoundingClientRect();

    return {
      x: rect.left + this._element.clientLeft + (this._element.clientWidth / 2),
      y: rect.top + this._element.clientTop + (this._element.clientHeight / 2),
    };
  }

  public getZoomableWidth() {
    const el: any = this._element.querySelector('.zoomable');

    return el.offsetWidth;
  }

  public getZoomableHeight() {
    const el: any = this._element.querySelector('.zoomable');

    return el.offsetHeight;
  }

  public getLeft(): number {
    return this._left;
  }

  public getTop(): number {
    return this._top;
  }

  public destroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public pointerEventToXY(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const out = { x: 0, y: 0 };

    if (event.type === 'touchstart'
      || event.type === 'touchmove'
      || event.type === 'touchend'
      || event.type === 'touchcancel') {
      const touch = (event as TouchEvent).touches[0] || (event as TouchEvent).changedTouches[0];
      out.x = touch.pageX;
      out.y = touch.pageY;

    } else if (event.type === 'mousedown'
      || event.type === 'mouseup'
      || event.type === 'mousemove'
      || event.type === 'mouseover'
      || event.type === 'mouseout'
      || event.type === 'mouseenter'
      || event.type === 'mouseleave') {

      out.x = (event as MouseEvent).pageX;
      out.y = (event as MouseEvent).pageY;
    }

    return out;
  }


  public enableSlide() {
    this._renderer.setStyle(this._zoomElement, 'transition', 'top 0.25s ease, left 0.25s ease');
  }
  public disableSlide() {
    this._renderer.setStyle(this._zoomElement, 'transition', '');
  }


}

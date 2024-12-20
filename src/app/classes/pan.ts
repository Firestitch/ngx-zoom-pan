import { Renderer2 } from '@angular/core';

import { fromEvent, Observable, Subject, takeUntil, tap } from 'rxjs';


export class Pan {

  public disabled = false;

  private _positionCoord: { x: number, y: number };
  private _positionPage: { left: number, top: number };
  private _destroy$ = new Subject<void>();
  private _moved$ = new Subject<{ top: number, left: number }>();
  private _dragStart = false;

  constructor(
    private _element: HTMLElement,
    private _zoomElement: HTMLElement,
    private _renderer: Renderer2,
  ) {
    this.events();
  }

  public get moved$(): Observable<{ top: number, left: number }> {
    return this._moved$.asObservable();
  }

  public get zoomElementTop(): number {
    return parseInt(this._zoomElement.style.top) || 0; // without 'px' sufix
  }

  public get zoomElementLeft(): number {
    return parseInt(this._zoomElement.style.left) || 0; // without 'px' sufix
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
        top: this.zoomElementTop || -1,
        left: this.zoomElementLeft || -1,
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

    if (this.zoomElementLeft !== left) {
      this._renderer.setStyle(this._zoomElement, 'left', `${left}px`);
    }

    if (this.zoomElementTop !== top) {
      this._renderer.setStyle(this._zoomElement, 'top', `${top}px`);
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
    this._zoomElement.style.top = '0px';
    this._zoomElement.style.left = '0px';
  }

  public getWidth() {
    return this._element.offsetWidth;
  }

  public getHeight() {
    return this._element.offsetHeight;
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
    return this._zoomElement.offsetLeft;
  }

  public getTop(): number {
    return this._zoomElement.offsetTop;
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

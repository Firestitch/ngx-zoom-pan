import { Renderer2 } from '@angular/core';

import { fromEvent, merge, Observable, Subject, takeUntil, tap } from 'rxjs';


/** on the host for the length of a drag, so the cursor can close into a fist while it runs */
const DRAGGING_CLASS = 'fs-zoom-pan-dragging';

/** on the host while panning is turned off, so the surface stops offering a drag it will refuse */
const DISABLED_CLASS = 'fs-zoom-pan-disabled';


export class Pan {

  private _positionCoord: { x: number, y: number };
  private _positionPage: { left: number, top: number };
  private _destroy$ = new Subject<void>();
  private _moved$ = new Subject<{ top: number, left: number }>();
  private _dragged$ = new Subject<void>();
  private _dragEnd$ = new Subject<void>();
  private _dragStart = false;
  private _disabled = false;
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

  public get disabled(): boolean {
    return this._disabled;
  }

  /**
   * turning panning off also drops the grab cursor and ends any drag already running: a surface
   * that advertises a drag and then refuses it reads as broken
   */
  public set disabled(disabled: boolean) {
    this._disabled = disabled;

    if (disabled) {
      this.dragEnd();
    }

    this._toggleClass(DISABLED_CLASS, disabled);
  }

  public get moved$(): Observable<{ top: number, left: number }> {
    return this._moved$.asObservable();
  }

  /**
   * Fires only for a pointer drag, unlike moved$, which also fires for every programmatic move.
   * That difference is what lets a held fit tell "the user took over" from "the fit repositioned
   * the content" — the fit moves the content on every resize and must not count as taking over.
   */
  public get dragged$(): Observable<void> {
    return this._dragged$.asObservable();
  }

  public get zoomElementTop(): number {
    return this._top;
  }

  public get zoomElementLeft(): number {
    return this._left;
  }

  /**
   * a drag STARTS on the element and then runs on the document.
   *
   * starting on the element is what lets a child veto the pan by stopping mousedown — a report
   * component being repositioned, a block being moved — so those listeners stay where they are.
   * mouse events are kept, rather than moving to pointer events with setPointerCapture, for the
   * same reason: pointerdown fires ahead of mousedown, so a consumer that blocks the pan on
   * mousedown would find it had already started.
   *
   * everything after the press belongs to the document, because taking the pointer outside the
   * viewport is the ordinary way to pan a zoomed-in page a long way and must not end the drag.
   */
  public events() {
    fromEvent(this._element, 'mousedown')
      .pipe(
        tap((event: MouseEvent) => this.dragStart(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    // touch events keep being delivered to the element the gesture started on, so touch needs
    // none of the document-level plumbing the mouse does
    fromEvent(this._element, 'touchstart')
      .pipe(
        tap((event: TouchEvent) => this.dragStart(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    fromEvent(this._element, 'touchmove')
      .pipe(
        tap((event: TouchEvent) => this.drag(event)),
        takeUntil(this._destroy$),
      )
      .subscribe();

    // touchcancel is the system taking the gesture away — a call arriving, a browser edge swipe —
    // and leaves no touchend behind to end the drag with
    merge(
      fromEvent(this._element, 'touchend'),
      fromEvent(this._element, 'touchcancel'),
    )
      .pipe(
        tap(() => this.dragEnd()),
        takeUntil(this._destroy$),
      )
      .subscribe();
  }

  public dragStart(event: MouseEvent | TouchEvent) {
    if (this._disabled) {
      return;
    }

    const mouse = event.type === 'mousedown';

    // only the primary button pans. a right-click drag would otherwise leave the content stuck to
    // the pointer, because the mouseup that ends it goes to the context menu instead
    if (mouse && (event as MouseEvent).button !== 0) {
      return;
    }

    this._positionCoord = this.pointerEventToXY(event);
    this._positionPage = {
      top: this._top,
      left: this._left,
    };

    this._dragStart = true;
    this._toggleClass(DRAGGING_CLASS, true);

    if (mouse) {
      this._listenDocumentDrag();
    }
  }

  public drag(event: MouseEvent | TouchEvent) {
    if (!this._dragStart) {
      return;
    }

    event.preventDefault();

    this._dragged$.next();

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
    if (!this._dragStart) {
      return;
    }

    this._dragStart = false;
    this._toggleClass(DRAGGING_CLASS, false);

    // releases the document listeners this drag put up
    this._dragEnd$.next();
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

  /**
   * size of the visible area. clientWidth/clientHeight are used so the size is measured on
   * the padding box, which is what overflow clips to
   */
  public getViewportSize(): { width: number, height: number } {
    return {
      width: this._element.clientWidth,
      height: this._element.clientHeight,
    };
  }

  /**
   * viewport coordinates of the top left corner of the visible area, measured on the padding
   * box for the same reason as getViewportCenter()
   */
  public getViewportOrigin(): { x: number, y: number } {
    const rect = this._element.getBoundingClientRect();

    return {
      x: rect.left + this._element.clientLeft,
      y: rect.top + this._element.clientTop,
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
    this._dragged$.complete();
    this._dragEnd$.complete();
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

  /**
   * follow the pointer for as long as the button is held, wherever it goes, and end on release.
   *
   * the listeners live on the document only for the length of the drag, so they cost nothing the
   * rest of the time. alongside the release there are two ways a press ends without a mouseup ever
   * arriving — pointercancel, the browser taking the gesture over, and the window losing focus,
   * which covers a button released over another window. both have to end the drag too: a missed
   * release leaves the content following a pointer with nothing held down, which is a worse bug
   * than the one this replaces.
   */
  private _listenDocumentDrag() {
    const end$ = merge(this._dragEnd$, this._destroy$);

    fromEvent(document, 'mousemove')
      .pipe(
        tap((event: MouseEvent) => this.drag(event)),
        takeUntil(end$),
      )
      .subscribe();

    merge(
      fromEvent(document, 'mouseup'),
      fromEvent(document, 'pointercancel'),
      fromEvent(window, 'blur'),
    )
      .pipe(
        tap(() => this.dragEnd()),
        takeUntil(end$),
      )
      .subscribe();
  }

  private _toggleClass(name: string, add: boolean) {
    if (add) {
      this._renderer.addClass(this._element, name);
    } else {
      this._renderer.removeClass(this._element, name);
    }
  }

}

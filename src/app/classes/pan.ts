import { ZoomPan } from './zoompan';
import { NgZone, Renderer2 } from '@angular/core';

export class Pan {
  // handlers
  private _dragStartHandler: EventListener;
  private _dragEndHandler: EventListener;
  private _dragHandler: EventListener;

  // listeners
  private _mouseDownListener: Function;
  private _mouseUpListener: Function;
  private _mouseMoveListener: Function;
  private _touchStartListener: Function;
  private _touchEndListener: Function;
  private _touchMoveListener: Function;

  private _positionCoord: { x: number, y: number };
  private _positionPage: { left: number, top: number };

  private _dragStart = false;

  constructor(private _zoomPan: ZoomPan,
              private _element: HTMLElement,
              private _zoomElement: HTMLElement,
              private _zone: NgZone,
              private _renderer: Renderer2) {
    this.events();
  }

  get zoomElementTop(): number {
    return parseInt(this._zoomElement.style.top) || 0 // without 'px' sufix
  }

  get zoomElementLeft(): number {
    return parseInt(this._zoomElement.style.left) || 0 // without 'px' sufix
  }

  public events() {
    this._dragStartHandler = this.dragStart.bind(this);
    this._dragEndHandler   = this.dragEnd.bind(this);
    this._dragHandler      = this.drag.bind(this);

    this._mouseDownListener = this._renderer.listen(
      this._element, 'mousedown', this._dragStartHandler
    );

    this._mouseUpListener   = this._renderer.listen(
      this._element, 'mouseup', this._dragEndHandler
    );

    this._touchStartListener = this._renderer.listen(
      this._element, 'touchstart', this._dragStartHandler
    );

    this._touchEndListener = this._renderer.listen(
      this._element, 'touchend', this._dragEndHandler
    );

    this._zone.runOutsideAngular(() => {
      this._mouseMoveListener = this._renderer.listen(
        this._element, 'mousemove', this._dragHandler
      );

      this._touchMoveListener = this._renderer.listen(
        this._element, 'touchmove', this._dragHandler
      );
    })
  }

  public dragStart(event: MouseEvent | TouchEvent) {
    this._positionCoord = this.pointerEventToXY(event);
    this._positionPage = {
      top: this.zoomElementTop || -1,
      left: this.zoomElementLeft || -1
    };

    this._dragStart = true;
  }

  public drag(event: MouseEvent | TouchEvent) {
    if (!this._dragStart) {
      return;
    }

    event.preventDefault();

    const newPosition = this.pointerEventToXY(event);

    const newTop = (newPosition.y - this._positionCoord.y) + this._positionPage.top;
    const newLeft = (newPosition.x - this._positionCoord.x) + this._positionPage.left;

    if (this.zoomElementTop !== newTop && this.zoomElementLeft !== newLeft) {
      this._zoomElement.style.top = newTop + 'px';
      this._zoomElement.style.left = newLeft + 'px';
    }
  }

  public dragEnd(event: MouseEvent | TouchEvent) {
    this._dragStart = false;
  }

  public reset() {
    this._zoomElement.style.top = '0px';
    this._zoomElement.style.left = '0px';
  }

  public destroy() {
    this._mouseDownListener();
    this._mouseUpListener();
    this._mouseMoveListener();
    this._touchStartListener();
    this._touchEndListener();
    this._touchMoveListener();
  }

  private pointerEventToXY(event: MouseEvent | TouchEvent): { x: number, y: number } {
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
}

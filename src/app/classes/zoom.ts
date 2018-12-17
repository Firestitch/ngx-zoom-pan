import { NgZone, Renderer2 } from '@angular/core';

export class Zoom {
  // handlers
  private _mouseDownHandler: EventListener;
  private _mouseUpHandler: EventListener;
  private _mouseMoveHandler: EventListener;


  // listeners
  private _mouseDownListener: Function;
  private _mouseUpListener: Function;
  private _mouseMoveListener: Function;


  private _positionCoord: { x: number, y: number };
  private _positionPage: { left: number, top: number };
  private _dragStart = false;

  constructor(private _element: HTMLElement,
              private _zoomElement: HTMLElement,
              private _zone: NgZone,
              private _renderer: Renderer2) {
    this.events();
  }

  public events() {
    this._mouseDownHandler = this.mousedown.bind(this);
    this._mouseUpHandler   = this.mouseup.bind(this);
    this._mouseMoveHandler = this.mousemove.bind(this);

    this._mouseDownListener = this._renderer.listen(
      this._element, 'mousedown', this._mouseDownHandler
    );
    this._mouseUpListener   = this._renderer.listen(
      this._element, 'mouseup', this._mouseUpHandler
    );

    this._zone.runOutsideAngular(() => {
      this._mouseMoveListener = this._renderer.listen(
        this._element, 'mousemove', this._mouseMoveHandler
      );
    })
  }

  public mousedown(event: MouseEvent) {
    this._positionCoord = this.pointerEventToXY(event);
    this._positionPage = {
      top: parseInt(this._zoomElement.style.top) || -1,
      left: parseInt(this._zoomElement.style.left) || -1
    };

    this._dragStart = true;
  }

  public mousemove(event: MouseEvent) {
    if (!this._dragStart) {
      return;
    }

    event.preventDefault();

    const newPosition = this.pointerEventToXY(event);

    const newTop = (newPosition.y - this._positionCoord.y) + this._positionPage.top;
    const newLeft = (newPosition.x - this._positionCoord.x) + this._positionPage.left;

    const positionOnPageTop = parseInt(this._zoomElement.style.top);
    const positionOnPageLeft = parseInt(this._zoomElement.style.left);

    if (positionOnPageTop !== newTop && positionOnPageLeft !== newLeft) {
      this._zoomElement.style.top = newTop + 'px';
      this._zoomElement.style.left = newLeft + 'px';
    }
  }

  public mouseup(event: MouseEvent) {
    this._dragStart = false;
  }

  public reset() {

  }

  public destroy() {
    this._mouseDownListener();
    this._mouseUpListener();
    this._mouseMoveListener();
  }

  private pointerEventToXY(event): { x: number, y: number } {
    const out = { x: 0, y: 0 };

    if (event.type === 'touchstart'
      || event.type === 'touchmove'
      || event.type === 'touchend'
      || event.type === 'touchcancel') {

      const touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
      out.x = touch.pageX;
      out.y = touch.pageY;

    } else if (event.type === 'mousedown'
      || event.type === 'mouseup'
      || event.type === 'mousemove'
      || event.type === 'mouseover'
      || event.type === 'mouseout'
      || event.type === 'mouseenter'
      || event.type === 'mouseleave') {

      out.x = event.pageX;
      out.y = event.pageY;
    }

    return out;
  }
}

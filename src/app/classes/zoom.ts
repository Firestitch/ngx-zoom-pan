import { NgZone, Renderer2 } from '@angular/core';
import { ZoomPan } from './zoompan';

export class Zoom {
  // handlers
  private _wheelHandler: EventListener;

  // listeners
  private _wheelListener: Function;

  private _zoomLevel = 1;

  private _xLast = 0;  // last x location on the screen
  private _yLast = 0;  // last y location on the screen
  private _xImage = 0; // last x location on the image
  private _yImage = 0; // last y location on the image

  private _offset;

  constructor(private _zoomPan: ZoomPan,
              private _element: HTMLElement,
              private _zoomElement: HTMLElement,
              private _zone: NgZone,
              private _renderer: Renderer2) {
    this.events();
  }

  get zoomElementTop(): number {
    return parseInt(this._zoomElement.style.top) // without 'px' sufix
  }

  get zoomElementLeft(): number {
    return parseInt(this._zoomElement.style.left) // without 'px' sufix
  }

  public events() {
    this._wheelHandler = this.wheel.bind(this);

    this._zone.runOutsideAngular(() => {
      this._wheelListener = this._renderer.listen(
        this._element, 'wheel', this._wheelHandler
      );
    });

    const rect = this._zoomElement.getBoundingClientRect();

    this._offset = {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft
    };
  }

  public wheel(event: WheelEvent) {
    event.preventDefault();

    let delta = event.wheelDelta || -event.detail;
    // const deltaMode = 0;
    // if ( event.originalEvent && event.originalEvent.deltaMode )
    //   deltaMode = event.originalEvent.deltaMode; //delta mode says if scroll delta is in pixels(0) or 'lines'(1).  firefox gives lines.  https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
    // if ( +deltaMode === 1 ) {
    //   delta = -delta; // Math.max(-100, Math.min(100, (delta)))/100;
    // } else {
      delta = Math.max(-100, Math.min(100, (delta))) / 100;
    // }

    const pageX = event.pageX;
    const pageY = event.pageY;

    this.adjustZoom(delta, pageX, pageY);
  }

  private adjustZoom(delta: number, focusX: number, focusY: number) {
    // find current location on screen

    const xScreen = focusX - this._offset.left - this.zoomElementLeft;
    const yScreen = focusY - this._offset.top - this.zoomElementTop;

    this._xImage = this._xImage + ((xScreen - this._xLast) / this._zoomLevel);
    this._yImage = this._yImage + ((yScreen - this._yLast) / this._zoomLevel);

    const zoom = this._zoomLevel + (delta * .10);

    // determine the location on the screen at the new scale
    const xNew = (xScreen - this._xImage) / zoom;
    const yNew = (yScreen - this._yImage) / zoom;

    // save the current screen location
    this._xLast = xScreen;
    this._yLast = yScreen;

    this.setZoom(zoom, { x: this._xImage, y: this._yImage }, { x: xNew, y: yNew });
  }

  private setZoom(zoom: number, origin, translate ) {
    // keep within constraints if there are any
    // if(($scope.zoomMin && zoom<$scope.zoomMin) || ($scope.zoomMax && zoom>$scope.zoomMax))
    //   return;

    // update dom
    if (translate && origin) {
      const prefix = [ 'webkit', 'moz', 'ms', 'o', '' ];
      prefix.forEach((pr) => {
        this._renderer.setStyle(this._zoomElement, `transform`, `translateZ(0) scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`);
        this._renderer.setStyle(this._zoomElement, 'transform-origin', `${origin.x}px ${origin.y}px`);
      })
    }

    this._zoomLevel = zoom;
  }

  public reset() {
    this.setZoom(1, { x: 0, y: 0 }, { x: 0, y: 0 });
  }

  public setLevel(scale: number) {
    this.setZoom(scale, { x: 0, y: 0 }, { x: 0, y: 0 })
  }

  public destroy() {
   this._wheelListener();
  }

}

import { Directive } from '@angular/core';

@Directive({
  selector: '[fsZoomPanContent]',
  host: {
    'class': 'zoom-content'
  }
})
export class FsZoomPanContentDirective {}

import { Directive } from '@angular/core';

@Directive({
    selector: '[fsZoomPanContent]',
    host: {
        'class': 'zoom-content',
    },
    standalone: true,
})
export class FsZoomPanContentDirective {}

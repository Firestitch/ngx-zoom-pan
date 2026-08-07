import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, inject, ViewChild,
} from '@angular/core';

import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { ConnectionOverlayType, FsDiagramDirective, FsDiagramModule } from '@firestitch/diagram';
import { FsZoomPanComponent } from '@firestitch/zoom-pan';

import { random } from 'lodash';

import { FsZoomPanComponent as FsZoomPanComponent_1 } from '../../../../src/app/components/zoom-pan/zoom-pan.component';

@Component({
  selector: 'example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatIconButton,
    MatIcon,
    MatTooltip,
    FsZoomPanComponent_1,
    FsDiagramModule,
  ],
})
export class ExampleComponent implements AfterViewInit {

  @ViewChild(FsZoomPanComponent, { static: true })
  public zoomPan: FsZoomPanComponent;

  @ViewChild(FsDiagramDirective)
  public diagram: FsDiagramDirective;

  @ViewChild('zoomPanContaner', { static: true })
  public zoomPanContaner: ElementRef;

  public objects = [];
  public scaleLabel = '';

  private _cdRef = inject(ChangeDetectorRef);

  public zoomIn() {
    this.zoomPan.zoomIn();
  }

  public zoomOut() {
    this.zoomPan.zoomOut();
  }

  public fit() {
    this.zoomPan.fit();
  }

  public center(el) {
    this.zoomPan.centerOnElement(el);
  }

  public reset() {
    this.zoomPan.reset();
  }

  public getCenter() {
    const obj = this.objects[Math.floor(Math.random() * this.objects.length)];

    const el = this.diagram.getDiagramObject(obj).elementRef.nativeElement;

    const center = this.zoomPan.getElementCenter(el);
    this.zoomPan.moveCenter(center.x, center.y, { slide: true });
  }

  public moved(data) {
    //console.log('Moved', data);
  }

  public zoomed(scale: number) {
    this._updateScaleLabel(scale);
  }

  public ngAfterViewInit() {
    // for (let i = 0; i < 30; i++) {
    //   this.add();
    // }

    this._updateScaleLabel(this.zoomPan.scale);

    this._cdRef.markForCheck();
  }

  public remove(object) {
    this.objects = this.objects.filter((obj) => obj !== object);
  }

  public add() {
    const x1 = random(0, this.zoomPanContaner.nativeElement.offsetWidth - 100 - 4);
    const y1 = random(0, 600 - 150 - 4);

    const idx = this.objects.length;

    const object = { name: `Object ${  idx + 1}`, x1: x1, y1: y1, id: idx + 1 };

    this.objects.push(object);

    if (idx) {

      const object1 = this.objects[idx - 1];
      const object2 = this.objects[idx];

      const config = {
        overlays: [
          {
            type: ConnectionOverlayType.Label,
            label: `Label ${  idx}`,
          },
        ],
        data: {
          object: object,
        },
      };

      this.diagram.connect(object1, object2, config);
    }
  }

  public dragStop() {
    //console.log(e);
  }

  private _updateScaleLabel(scale: number) {
    this.scaleLabel = `${Math.round(scale * 100)}%`;

    this._cdRef.markForCheck();
  }
}

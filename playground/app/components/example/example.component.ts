import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { ConnectionOverlayType, FsDiagramDirective } from '@firestitch/diagram';
import { FsZoomPanComponent } from '@firestitch/zoom-pan';

import { random } from 'lodash';

@Component({
  selector: 'example',
  templateUrl: 'example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements AfterViewInit {
  @ViewChild(FsZoomPanComponent, { static: true })
  public zoomPan: FsZoomPanComponent;

  @ViewChild(FsDiagramDirective)
  public model: FsDiagramDirective;

  @ViewChild('zoomPanContaner', { static: true })
  public zoomPanContaner: ElementRef;

  public objects = [];

  public zoomIn() {
    this.zoomPan.zoomIn();
  }

  public zoomOut() {
    this.zoomPan.zoomOut();
  }

  public center(el) {
    this.zoomPan.centerOnElement(el);
  }

  public reset() {
    this.zoomPan.reset();
  }

  public getCenter() {

    const obj = this.objects[Math.floor(Math.random() * this.objects.length)];

    const el = this.model.getDiagramObject(obj).element.nativeElement;

    const center = this.zoomPan.getElementCenter(el);
    this.zoomPan.moveCenter(center.x, center.y, { slide: true });
  }

  public changed(data) {
    console.log('Changed', data);
  }

  ngAfterViewInit() {
    for (let i = 0; i < 30; i++) {
      this.add();
    }
  }

  remove(object) {
    this.objects = this.objects.filter(obj => obj !== object);
  }

  add() {
    const x1 = random(0, this.zoomPanContaner.nativeElement.offsetWidth - 100 - 4);
    const y1 = random(0, 600 - 150 - 4);

    const idx = this.objects.length;

    const object = { name: 'Object ' + (idx + 1), x1: x1, y1: y1, id: idx + 1 };

    this.objects.push(object);

    if (idx) {

      const object1 = this.objects[idx - 1];
      const object2 = this.objects[idx];

      const config = {
        overlays: [
          {
            type: ConnectionOverlayType.Label,
            label: 'Label ' + idx
          }
        ],
        data: {
          object: object
        }
      };

      this.model.connect(object1, object2, config);
    }
  }

  dragStop(e) {
    //console.log(e);
  }
}

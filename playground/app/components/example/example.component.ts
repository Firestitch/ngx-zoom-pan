import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { FsZoomPanComponent } from 'fs-package';
import { FsModelDirective, ConnectionOverlayType } from '@firestitch/model';
import { random } from 'lodash';

@Component({
  selector: 'example',
  templateUrl: 'example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements AfterViewInit {
  @ViewChild(FsZoomPanComponent)
  public zoomPan: FsZoomPanComponent;

  @ViewChild(FsModelDirective)
  public model: FsModelDirective;
  public objects = [];

  public zoomIn() {
    this.zoomPan.zoomIn();
  }

  public zoomOut() {
    this.zoomPan.zoomOut();
  }

  public reset() {
    this.zoomPan.reset();
  }

  ngAfterViewInit() {

    for (let i = 0; i < 8; i++) {
      this.add();
    }
  }

  remove(object) {
    this.objects = this.objects.filter(obj => obj !== object);
  }

  add() {

    const x1 = random(0, this.model.element.nativeElement.offsetWidth - 100 - 4);
    const y1 = random(0, 600 - 150 - 4);

    const idx = this.objects.length;

    const object = { name: 'Object ' + (idx + 1), x1: x1, y1: y1, id: idx + 1 };

    this.objects.push(object);

    if(idx) {

      const object1 = this.objects[idx - 1];
      const object2 = this.objects[idx];

      let config = {
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
    console.log(e);
  }
}

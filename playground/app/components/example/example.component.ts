import { Component } from '@angular/core';

@Component({
  selector: 'example',
  templateUrl: 'example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent {

  public blocks = [ { left: 550 + 'px', top: 300 + 'px' },
                    { left: 99 + 'px', top: 50 + 'px' },
                    { left: 352 + 'px', top: 180 + 'px' },
                    { left: 156 + 'px', top: 400 + 'px' },
                    { left: 480 + 'px', top: 232 + 'px' },];
}

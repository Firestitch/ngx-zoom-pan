import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { FsZoomPanComponent } from './components/zoom-pan/zoom-pan.component';
import { FsZoomPanContentDirective } from './directives/fs-zoom-pan-content.directive';


@NgModule({
  imports: [
    CommonModule,
  ],
  exports: [
    FsZoomPanComponent,
    FsZoomPanContentDirective,
  ],
  declarations: [
    FsZoomPanComponent,
    FsZoomPanContentDirective,
  ],
})
export class FsZoomPanModule {
  public static forRoot(): ModuleWithProviders<FsZoomPanModule> {
    return {
      ngModule: FsZoomPanModule,
    };
  }
}

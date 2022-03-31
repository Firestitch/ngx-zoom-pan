import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FsZoomPanComponent } from './components/zoom-pan/zoom-pan.component';
import { FsZoomPanContentDirective } from './directives/fs-zoom-pan-content.directive';


@NgModule({
  imports: [
    CommonModule
  ],
  exports: [
    FsZoomPanComponent,
    FsZoomPanContentDirective
  ],
  declarations: [
    FsZoomPanComponent,
    FsZoomPanContentDirective
  ]
})
export class FsZoomPanModule {
  static forRoot(): ModuleWithProviders<FsZoomPanModule> {
    return {
      ngModule: FsZoomPanModule
    };
  }
}

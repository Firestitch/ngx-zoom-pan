import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FsZoomPanComponent } from './components/zoom-pan/zoom-pan.component';
import { FsZoomPanContentDirective } from './directives';
// import { FsComponentService } from './services';

@NgModule({
  imports: [
    CommonModule,
  ],
  exports: [
    FsZoomPanComponent,
    FsZoomPanContentDirective,
  ],
  entryComponents: [
  ],
  declarations: [
    FsZoomPanComponent,
    FsZoomPanContentDirective,
  ],
  providers: [
    // FsComponentService,
  ],
})
export class FsComponentModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: FsComponentModule,
      // providers: [FsComponentService]
    };
  }
}

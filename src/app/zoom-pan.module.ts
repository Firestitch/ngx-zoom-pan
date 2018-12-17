import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ZoomPanComponent } from './components/zoom-pan/zoom-pan.component';
// import { FsComponentService } from './services';

@NgModule({
  imports: [
    CommonModule,
  ],
  exports: [
    ZoomPanComponent,
  ],
  entryComponents: [
  ],
  declarations: [
    ZoomPanComponent,
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

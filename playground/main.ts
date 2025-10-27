import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { environment } from './environments/environment';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FsZoomPanModule } from '@firestitch/zoom-pan';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { FsExampleModule } from '@firestitch/example';
import { ToastrModule } from 'ngx-toastr';
import { FsMessageModule } from '@firestitch/message';
import { provideRouter, Routes } from '@angular/router';
import { ExamplesComponent } from './app/components';
import { FsDiagramModule } from '@firestitch/diagram';
import { AppComponent } from './app/app.component';

const routes: Routes = [
  { path: '', component: ExamplesComponent },
];



if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, FsZoomPanModule, FormsModule, FsExampleModule.forRoot(), ToastrModule.forRoot({ preventDuplicates: true }), FsMessageModule.forRoot(), FsDiagramModule),
        provideAnimations(),
        provideRouter(routes)
    ]
})
  .catch(err => console.error(err));


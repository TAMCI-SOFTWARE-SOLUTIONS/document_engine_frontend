import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/xml-to-pdf-converter/xml-to-pdf-converter.component').then(
        (m) => m.XmlToPdfConverterComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

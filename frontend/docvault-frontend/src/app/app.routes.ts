import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LoginComponent } from './login/login.component';
import { UploadComponent } from './upload/upload.component';
import { DocumentListComponent } from './document-list/document-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: 'documents',
    canActivate: [MsalGuard],
    component: UploadComponent   // 👈 no children
  },

  {
    path: 'documents/list',
    canActivate: [MsalGuard],
    component: DocumentListComponent
  },

  { path: '', redirectTo: '/documents', pathMatch: 'full' },
  { path: '**', redirectTo: '/documents' }
];

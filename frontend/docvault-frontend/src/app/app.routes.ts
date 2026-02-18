import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LoginComponent } from './login/login.component';
import { UploadComponent } from './upload/upload.component';
import { DocumentListComponent } from './document-list/document-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/documents', pathMatch: 'full' },
  {
    path: 'documents',
    canActivate: [MsalGuard],
    children: [
      { path: '', component: UploadComponent },
      { path: 'list', component: DocumentListComponent }
    ]
  }
];
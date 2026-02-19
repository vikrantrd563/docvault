import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LoginComponent } from './login/login.component';
import { UploadComponent } from './upload/upload.component';
import { DocumentListComponent } from './document-list/document-list.component';
import { DashboardComponent } from './dashboard/dashboard';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: 'documents',
    canActivate: [MsalGuard],
    component: UploadComponent   // no children
  },
  { path: 'dashboard', component: DashboardComponent, canActivate: [MsalGuard] },

  {
    path: 'documents/list',
    canActivate: [MsalGuard],
    component: DocumentListComponent
  },

  { path: '', redirectTo: '/documents', pathMatch: 'full' },
  { path: '**', redirectTo: '/documents' }
];

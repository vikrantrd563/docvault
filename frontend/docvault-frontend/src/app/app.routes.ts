import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LoginComponent } from './login/login.component';
import { UploadComponent } from './upload/upload.component';
import { DocumentListComponent } from './document-list/document-list.component';
import { DashboardComponent } from './dashboard/dashboard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: 'documents', component: DocumentListComponent, canActivate: [MsalGuard] },
  { path: 'starred',   component: DocumentListComponent, canActivate: [MsalGuard] },
  { path: 'recent',    component: DocumentListComponent, canActivate: [MsalGuard] },
  { path: 'trash',     component: DocumentListComponent, canActivate: [MsalGuard] },

  { path: 'upload',    component: UploadComponent,       canActivate: [MsalGuard] },
  { path: 'dashboard', component: DashboardComponent,    canActivate: [MsalGuard] },

  { path: '',   redirectTo: '/documents', pathMatch: 'full' },
  { path: '**', redirectTo: '/documents' },
];
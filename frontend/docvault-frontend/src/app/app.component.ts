import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { UploadComponent } from './upload/upload.component';
import { DocumentListComponent } from './document-list/document-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatToolbarModule,
    MatDividerModule,
    UploadComponent,
    DocumentListComponent
  ],
  template: `
    <mat-toolbar color="primary">
      <span>🔒 DocVault — Secure Document Management</span>
    </mat-toolbar>
    <app-upload></app-upload>
    <mat-divider></mat-divider>
    <app-document-list></app-document-list>
  `
})
export class AppComponent { }

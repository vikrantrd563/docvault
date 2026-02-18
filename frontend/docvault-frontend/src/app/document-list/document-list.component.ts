import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DocumentService, DocumentMetadata } from '../services/document.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div style="padding: 24px">
      <h2>My Documents</h2>

      <mat-form-field style='width:300px;margin-right:16px'>
        <input matInput placeholder='Search...' [(ngModel)]='searchQuery'
          (keyup.enter)='search()'>
      </mat-form-field>
      <button mat-raised-button color='primary' (click)='search()'>
        <mat-icon>search</mat-icon> Search
      </button>

      <button mat-stroked-button (click)="load()" style="margin-bottom:16px;margin-left:16px">
        <mat-icon>refresh</mat-icon> Refresh
      </button>

      <table mat-table [dataSource]="documents" style="width:100%">

        <ng-container matColumnDef="fileName">
          <th mat-header-cell *matHeaderCellDef>File Name</th>
          <td mat-cell *matCellDef="let d">{{ d.fileName }}</td>
        </ng-container>

        <ng-container matColumnDef="size">
          <th mat-header-cell *matHeaderCellDef>Size</th>
          <td mat-cell *matCellDef="let d">{{ fmt(d.sizeBytes) }}</td>
        </ng-container>

        <ng-container matColumnDef="uploadedAt">
          <th mat-header-cell *matHeaderCellDef>Uploaded</th>
          <td mat-cell *matCellDef="let d">{{ d.uploadedAt | date:'medium' }}</td>
        </ng-container>

        <ng-container matColumnDef="download">
          <th mat-header-cell *matHeaderCellDef>Download</th>
          <td mat-cell *matCellDef="let d">
            <a mat-icon-button [href]="d.downloadUrl" target="_blank" color="primary">
              <mat-icon>download</mat-icon>
            </a>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>

      <p *ngIf="documents.length===0"
         style="text-align:center;color:#999;margin-top:32px">
        No documents yet. Upload one above!
      </p>
    </div>
  `
})
export class DocumentListComponent implements OnInit {
  documents: DocumentMetadata[] = [];
  cols = ['fileName', 'size', 'uploadedAt', 'download'];
  searchQuery = '';

  constructor(private svc: DocumentService) {}

  ngOnInit() { this.load(); }

  load() {
    this.svc.list().subscribe({
      next: d => this.documents = d,
      error: e => console.error('Load failed', e)
    });
  }

  search() {
    if (this.searchQuery.trim()) {
      this.svc.search(this.searchQuery).subscribe({
        next: d => this.documents = d,
        error: e => console.error('Search failed', e)
      });
    } else {
      this.load();
    }
  }

  fmt(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }
}
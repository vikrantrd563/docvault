import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { DocumentService, DocumentMetadata } from '../services/document.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    FormsModule
  ],
  template: `
    <div style="padding: 24px">
      <h2>My Documents</h2>

      <!-- Search bar -->
      <mat-form-field style="width:300px; margin-right:16px">
        <input matInput placeholder="Search..." [(ngModel)]="searchQuery"
               (keyup.enter)="search()">
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="search()">
        <mat-icon>search</mat-icon> Search
      </button>
      <button mat-stroked-button (click)="load()" style="margin-left:16px; margin-bottom:16px">
        <mat-icon>refresh</mat-icon> Refresh
      </button>

      <!-- Documents table -->
      <table mat-table [dataSource]="documents" style="width:100%">

        <!-- File Name column — shows either the label or an inline edit input -->
        <ng-container matColumnDef="fileName">
          <th mat-header-cell *matHeaderCellDef>File Name</th>
          <td mat-cell *matCellDef="let d">

            <!-- VIEW mode -->
            <span *ngIf="editingId !== d.id">{{ d.fileName }}</span>

            <!-- EDIT mode — inline text field -->
            <mat-form-field
              *ngIf="editingId === d.id"
              style="width:220px; margin:0"
              appearance="outline">
              <input
                matInput
                [(ngModel)]="editingName"
                (keyup.enter)="confirmRename(d)"
                (keyup.escape)="cancelRename()"
                [id]="'rename-input-' + d.id"
                autofocus>
            </mat-form-field>

          </td>
        </ng-container>

        <!-- Size column -->
        <ng-container matColumnDef="size">
          <th mat-header-cell *matHeaderCellDef>Size</th>
          <td mat-cell *matCellDef="let d">{{ fmt(d.sizeBytes) }}</td>
        </ng-container>

        <!-- Uploaded column -->
        <ng-container matColumnDef="uploadedAt">
          <th mat-header-cell *matHeaderCellDef>Uploaded</th>
          <td mat-cell *matCellDef="let d">{{ d.uploadedAt | date:'medium' }}</td>
        </ng-container>

        <!-- Actions column — Download + Rename / Save + Cancel -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let d">

            <!-- Download (always visible) -->
            <a mat-icon-button [href]="d.downloadUrl" target="_blank" color="primary"
               matTooltip="Download">
              <mat-icon>download</mat-icon>
            </a>

            <!-- RENAME button (shown in view mode) -->
            <button
              *ngIf="editingId !== d.id"
              mat-icon-button
              color="accent"
              (click)="startRename(d)"
              matTooltip="Rename">
              <mat-icon>edit</mat-icon>
            </button>

            <!-- SAVE button (shown in edit mode) -->
            <button
              *ngIf="editingId === d.id"
              mat-icon-button
              color="primary"
              (click)="confirmRename(d)"
              [disabled]="renaming"
              matTooltip="Save rename">
              <mat-icon>check</mat-icon>
            </button>

            <!-- CANCEL button (shown in edit mode) -->
            <button
              *ngIf="editingId === d.id"
              mat-icon-button
              (click)="cancelRename()"
              matTooltip="Cancel">
              <mat-icon>close</mat-icon>
            </button>

          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>

      <p *ngIf="documents.length === 0"
         style="text-align:center; color:#999; margin-top:32px">
        No documents yet. Upload one above!
      </p>
    </div>
  `
})
export class DocumentListComponent implements OnInit, OnDestroy {
  documents: DocumentMetadata[] = [];
  // Added 'actions' column to replace the old 'download' column
  cols = ['fileName', 'size', 'uploadedAt', 'actions'];
  searchQuery = '';

  // ─── Rename state ─────────────────────────────────────────────────────────
  editingId: string | null = null;   // which row is being edited
  editingName = '';                   // current value in the input
  renaming = false;                   // true while HTTP request is in flight
  // ─────────────────────────────────────────────────────────────────────────

  private refreshInterval: any;

  constructor(
    private svc: DocumentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.load();
    this.refreshInterval = setInterval(() => {
      // Don't auto-refresh while the user is in the middle of renaming
      if ((!this.searchQuery || !this.searchQuery.trim()) && !this.editingId) {
        this.load();
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

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

  // ─── Rename methods ───────────────────────────────────────────────────────

  /** Enter edit mode for a row */
  startRename(doc: DocumentMetadata) {
    this.editingId = doc.id;
    this.editingName = doc.fileName;  // pre-fill with the current name
  }

  /** Cancel without saving */
  cancelRename() {
    this.editingId = null;
    this.editingName = '';
  }

  /** Send the rename request to the API */
  confirmRename(doc: DocumentMetadata) {
    const trimmed = this.editingName.trim();

    if (!trimmed) {
      this.snackBar.open('File name cannot be empty.', 'Close', { duration: 3000 });
      return;
    }

    // Nothing changed — just exit edit mode silently
    if (trimmed === doc.fileName) {
      this.cancelRename();
      return;
    }

    this.renaming = true;

    this.svc.rename(doc.id, trimmed).subscribe({
      next: updated => {
        // Update the row in-place so the table reflects the new name immediately
        const idx = this.documents.findIndex(d => d.id === updated.id);
        if (idx !== -1) {
          this.documents[idx] = { ...this.documents[idx], fileName: updated.fileName };
          // Trigger Angular change detection on the array
          this.documents = [...this.documents];
        }
        this.editingId = null;
        this.editingName = '';
        this.renaming = false;
        this.snackBar.open('File renamed successfully!', 'Close', { duration: 3000 });
      },
      error: err => {
        this.renaming = false;
        console.error('Rename failed', err);
        this.snackBar.open('Rename failed. Please try again.', 'Close', { duration: 4000 });
      }
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  fmt(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

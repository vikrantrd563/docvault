import { Component ,ChangeDetectionStrategy ,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DocumentService } from '../services/document.service';
 
@Component({
  selector: 'app-upload',
  standalone: true,
  changeDetection : ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatProgressBarModule,
            MatIconModule, MatSnackBarModule],
  template: `
    <div class="upload-container">
      <div class="drop-zone"
           [class.drag-over]="isDragging"
           (dragover)="onDragOver($event)"
           (dragleave)="isDragging = false"
           (drop)="onDrop($event)">
        <mat-icon class="upload-icon">cloud_upload</mat-icon>
        <h3>Drag and drop files here</h3>
        <p>or</p>
        <button mat-raised-button color="primary"
                (click)="fileInput.click()">
          Choose File
        </button>
        <input #fileInput type="file" hidden
               (change)="onFileSelected($event)">
      </div>
      <mat-progress-bar *ngIf="uploading"
                        mode="indeterminate"
                        style="margin-top:16px">
      </mat-progress-bar>
      <p *ngIf="uploading" class="uploading-text">Uploading...</p>
    </div>
  `,
  styles: [`
    .upload-container { padding: 24px; }
    .drop-zone {
      border: 2px dashed #0078D4;
      border-radius: 12px;
      padding: 48px;
      text-align: center;
      cursor: pointer;
      transition: background 0.2s;
    }
    .drag-over { background: #EBF3FB; }
    .upload-icon { font-size:48px; width:48px; height:48px; color:#0078D4; }
    .uploading-text { text-align:center; color:#666; margin-top:8px; }
  `]
})
export class UploadComponent {
  uploading = false;
  isDragging = false;
 
  constructor(
    private docService: DocumentService,
    private snackBar: MatSnackBar,
    private cdr : ChangeDetectorRef) {}
 
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }
 
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }
 
  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
  }
 
  uploadFile(file: File) {
    this.uploading = true;
    this.cdr.markForCheck();
    const formData = new FormData();
    formData.append('file', file);
    this.docService.upload(formData).subscribe({
      next: () => {
        this.uploading = false;
        this.cdr.markForCheck();
        this.snackBar.open('Uploaded successfully!', 'Close',
          { duration: 3000 });
      },
      error: (err) => {
        this.uploading = false;
        this.cdr.markForCheck();
        this.snackBar.open('Upload failed. Is the API running?',
          'Close', { duration: 4000 });
        console.error(err);
      }
    });
  }
}

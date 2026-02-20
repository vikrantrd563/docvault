import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../services/document.service';

const EXT_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  pdf: { icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
  doc: { icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
  docx: { icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
  txt: { icon: 'text_snippet', color: '#5F6368', bg: '#F1F3F4' },
  xls: { icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
  xlsx: { icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
  csv: { icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
  ppt: { icon: 'slideshow', color: '#D56E0C', bg: '#FEF7E0' },
  pptx: { icon: 'slideshow', color: '#D56E0C', bg: '#FEF7E0' },
  png: { icon: 'image', color: '#188038', bg: '#E6F4EA' },
  jpg: { icon: 'image', color: '#188038', bg: '#E6F4EA' },
  jpeg: { icon: 'image', color: '#188038', bg: '#E6F4EA' },
  gif: { icon: 'gif_box', color: '#188038', bg: '#E6F4EA' },
  webp: { icon: 'image', color: '#188038', bg: '#E6F4EA' },
  mp4: { icon: 'video_file', color: '#9334E6', bg: '#F3E8FD' },
  mp3: { icon: 'audio_file', color: '#E8710A', bg: '#FEF3E2' },
  zip: { icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
  rar: { icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
};

interface QItem {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error: string;
  preview: string | null;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatSnackBarModule, RouterModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Upload Files ☁️</h1>
          <p class="page-sub">Drag & drop or browse — supports any file type</p>
        </div>
        <a routerLink="/documents" class="view-files-btn">
          <mat-icon>folder_open</mat-icon>
          My Files
        </a>
      </div>

      <!-- Drop Zone -->
      <div class="dropzone" [class.dragging]="dragging"
        (dragenter)="dragging = true"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fi.click()">
        <input #fi type="file" multiple hidden (change)="onPick($event)" />

        <div class="dz-content">
          <div class="dz-ring" [class.active]="dragging">
            <mat-icon class="dz-icon">{{ dragging ? 'file_download' : 'cloud_upload' }}</mat-icon>
          </div>
          <p class="dz-title">{{ dragging ? 'Drop your files here!' : 'Drag files here to upload' }}</p>
          <p class="dz-or">— or —</p>
          <button class="browse-btn" (click)="fi.click(); $event.stopPropagation()">
            <mat-icon>folder_open</mat-icon>
            Browse files
          </button>
          <p class="dz-hint">PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP and more · up to 100 MB each</p>
        </div>
      </div>

      <!-- Queue -->
      <div class="queue-wrap" *ngIf="queue.length > 0">

        <!-- Queue Header -->
        <div class="queue-header">
          <div class="queue-stats">
            <span class="q-count">{{ queue.length }} file{{ queue.length !== 1 ? 's' : '' }}</span>
            <span class="q-sep">·</span>
            <span class="stat-done" *ngIf="doneCount">✅ {{ doneCount }} done</span>
            <span class="stat-err" *ngIf="errCount">❌ {{ errCount }} failed</span>
            <span class="stat-pend" *ngIf="pendCount">🕐 {{ pendCount }} pending</span>
          </div>
          <div class="queue-actions">
            <button class="btn-clear" *ngIf="doneCount || errCount" (click)="clearFinished()">
              <mat-icon>clear_all</mat-icon> Clear done
            </button>
            <button class="btn-upload" (click)="uploadAll()" [disabled]="!pendCount || uploading">
              <mat-icon>cloud_upload</mat-icon>
              {{ uploading ? 'Uploading…' : 'Upload ' + pendCount + ' file' + (pendCount !== 1 ? 's' : '') }}
            </button>
          </div>
        </div>

        <!-- Overall Progress -->
        <div class="overall-progress" *ngIf="uploading">
          <div class="op-bar">
            <div class="op-fill" [style.width.%]="overallPct"></div>
          </div>
          <span class="op-pct">{{ overallPct | number:'1.0-0' }}%</span>
        </div>

        <!-- File List -->
        <div class="file-list">
          <div class="file-item" *ngFor="let q of queue; let i = index; trackBy: trackIdx">

            <!-- Thumb -->
            <div class="file-thumb">
              <img *ngIf="q.preview" [src]="q.preview" class="thumb-img"/>
              <div *ngIf="!q.preview" class="thumb-icon" [style.background]="extInfo(q.file).bg">
                <mat-icon [style.color]="extInfo(q.file).color">{{ extInfo(q.file).icon }}</mat-icon>
              </div>
              <div class="thumb-done" *ngIf="q.status === 'done'">
                <mat-icon>check</mat-icon>
              </div>
            </div>

            <!-- Info -->
            <div class="file-info">
              <p class="file-name" [title]="q.file.name">{{ q.file.name }}</p>
              <p class="file-meta">{{ fmtSize(q.file.size) }} · {{ q.file.name.split('.').pop()?.toUpperCase() }}</p>
              <div class="file-progress" *ngIf="q.status === 'uploading'">
                <div class="fp-fill" [style.width.%]="q.progress" [class.fast]="q.progress > 80"></div>
              </div>
              <p class="file-error" *ngIf="q.status === 'error'">{{ q.error }}</p>
            </div>

            <!-- Badge -->
            <span class="status-badge" [class]="q.status">
              <mat-icon *ngIf="q.status === 'pending'">schedule</mat-icon>
              <mat-icon *ngIf="q.status === 'uploading'" class="spin">sync</mat-icon>
              <mat-icon *ngIf="q.status === 'done'">check_circle</mat-icon>
              <mat-icon *ngIf="q.status === 'error'">error_outline</mat-icon>
              {{ q.status === 'uploading' ? q.progress + '%' : (q.status | titlecase) }}
            </span>

            <!-- Remove -->
            <button class="file-remove" [disabled]="q.status === 'uploading'" (click)="remove(i)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Success Footer -->
        <div class="success-footer" *ngIf="doneCount > 0 && !uploading">
          <span>🎉 {{ doneCount }} file{{ doneCount !== 1 ? 's' : '' }} uploaded successfully!</span>
          <a routerLink="/documents" class="view-link">
            <mat-icon>folder_open</mat-icon> View in My Files
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

    :host {
      --teal: #2EC4B6;
      --teal-light: #E8FAF9;
      --coral: #FF6B6B;
      --coral-light: #FFF0F0;
      --text: #1A1A2E;
      --sub: #6B7280;
      --border: #E5E7EB;
      --white: #FFFFFF;
      --bg: #F8FAFB;
      display: block;
      font-family: 'Nunito', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      padding: 28px;
      color: var(--text);
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    .page-sub { font-size: 14px; color: var(--sub); }
    .view-files-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 10px 20px;
      text-decoration: none;
      color: var(--text);
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      font-weight: 700;
      background: var(--white);
      transition: all 0.2s;
    }
    .view-files-btn mat-icon { font-size: 18px; }
    .view-files-btn:hover {
      border-color: var(--teal);
      color: var(--teal);
    }

    /* Dropzone */
    .dropzone {
      background: var(--white);
      border: 2.5px dashed #D1D5DB;
      border-radius: 24px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .dropzone:hover { border-color: var(--teal); }
    .dropzone.dragging {
      border-color: var(--teal);
      border-style: solid;
      background: var(--teal-light);
    }
    .dz-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 64px 24px;
    }
    .dz-ring {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--teal-light);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
      box-shadow: 0 0 0 10px rgba(46,196,182,0.08);
      transition: all 0.2s;
    }
    .dz-ring.active {
      background: var(--teal);
      box-shadow: 0 0 0 16px rgba(46,196,182,0.15);
      animation: pulse 1s ease infinite alternate;
    }
    @keyframes pulse {
      from { box-shadow: 0 0 0 10px rgba(46,196,182,0.1); }
      to { box-shadow: 0 0 0 20px rgba(46,196,182,0.2); }
    }
    .dz-icon {
      font-size: 42px;
      color: var(--teal);
    }
    .dz-ring.active .dz-icon { color: white; }
    .dz-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .dz-or { font-size: 13px; color: var(--sub); margin-bottom: 14px; }
    .browse-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--teal);
      color: white;
      border: none;
      padding: 11px 24px;
      border-radius: 50px;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 14px;
      box-shadow: 0 2px 10px rgba(46,196,182,0.3);
    }
    .browse-btn:hover { background: #25a99d; transform: translateY(-1px); }
    .browse-btn mat-icon { font-size: 18px; }
    .dz-hint { font-size: 12px; color: #9CA3AF; }

    /* Queue */
    .queue-wrap {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
    }
    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .queue-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .q-count { font-weight: 800; }
    .q-sep { color: var(--sub); }
    .stat-done { color: #188038; font-weight: 600; }
    .stat-err { color: #D93025; font-weight: 600; }
    .stat-pend { color: var(--sub); font-weight: 600; }
    .queue-actions { display: flex; gap: 8px; }

    .btn-clear {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 14px;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: none;
      cursor: pointer;
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--sub);
      transition: all 0.15s;
    }
    .btn-clear:hover { background: var(--bg); color: var(--text); }
    .btn-clear mat-icon { font-size: 16px; }

    .btn-upload {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border-radius: 50px;
      border: none;
      background: var(--teal);
      color: white;
      cursor: pointer;
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(46,196,182,0.3);
    }
    .btn-upload mat-icon { font-size: 16px; }
    .btn-upload:hover:not([disabled]) { background: #25a99d; }
    .btn-upload[disabled] { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    /* Overall Progress */
    .overall-progress {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      border-bottom: 1px solid var(--border);
    }
    .op-bar {
      flex: 1;
      height: 6px;
      background: #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }
    .op-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--teal), #4ECDC4);
      border-radius: 6px;
      transition: width 0.3s ease;
    }
    .op-pct {
      font-size: 12px;
      font-weight: 800;
      color: var(--teal);
      white-space: nowrap;
    }

    /* File List */
    .file-list { max-height: 460px; overflow-y: auto; }
    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      animation: slideIn 0.2s ease;
    }
    .file-item:last-child { border-bottom: none; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .file-thumb {
      position: relative;
      width: 46px;
      height: 46px;
      flex-shrink: 0;
    }
    .thumb-img {
      width: 46px; height: 46px;
      border-radius: 10px; object-fit: cover;
      border: 1px solid var(--border);
    }
    .thumb-icon {
      width: 46px; height: 46px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .thumb-icon mat-icon { font-size: 26px; }
    .thumb-done {
      position: absolute; inset: 0;
      border-radius: 10px;
      background: rgba(24,128,56,0.85);
      display: flex; align-items: center; justify-content: center;
    }
    .thumb-done mat-icon { font-size: 22px; color: white; }

    .file-info { flex: 1; min-width: 0; }
    .file-name {
      font-size: 14px; font-weight: 700;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-meta { font-size: 12px; color: var(--sub); margin-top: 2px; }
    .file-progress {
      height: 4px; background: #E5E7EB;
      border-radius: 4px; margin-top: 6px; overflow: hidden;
    }
    .fp-fill {
      height: 100%;
      background: var(--teal);
      border-radius: 4px;
      transition: width 0.25s ease;
    }
    .fp-fill.fast { background: #188038; }
    .file-error { font-size: 12px; color: #D93025; margin-top: 4px; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .status-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .status-badge.pending { background: #F3F4F6; color: var(--sub); }
    .status-badge.uploading { background: var(--teal-light); color: var(--teal); }
    .status-badge.done { background: #DCFCE7; color: #188038; }
    .status-badge.error { background: #FDE8E6; color: #D93025; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .file-remove {
      background: none; border: none; cursor: pointer;
      border-radius: 50%; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      color: var(--sub); flex-shrink: 0; transition: all 0.15s;
    }
    .file-remove mat-icon { font-size: 16px; }
    .file-remove:hover:not([disabled]) { background: var(--coral-light); color: var(--coral); }
    .file-remove[disabled] { opacity: 0.3; cursor: not-allowed; }

    /* Success Footer */
    .success-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      background: #F0FDF4;
      border-top: 1px solid #BBF7D0;
      font-size: 14px;
      color: #188038;
      font-weight: 700;
      flex-wrap: wrap;
    }
    .view-link {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--teal);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }
    .view-link mat-icon { font-size: 16px; }
    .view-link:hover { text-decoration: underline; }
  `]
})
export class UploadComponent {
  queue: QItem[] = [];
  dragging = false;
  uploading = false;

  get pendCount() { return this.queue.filter(q => q.status === 'pending').length; }
  get doneCount() { return this.queue.filter(q => q.status === 'done').length; }
  get errCount() { return this.queue.filter(q => q.status === 'error').length; }
  get overallPct() {
    const items = this.queue.filter(q => q.status !== 'pending');
    if (!items.length) return 0;
    return items.reduce((s, q) => s + (q.status === 'done' ? 100 : q.progress), 0) / this.queue.length;
  }

  constructor(private svc: DocumentService, private snack: MatSnackBar, private cdr: ChangeDetectorRef) {}

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging = true; }
  onDragLeave(e: DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) this.dragging = false;
  }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging = false;
    this.enqueue(Array.from(e.dataTransfer?.files ?? []));
  }
  onPick(e: Event) {
    this.enqueue(Array.from((e.target as HTMLInputElement).files ?? []));
    (e.target as HTMLInputElement).value = '';
  }

  enqueue(files: File[]) {
    for (const f of files) {
      if (this.queue.some(q => q.file.name === f.name && q.file.size === f.size)) continue;
      const item: QItem = { file: f, status: 'pending', progress: 0, error: '', preview: null };
      if (['png','jpg','jpeg','gif','webp'].includes((f.name.split('.').pop() ?? '').toLowerCase())) {
        const reader = new FileReader();
        reader.onload = ev => { item.preview = ev.target?.result as string; this.cdr.markForCheck(); };
        reader.readAsDataURL(f);
      }
      this.queue.push(item);
    }
    this.cdr.markForCheck();
  }

  remove(i: number) { this.queue.splice(i, 1); this.cdr.markForCheck(); }
  clearFinished() {
    this.queue = this.queue.filter(q => q.status === 'pending' || q.status === 'uploading');
    this.cdr.markForCheck();
  }

  uploadAll() {
    const pending = this.queue.filter(q => q.status === 'pending');
    if (!pending.length) return;
    this.uploading = true;
    let done = 0;
    for (const item of pending) {
      item.status = 'uploading'; item.progress = 0; this.cdr.markForCheck();
      const tick = setInterval(() => {
        if (item.status === 'uploading' && item.progress < 85) {
          item.progress += Math.round(8 + Math.random() * 12);
          if (item.progress > 85) item.progress = 85;
          this.cdr.markForCheck();
        }
      }, 120);
      const fd = new FormData();
      fd.append('file', item.file);
      this.svc.upload(fd).subscribe({
        next: () => {
          clearInterval(tick); item.progress = 100; item.status = 'done'; done++;
          if (done === pending.length) {
            this.uploading = false;
            this.snack.open(`🎉 ${done} file${done > 1 ? 's' : ''} uploaded!`, 'View', { duration: 4000 });
          }
          this.cdr.markForCheck();
        },
        error: err => {
          clearInterval(tick); item.status = 'error';
          item.error = err?.error?.message || 'Upload failed — check that the API is running';
          done++;
          if (done === pending.length) this.uploading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  extInfo(f: File) {
    const e = (f.name.split('.').pop() ?? '').toLowerCase();
    return EXT_MAP[e] ?? { icon: 'insert_drive_file', color: '#5F6368', bg: '#F1F3F4' };
  }
  fmtSize(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }
  trackIdx(i: number) { return i; }
}
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
      <div class="hdr">
        <div>
          <h1 class="htitle">Upload Files</h1>
          <p class="hsub">Drag &amp; drop or browse — supports any file type, multiple at once</p>
        </div>
        <a routerLink="/documents" class="go-files">
          <mat-icon>folder_open</mat-icon> View My Files
        </a>
      </div>

      <!-- Drop zone -->
      <div
        class="dropzone"
        [class.drag]="dragging"
        (dragenter)="dragging = true"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fi.click()"
      >
        <input #fi type="file" multiple hidden (change)="onPick($event)" />

        <div class="dz-inner" [class.drag]="dragging">
          <div class="dz-icon-ring">
            <mat-icon class="dz-icon">cloud_upload</mat-icon>
          </div>
          <p class="dz-title">{{ dragging ? 'Drop to upload' : 'Drag files here' }}</p>
          <p class="dz-or">— or —</p>
          <button class="browse-btn" (click)="fi.click(); $event.stopPropagation()">
            <mat-icon>folder_open</mat-icon> Browse files
          </button>
          <p class="dz-hint">PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP and more · up to 100 MB each</p>
        </div>
      </div>

      <!-- Queue -->
      <div class="queue" *ngIf="queue.length > 0">
        <div class="q-header">
          <div class="q-stats">
            <span class="q-total">{{ queue.length }} file{{ queue.length !== 1 ? 's' : '' }}</span>
            <span class="q-sep">·</span>
            <span class="q-done" *ngIf="doneCount">{{ doneCount }} uploaded</span>
            <span class="q-err" *ngIf="errCount">{{ errCount }} failed</span>
            <span class="q-pend" *ngIf="pendCount">{{ pendCount }} pending</span>
          </div>
          <div class="q-actions">
            <button class="qa-clear" *ngIf="doneCount || errCount" (click)="clearFinished()">
              <mat-icon>clear_all</mat-icon> Clear finished
            </button>
            <button class="qa-upload" (click)="uploadAll()" [disabled]="!pendCount || uploading">
              <mat-icon>cloud_upload</mat-icon>
              {{
                uploading
                  ? 'Uploading…'
                  : 'Upload ' + pendCount + ' file' + (pendCount !== 1 ? 's' : '')
              }}
            </button>
          </div>
        </div>

        <!-- Overall progress bar when uploading -->
        <div class="overall-bar" *ngIf="uploading">
          <div class="ob-fill" [style.width.%]="overallPct"></div>
          <span class="ob-txt">{{ overallPct | number: '1.0-0' }}%</span>
        </div>

        <div class="q-list">
          <div class="q-item" *ngFor="let q of queue; let i = index; trackBy: trackIdx">
            <!-- Thumbnail / icon -->
            <div class="qi-thumb">
              <img *ngIf="q.preview" [src]="q.preview" class="qi-img" />
              <div *ngIf="!q.preview" class="qi-icon" [style.background]="extInfo(q.file).bg">
                <mat-icon [style.color]="extInfo(q.file).color">{{
                  extInfo(q.file).icon
                }}</mat-icon>
              </div>
              <!-- Done overlay -->
              <div class="qi-done-ring" *ngIf="q.status === 'done'">
                <mat-icon>check</mat-icon>
              </div>
            </div>

            <!-- Info -->
            <div class="qi-info">
              <p class="qi-name" [title]="q.file.name">{{ q.file.name }}</p>
              <p class="qi-meta">
                {{ fmtSize(q.file.size) }} · {{ q.file.name.split('.').pop()?.toUpperCase() }}
              </p>
              <!-- progress bar -->
              <div class="qi-bar" *ngIf="q.status === 'uploading'">
                <div
                  class="qi-fill"
                  [style.width.%]="q.progress"
                  [class.fast]="q.progress > 80"
                ></div>
              </div>
              <p class="qi-err-txt" *ngIf="q.status === 'error'">{{ q.error }}</p>
            </div>

            <!-- Badge -->
            <span class="qbadge" [ngClass]="q.status">
              <mat-icon *ngIf="q.status === 'pending'">schedule</mat-icon>
              <mat-icon *ngIf="q.status === 'uploading'" class="spin">sync</mat-icon>
              <mat-icon *ngIf="q.status === 'done'">check_circle</mat-icon>
              <mat-icon *ngIf="q.status === 'error'">error_outline</mat-icon>
              {{ q.status === 'uploading' ? q.progress + '%' : (q.status | titlecase) }}
            </span>

            <!-- Remove -->
            <button class="qi-rm" [disabled]="q.status === 'uploading'" (click)="remove(i)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Post-upload CTA -->
        <div class="q-footer" *ngIf="doneCount > 0 && !uploading">
          <mat-icon style="color:#188038">check_circle</mat-icon>
          <span>{{ doneCount }} file{{ doneCount !== 1 ? 's' : '' }} uploaded successfully</span>
          <a routerLink="/documents" class="q-view-link">
            <mat-icon>folder_open</mat-icon> View in My Files
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

      :host {
        --blue: #0061fe;
        --blue-soft: #ebf3ff;
        --text: #1c1c1e;
        --sub: #636366;
        --border: #e5e5ea;
        --white: #ffffff;
        --hover: #f5f5f7;
        display: block;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 14px;
        color: var(--text);
        background: #f2f2f7;
        min-height: 100vh;
        padding: 24px;
      }

      /* HEADER */
      .hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 22px;
        gap: 12px;
      }
      .htitle {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .hsub {
        font-size: 13px;
        color: var(--sub);
      }
      .go-files {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--border);
        border-radius: 28px;
        padding: 8px 18px;
        text-decoration: none;
        color: var(--text);
        font-size: 13px;
        font-weight: 600;
        background: var(--white);
        transition: all 0.15s;
        white-space: nowrap;
      }
      .go-files mat-icon {
        font-size: 18px;
      }
      .go-files:hover {
        border-color: var(--blue);
        color: var(--blue);
      }

      /* DROP ZONE */
      .dropzone {
        background: var(--white);
        border: 2px dashed #c7c7cc;
        border-radius: 20px;
        padding: 0;
        overflow: hidden;
        cursor: pointer;
        transition:
          border-color 0.2s,
          background 0.2s;
        margin-bottom: 20px;
      }
      .dropzone:hover {
        border-color: var(--blue);
      }
      .dropzone.drag {
        border-color: var(--blue);
        background: var(--blue-soft);
        border-style: solid;
      }

      .dz-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 60px 24px;
        transition: transform 0.2s;
      }
      .dz-inner.drag {
        transform: scale(1.01);
      }

      .dz-icon-ring {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: var(--blue-soft);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        box-shadow: 0 0 0 8px rgba(0, 97, 254, 0.06);
      }
      .dz-icon {
        font-size: 40px;
        color: var(--blue);
      }
      .dropzone.drag .dz-icon-ring {
        animation: pulse 1s ease infinite alternate;
      }
      @keyframes pulse {
        from {
          box-shadow: 0 0 0 8px rgba(0, 97, 254, 0.06);
        }
        to {
          box-shadow: 0 0 0 16px rgba(0, 97, 254, 0.12);
        }
      }

      .dz-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .dz-or {
        font-size: 13px;
        color: var(--sub);
        margin-bottom: 12px;
      }
      .browse-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--blue);
        color: #fff;
        border: none;
        padding: 10px 22px;
        border-radius: 28px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        margin-bottom: 14px;
      }
      .browse-btn:hover {
        background: #004ed4;
      }
      .browse-btn mat-icon {
        font-size: 18px;
      }
      .dz-hint {
        font-size: 12px;
        color: #9ca3af;
      }

      /* QUEUE */
      .queue {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }
      .q-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
      }
      .q-stats {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
      }
      .q-sep {
        color: var(--sub);
      }
      .q-done {
        color: #188038;
      }
      .q-err {
        color: #d93025;
      }
      .q-pend {
        color: var(--sub);
      }
      .q-actions {
        display: flex;
        gap: 8px;
      }

      .qa-clear {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        color: var(--sub);
        transition: all 0.12s;
      }
      .qa-clear:hover {
        background: var(--hover);
        color: var(--text);
      }
      .qa-clear mat-icon {
        font-size: 16px;
      }

      .qa-upload {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 28px;
        border: none;
        background: var(--blue);
        color: #fff;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        transition: background 0.15s;
      }
      .qa-upload mat-icon {
        font-size: 16px;
      }
      .qa-upload:hover:not([disabled]) {
        background: #004ed4;
      }
      .qa-upload[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Overall progress */
      .overall-bar {
        height: 3px;
        background: #e5e5ea;
        position: relative;
      }
      .ob-fill {
        height: 100%;
        background: var(--blue);
        transition: width 0.3s ease;
        border-radius: 0 2px 2px 0;
      }
      .ob-txt {
        position: absolute;
        right: 12px;
        top: 4px;
        font-size: 11px;
        font-weight: 700;
        color: var(--blue);
      }

      /* Queue list */
      .q-list {
        max-height: 440px;
        overflow-y: auto;
      }
      .q-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
        border-bottom: 1px solid var(--border);
        animation: slideIn 0.2s ease;
      }
      .q-item:last-child {
        border-bottom: none;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .qi-thumb {
        position: relative;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
      }
      .qi-img {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid var(--border);
      }
      .qi-icon {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qi-icon mat-icon {
        font-size: 24px;
      }
      .qi-done-ring {
        position: absolute;
        inset: 0;
        border-radius: 8px;
        background: rgba(24, 128, 56, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qi-done-ring mat-icon {
        font-size: 22px;
        color: #fff;
      }

      .qi-info {
        flex: 1;
        min-width: 0;
      }
      .qi-name {
        font-size: 14px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .qi-meta {
        font-size: 12px;
        color: var(--sub);
        margin-top: 2px;
      }
      .qi-bar {
        height: 3px;
        background: #e5e5ea;
        border-radius: 4px;
        margin-top: 6px;
        overflow: hidden;
      }
      .qi-fill {
        height: 100%;
        background: var(--blue);
        border-radius: 4px;
        transition: width 0.25s ease;
      }
      .qi-fill.fast {
        background: #188038;
      }
      .qi-err-txt {
        font-size: 12px;
        color: #d93025;
        margin-top: 4px;
      }

      .qbadge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 20px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .qbadge mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .qbadge.pending {
        background: #f1f3f4;
        color: var(--sub);
      }
      .qbadge.uploading {
        background: var(--blue-soft);
        color: var(--blue);
      }
      .qbadge.done {
        background: #e6f4ea;
        color: #188038;
      }
      .qbadge.error {
        background: #fde8e6;
        color: #d93025;
      }
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .qi-rm {
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sub);
        flex-shrink: 0;
        transition: all 0.12s;
      }
      .qi-rm mat-icon {
        font-size: 16px;
      }
      .qi-rm:hover:not([disabled]) {
        background: #fde8e6;
        color: #d93025;
      }
      .qi-rm[disabled] {
        opacity: 0.3;
        cursor: not-allowed;
      }

      /* Footer */
      .q-footer {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        background: #f0faf0;
        border-top: 1px solid #c8e6c9;
        font-size: 13px;
        color: #188038;
        font-weight: 500;
      }
      .q-footer mat-icon {
        font-size: 18px;
      }
      .q-view-link {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--blue);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
      }
      .q-view-link mat-icon {
        font-size: 15px;
      }
      .q-view-link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class UploadComponent {
  queue: QItem[] = [];
  dragging = false;
  uploading = false;

  get pendCount() {
    return this.queue.filter((q) => q.status === 'pending').length;
  }
  get doneCount() {
    return this.queue.filter((q) => q.status === 'done').length;
  }
  get errCount() {
    return this.queue.filter((q) => q.status === 'error').length;
  }
  get overallPct() {
    const items = this.queue.filter((q) => q.status !== 'pending');
    if (!items.length) return 0;
    return (
      items.reduce((s, q) => s + (q.status === 'done' ? 100 : q.progress), 0) / this.queue.length
    );
  }

  constructor(
    private svc: DocumentService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }
  onDragLeave(e: DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) this.dragging = false;
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    this.enqueue(Array.from(e.dataTransfer?.files ?? []));
  }
  onPick(e: Event) {
    this.enqueue(Array.from((e.target as HTMLInputElement).files ?? []));
    (e.target as HTMLInputElement).value = '';
  }

  enqueue(files: File[]) {
    for (const f of files) {
      if (this.queue.some((q) => q.file.name === f.name && q.file.size === f.size)) continue;
      const item: QItem = { file: f, status: 'pending', progress: 0, error: '', preview: null };
      // Generate image preview
      if (
        ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(
          (f.name.split('.').pop() ?? '').toLowerCase(),
        )
      ) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          item.preview = ev.target?.result as string;
          this.cdr.markForCheck();
        };
        reader.readAsDataURL(f);
      }
      this.queue.push(item);
    }
    this.cdr.markForCheck();
  }

  remove(i: number) {
    this.queue.splice(i, 1);
    this.cdr.markForCheck();
  }
  clearFinished() {
    this.queue = this.queue.filter((q) => q.status === 'pending' || q.status === 'uploading');
    this.cdr.markForCheck();
  }

  uploadAll() {
    const pending = this.queue.filter((q) => q.status === 'pending');
    if (!pending.length) return;
    this.uploading = true;
    let done = 0;

    for (const item of pending) {
      item.status = 'uploading';
      item.progress = 0;
      this.cdr.markForCheck();

      // Fake progress ticks
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
          clearInterval(tick);
          item.progress = 100;
          item.status = 'done';
          done++;
          if (done === pending.length) {
            this.uploading = false;
            this.snack.open(`${done} file${done > 1 ? 's' : ''} uploaded!`, 'View', {
              duration: 4000,
            });
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          clearInterval(tick);
          item.status = 'error';
          item.error = err?.error?.message || 'Upload failed — check that the API is running';
          done++;
          if (done === pending.length) this.uploading = false;
          this.cdr.markForCheck();
        },
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
  trackIdx(i: number) {
    return i;
  }
}

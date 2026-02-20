import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { DocumentService, DocumentMetadata } from '../services/document.service';

interface TypeStat {
  label: string;
  count: number;
  pct: number;
  icon: string;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="hdr">
        <div>
          <h1 class="ht">Dashboard</h1>
          <p class="hs">Real-time overview of your DocVault storage</p>
        </div>
        <a routerLink="/upload" class="upload-cta">
          <mat-icon>cloud_upload</mat-icon> Upload Files
        </a>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Fetching your data…</p>
      </div>

      <!-- Content -->
      <ng-container *ngIf="!loading">
        <!-- Stat cards -->
        <div class="stat-grid">
          <div class="stat-card" *ngFor="let s of stats">
            <div class="sc-left">
              <div class="sc-icon" [style.background]="s.bg">
                <mat-icon [style.color]="s.color">{{ s.icon }}</mat-icon>
              </div>
            </div>
            <div class="sc-right">
              <p class="sc-val">{{ s.value }}</p>
              <p class="sc-lbl">{{ s.label }}</p>
            </div>
          </div>
        </div>

        <!-- Main content row -->
        <div class="content-row">
          <!-- File type breakdown -->
          <div class="card">
            <h2 class="c-title">File Types</h2>
            <div class="type-list" *ngIf="typeStats.length > 0; else noFiles">
              <div class="type-row" *ngFor="let t of typeStats">
                <div class="tr-icon" [style.background]="t.bg">
                  <mat-icon [style.color]="t.color">{{ t.icon }}</mat-icon>
                </div>
                <div class="tr-info">
                  <div class="tr-labels">
                    <span class="tr-name">{{ t.label }}</span>
                    <span class="tr-count">{{ t.count }} file{{ t.count !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="tr-bar-bg">
                    <div
                      class="tr-bar-fill"
                      [style.width.%]="t.pct"
                      [style.background]="t.color"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noFiles>
              <p class="no-data">No files uploaded yet</p>
            </ng-template>
          </div>

          <!-- Recent uploads -->
          <div class="card">
            <div class="c-head">
              <h2 class="c-title">Recent Uploads</h2>
              <a routerLink="/documents" class="c-see-all">See all</a>
            </div>
            <div class="recent-list" *ngIf="recent.length > 0; else noRecent">
              <div class="rec-row" *ngFor="let d of recent">
                <div class="rr-icon" [style.background]="getInfo(d).bg">
                  <mat-icon [style.color]="getInfo(d).color">{{ getInfo(d).icon }}</mat-icon>
                </div>
                <div class="rr-info">
                  <p class="rr-name" [title]="d.fileName">{{ d.fileName }}</p>
                  <p class="rr-meta">
                    {{ fmt(d.sizeBytes) }} · {{ d.uploadedAt | date: 'MMM d, y' }}
                  </p>
                </div>
                <a class="rr-dl" [href]="d.downloadUrl" target="_blank" matTooltip="Download">
                  <mat-icon>download</mat-icon>
                </a>
              </div>
            </div>
            <ng-template #noRecent>
              <p class="no-data">No recent uploads</p>
            </ng-template>
          </div>
        </div>
      </ng-container>
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
        color: var(--text);
        background: #f2f2f7;
        min-height: 100vh;
        padding: 24px;
      }

      .hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        gap: 12px;
      }
      .ht {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .hs {
        font-size: 13px;
        color: var(--sub);
      }
      .upload-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--blue);
        color: #fff;
        text-decoration: none;
        padding: 10px 22px;
        border-radius: 28px;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.15s;
      }
      .upload-cta:hover {
        background: #004ed4;
      }
      .upload-cta mat-icon {
        font-size: 18px;
      }

      /* Loading */
      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px;
        color: var(--sub);
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--blue);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 14px;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Stat cards */
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .stat-card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .sc-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .sc-icon mat-icon {
        font-size: 26px;
      }
      .sc-val {
        font-size: 26px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 4px;
      }
      .sc-lbl {
        font-size: 13px;
        color: var(--sub);
      }

      /* Content row */
      .content-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      @media (max-width: 800px) {
        .content-row {
          grid-template-columns: 1fr;
        }
      }

      /* Card */
      .card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px;
      }
      .c-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .c-title {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .c-see-all {
        font-size: 13px;
        color: var(--blue);
        text-decoration: none;
        font-weight: 500;
      }
      .c-see-all:hover {
        text-decoration: underline;
      }
      .no-data {
        font-size: 14px;
        color: var(--sub);
        padding: 20px 0;
        text-align: center;
      }

      /* Type breakdown */
      .type-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .type-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .tr-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tr-icon mat-icon {
        font-size: 20px;
      }
      .tr-info {
        flex: 1;
      }
      .tr-labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .tr-name {
        font-size: 13px;
        font-weight: 500;
      }
      .tr-count {
        font-size: 12px;
        color: var(--sub);
      }
      .tr-bar-bg {
        height: 5px;
        background: #f1f3f4;
        border-radius: 5px;
        overflow: hidden;
      }
      .tr-bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.6s ease;
      }

      /* Recent */
      .recent-list {
        display: flex;
        flex-direction: column;
      }
      .rec-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }
      .rec-row:last-child {
        border-bottom: none;
      }
      .rr-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rr-icon mat-icon {
        font-size: 20px;
      }
      .rr-info {
        flex: 1;
        min-width: 0;
      }
      .rr-name {
        font-size: 14px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rr-meta {
        font-size: 12px;
        color: var(--sub);
      }
      .rr-dl {
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 6px;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sub);
        text-decoration: none;
        transition: all 0.12s;
        flex-shrink: 0;
      }
      .rr-dl mat-icon {
        font-size: 18px;
      }
      .rr-dl:hover {
        background: var(--hover);
        color: var(--text);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  loading = true;
  stats: { label: string; value: string; icon: string; color: string; bg: string }[] = [];
  typeStats: TypeStat[] = [];
  recent: DocumentMetadata[] = [];

  private extMap: Record<string, { key: string; icon: string; color: string; bg: string }> = {
    pdf: { key: 'pdf', icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
    doc: { key: 'doc', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
    docx: { key: 'doc', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
    txt: { key: 'doc', icon: 'text_snippet', color: '#5F6368', bg: '#F1F3F4' },
    xls: { key: 'xls', icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
    xlsx: { key: 'xls', icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
    csv: { key: 'xls', icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
    ppt: { key: 'ppt', icon: 'slideshow', color: '#D56E0C', bg: '#FEF7E0' },
    pptx: { key: 'ppt', icon: 'slideshow', color: '#D56E0C', bg: '#FEF7E0' },
    png: { key: 'img', icon: 'image', color: '#188038', bg: '#E6F4EA' },
    jpg: { key: 'img', icon: 'image', color: '#188038', bg: '#E6F4EA' },
    jpeg: { key: 'img', icon: 'image', color: '#188038', bg: '#E6F4EA' },
    gif: { key: 'img', icon: 'gif_box', color: '#188038', bg: '#E6F4EA' },
    webp: { key: 'img', icon: 'image', color: '#188038', bg: '#E6F4EA' },
    mp4: { key: 'vid', icon: 'video_file', color: '#9334E6', bg: '#F3E8FD' },
    zip: { key: 'zip', icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
  };

  constructor(
    private svc: DocumentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.svc.list().subscribe({
      next: (docs) => {
        const total = docs.length;
        const bytes = docs.reduce((s, d) => s + (d.sizeBytes || 0), 0);

        // Count by type
        const counts: Record<string, number> = {};
        for (const d of docs) {
          const e = (d.fileName.split('.').pop() ?? '').toLowerCase();
          const key = this.extMap[e]?.key ?? 'other';
          counts[key] = (counts[key] ?? 0) + 1;
        }

        this.stats = [
          {
            label: 'Total Files',
            value: String(total),
            icon: 'folder_open',
            color: '#1A73E8',
            bg: '#E8F0FE',
          },
          {
            label: 'Storage Used',
            value: this.fmt(bytes),
            icon: 'storage',
            color: '#188038',
            bg: '#E6F4EA',
          },
          {
            label: 'PDFs',
            value: String(counts['pdf'] ?? 0),
            icon: 'picture_as_pdf',
            color: '#D93025',
            bg: '#FDE8E6',
          },
          {
            label: 'Images',
            value: String(counts['img'] ?? 0),
            icon: 'image',
            color: '#188038',
            bg: '#E6F4EA',
          },
        ];

        const typeMap: Record<string, { label: string; icon: string; color: string; bg: string }> =
          {
            pdf: { label: 'PDFs', icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
            doc: { label: 'Documents', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
            xls: { label: 'Spreadsheets', icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
            ppt: { label: 'Presentations', icon: 'slideshow', color: '#D56E0C', bg: '#FEF7E0' },
            img: { label: 'Images', icon: 'image', color: '#188038', bg: '#E6F4EA' },
            vid: { label: 'Videos', icon: 'video_file', color: '#9334E6', bg: '#F3E8FD' },
            zip: { label: 'Archives', icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
            other: { label: 'Other', icon: 'insert_drive_file', color: '#5F6368', bg: '#F1F3F4' },
          };

        this.typeStats = Object.entries(counts)
          .filter(([, c]) => c > 0)
          .map(([key, count]) => ({
            ...(typeMap[key] ?? typeMap['other']),
            count,
            pct: total > 0 ? Math.round((count / total) * 100) : 0,
            label: (typeMap[key] ?? typeMap['other']).label,
          }))
          .sort((a, b) => b.count - a.count);

        this.recent = [...docs]
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(0, 10);

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  getInfo(d: DocumentMetadata) {
    const e = (d.fileName.split('.').pop() ?? '').toLowerCase();
    return this.extMap[e] ?? { icon: 'insert_drive_file', color: '#5F6368', bg: '#F1F3F4' };
  }

  fmt(b: number): string {
    if (!b) return '0 B';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  }
}

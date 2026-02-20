import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService, DocumentMetadata } from '../services/document.service';

interface TypeStat {
  label: string;
  count: number;
  pct: number;
  icon: string;
  color: string;
  bg: string;
  typeKey: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTooltipModule, RouterModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Dashboard ✨</h1>
          <p class="page-sub">Here's what's going on with your files</p>
        </div>
        <a routerLink="/upload" class="upload-btn">
          <mat-icon>cloud_upload</mat-icon>
          Upload Files
        </a>
      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner-ring"></div>
        <p>Fetching your data…</p>
      </div>

      <ng-container *ngIf="!loading">

        <!-- Quick Actions (moved up, replaces stat cards) -->
        <div class="quick-actions">
          <h2 class="panel-title" style="margin-bottom: 14px;">Quick Actions</h2>
          <div class="actions-row">
            <a routerLink="/upload" class="action-card">
              <mat-icon>cloud_upload</mat-icon>
              <span>Upload Files</span>
            </a>
            <a routerLink="/documents" class="action-card">
              <mat-icon>folder_open</mat-icon>
              <span>My Files</span>
            </a>
            <a routerLink="/starred" class="action-card">
              <mat-icon>star_outline</mat-icon>
              <span>Starred</span>
            </a>
            <a routerLink="/recent" class="action-card">
              <mat-icon>access_time</mat-icon>
              <span>Recent</span>
            </a>
            <a routerLink="/trash" class="action-card">
              <mat-icon>delete_outline</mat-icon>
              <span>Trash</span>
            </a>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">

          <!-- File Types -->
          <div class="panel">
            <div class="panel-header">
              <h2 class="panel-title">File Types</h2>
              <span class="panel-badge">{{ typeStats.length }} types</span>
            </div>

            <!-- Total files summary row -->
            <div class="total-row" *ngIf="typeStats.length > 0">
              <div class="total-left">
                <div class="total-icon">
                  <mat-icon>folder_open</mat-icon>
                </div>
                <div>
                  <p class="total-value">{{ totalFiles }}</p>
                  <p class="total-label">Total Files</p>
                </div>
              </div>
              <div class="total-right">
                <p class="total-storage">{{ totalStorage }}</p>
                <p class="total-storage-label">Storage used</p>
              </div>
            </div>

            <div class="type-list" *ngIf="typeStats.length > 0; else noData">
              <a class="type-item" *ngFor="let t of typeStats"
                 [routerLink]="['/documents']"
                 [queryParams]="{ type: t.typeKey }"
                 title="View {{ t.label }}">
                <div class="type-icon" [style.background]="t.bg">
                  <mat-icon [style.color]="t.color">{{ t.icon }}</mat-icon>
                </div>
                <div class="type-info">
                  <div class="type-labels">
                    <span class="type-name">{{ t.label }}</span>
                    <span class="type-count">{{ t.count }} file{{ t.count !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="type-bar-track">
                    <div class="type-bar-fill" [style.width.%]="t.pct" [style.background]="t.color"></div>
                  </div>
                </div>
                <span class="type-pct">{{ t.pct }}%</span>
                <mat-icon class="type-arrow">chevron_right</mat-icon>
              </a>
            </div>
            <ng-template #noData>
              <div class="empty-panel">
                <span class="empty-emoji">📂</span>
                <p>No files yet</p>
              </div>
            </ng-template>
          </div>

          <!-- Recent Uploads -->
          <div class="panel">
            <div class="panel-header">
              <h2 class="panel-title">Recent Uploads</h2>
              <a routerLink="/documents" class="see-all-link">See all →</a>
            </div>
            <div class="recent-list" *ngIf="recent.length > 0; else noRecent">
              <div class="recent-item" *ngFor="let d of recent">
                <div class="recent-icon" [style.background]="getInfo(d).bg">
                  <mat-icon [style.color]="getInfo(d).color">{{ getInfo(d).icon }}</mat-icon>
                </div>
                <div class="recent-info">
                  <p class="recent-name" [title]="d.fileName">{{ d.fileName }}</p>
                  <p class="recent-meta">{{ fmt(d.sizeBytes) }} · {{ d.uploadedAt | date: 'MMM d, y' }}</p>
                </div>
                <div class="recent-actions">
                  <button class="recent-btn" (click)="openPreview(d)" matTooltip="Preview">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <a class="recent-btn" [href]="d.downloadUrl" target="_blank" matTooltip="Download">
                    <mat-icon>download</mat-icon>
                  </a>
                </div>
              </div>
            </div>
            <ng-template #noRecent>
              <div class="empty-panel">
                <span class="empty-emoji">🕐</span>
                <p>No recent uploads</p>
              </div>
            </ng-template>
          </div>

        </div>

      </ng-container>

      <!-- PREVIEW MODAL -->
      <div class="overlay" *ngIf="pvDoc" (click)="closePv()">
        <div class="pv-shell" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="pv-head">
            <div class="pv-title-block">
              <div class="pv-ficon" [style.background]="getInfo(pvDoc).bg">
                <mat-icon [style.color]="getInfo(pvDoc).color">{{ getInfo(pvDoc).icon }}</mat-icon>
              </div>
              <div>
                <p class="pv-fname">{{ pvDoc.fileName }}</p>
                <p class="pv-fmeta">{{ fmt(pvDoc.sizeBytes) }} · {{ pvDoc.uploadedAt | date: 'MMM d, y' }}</p>
              </div>
            </div>
            <div class="pv-actions">
              <a class="pv-btn" [href]="pvDoc.downloadUrl" target="_blank" matTooltip="Download">
                <mat-icon>download</mat-icon>
              </a>
              <button class="pv-btn close-btn" (click)="closePv()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="pv-body">
            <!-- Image preview -->
            <div class="pv-img-wrap" *ngIf="isImg(pvDoc)">
              <img [src]="pvDoc.downloadUrl" class="pv-img" (error)="pvImgFail = true" *ngIf="!pvImgFail"/>
              <div class="pv-nopv" *ngIf="pvImgFail">
                <mat-icon style="font-size:52px; color:#9CA3AF">broken_image</mat-icon>
                <p>Could not load image</p>
              </div>
            </div>

            <!-- PDF preview -->
            <iframe *ngIf="isPdf(pvDoc) && pvSafeUrl" [src]="pvSafeUrl" class="pv-iframe" frameborder="0"></iframe>

            <!-- No preview -->
            <div class="pv-nopv" *ngIf="!isImg(pvDoc) && !isPdf(pvDoc)">
              <div class="pv-np-ico" [style.background]="getInfo(pvDoc).bg">
                <mat-icon style="font-size:64px;width:64px;height:64px;" [style.color]="getInfo(pvDoc).color">{{ getInfo(pvDoc).icon }}</mat-icon>
              </div>
              <p class="pv-np-title">No preview available</p>
              <p class="pv-np-sub">.{{ pvExt(pvDoc) }} files can't be previewed in the browser</p>
              <a [href]="pvDoc.downloadUrl" target="_blank" class="pv-dl-btn">
                <mat-icon>download</mat-icon> Download to open
              </a>
            </div>

            <!-- Side info -->
            <div class="pv-info">
              <p class="pi-head">File details</p>
              <div class="pi-row"><span class="pi-lbl">Type</span><span>{{ pvExt(pvDoc).toUpperCase() }}</span></div>
              <div class="pi-row"><span class="pi-lbl">Size</span><span>{{ fmt(pvDoc.sizeBytes) }}</span></div>
              <div class="pi-row"><span class="pi-lbl">Uploaded</span><span>{{ pvDoc.uploadedAt | date:'medium' }}</span></div>
              <div class="pi-btns">
                <a [href]="pvDoc.downloadUrl" target="_blank" class="pi-btn-primary">
                  <mat-icon>download</mat-icon> Download
                </a>
              </div>
            </div>
          </div>
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
      margin-bottom: 28px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    .page-sub { font-size: 14px; color: var(--sub); }
    .upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--teal);
      color: white;
      text-decoration: none;
      padding: 11px 24px;
      border-radius: 50px;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      font-weight: 700;
      transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(46,196,182,0.3);
    }
    .upload-btn:hover {
      background: #25a99d;
      transform: translateY(-1px);
      box-shadow: 0 4px 18px rgba(46,196,182,0.4);
    }
    .upload-btn mat-icon { font-size: 18px; }

    /* Loading */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px;
      gap: 16px;
      color: var(--sub);
    }
    .spinner-ring {
      width: 44px;
      height: 44px;
      border: 3px solid var(--border);
      border-top-color: var(--teal);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Stat Grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.08);
    }
    .stat-icon-wrap {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: var(--accent-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-wrap mat-icon { font-size: 26px; }
    .stat-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-label { font-size: 13px; color: var(--sub); font-weight: 600; }
    .stat-decor {
      position: absolute;
      right: -20px;
      top: -20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--accent-bg);
      opacity: 0.5;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    @media (max-width: 800px) { .content-grid { grid-template-columns: 1fr; } }

    /* Panel */
    .panel {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 18px;
      padding: 22px;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .panel-title { font-size: 16px; font-weight: 800; color: var(--text); }
    .panel-badge {
      font-size: 12px;
      font-weight: 700;
      color: var(--teal);
      background: var(--teal-light);
      padding: 3px 10px;
      border-radius: 20px;
    }
    .see-all-link {
      font-size: 13px;
      font-weight: 700;
      color: var(--teal);
      text-decoration: none;
    }
    .see-all-link:hover { text-decoration: underline; }

    .empty-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      gap: 8px;
      color: var(--sub);
    }
    .empty-emoji { font-size: 32px; }
    .empty-panel p { font-size: 14px; font-weight: 600; }

    /* Type list */
    .type-list { display: flex; flex-direction: column; gap: 10px; }
    .type-item {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 10px; border-radius: 12px;
      text-decoration: none; color: inherit;
      cursor: pointer; transition: background 0.15s;
      border: 1.5px solid transparent;
    }
    .type-item:hover {
      background: var(--teal-light);
      border-color: var(--teal);
    }
    .type-arrow { font-size: 18px; color: var(--sub); opacity: 0; transition: opacity 0.15s; }
    .type-item:hover .type-arrow { opacity: 1; color: var(--teal); }
    .type-icon {
      width: 38px; height: 38px; border-radius: 10px;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    }
    .type-icon mat-icon { font-size: 20px; }
    .type-info { flex: 1; }
    .type-labels {
      display: flex; justify-content: space-between;
      margin-bottom: 5px;
    }
    .type-name { font-size: 13px; font-weight: 700; }
    .type-count { font-size: 12px; color: var(--sub); }
    .type-bar-track {
      height: 6px; background: #F0F0F0; border-radius: 6px; overflow: hidden;
    }
    .type-bar-fill { height: 100%; border-radius: 6px; transition: width 0.7s ease; }
    .type-pct { font-size: 12px; font-weight: 700; color: var(--sub); width: 34px; text-align: right; }

    /* Total row in File Types */
    .total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--teal-light);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 14px;
      border: 1.5px solid rgba(46,196,182,0.2);
    }
    .total-left { display: flex; align-items: center; gap: 12px; }
    .total-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--teal); display: flex; align-items: center; justify-content: center;
    }
    .total-icon mat-icon { font-size: 22px; color: white; }
    .total-value { font-size: 22px; font-weight: 800; color: var(--text); line-height: 1; }
    .total-label { font-size: 12px; color: var(--sub); font-weight: 600; }
    .total-right { text-align: right; }
    .total-storage { font-size: 16px; font-weight: 800; color: var(--teal); }
    .total-storage-label { font-size: 11px; color: var(--sub); font-weight: 600; }

    /* Recent actions */
    .recent-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .recent-btn {
      background: none; border: none; cursor: pointer;
      border-radius: 8px; width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      color: var(--sub); text-decoration: none; transition: all 0.15s;
    }
    .recent-btn mat-icon { font-size: 18px; }
    .recent-btn:hover { background: var(--teal-light); color: var(--teal); }

    /* Recent list */
    .recent-list { display: flex; flex-direction: column; }
    .recent-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid var(--border);
    }
    .recent-item:last-child { border-bottom: none; }
    .recent-icon {
      width: 38px; height: 38px; border-radius: 10px;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    }
    .recent-icon mat-icon { font-size: 20px; }
    .recent-info { flex: 1; min-width: 0; }
    .recent-name {
      font-size: 13px; font-weight: 700;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .recent-meta { font-size: 12px; color: var(--sub); }

    /* Quick Actions */
    .quick-actions {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 20px;
    }
    .actions-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    @media (max-width: 700px) { .actions-row { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 480px) { .actions-row { grid-template-columns: repeat(2, 1fr); } }
    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 18px 12px;
      border-radius: 16px;
      border: 1.5px solid var(--border);
      text-decoration: none;
      color: var(--text);
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s;
      background: var(--bg);
    }
    .action-card mat-icon { font-size: 26px; color: var(--teal); }
    .action-card:hover {
      border-color: var(--teal);
      background: var(--teal-light);
      color: var(--teal);
      transform: translateY(-2px);
    }

    /* PREVIEW OVERLAY */
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      display: flex; align-items: center; justify-content: center;
      z-index: 3000;
      backdrop-filter: blur(4px);
      animation: fadein 0.18s;
    }
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

    .pv-shell {
      background: var(--white);
      border-radius: 20px;
      width: min(1100px, 97vw);
      height: min(90vh, 780px);
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 40px 80px rgba(0,0,0,0.25);
      animation: scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .pv-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid var(--border);
      gap: 12px; flex-shrink: 0;
    }
    .pv-title-block { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .pv-ficon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .pv-ficon mat-icon { font-size: 26px; }
    .pv-fname {
      font-size: 16px; font-weight: 800;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .pv-fmeta { font-size: 12px; color: var(--sub); margin-top: 2px; }
    .pv-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .pv-btn {
      background: none; border: 1.5px solid var(--border);
      border-radius: 10px; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--sub); text-decoration: none;
      transition: all 0.12s;
    }
    .pv-btn mat-icon { font-size: 20px; }
    .pv-btn:hover { background: var(--bg); color: var(--text); }
    .pv-btn.close-btn { border-radius: 50%; }
    .pv-btn.close-btn:hover { background: var(--coral-light); color: var(--coral); }

    .pv-body { flex: 1; display: flex; overflow: hidden; }
    .pv-img-wrap {
      flex: 1; display: flex; align-items: center; justify-content: center;
      overflow: hidden; background: #111; padding: 16px;
    }
    .pv-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
    .pv-iframe { flex: 1; height: 100%; border: none; }
    .pv-nopv {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px; padding: 32px;
    }
    .pv-np-ico {
      width: 110px; height: 110px; border-radius: 24px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .pv-np-title { font-size: 18px; font-weight: 800; }
    .pv-np-sub { font-size: 14px; color: var(--sub); }
    .pv-dl-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--teal); color: white; text-decoration: none;
      padding: 10px 22px; border-radius: 50px;
      font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 700;
      margin-top: 8px; transition: background 0.15s;
    }
    .pv-dl-btn:hover { background: #25a99d; }
    .pv-dl-btn mat-icon { font-size: 18px; }

    .pv-info {
      width: 240px; flex-shrink: 0;
      border-left: 1px solid var(--border);
      padding: 20px 16px; overflow-y: auto;
    }
    .pi-head {
      font-size: 12px; font-weight: 800; margin-bottom: 14px;
      text-transform: uppercase; letter-spacing: 0.6px; color: var(--sub);
    }
    .pi-row {
      display: flex; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid var(--border);
      font-size: 13px; font-weight: 500;
    }
    .pi-row:last-of-type { border-bottom: none; }
    .pi-lbl { color: var(--sub); font-weight: 600; margin-right: 8px; }
    .pi-btns { margin-top: 16px; }
    .pi-btn-primary {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      background: var(--teal); color: white; text-decoration: none;
      padding: 9px 0; border-radius: 10px;
      font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 700;
      transition: background 0.15s;
    }
    .pi-btn-primary:hover { background: #25a99d; }
    .pi-btn-primary mat-icon { font-size: 17px; }
  `]
})
export class DashboardComponent implements OnInit {
  loading = true;
  stats: { label: string; value: string; icon: string; color: string; bg: string }[] = [];
  typeStats: TypeStat[] = [];
  recent: DocumentMetadata[] = [];
  totalFiles = 0;
  totalStorage = '0 B';

  pvDoc: DocumentMetadata | null = null;
  pvSafeUrl: SafeResourceUrl | null = null;
  pvImgFail = false;

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

  constructor(private svc: DocumentService, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.svc.list().subscribe({
      next: (docs) => {
        const total = docs.length;
        const bytes = docs.reduce((s, d) => s + (d.sizeBytes || 0), 0);
        const counts: Record<string, number> = {};
        for (const d of docs) {
          const e = (d.fileName.split('.').pop() ?? '').toLowerCase();
          const key = this.extMap[e]?.key ?? 'other';
          counts[key] = (counts[key] ?? 0) + 1;
        }
        this.totalFiles = total;
        this.totalStorage = this.fmt(bytes);
        this.stats = [
          { label: 'Total Files', value: String(total), icon: 'folder_open', color: '#2EC4B6', bg: '#E8FAF9' },
          { label: 'Storage Used', value: this.fmt(bytes), icon: 'storage', color: '#FF6B6B', bg: '#FFF0F0' },
          { label: 'PDFs', value: String(counts['pdf'] ?? 0), icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
          { label: 'Images', value: String(counts['img'] ?? 0), icon: 'image', color: '#9334E6', bg: '#F3E8FD' },
        ];
        const typeMap: Record<string, { label: string; icon: string; color: string; bg: string }> = {
          pdf: { label: 'PDFs', icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
          doc: { label: 'Documents', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
          xls: { label: 'Spreadsheets', icon: 'table_chart', color: '#188038', bg: '#E6F4EA' },
          ppt: { label: 'Presentations', icon: 'slideshow', color: '#D56E0C', bg: '#FEF7E0' },
          img: { label: 'Images', icon: 'image', color: '#9334E6', bg: '#F3E8FD' },
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
            typeKey: key,
          }))
          .sort((a, b) => b.count - a.count);
        this.recent = [...docs]
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(0, 8);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  getInfo(d: DocumentMetadata) {
    const e = (d.fileName.split('.').pop() ?? '').toLowerCase();
    return this.extMap[e] ?? { icon: 'insert_drive_file', color: '#5F6368', bg: '#F1F3F4' };
  }

  openPreview(d: DocumentMetadata) {
    this.pvDoc = d;
    this.pvImgFail = false;
    const ext = this.pvExt(d);
    this.pvSafeUrl = ext === 'pdf' && d.downloadUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(d.downloadUrl)
      : null;
    this.cdr.markForCheck();
  }

  closePv() {
    this.pvDoc = null;
    this.pvSafeUrl = null;
    this.cdr.markForCheck();
  }

  isImg(d: DocumentMetadata) {
    return ['png','jpg','jpeg','gif','webp','svg','bmp'].includes(this.pvExt(d));
  }

  isPdf(d: DocumentMetadata) {
    return this.pvExt(d) === 'pdf';
  }

  pvExt(d: DocumentMetadata) {
    return (d.fileName.split('.').pop() ?? '').toLowerCase();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.pvDoc) this.closePv();
  }

  fmt(b: number): string {
    if (!b) return '0 B';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  }
}
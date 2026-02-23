import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocumentService, DocumentMetadata } from '../services/document.service';

type SortKey = 'name' | 'modified' | 'size' | 'type' | 'date-asc' | 'date-desc';
type SortDir = 'asc' | 'desc';
type Mode = 'grid' | 'list';
type View = 'my-files' | 'starred' | 'recent' | 'trash';

interface DocRow extends DocumentMetadata {
  ext: string;
  typeKey: string;
  starred: boolean;
  trashed: boolean;
  trashedAt: Date | null;
  selected: boolean;
  _imgOk?: boolean;
}

const EXT_MAP: Record<string, { key: string; icon: string; color: string; bg: string }> = {
  pdf: { key: 'pdf', icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
  doc: { key: 'doc', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
  docx: { key: 'doc', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
  txt: { key: 'doc', icon: 'text_snippet', color: '#5F6368', bg: '#F1F3F4' },
  rtf: { key: 'doc', icon: 'description', color: '#1A73E8', bg: '#E8F0FE' },
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
  svg: { key: 'img', icon: 'image', color: '#188038', bg: '#E6F4EA' },
  bmp: { key: 'img', icon: 'image', color: '#188038', bg: '#E6F4EA' },
  mp4: { key: 'vid', icon: 'video_file', color: '#9334E6', bg: '#F3E8FD' },
  mov: { key: 'vid', icon: 'video_file', color: '#9334E6', bg: '#F3E8FD' },
  avi: { key: 'vid', icon: 'video_file', color: '#9334E6', bg: '#F3E8FD' },
  mp3: { key: 'aud', icon: 'audio_file', color: '#E8710A', bg: '#FEF3E2' },
  wav: { key: 'aud', icon: 'audio_file', color: '#E8710A', bg: '#FEF3E2' },
  zip: { key: 'zip', icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
  rar: { key: 'zip', icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
  '7z': { key: 'zip', icon: 'folder_zip', color: '#F29900', bg: '#FEF9E5' },
};
function getInfo(ext: string) {
  return (
    EXT_MAP[ext] ?? { key: 'other', icon: 'insert_drive_file', color: '#5F6368', bg: '#F1F3F4' }
  );
}

@Component({
  selector: 'app-document-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, RouterModule],
  template: `
    <!-- TOOLBAR -->
    <div class="toolbar">
      <div class="toolbar-left">
        <mat-icon class="tb-view-icon">{{ viewIcon }}</mat-icon>
        <h1 class="tb-title">{{ viewTitle }}</h1>
      </div>

      <div class="search-wrap" [class.focused]="sfocus">
        <mat-icon class="s-ico">search</mat-icon>
        <input
          class="s-input"
          placeholder="Search in DocVault…"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange()"
          (focus)="sfocus = true"
          (blur)="sfocus = false"
        />
        <button *ngIf="query" class="s-clear" (click)="clearSearch()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="toolbar-right">
        <ng-container *ngIf="selectedCount > 0">
          <span class="sel-pill">{{ selectedCount }} selected</span>
          <button class="tb-icon-btn" (click)="bulkStar()" matTooltip="Star selected">
            <mat-icon>star_outline</mat-icon>
          </button>
          <button class="tb-icon-btn" (click)="bulkTrash()" matTooltip="Trash selected">
            <mat-icon>delete_outline</mat-icon>
          </button>
          <button class="tb-icon-btn" (click)="clearSelection()" matTooltip="Deselect">
            <mat-icon>close</mat-icon>
          </button>
        </ng-container>

        <div class="view-toggle">
          <button
            class="vt-btn"
            [class.on]="mode === 'grid'"
            (click)="mode = 'grid'"
            matTooltip="Grid"
          >
            <mat-icon>grid_view</mat-icon>
          </button>
          <button
            class="vt-btn"
            [class.on]="mode === 'list'"
            (click)="mode = 'list'"
            matTooltip="List"
          >
            <mat-icon>view_list</mat-icon>
          </button>
        </div>

        <button class="tb-icon-btn" (click)="load()" matTooltip="Refresh">
          <mat-icon [class.spinning]="loading">refresh</mat-icon>
        </button>

        <div class="sort-wrap">
          <button class="sort-trigger tb-icon-btn" (click)="sortOpen = !sortOpen">
            <mat-icon>sort</mat-icon>
            <span>{{ sortLabel }}</span>
            <mat-icon class="arr">expand_more</mat-icon>
          </button>
          <div class="sort-menu" *ngIf="sortOpen" (click)="$event.stopPropagation()">
            <p class="sm-section">Sort by</p>
            <button
              *ngFor="let s of sortOptions"
              class="sm-item"
              [class.on]="sortKey === s.key"
              (click)="setSort(s.key)"
            >
              <mat-icon *ngIf="sortKey === s.key">{{
                sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'
              }}</mat-icon>
              <mat-icon *ngIf="sortKey !== s.key" style="opacity:0">arrow_upward</mat-icon>
              {{ s.label }}
            </button>
            <div class="sm-divider"></div>
            <p class="sm-section">Filter by date</p>
            <div class="sm-date-row">
              <label class="sm-date-label">From</label>
              <input
                type="date"
                class="sm-date-input"
                [(ngModel)]="dateFrom"
                (change)="applyAll()"
              />
            </div>
            <div class="sm-date-row">
              <label class="sm-date-label">To</label>
              <input type="date" class="sm-date-input" [(ngModel)]="dateTo" (change)="applyAll()" />
            </div>
            <button class="sm-clear-date" *ngIf="dateFrom || dateTo" (click)="clearDateFilter()">
              <mat-icon>close</mat-icon> Clear date filter
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- FILTER CHIPS -->
    <div class="chips-row">
      <button class="chip" [class.on]="typeFilter === 'all'" (click)="setType('all')">
        All files
      </button>
      <button class="chip" [class.on]="typeFilter === 'pdf'" (click)="setType('pdf')">
        <span class="dot" style="background:#D93025"></span>PDF
      </button>
      <button class="chip" [class.on]="typeFilter === 'doc'" (click)="setType('doc')">
        <span class="dot" style="background:#1A73E8"></span>Docs
      </button>
      <button class="chip" [class.on]="typeFilter === 'xls'" (click)="setType('xls')">
        <span class="dot" style="background:#188038"></span>Sheets
      </button>
      <button class="chip" [class.on]="typeFilter === 'ppt'" (click)="setType('ppt')">
        <span class="dot" style="background:#D56E0C"></span>Slides
      </button>
      <button class="chip" [class.on]="typeFilter === 'img'" (click)="setType('img')">
        <span class="dot" style="background:#9334E6"></span>Images
      </button>
      <button class="chip" [class.on]="typeFilter === 'vid'" (click)="setType('vid')">
        <span class="dot" style="background:#9334E6"></span>Videos
      </button>
      <button class="chip" [class.on]="typeFilter === 'zip'" (click)="setType('zip')">
        <span class="dot" style="background:#F29900"></span>Archives
      </button>
    </div>

    <!-- LOADING -->
    <div class="state-center" *ngIf="loading && rows.length === 0">
      <div class="spinner-ring"></div>
      <p>Loading your files…</p>
    </div>

    <!-- EMPTY -->
    <div class="state-center" *ngIf="!loading && visible.length === 0">
      <div class="empty-illustration">
        {{ view === 'starred' ? '⭐' : view === 'recent' ? '🕐' : view === 'trash' ? '🗑️' : '📁' }}
      </div>
      <p class="empty-title">
        {{
          query
            ? 'No results for "' + query + '"'
            : view === 'starred'
              ? 'No starred files yet'
              : view === 'recent'
                ? 'No recent activity'
                : view === 'trash'
                  ? 'Trash is empty'
                  : 'No files uploaded yet'
        }}
      </p>
      <p class="empty-sub" *ngIf="!query && view === 'my-files'">
        Upload some files to get started!
      </p>
      <a class="empty-cta" routerLink="/upload" *ngIf="!query && view === 'my-files'">
        <mat-icon>cloud_upload</mat-icon> Upload Files
      </a>
    </div>

    <!-- GRID -->
    <div class="grid" *ngIf="mode === 'grid' && visible.length > 0" (click)="handleGridBg($event)">
      <div
        class="file-card"
        *ngFor="let d of visible; trackBy: trackBy"
        [class.selected]="d.selected"
        (click)="onCardClick(d, $event)"
        (dblclick)="openPreview(d)"
        (contextmenu)="openCtx($event, d)"
      >
        <div class="card-thumb">
          <img
            *ngIf="isImg(d) && d.downloadUrl && d._imgOk !== false"
            [src]="d.downloadUrl"
            class="thumb-img"
            (load)="d._imgOk = true; cdr.markForCheck()"
            (error)="onImgErr($event, d)"
          />
          <div
            *ngIf="!isImg(d) || d._imgOk === false"
            class="thumb-ico"
            [style.background]="info(d).bg"
          >
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <span class="ext-pill">{{ d.ext }}</span>
          <div
            class="sel-check"
            [class.show]="d.selected"
            (click)="toggleSelect(d); $event.stopPropagation()"
          >
            <div class="chk" [class.on]="d.selected">
              <mat-icon *ngIf="d.selected">check</mat-icon>
            </div>
          </div>
          <button
            class="star-btn"
            [class.starred]="d.starred"
            (click)="toggleStar(d); $event.stopPropagation()"
            [matTooltip]="d.starred ? 'Unstar' : 'Star'"
          >
            <mat-icon>{{ d.starred ? 'star' : 'star_outline' }}</mat-icon>
          </button>
        </div>

        <div class="card-footer">
          <div class="cf-icon" [style.background]="info(d).bg">
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <div class="cf-text">
            <p class="cf-name" [title]="d.fileName">{{ d.fileName }}</p>
            <p class="cf-date">{{ d.uploadedAt | date: 'MMM d, y' }}</p>
          </div>
          <button
            class="cf-more"
            (click)="openCtx($event, d); $event.stopPropagation()"
            matTooltip="More"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- LIST -->
    <div class="list-wrap" *ngIf="mode === 'list' && visible.length > 0">
      <div class="list-head">
        <div class="lh-chk">
          <div class="chk" [class.on]="allSelected" (click)="toggleAll()">
            <mat-icon *ngIf="allSelected">check</mat-icon>
            <mat-icon *ngIf="!allSelected && selectedCount > 0">remove</mat-icon>
          </div>
        </div>
        <button class="lh-col sortable" (click)="setSort('name')">
          Name
          <mat-icon *ngIf="sortKey === 'name'">{{
            sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'
          }}</mat-icon>
        </button>
        <button class="lh-col sortable" (click)="setSort('modified')">
          Modified
          <mat-icon *ngIf="sortKey === 'modified'">{{
            sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'
          }}</mat-icon>
        </button>
        <button class="lh-col sortable" (click)="setSort('size')">
          Size
          <mat-icon *ngIf="sortKey === 'size'">{{
            sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'
          }}</mat-icon>
        </button>
        <div class="lh-col">Type</div>
        <div class="lh-col lh-right">Actions</div>
      </div>

      <div
        class="list-row"
        *ngFor="let d of visible; trackBy: trackBy"
        [class.selected]="d.selected"
        (click)="onRowClick(d, $event)"
        (dblclick)="openPreview(d)"
        (contextmenu)="openCtx($event, d)"
      >
        <div class="lr-chk" (click)="toggleSelect(d); $event.stopPropagation()">
          <div class="chk" [class.on]="d.selected">
            <mat-icon *ngIf="d.selected">check</mat-icon>
          </div>
        </div>

        <div class="lr-name">
          <div class="lr-ico" [style.background]="info(d).bg">
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <span class="lr-fname" [title]="d.fileName">{{ d.fileName }}</span>
          <mat-icon *ngIf="d.starred" class="lr-star-ico">star</mat-icon>
        </div>

        <span class="lr-col">{{ d.uploadedAt | date: 'MMM d, y, h:mm a' }}</span>
        <span class="lr-col">{{ fmt(d.sizeBytes) }}</span>
        <span class="lr-col">{{ d.ext.toUpperCase() }}</span>

        <div class="lr-actions" (click)="$event.stopPropagation()">
          <button class="ra" (click)="openPreview(d)" matTooltip="Preview">
            <mat-icon>visibility</mat-icon>
          </button>
          <a
            class="ra"
            [href]="d.downloadUrl"
            target="_blank"
            matTooltip="Download"
            (click)="$event.stopPropagation()"
            ><mat-icon>download</mat-icon></a
          >
          <button
            class="ra"
            [class.starred]="d.starred"
            (click)="toggleStar(d)"
            [matTooltip]="d.starred ? 'Unstar' : 'Star'"
          >
            <mat-icon>{{ d.starred ? 'star' : 'star_outline' }}</mat-icon>
          </button>
          <button
            class="ra danger"
            (click)="view === 'trash' ? permanentDelete(d) : trashDoc(d)"
            [matTooltip]="view === 'trash' ? 'Delete forever' : 'Trash'"
          >
            <mat-icon>{{ view === 'trash' ? 'delete_forever' : 'delete_outline' }}</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- TRASH BAR -->
    <div class="trash-bar" *ngIf="view === 'trash' && visible.length > 0">
      <mat-icon>info_outline</mat-icon>
      Items in Trash are deleted forever after 30 days.
      <button class="tb-restore" (click)="restoreAll()">Restore all</button>
      <button class="tb-empty" (click)="emptyTrash()">Empty Trash</button>
    </div>

    <!-- CONTEXT MENU -->
    <div class="ctx-menu" *ngIf="ctxDoc" [style.top.px]="ctxY" [style.left.px]="ctxX">
      <button class="ctx-item" (click)="openPreview(ctxDoc!); closeCtx()">
        <mat-icon>visibility</mat-icon> Preview
      </button>
      <a class="ctx-item" [href]="ctxDoc.downloadUrl" target="_blank" (click)="closeCtx()">
        <mat-icon>download</mat-icon> Download
      </a>
      <div class="ctx-sep"></div>
      <button class="ctx-item" (click)="toggleStar(ctxDoc!); closeCtx()">
        <mat-icon>{{ ctxDoc.starred ? 'star_outline' : 'star' }}</mat-icon>
        {{ ctxDoc.starred ? 'Remove star' : 'Add to Starred' }}
      </button>
      <div class="ctx-sep"></div>
      <button class="ctx-item" (click)="openRename(ctxDoc!); closeCtx()">
        <mat-icon>drive_file_rename_outline</mat-icon> Rename
      </button>
      <button class="ctx-item" (click)="copyLink(ctxDoc!); closeCtx()">
        <mat-icon>link</mat-icon> Copy link
      </button>
      <div class="ctx-sep" *ngIf="view !== 'trash'"></div>
      <button
        class="ctx-item danger"
        *ngIf="view !== 'trash'"
        (click)="trashDoc(ctxDoc!); closeCtx()"
      >
        <mat-icon>delete_outline</mat-icon> Move to Trash
      </button>
      <button class="ctx-item" *ngIf="view === 'trash'" (click)="restoreDoc(ctxDoc!); closeCtx()">
        <mat-icon>restore_from_trash</mat-icon> Restore
      </button>
      <button
        class="ctx-item danger"
        *ngIf="view === 'trash'"
        (click)="permanentDelete(ctxDoc!); closeCtx()"
      >
        <mat-icon>delete_forever</mat-icon> Delete permanently
      </button>
    </div>

    <!-- PREVIEW MODAL -->
    <div class="overlay" *ngIf="pvDoc" (click)="closePv()">
      <div class="pv-shell" (click)="$event.stopPropagation()">
        <div class="pv-head">
          <div class="pv-title-block">
            <div class="pv-ficon" [style.background]="info(pvDoc).bg">
              <mat-icon [style.color]="info(pvDoc).color">{{ info(pvDoc).icon }}</mat-icon>
            </div>
            <div>
              <p class="pv-fname">{{ pvDoc.fileName }}</p>
              <p class="pv-fmeta">
                {{ fmt(pvDoc.sizeBytes) }} · {{ pvDoc.uploadedAt | date: 'MMM d, y' }}
              </p>
            </div>
          </div>
          <div class="pv-actions">
            <button
              class="pv-btn"
              (click)="toggleStar(pvDoc)"
              [matTooltip]="pvDoc.starred ? 'Unstar' : 'Star'"
            >
              <mat-icon>{{ pvDoc.starred ? 'star' : 'star_outline' }}</mat-icon>
            </button>
            <a class="pv-btn" [href]="pvDoc.downloadUrl" target="_blank" matTooltip="Download">
              <mat-icon>download</mat-icon>
            </a>
            <button
              class="pv-btn danger-btn"
              (click)="trashDoc(pvDoc); closePv()"
              matTooltip="Trash"
            >
              <mat-icon>delete_outline</mat-icon>
            </button>
            <button class="pv-btn close-btn" (click)="closePv()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="pv-body">
          <div class="pv-img-wrap" *ngIf="isImg(pvDoc)">
            <img
              [src]="pvDoc.downloadUrl"
              class="pv-img"
              (error)="pvImgFail = true"
              *ngIf="!pvImgFail"
            />
            <div class="pv-nopv" *ngIf="pvImgFail">
              <mat-icon class="pv-big-ico" [style.color]="info(pvDoc).color">broken_image</mat-icon>
              <p>Could not load image</p>
            </div>
          </div>
          <iframe
            *ngIf="isPdf(pvDoc) && pvSafeUrl"
            [src]="pvSafeUrl"
            class="pv-iframe"
            frameborder="0"
          ></iframe>
          <div class="pv-nopv" *ngIf="!isImg(pvDoc) && !isPdf(pvDoc)">
            <div class="pv-np-ico" [style.background]="info(pvDoc).bg">
              <mat-icon
                style="font-size:64px;width:64px;height:64px;"
                [style.color]="info(pvDoc).color"
                >{{ info(pvDoc).icon }}</mat-icon
              >
            </div>
            <p class="pv-np-title">No preview available</p>
            <p class="pv-np-sub">.{{ pvDoc.ext }} files can't be previewed</p>
            <a [href]="pvDoc.downloadUrl" target="_blank" class="pv-dl-btn">
              <mat-icon>download</mat-icon> Download to open
            </a>
          </div>

          <div class="pv-info">
            <p class="pi-head">File details</p>
            <div class="pi-row">
              <span class="pi-lbl">Type</span><span>{{ pvDoc.ext.toUpperCase() }}</span>
            </div>
            <div class="pi-row">
              <span class="pi-lbl">Size</span><span>{{ fmt(pvDoc.sizeBytes) }}</span>
            </div>
            <div class="pi-row">
              <span class="pi-lbl">Uploaded</span
              ><span>{{ pvDoc.uploadedAt | date: 'medium' }}</span>
            </div>
            <div class="pi-row">
              <span class="pi-lbl">Starred</span><span>{{ pvDoc.starred ? '⭐ Yes' : 'No' }}</span>
            </div>
            <div class="pi-btns">
              <a [href]="pvDoc.downloadUrl" target="_blank" class="pi-btn-primary">
                <mat-icon>download</mat-icon> Download
              </a>
              <button class="pi-btn-ghost" (click)="toggleStar(pvDoc)">
                <mat-icon>{{ pvDoc.starred ? 'star' : 'star_outline' }}</mat-icon>
                {{ pvDoc.starred ? 'Starred' : 'Star' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RENAME MODAL -->
    <div class="overlay" *ngIf="renameDoc" (click)="renameDoc = null">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <p class="modal-title">✏️ Rename file</p>
        <input
          class="modal-input"
          [(ngModel)]="renameName"
          (keyup.enter)="confirmRename()"
          autofocus
        />
        <div class="modal-btns">
          <button class="btn-cancel" (click)="renameDoc = null">Cancel</button>
          <button class="btn-ok" (click)="confirmRename()">Rename</button>
        </div>
      </div>
    </div>

    <!-- DELETE CONFIRM -->
    <div class="overlay" *ngIf="delDoc" (click)="delDoc = null">
      <div class="modal-box del-box" (click)="$event.stopPropagation()">
        <div class="del-emoji">🗑️</div>
        <p class="modal-title">Delete permanently?</p>
        <p class="del-sub">
          <strong>{{ delDoc.fileName }}</strong> will be removed from cloud storage forever.
        </p>
        <div class="modal-btns">
          <button class="btn-cancel" (click)="delDoc = null">Cancel</button>
          <button class="btn-danger" (click)="confirmDelete()">Delete forever</button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <div class="toast" [class.show]="toastVisible">
      <mat-icon>{{ toastIcon }}</mat-icon> {{ toast }}
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

      :host {
        --teal: #2ec4b6;
        --teal-light: #e8faf9;
        --coral: #ff6b6b;
        --coral-light: #fff0f0;
        --text: #1a1a2e;
        --sub: #6b7280;
        --border: #e5e7eb;
        --bg: #f8fafb;
        --white: #ffffff;
        display: block;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        color: var(--text);
        background: var(--bg);
        min-height: 100vh;
        position: relative;
      }

      /* TOOLBAR */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 18px;
        background: var(--white);
        border-bottom: 1.5px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 110px;
      }
      .tb-view-icon {
        color: var(--teal);
        font-size: 22px;
      }
      .tb-title {
        font-size: 18px;
        font-weight: 800;
        white-space: nowrap;
      }

      .search-wrap {
        flex: 1;
        max-width: 580px;
        min-width: 180px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--bg);
        border: 1.5px solid transparent;
        border-radius: 50px;
        padding: 8px 16px;
        transition: all 0.2s;
      }
      .search-wrap.focused {
        background: var(--white);
        border-color: var(--teal);
        box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.12);
      }
      .s-ico {
        color: var(--sub);
        font-size: 20px;
        flex-shrink: 0;
      }
      .s-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        color: var(--text);
      }
      .s-input::placeholder {
        color: #9ca3af;
      }
      .s-clear {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        color: var(--sub);
        border-radius: 50%;
        padding: 2px;
        transition: background 0.12s;
      }
      .s-clear:hover {
        background: var(--border);
      }
      .s-clear mat-icon {
        font-size: 16px;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-left: auto;
      }
      .sel-pill {
        font-size: 13px;
        font-weight: 700;
        color: var(--teal);
        background: var(--teal-light);
        padding: 4px 12px;
        border-radius: 20px;
      }
      .tb-icon-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: 1.5px solid var(--border);
        border-radius: 10px;
        padding: 6px 10px;
        cursor: pointer;
        color: var(--sub);
        font-family: 'Nunito', sans-serif;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.15s;
      }
      .tb-icon-btn mat-icon {
        font-size: 20px;
      }
      .tb-icon-btn:hover {
        background: var(--bg);
        color: var(--text);
        border-color: #c0c0c0;
      }

      .view-toggle {
        display: flex;
        border: 1.5px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
      }
      .vt-btn {
        background: var(--white);
        border: none;
        padding: 6px 10px;
        cursor: pointer;
        color: var(--sub);
        display: flex;
        align-items: center;
        transition: all 0.15s;
      }
      .vt-btn mat-icon {
        font-size: 20px;
      }
      .vt-btn.on {
        background: var(--teal-light);
        color: var(--teal);
      }
      .vt-btn:hover:not(.on) {
        background: var(--bg);
      }

      .sort-wrap {
        position: relative;
      }
      .sort-trigger {
        gap: 6px;
      }
      .sort-trigger .arr {
        font-size: 18px;
      }
      .sort-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 6px);
        background: var(--white);
        border: 1.5px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        min-width: 180px;
        z-index: 200;
        overflow: hidden;
        animation: fadeDown 0.15s ease;
      }
      @keyframes fadeDown {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .sm-section {
        font-size: 11px;
        font-weight: 800;
        color: var(--sub);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 8px 14px 4px;
      }
      .sm-divider {
        height: 1px;
        background: var(--border);
        margin: 6px 0;
      }
      .sm-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        background: none;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        text-align: left;
        transition: background 0.12s;
      }
      .sm-item:hover {
        background: var(--bg);
      }
      .sm-item.on {
        color: var(--teal);
      }
      .sm-item.on mat-icon {
        color: var(--teal);
      }
      .sm-date-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
      }
      .sm-date-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--sub);
        width: 32px;
        flex-shrink: 0;
      }
      .sm-date-input {
        flex: 1;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        padding: 5px 8px;
        font-family: 'Nunito', sans-serif;
        font-size: 12px;
        color: var(--text);
        outline: none;
        transition: border-color 0.15s;
      }
      .sm-date-input:focus {
        border-color: var(--teal);
      }
      .sm-clear-date {
        display: flex;
        align-items: center;
        gap: 4px;
        width: calc(100% - 28px);
        margin: 4px 14px 8px;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1.5px solid var(--coral);
        background: var(--coral-light);
        color: var(--coral);
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 12px;
        font-weight: 700;
        transition: all 0.15s;
      }
      .sm-clear-date mat-icon {
        font-size: 14px;
      }
      .sm-clear-date:hover {
        background: var(--coral);
        color: white;
      }

      /* CHIPS */
      .chips-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        padding: 10px 18px;
        background: var(--white);
        border-bottom: 1.5px solid var(--border);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 14px;
        border-radius: 20px;
        border: 1.5px solid var(--border);
        background: var(--white);
        font-family: 'Nunito', sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        color: var(--sub);
        transition: all 0.15s;
      }
      .chip:hover {
        background: var(--bg);
        color: var(--text);
      }
      .chip.on {
        background: var(--teal-light);
        border-color: var(--teal);
        color: var(--teal);
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* LOADING / EMPTY */
      .state-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 24px;
        text-align: center;
        gap: 12px;
      }
      .spinner-ring {
        width: 44px;
        height: 44px;
        border: 3px solid var(--border);
        border-top-color: var(--teal);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .empty-illustration {
        font-size: 64px;
        margin-bottom: 4px;
      }
      .empty-title {
        font-size: 18px;
        font-weight: 800;
      }
      .empty-sub {
        font-size: 14px;
        color: var(--sub);
      }
      .empty-cta {
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
        box-shadow: 0 2px 10px rgba(46, 196, 182, 0.3);
      }
      .empty-cta:hover {
        background: #25a99d;
        transform: translateY(-1px);
      }
      .empty-cta mat-icon {
        font-size: 18px;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .spinning {
        animation: spin 0.8s linear infinite;
      }

      /* GRID */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
        gap: 12px;
        padding: 16px;
      }
      .file-card {
        background: var(--white);
        border: 1.5px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        user-select: none;
        transition:
          box-shadow 0.2s,
          border-color 0.15s,
          transform 0.15s;
      }
      .file-card:hover {
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.09);
        border-color: #c5c5c5;
        transform: translateY(-2px);
      }
      .file-card.selected {
        border-color: var(--teal);
        background: var(--teal-light);
      }

      .card-thumb {
        position: relative;
        height: 138px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: #f9fafb;
      }
      .thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .thumb-ico {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .thumb-ico mat-icon {
        font-size: 54px;
        width: 54px;
        height: 54px;
      }
      .ext-pill {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.55);
        color: white;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .sel-check {
        position: absolute;
        top: 8px;
        left: 8px;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .sel-check.show,
      .file-card:hover .sel-check {
        opacity: 1;
      }
      .chk {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.12s;
      }
      .chk mat-icon {
        font-size: 14px;
        color: var(--teal);
      }
      .chk.on {
        background: var(--teal);
        border-color: var(--teal);
      }
      .chk.on mat-icon {
        color: white;
      }
      .star-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        background: rgba(255, 255, 255, 0.85);
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .star-btn mat-icon {
        font-size: 16px;
        color: var(--sub);
      }
      .star-btn.starred mat-icon {
        color: #f59e0b;
      }
      .star-btn.starred,
      .file-card:hover .star-btn {
        opacity: 1;
      }

      .card-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid var(--border);
      }
      .cf-icon {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cf-icon mat-icon {
        font-size: 16px;
      }
      .cf-text {
        flex: 1;
        min-width: 0;
      }
      .cf-name {
        font-size: 13px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cf-date {
        font-size: 11px;
        color: var(--sub);
      }
      .cf-more {
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
        opacity: 0;
        transition: opacity 0.12s;
      }
      .cf-more mat-icon {
        font-size: 18px;
      }
      .cf-more:hover {
        background: var(--bg);
      }
      .file-card:hover .cf-more {
        opacity: 1;
      }

      /* LIST */
      .list-wrap {
        background: var(--white);
        border-radius: 16px;
        border: 1.5px solid var(--border);
        margin: 14px 16px;
        overflow: hidden;
      }
      .list-head {
        display: grid;
        grid-template-columns: 36px 2fr 180px 90px 70px 140px;
        padding: 8px 14px;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
      }
      .lh-chk {
        display: flex;
        align-items: center;
      }
      .lh-col {
        font-size: 11px;
        font-weight: 700;
        color: var(--sub);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 2px;
        background: none;
        border: none;
        cursor: default;
        font-family: 'Nunito', sans-serif;
      }
      .lh-col.sortable {
        cursor: pointer;
      }
      .lh-col.sortable:hover {
        color: var(--text);
      }
      .lh-col mat-icon {
        font-size: 14px;
      }
      .lh-right {
        justify-content: flex-end;
      }
      .list-row {
        display: grid;
        grid-template-columns: 36px 2fr 180px 90px 70px 140px;
        padding: 10px 14px;
        align-items: center;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background 0.12s;
        user-select: none;
      }
      .list-row:last-child {
        border-bottom: none;
      }
      .list-row:hover {
        background: #fafafa;
      }
      .list-row.selected {
        background: var(--teal-light);
      }
      .lr-chk {
        display: flex;
        align-items: center;
      }
      .lr-name {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .lr-ico {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lr-ico mat-icon {
        font-size: 20px;
      }
      .lr-fname {
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lr-star-ico {
        font-size: 14px;
        color: #f59e0b;
        flex-shrink: 0;
      }
      .lr-col {
        font-size: 13px;
        color: var(--sub);
        font-weight: 500;
      }
      .lr-actions {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .list-row:hover .lr-actions {
        opacity: 1;
      }
      .ra {
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 8px;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sub);
        text-decoration: none;
        transition: all 0.12s;
      }
      .ra mat-icon {
        font-size: 17px;
      }
      .ra:hover {
        background: var(--bg);
        color: var(--text);
      }
      .ra.starred mat-icon {
        color: #f59e0b;
      }
      .ra.danger:hover {
        background: var(--coral-light);
        color: var(--coral);
      }

      /* TRASH BAR */
      .trash-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        background: #fffbeb;
        border-top: 1px solid #f59e0b;
        font-size: 13px;
        color: #92400e;
        position: sticky;
        bottom: 0;
        z-index: 50;
      }
      .trash-bar mat-icon {
        font-size: 18px;
      }
      .tb-restore {
        margin-left: auto;
        background: none;
        border: 1.5px solid #f59e0b;
        padding: 5px 14px;
        border-radius: 20px;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: #92400e;
        transition: background 0.12s;
      }
      .tb-restore:hover {
        background: rgba(245, 158, 11, 0.1);
      }
      .tb-empty {
        background: var(--coral);
        border: none;
        color: white;
        padding: 5px 14px;
        border-radius: 20px;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 13px;
        font-weight: 700;
        transition: background 0.12s;
      }
      .tb-empty:hover {
        background: #e55555;
      }

      /* CONTEXT MENU */
      .ctx-menu {
        position: fixed;
        background: var(--white);
        border: 1.5px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.12);
        z-index: 5000;
        min-width: 200px;
        overflow: hidden;
        animation: fadeDown 0.12s ease;
      }
      .ctx-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        background: none;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        text-align: left;
        text-decoration: none;
        transition: background 0.12s;
      }
      .ctx-item mat-icon {
        font-size: 18px;
        color: var(--sub);
      }
      .ctx-item:hover {
        background: var(--bg);
      }
      .ctx-item.danger {
        color: var(--coral);
      }
      .ctx-item.danger mat-icon {
        color: var(--coral);
      }
      .ctx-sep {
        height: 1px;
        background: var(--border);
      }

      /* OVERLAY & MODALS */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        backdrop-filter: blur(4px);
        animation: fadein 0.18s;
      }
      @keyframes fadein {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .pv-shell {
        background: var(--white);
        border-radius: 20px;
        width: min(1100px, 97vw);
        height: min(90vh, 780px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.25);
        animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes scaleIn {
        from {
          transform: scale(0.95);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      .pv-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
        gap: 12px;
        flex-shrink: 0;
      }
      .pv-title-block {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .pv-ficon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pv-ficon mat-icon {
        font-size: 26px;
      }
      .pv-fname {
        font-size: 16px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pv-fmeta {
        font-size: 12px;
        color: var(--sub);
        margin-top: 2px;
      }
      .pv-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .pv-btn {
        background: none;
        border: 1.5px solid var(--border);
        border-radius: 10px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--sub);
        text-decoration: none;
        transition: all 0.12s;
      }
      .pv-btn mat-icon {
        font-size: 20px;
      }
      .pv-btn:hover {
        background: var(--bg);
        color: var(--text);
      }
      .pv-btn.danger-btn:hover {
        background: var(--coral-light);
        color: var(--coral);
        border-color: var(--coral);
      }
      .pv-btn.close-btn {
        border-radius: 50%;
      }
      .pv-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      .pv-img-wrap {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: #111;
        padding: 16px;
      }
      .pv-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
      }
      .pv-iframe {
        flex: 1;
        height: 100%;
        border: none;
      }
      .pv-nopv {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 32px;
      }
      .pv-big-ico {
        font-size: 52px;
      }
      .pv-np-ico {
        width: 110px;
        height: 110px;
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
      }
      .pv-np-title {
        font-size: 18px;
        font-weight: 800;
      }
      .pv-np-sub {
        font-size: 14px;
        color: var(--sub);
      }
      .pv-dl-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--teal);
        color: white;
        text-decoration: none;
        padding: 10px 22px;
        border-radius: 50px;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        margin-top: 8px;
        transition: background 0.15s;
      }
      .pv-dl-btn:hover {
        background: #25a99d;
      }
      .pv-dl-btn mat-icon {
        font-size: 18px;
      }
      .pv-info {
        width: 240px;
        flex-shrink: 0;
        border-left: 1px solid var(--border);
        padding: 20px 16px;
        overflow-y: auto;
      }
      .pi-head {
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 14px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--sub);
      }
      .pi-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
        font-size: 13px;
      }
      .pi-row:last-of-type {
        border-bottom: none;
      }
      .pi-lbl {
        color: var(--sub);
        flex-shrink: 0;
        margin-right: 8px;
        font-weight: 600;
      }
      .pi-btns {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pi-btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--teal);
        color: white;
        text-decoration: none;
        padding: 9px 0;
        border-radius: 10px;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        transition: background 0.15s;
      }
      .pi-btn-primary:hover {
        background: #25a99d;
      }
      .pi-btn-primary mat-icon {
        font-size: 17px;
      }
      .pi-btn-ghost {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: none;
        border: 1.5px solid var(--border);
        color: var(--text);
        padding: 9px 0;
        border-radius: 10px;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.12s;
      }
      .pi-btn-ghost:hover {
        background: var(--bg);
      }
      .pi-btn-ghost mat-icon {
        font-size: 17px;
        color: #f59e0b;
      }

      /* MODALS */
      .modal-box {
        background: var(--white);
        border-radius: 20px;
        padding: 28px 32px;
        width: 380px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
        animation: scaleIn 0.18s ease;
      }
      .del-box {
        text-align: center;
        width: 400px;
      }
      .del-emoji {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .modal-title {
        font-size: 18px;
        font-weight: 800;
        margin-bottom: 14px;
      }
      .del-sub {
        font-size: 14px;
        color: var(--sub);
        line-height: 1.5;
      }
      .modal-input {
        width: 100%;
        border: 1.5px solid var(--border);
        border-radius: 10px;
        padding: 10px 12px;
        font-family: 'Nunito', sans-serif;
        font-size: 15px;
        font-weight: 600;
        outline: none;
        transition: border-color 0.15s;
        color: var(--text);
      }
      .modal-input:focus {
        border-color: var(--teal);
        box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.12);
      }
      .modal-btns {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 18px;
      }
      .del-box .modal-btns {
        justify-content: center;
      }
      .btn-cancel {
        padding: 9px 20px;
        border-radius: 10px;
        border: 1.5px solid var(--border);
        background: none;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
        transition: background 0.12s;
      }
      .btn-cancel:hover {
        background: var(--bg);
      }
      .btn-ok {
        padding: 9px 20px;
        border-radius: 10px;
        border: none;
        background: var(--teal);
        color: white;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        transition: background 0.12s;
      }
      .btn-ok:hover {
        background: #25a99d;
      }
      .btn-danger {
        padding: 9px 20px;
        border-radius: 10px;
        border: none;
        background: var(--coral);
        color: white;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        transition: background 0.12s;
      }
      .btn-danger:hover {
        background: #e55555;
      }

      /* TOAST */
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: #1a1a2e;
        color: white;
        padding: 12px 22px;
        border-radius: 50px;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition:
          transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
          opacity 0.3s;
        opacity: 0;
      }
      .toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .toast mat-icon {
        font-size: 18px;
      }
    `,
  ],
})
export class DocumentListComponent implements OnInit, OnDestroy {
  rows: DocRow[] = [];
  visible: DocRow[] = [];
  view: View = 'my-files';
  mode: Mode = 'grid';
  query = '';
  sfocus = false;
  sortKey: SortKey = 'modified';
  sortDir: SortDir = 'desc';
  typeFilter = 'all';
  sortOpen = false;
  loading = false;
  dateFrom = '';
  dateTo = '';

  ctxDoc: DocRow | null = null;
  ctxX = 0;
  ctxY = 0;
  pvDoc: DocRow | null = null;
  pvSafeUrl: SafeResourceUrl | null = null;
  pvImgFail = false;
  renameDoc: DocRow | null = null;
  renameName = '';
  delDoc: DocRow | null = null;
  toast = '';
  toastIcon = 'check';
  toastVisible = false;
  private toastTimer: any;
  private refreshTimer: any;
  private searchTimer: any;

  readonly sortOptions = [
    { key: 'name' as SortKey, label: 'Name (A → Z)' },
    { key: 'modified' as SortKey, label: 'Last modified' },
    { key: 'date-asc' as SortKey, label: 'Date (oldest first)' },
    { key: 'date-desc' as SortKey, label: 'Date (newest first)' },
    { key: 'size' as SortKey, label: 'File size' },
    { key: 'type' as SortKey, label: 'Type' },
  ];

  get sortLabel() {
    return this.sortOptions.find((s) => s.key === this.sortKey)?.label ?? 'Sort';
  }
  get selectedCount() {
    return this.visible.filter((d) => d.selected).length;
  }
  get allSelected() {
    return this.visible.length > 0 && this.visible.every((d) => d.selected);
  }
  get viewTitle() {
    return this.view === 'starred'
      ? 'Starred'
      : this.view === 'recent'
        ? 'Recent'
        : this.view === 'trash'
          ? 'Trash'
          : 'My Files';
  }
  get viewIcon() {
    return this.view === 'starred'
      ? 'star_outline'
      : this.view === 'recent'
        ? 'access_time'
        : this.view === 'trash'
          ? 'delete_outline'
          : 'folder_open';
  }

  constructor(
    private svc: DocumentService,
    public cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.url.subscribe((segs) => {
      const path = segs[0]?.path ?? 'documents';
      if (path === 'starred') this.view = 'starred';
      else if (path === 'recent') this.view = 'recent';
      else if (path === 'trash') this.view = 'trash';
      else this.view = 'my-files';
      this.applyAll();
    });
    this.route.queryParams.subscribe((params) => {
      if (params['type']) {
        this.typeFilter = params['type'];
        this.cdr.markForCheck();
      }
    });
    this.load();
    this.refreshTimer = setInterval(() => {
      if (!this.query.trim() && !this.pvDoc) this.load();
    }, 8000);
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
    clearTimeout(this.searchTimer);
    clearTimeout(this.toastTimer);
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();
    this.svc.list().subscribe({
      next: (docs) => {
        const persisted = this.loadPersistedState();
        // Preserve in-memory state so recent star/unstar/trash actions aren't overwritten by refresh
        const inMemory = new Map(this.rows.map((r) => [r.fileName, r]));
        this.rows = docs.map((d) => {
          const ext = this.getExt(d.fileName);
          const mem = inMemory.get(d.fileName);
          const saved = persisted[d.fileName];
          // Priority: in-memory > localStorage > default false
          return {
            ...d,
            ext,
            typeKey: getInfo(ext).key,
            starred: mem ? mem.starred : (saved?.starred ?? false),
            trashed: mem ? mem.trashed : (saved?.trashed ?? false),
            trashedAt: mem ? mem.trashedAt : saved?.trashedAt ? new Date(saved.trashedAt) : null,
            selected: false,
          } as DocRow;
        });
        this.loading = false;
        this.applyAll();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onQueryChange() {
    this.applyAll();
    clearTimeout(this.searchTimer);
    if (!this.query.trim()) return;
    this.searchTimer = setTimeout(() => {
      this.svc.search(this.query).subscribe({
        next: (docs) => {
          const sm = new Map(this.rows.map((r) => [r.fileName, r]));
          const merged: DocRow[] = docs.map((d) => {
            const ext = this.getExt(d.fileName);
            const prev = sm.get(d.fileName);
            return (
              prev ??
              ({
                ...d,
                ext,
                typeKey: getInfo(ext).key,
                starred: false,
                trashed: false,
                trashedAt: null,
                selected: false,
              } as DocRow)
            );
          });
          this.visible = this.applyFiltersAndSort(merged.filter((d) => !d.trashed));
          this.cdr.markForCheck();
        },
        error: () => this.applyAll(),
      });
    }, 150);
  }

  clearSearch() {
    this.query = '';
    this.applyAll();
  }

  setType(t: string) {
    this.typeFilter = t;
    this.applyAll();
  }

  setSort(k: SortKey) {
    if (this.sortKey === k) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else {
      this.sortKey = k;
      this.sortDir = 'asc';
    }
    this.sortOpen = false;
    this.applyAll();
  }

  applyAll() {
    let pool = [...this.rows];
    if (this.view === 'starred') pool = pool.filter((d) => d.starred && !d.trashed);
    else if (this.view === 'recent') pool = pool.filter((d) => !d.trashed).slice(0, 20);
    else if (this.view === 'trash') pool = pool.filter((d) => d.trashed);
    else pool = pool.filter((d) => !d.trashed);
    if (this.query.trim()) {
      const q = this.query.toLowerCase();
      pool = pool.filter((d) => d.fileName.toLowerCase().includes(q));
    }
    this.visible = this.applyFiltersAndSort(pool);
    this.cdr.markForCheck();
  }

  clearDateFilter() {
    this.dateFrom = '';
    this.dateTo = '';
    this.applyAll();
  }

  applyFiltersAndSort(pool: DocRow[]): DocRow[] {
    if (this.typeFilter !== 'all') pool = pool.filter((d) => d.typeKey === this.typeFilter);
    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      pool = pool.filter((d) => new Date(d.uploadedAt).getTime() >= from);
    }
    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      pool = pool.filter((d) => new Date(d.uploadedAt).getTime() <= to.getTime());
    }
    return pool.sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (this.sortKey) {
        case 'name':
          va = a.fileName.toLowerCase();
          vb = b.fileName.toLowerCase();
          break;
        case 'modified':
          va = new Date(a.uploadedAt).getTime();
          vb = new Date(b.uploadedAt).getTime();
          break;
        case 'date-asc':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'date-desc':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'size':
          va = a.sizeBytes;
          vb = b.sizeBytes;
          break;
        case 'type':
          va = a.ext;
          vb = b.ext;
          break;
        default:
          va = vb = 0;
      }
      return (va < vb ? -1 : va > vb ? 1 : 0) * (this.sortDir === 'asc' ? 1 : -1);
    });
  }

  // ── PERSISTENCE ────────────────────────────────────────────────────────────
  private readonly STORAGE_KEY = 'docvault_file_state';

  private loadPersistedState(): Record<
    string,
    { starred: boolean; trashed: boolean; trashedAt: string | null }
  > {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private savePersistedState() {
    const state: Record<string, { starred: boolean; trashed: boolean; trashedAt: string | null }> =
      {};
    // Save ALL files explicitly — unstar/untrash saved as false so it's never lost on refresh
    for (const r of this.rows) {
      state[r.fileName] = {
        starred: r.starred,
        trashed: r.trashed,
        trashedAt: r.trashedAt ? r.trashedAt.toISOString() : null,
      };
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  // ── SELECTION ──────────────────────────────────────────────────────────────
  toggleSelect(d: DocRow) {
    d.selected = !d.selected;
    this.cdr.markForCheck();
  }
  clearSelection() {
    this.rows.forEach((r) => (r.selected = false));
    this.applyAll();
  }
  toggleAll() {
    const all = this.allSelected;
    this.visible.forEach((d) => (d.selected = !all));
    this.cdr.markForCheck();
  }

  onCardClick(d: DocRow, e: MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
      this.toggleSelect(d);
    } else if (e.shiftKey && this.selectedCount > 0) {
      const idxA = this.visible.findIndex((r) => r.selected);
      const idxB = this.visible.indexOf(d);
      const lo = Math.min(idxA, idxB),
        hi = Math.max(idxA, idxB);
      this.visible.forEach((r, i) => {
        if (i >= lo && i <= hi) r.selected = true;
      });
      this.cdr.markForCheck();
    } else {
      this.clearSelection();
      this.toggleSelect(d);
    }
  }
  onRowClick = this.onCardClick.bind(this);

  // ── BULK ACTIONS ───────────────────────────────────────────────────────────
  bulkStar() {
    this.visible.filter((d) => d.selected).forEach((d) => (d.starred = true));
    this.savePersistedState();
    this.clearSelection();
    this.showToast('Added to Starred ⭐', 'star');
  }
  bulkTrash() {
    this.visible
      .filter((d) => d.selected)
      .forEach((d) => {
        d.trashed = true;
        d.trashedAt = new Date();
      });
    this.savePersistedState();
    this.clearSelection();
    this.applyAll();
    this.showToast('Moved to Trash 🗑️', 'delete');
  }

  // ── STAR ───────────────────────────────────────────────────────────────────
  toggleStar(d: DocRow) {
    d.starred = !d.starred;
    this.savePersistedState();
    this.applyAll();
    this.showToast(d.starred ? 'Added to Starred ⭐' : 'Removed from Starred', 'star');
  }

  // ── TRASH (local only — file stays in cloud) ───────────────────────────────
  trashDoc(d: DocRow) {
    d.trashed = true;
    d.trashedAt = new Date();
    d.starred = false;
    this.savePersistedState();
    if (this.pvDoc === d) this.closePv();
    this.applyAll();
    this.showToast('Moved to Trash 🗑️', 'delete');
  }
  restoreDoc(d: DocRow) {
    d.trashed = false;
    d.trashedAt = null;
    this.savePersistedState();
    this.applyAll();
    this.showToast('Restored ✅', 'restore');
  }
  restoreAll() {
    this.visible.forEach((d) => {
      d.trashed = false;
      d.trashedAt = null;
    });
    this.savePersistedState();
    this.applyAll();
    this.showToast('All restored ✅', 'restore');
  }

  // ── PERMANENT DELETE (calls cloud API) ─────────────────────────────────────
  async emptyTrash() {
    const trashed = this.rows.filter((r) => r.trashed);
    if (trashed.length === 0) return;
    this.showToast(`Deleting ${trashed.length} file(s)…`, 'hourglass_empty');
    let completed = 0;
    let failed = 0;
    for (const d of trashed) {
      try {
        await this.svc.delete(d.id).toPromise();
        this.rows = this.rows.filter((r) => r !== d);
        this.savePersistedState();
        completed++;
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch {
        failed++;
      }
    }
    this.applyAll();
    this.showToast(
      failed > 0 ? `Deleted ${completed}, ${failed} failed` : 'Trash emptied 🗑️',
      'delete_forever',
    );
    this.cdr.markForCheck();
  }

  permanentDelete(d: DocRow) {
    this.delDoc = d;
  }

  confirmDelete() {
    if (!this.delDoc) return;
    const target = this.delDoc;
    this.delDoc = null;
    this.showToast('Deleting…', 'hourglass_empty');
    this.svc.delete(target.id).subscribe({
      next: () => {
        this.rows = this.rows.filter((r) => r !== target);
        this.savePersistedState();
        this.applyAll();
        this.showToast('Deleted permanently 🗑️', 'delete_forever');
      },
      error: () => {
        this.showToast('Delete failed — please try again', 'error');
      },
    });
  }

  // ── RENAME ─────────────────────────────────────────────────────────────────
  openRename(d: DocRow) {
    this.renameDoc = d;
    this.renameName = d.fileName;
  }
  confirmRename() {
    if (!this.renameDoc || !this.renameName.trim()) return;
    this.renameDoc.fileName = this.renameName.trim();
    this.renameDoc.ext = this.getExt(this.renameDoc.fileName);
    this.renameDoc.typeKey = getInfo(this.renameDoc.ext).key;
    this.renameDoc = null;
    this.applyAll();
    this.showToast('Renamed ✏️', 'drive_file_rename_outline');
  }

  copyLink(d: DocRow) {
    if (d.downloadUrl && navigator.clipboard) {
      navigator.clipboard
        .writeText(d.downloadUrl)
        .then(() => this.showToast('Link copied! 🔗', 'link'));
    }
  }

  // ── CONTEXT MENU ───────────────────────────────────────────────────────────
  openCtx(e: MouseEvent, d: DocRow) {
    e.preventDefault();
    this.ctxDoc = d;
    const vpW = window.innerWidth,
      vpH = window.innerHeight;
    this.ctxX = e.clientX + 210 > vpW ? e.clientX - 210 : e.clientX;
    this.ctxY = e.clientY + 300 > vpH ? e.clientY - 300 : e.clientY;
    this.cdr.markForCheck();
  }
  closeCtx() {
    this.ctxDoc = null;
    this.cdr.markForCheck();
  }
  handleGridBg(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('grid')) this.clearSelection();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.ctx-menu') && !t.closest('.cf-more') && !t.closest('[contextmenu]'))
      this.closeCtx();
    if (!t.closest('.sort-wrap')) this.sortOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.pvDoc) {
        this.closePv();
        return;
      }
      if (this.ctxDoc) {
        this.closeCtx();
        return;
      }
      if (this.renameDoc) {
        this.renameDoc = null;
        return;
      }
      if (this.delDoc) {
        this.delDoc = null;
        return;
      }
      if (this.selectedCount) {
        this.clearSelection();
        return;
      }
    }
  }

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  openPreview(d: DocRow) {
    this.pvDoc = d;
    this.pvImgFail = false;
    this.pvSafeUrl =
      this.isPdf(d) && d.downloadUrl
        ? this.sanitizer.bypassSecurityTrustResourceUrl(d.downloadUrl)
        : null;
    this.cdr.markForCheck();
  }
  closePv() {
    this.pvDoc = null;
    this.pvSafeUrl = null;
    this.cdr.markForCheck();
  }

  // ── TOAST ──────────────────────────────────────────────────────────────────
  showToast(msg: string, icon = 'check', undoable = false, undoFn?: () => void) {
    this.toast = msg;
    this.toastIcon = icon;
    this.toastVisible = true;
    this.cdr.markForCheck();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  isImg(d: DocRow) {
    return d.typeKey === 'img';
  }
  isPdf(d: DocRow) {
    return d.ext === 'pdf';
  }
  info(d: DocRow) {
    return getInfo(d.ext);
  }
  getExt(n: string) {
    return (n.split('.').pop() ?? '').toLowerCase();
  }
  onImgErr(e: Event, d: DocRow) {
    d._imgOk = false;
    this.cdr.markForCheck();
  }
  fmt(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }
  trackBy(_: number, d: DocRow) {
    return d.fileName;
  }
}

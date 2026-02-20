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

/* ──────────────────────────────────────────── */
type SortKey = 'name' | 'modified' | 'size' | 'type';
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
/* ──────────────────────────────────────────── */

@Component({
  selector: 'app-document-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, RouterModule],
  template: `
    <!-- ═══════════════════════════════════════════════════════
     TOOLBAR
═══════════════════════════════════════════════════════ -->
    <div class="toolbar">
      <!-- Left: breadcrumb title -->
      <div class="toolbar-left">
        <mat-icon class="tb-icon">{{ viewIcon }}</mat-icon>
        <h1 class="tb-title">{{ viewTitle }}</h1>
      </div>

      <!-- Centre: Search bar -->
      <div class="search-bar" [class.focused]="sfocus">
        <mat-icon class="s-icon">search</mat-icon>
        <input
          #searchEl
          class="s-input"
          placeholder="Search in DocVault"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange()"
          (focus)="sfocus = true"
          (blur)="sfocus = false"
        />
        <button *ngIf="query" class="s-clear" (click)="clearSearch()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Right: actions -->
      <div class="toolbar-right">
        <!-- Bulk actions when selected -->
        <ng-container *ngIf="selectedCount > 0">
          <span class="sel-count">{{ selectedCount }} selected</span>
          <button class="tb-btn" (click)="bulkStar()" matTooltip="Star selected">
            <mat-icon>star_outline</mat-icon>
          </button>
          <button class="tb-btn" (click)="bulkTrash()" matTooltip="Move to Trash">
            <mat-icon>delete_outline</mat-icon>
          </button>
          <button class="tb-btn" (click)="clearSelection()" matTooltip="Clear selection">
            <mat-icon>close</mat-icon>
          </button>
        </ng-container>

        <!-- View toggle -->
        <div class="view-toggle">
          <button
            class="vt-btn"
            [class.on]="mode === 'grid'"
            (click)="mode = 'grid'"
            matTooltip="Grid view"
          >
            <mat-icon>grid_view</mat-icon>
          </button>
          <button
            class="vt-btn"
            [class.on]="mode === 'list'"
            (click)="mode = 'list'"
            matTooltip="List view"
          >
            <mat-icon>view_list</mat-icon>
          </button>
        </div>

        <button class="tb-btn" (click)="load()" matTooltip="Refresh">
          <mat-icon [class.spinning]="loading">refresh</mat-icon>
        </button>

        <!-- Sort menu -->
        <div class="sort-wrap">
          <button class="tb-btn sort-trigger" (click)="sortOpen = !sortOpen">
            <mat-icon>sort</mat-icon>
            <span>{{ sortLabel }}</span>
            <mat-icon class="arr">expand_more</mat-icon>
          </button>
          <div class="sort-menu" *ngIf="sortOpen" (click)="$event.stopPropagation()">
            <button
              *ngFor="let s of sortOptions"
              class="sm-item"
              [class.on]="sortKey === s.key"
              (click)="setSort(s.key)"
            >
              <mat-icon *ngIf="sortKey === s.key">
                {{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
              </mat-icon>
              <mat-icon *ngIf="sortKey !== s.key" style="opacity:0">arrow_upward</mat-icon>
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     FILTER CHIPS
═══════════════════════════════════════════════════════ -->
    <div class="chips-row">
      <button class="chip" [class.on]="typeFilter === 'all'" (click)="setType('all')">
        All files
      </button>
      <button class="chip" [class.on]="typeFilter === 'pdf'" (click)="setType('pdf')">
        <span class="cdot" style="background:#D93025"></span>PDF
      </button>
      <button class="chip" [class.on]="typeFilter === 'doc'" (click)="setType('doc')">
        <span class="cdot" style="background:#1A73E8"></span>Documents
      </button>
      <button class="chip" [class.on]="typeFilter === 'xls'" (click)="setType('xls')">
        <span class="cdot" style="background:#188038"></span>Spreadsheets
      </button>
      <button class="chip" [class.on]="typeFilter === 'ppt'" (click)="setType('ppt')">
        <span class="cdot" style="background:#D56E0C"></span>Presentations
      </button>
      <button class="chip" [class.on]="typeFilter === 'img'" (click)="setType('img')">
        <span class="cdot" style="background:#188038"></span>Images
      </button>
      <button class="chip" [class.on]="typeFilter === 'vid'" (click)="setType('vid')">
        <span class="cdot" style="background:#9334E6"></span>Videos
      </button>
      <button class="chip" [class.on]="typeFilter === 'zip'" (click)="setType('zip')">
        <span class="cdot" style="background:#F29900"></span>Archives
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     LOADING
═══════════════════════════════════════════════════════ -->
    <div class="state-center" *ngIf="loading && rows.length === 0">
      <div class="loader"></div>
      <p>Loading your files…</p>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     EMPTY
═══════════════════════════════════════════════════════ -->
    <div class="state-center" *ngIf="!loading && visible.length === 0">
      <img
        class="empty-art"
        src="https://ssl.gstatic.com/docs/doclist/images/empty_state_my_drive_v2.svg"
        alt=""
        onerror="this.style.display='none'"
      />
      <p class="empty-title">
        {{
          query
            ? 'No results for "' + query + '"'
            : view === 'starred'
              ? 'No starred files'
              : view === 'recent'
                ? 'No recent activity'
                : view === 'trash'
                  ? 'Trash is empty'
                  : 'No files uploaded yet'
        }}
      </p>
      <p class="empty-sub" *ngIf="!query && view === 'my-files'">
        Drop files into DocVault or use the Upload button
      </p>
      <a class="empty-cta" routerLink="/upload" *ngIf="!query && view === 'my-files'">
        <mat-icon>cloud_upload</mat-icon> Upload files
      </a>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     GRID VIEW
═══════════════════════════════════════════════════════ -->
    <div class="grid" *ngIf="mode === 'grid' && visible.length > 0" (click)="handleGridBg($event)">
      <div
        class="card"
        *ngFor="let d of visible; trackBy: trackBy"
        [class.selected]="d.selected"
        (click)="onCardClick(d, $event)"
        (dblclick)="openPreview(d)"
        (contextmenu)="openCtx($event, d)"
      >
        <!-- Thumbnail -->
        <div class="card-thumb">
          <img
            *ngIf="isImg(d) && d.downloadUrl"
            [src]="d.downloadUrl"
            class="thumb-img"
            (error)="onImgErr($event, d)"
            [attr.data-loaded]="true"
          />
          <div *ngIf="!d._imgOk && !isImg(d)" class="thumb-icon" [style.background]="info(d).bg">
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <div
            *ngIf="isImg(d) && d._imgOk === false"
            class="thumb-icon"
            [style.background]="info(d).bg"
          >
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <span class="ext-tag">{{ d.ext }}</span>
          <!-- selection check -->
          <div
            class="sel-check"
            [class.show]="d.selected"
            (click)="toggleSelect(d); $event.stopPropagation()"
          >
            <div class="check-circle" [class.checked]="d.selected">
              <mat-icon *ngIf="d.selected">check</mat-icon>
            </div>
          </div>
          <!-- star -->
          <button
            class="card-star"
            [class.on]="d.starred"
            (click)="toggleStar(d); $event.stopPropagation()"
            [matTooltip]="d.starred ? 'Remove star' : 'Star'"
          >
            <mat-icon>{{ d.starred ? 'star' : 'star_outline' }}</mat-icon>
          </button>
        </div>

        <!-- Footer -->
        <div class="card-foot">
          <div class="cf-icon-sm" [style.background]="info(d).bg">
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <div class="cf-text">
            <p class="cf-name" [title]="d.fileName">{{ d.fileName }}</p>
            <p class="cf-meta">{{ d.uploadedAt | date: 'MMM d, y' }}</p>
          </div>
          <button
            class="cf-more"
            (click)="openCtx($event, d); $event.stopPropagation()"
            matTooltip="More options"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     LIST VIEW
═══════════════════════════════════════════════════════ -->
    <div class="list-wrap" *ngIf="mode === 'list' && visible.length > 0">
      <!-- Column headers -->
      <div class="list-head">
        <div class="lh-check">
          <div class="check-circle" [class.checked]="allSelected" (click)="toggleAll()">
            <mat-icon *ngIf="allSelected">check</mat-icon>
            <mat-icon *ngIf="!allSelected && selectedCount > 0">remove</mat-icon>
          </div>
        </div>
        <button class="lh-col sortable" (click)="setSort('name')">
          Name
          <mat-icon *ngIf="sortKey === 'name'">
            {{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
          </mat-icon>
        </button>
        <button class="lh-col sortable" (click)="setSort('modified')">
          Modified
          <mat-icon *ngIf="sortKey === 'modified'">
            {{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
          </mat-icon>
        </button>
        <button class="lh-col sortable" (click)="setSort('size')">
          Size
          <mat-icon *ngIf="sortKey === 'size'">
            {{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
          </mat-icon>
        </button>
        <div class="lh-col">Type</div>
        <div class="lh-col lh-act">Actions</div>
      </div>

      <div
        class="list-row"
        *ngFor="let d of visible; trackBy: trackBy"
        [class.selected]="d.selected"
        (click)="onRowClick(d, $event)"
        (dblclick)="openPreview(d)"
        (contextmenu)="openCtx($event, d)"
      >
        <!-- Checkbox -->
        <div class="lr-check" (click)="toggleSelect(d); $event.stopPropagation()">
          <div class="check-circle" [class.checked]="d.selected">
            <mat-icon *ngIf="d.selected">check</mat-icon>
          </div>
        </div>

        <!-- Name + icon -->
        <div class="lr-name">
          <div class="lr-icon" [style.background]="info(d).bg">
            <mat-icon [style.color]="info(d).color">{{ info(d).icon }}</mat-icon>
          </div>
          <span class="lr-fname" [title]="d.fileName">{{ d.fileName }}</span>
          <mat-icon *ngIf="d.starred" class="lr-star">star</mat-icon>
        </div>

        <span class="lr-col">{{ d.uploadedAt | date: 'MMM d, y, h:mm a' }}</span>
        <span class="lr-col">{{ fmt(d.sizeBytes) }}</span>
        <span class="lr-col">{{ d.ext.toUpperCase() }}</span>

        <!-- Row actions -->
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
          >
            <mat-icon>download</mat-icon>
          </a>
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
            [matTooltip]="view === 'trash' ? 'Delete permanently' : 'Move to Trash'"
          >
            <mat-icon>{{ view === 'trash' ? 'delete_forever' : 'delete_outline' }}</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- Trash restore bar -->
    <div class="trash-bar" *ngIf="view === 'trash' && visible.length > 0">
      <mat-icon>info_outline</mat-icon>
      Items in Trash are deleted forever after 30 days.
      <button class="tb-restore" (click)="restoreAll()">Restore all</button>
      <button class="tb-empty" (click)="emptyTrash()">Empty Trash</button>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     CONTEXT MENU
═══════════════════════════════════════════════════════ -->
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

    <!-- ═══════════════════════════════════════════════════════
     PREVIEW MODAL
═══════════════════════════════════════════════════════ -->
    <div class="pv-overlay" *ngIf="pvDoc" (click)="closePv()">
      <div class="pv-shell" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="pv-head">
          <div class="pv-title-block">
            <div class="pv-ficon" [style.background]="info(pvDoc).bg">
              <mat-icon [style.color]="info(pvDoc).color">{{ info(pvDoc).icon }}</mat-icon>
            </div>
            <div>
              <p class="pv-fname">{{ pvDoc.fileName }}</p>
              <p class="pv-fmeta">
                {{ fmt(pvDoc.sizeBytes) }} · Modified {{ pvDoc.uploadedAt | date: 'MMM d, y' }}
              </p>
            </div>
          </div>
          <div class="pv-head-btns">
            <button
              class="pv-hb"
              (click)="toggleStar(pvDoc)"
              [matTooltip]="pvDoc.starred ? 'Unstar' : 'Star'"
            >
              <mat-icon>{{ pvDoc.starred ? 'star' : 'star_outline' }}</mat-icon>
            </button>
            <a class="pv-hb" [href]="pvDoc.downloadUrl" target="_blank" matTooltip="Download">
              <mat-icon>download</mat-icon>
            </a>
            <button
              class="pv-hb danger-hb"
              (click)="trashDoc(pvDoc); closePv()"
              matTooltip="Move to Trash"
            >
              <mat-icon>delete_outline</mat-icon>
            </button>
            <button class="pv-hb close-hb" (click)="closePv()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="pv-body">
          <!-- Image -->
          <div class="pv-img-wrap" *ngIf="isImg(pvDoc)">
            <img
              [src]="pvDoc.downloadUrl"
              class="pv-img"
              (error)="pvImgFail = true"
              *ngIf="!pvImgFail"
            />
            <div class="pv-nopreview" *ngIf="pvImgFail">
              <mat-icon class="pv-big-icon" [style.color]="info(pvDoc).color"
                >broken_image</mat-icon
              >
              <p>Could not load image</p>
            </div>
          </div>

          <!-- PDF -->
          <iframe
            *ngIf="isPdf(pvDoc) && pvSafeUrl"
            [src]="pvSafeUrl"
            class="pv-iframe"
            frameborder="0"
          ></iframe>

          <!-- No preview -->
          <div class="pv-nopreview" *ngIf="!isImg(pvDoc) && !isPdf(pvDoc)">
            <div class="pv-np-icon" [style.background]="info(pvDoc).bg">
              <mat-icon
                style="font-size:64px;width:64px;height:64px;"
                [style.color]="info(pvDoc).color"
                >{{ info(pvDoc).icon }}</mat-icon
              >
            </div>
            <p class="pv-np-title">No preview available</p>
            <p class="pv-np-sub">.{{ pvDoc.ext }} files can't be previewed in the browser</p>
            <a [href]="pvDoc.downloadUrl" target="_blank" class="pv-dl-cta">
              <mat-icon>download</mat-icon> Download to open
            </a>
          </div>

          <!-- Side info panel -->
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
              <span class="pi-lbl">Starred</span>
              <span>{{ pvDoc.starred ? 'Yes' : 'No' }}</span>
            </div>
            <div class="pi-actions">
              <a [href]="pvDoc.downloadUrl" target="_blank" class="pi-btn">
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

    <!-- ═══════════════════════════════════════════════════════
     RENAME MODAL
═══════════════════════════════════════════════════════ -->
    <div class="pv-overlay" *ngIf="renameDoc" (click)="renameDoc = null">
      <div class="rename-box" (click)="$event.stopPropagation()">
        <p class="rb-title">Rename</p>
        <input
          class="rb-input"
          [(ngModel)]="renameName"
          (keyup.enter)="confirmRename()"
          autofocus
        />
        <div class="rb-btns">
          <button class="rb-cancel" (click)="renameDoc = null">Cancel</button>
          <button class="rb-ok" (click)="confirmRename()">OK</button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
     DELETE CONFIRM
═══════════════════════════════════════════════════════ -->
    <div class="pv-overlay" *ngIf="delDoc" (click)="delDoc = null">
      <div class="del-box" (click)="$event.stopPropagation()">
        <mat-icon class="del-ico">delete_forever</mat-icon>
        <p class="del-title">Delete permanently?</p>
        <p class="del-sub">
          <strong>{{ delDoc.fileName }}</strong> will be deleted forever and cannot be recovered.
        </p>
        <div class="del-btns">
          <button class="rb-cancel" (click)="delDoc = null">Cancel</button>
          <button class="del-ok" (click)="confirmDelete()">Delete forever</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast" *ngIf="toast" [class.show]="toastVisible">
      <mat-icon>{{ toastIcon }}</mat-icon> {{ toast }}
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
        --bg: #f2f2f7;
        --white: #ffffff;
        --hover: #f5f5f7;
        --selected-bg: #ebf3ff;
        --r: 8px;
        display: block;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 14px;
        color: var(--text);
        background: var(--bg);
        min-height: 100vh;
        position: relative;
      }

      /* ── TOOLBAR ── */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 16px;
        background: var(--white);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 120px;
      }
      .tb-icon {
        color: var(--sub);
        font-size: 22px;
      }
      .tb-title {
        font-size: 18px;
        font-weight: 600;
        white-space: nowrap;
      }

      .search-bar {
        flex: 1;
        max-width: 600px;
        min-width: 200px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--bg);
        border: 1.5px solid transparent;
        border-radius: 28px;
        padding: 8px 16px;
        transition: all 0.2s;
      }
      .search-bar.focused {
        background: var(--white);
        border-color: var(--blue);
        box-shadow: 0 0 0 3px rgba(0, 97, 254, 0.1);
      }
      .s-icon {
        color: var(--sub);
        font-size: 20px;
        flex-shrink: 0;
      }
      .s-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: 15px;
        color: var(--text);
      }
      .s-input::placeholder {
        color: #9ca3af;
      }
      .s-clear {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        color: var(--sub);
        border-radius: 50%;
        transition: background 0.12s;
      }
      .s-clear:hover {
        background: var(--border);
      }
      .s-clear mat-icon {
        font-size: 18px;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-left: auto;
      }

      .sel-count {
        font-size: 13px;
        font-weight: 600;
        color: var(--blue);
        padding: 4px 10px;
        background: var(--blue-soft);
        border-radius: 20px;
      }

      .tb-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        color: var(--sub);
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.12s;
      }
      .tb-btn mat-icon {
        font-size: 20px;
      }
      .tb-btn:hover {
        background: var(--hover);
        color: var(--text);
        border-color: #c7c7cc;
      }

      .view-toggle {
        display: flex;
        border: 1px solid var(--border);
        border-radius: 8px;
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
        transition: background 0.12s;
      }
      .vt-btn mat-icon {
        font-size: 20px;
      }
      .vt-btn.on {
        background: var(--blue-soft);
        color: var(--blue);
      }
      .vt-btn:hover:not(.on) {
        background: var(--hover);
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
        border: 1px solid var(--border);
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
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
      .sm-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        color: var(--text);
        text-align: left;
        transition: background 0.12s;
      }
      .sm-item mat-icon {
        font-size: 18px;
        color: var(--sub);
      }
      .sm-item:hover {
        background: var(--hover);
      }
      .sm-item.on {
        color: var(--blue);
        font-weight: 600;
      }
      .sm-item.on mat-icon {
        color: var(--blue);
      }

      /* ── CHIPS ── */
      .chips-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        padding: 10px 16px;
        background: var(--white);
        border-bottom: 1px solid var(--border);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 14px;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: var(--white);
        font-family: inherit;
        font-size: 13px;
        cursor: pointer;
        color: var(--sub);
        transition: all 0.12s;
      }
      .chip:hover {
        background: var(--hover);
        color: var(--text);
      }
      .chip.on {
        background: var(--blue-soft);
        border-color: var(--blue);
        color: var(--blue);
        font-weight: 600;
      }
      .cdot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }

      /* ── LOADING / EMPTY ── */
      .state-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 24px;
        text-align: center;
      }
      .loader {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--blue);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 16px;
      }
      .empty-art {
        width: 240px;
        margin-bottom: 16px;
        opacity: 0.8;
      }
      .empty-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .empty-sub {
        font-size: 14px;
        color: var(--sub);
        margin-bottom: 16px;
      }
      .empty-cta {
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
      .empty-cta:hover {
        background: #004ed4;
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

      /* ── GRID ── */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
        padding: 16px;
      }
      .card {
        background: var(--white);
        border: 1.5px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition:
          box-shadow 0.2s,
          border-color 0.15s,
          transform 0.15s;
        position: relative;
        user-select: none;
      }
      .card:hover {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border-color: #c7c7cc;
        transform: translateY(-1px);
      }
      .card.selected {
        border-color: var(--blue);
        background: var(--blue-soft);
      }
      .card.selected .card-thumb {
        opacity: 0.9;
      }

      .card-thumb {
        position: relative;
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: #f9f9fb;
      }
      .thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .thumb-icon {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .thumb-icon mat-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
      }
      .ext-tag {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 5px;
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
      .card:hover .sel-check {
        opacity: 1;
      }
      .check-circle {
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
      .check-circle mat-icon {
        font-size: 14px;
        color: var(--blue);
      }
      .check-circle.checked {
        background: var(--blue);
        border-color: var(--blue);
      }
      .check-circle.checked mat-icon {
        color: #fff;
      }

      .card-star {
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
        transition:
          opacity 0.12s,
          background 0.12s;
      }
      .card-star mat-icon {
        font-size: 16px;
        color: var(--sub);
      }
      .card-star.on mat-icon {
        color: #f9ab00;
      }
      .card-star.on {
        opacity: 1;
      }
      .card:hover .card-star {
        opacity: 1;
      }

      .card-foot {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: var(--white);
        border-top: 1px solid var(--border);
      }
      .cf-icon-sm {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cf-icon-sm mat-icon {
        font-size: 16px;
      }
      .cf-text {
        flex: 1;
        min-width: 0;
      }
      .cf-name {
        font-size: 13px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cf-meta {
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
        flex-shrink: 0;
      }
      .cf-more mat-icon {
        font-size: 18px;
      }
      .cf-more:hover {
        background: var(--hover);
      }
      .card:hover .cf-more {
        opacity: 1;
      }

      /* ── LIST ── */
      .list-wrap {
        background: var(--white);
        border-radius: 12px;
        border: 1px solid var(--border);
        margin: 14px 16px;
        overflow: hidden;
      }
      .list-head {
        display: grid;
        grid-template-columns: 36px 2fr 180px 90px 70px 140px;
        padding: 8px 12px;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
      }
      .lh-check {
        display: flex;
        align-items: center;
      }
      .lh-col {
        font-size: 12px;
        font-weight: 600;
        color: var(--sub);
        text-transform: uppercase;
        letter-spacing: 0.4px;
        display: flex;
        align-items: center;
        gap: 2px;
        background: none;
        border: none;
        cursor: default;
        font-family: inherit;
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
      .lh-act {
        justify-content: flex-end;
      }

      .list-row {
        display: grid;
        grid-template-columns: 36px 2fr 180px 90px 70px 140px;
        padding: 10px 12px;
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
        background: var(--hover);
      }
      .list-row.selected {
        background: var(--blue-soft);
      }
      .lr-check {
        display: flex;
        align-items: center;
      }

      .lr-name {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .lr-icon {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lr-icon mat-icon {
        font-size: 20px;
      }
      .lr-fname {
        font-size: 14px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .lr-star {
        font-size: 14px;
        color: #f9ab00;
        flex-shrink: 0;
      }
      .lr-col {
        font-size: 13px;
        color: var(--sub);
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
        border-radius: 6px;
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
        background: #e5e5ea;
        color: var(--text);
      }
      .ra.starred mat-icon {
        color: #f9ab00;
      }
      .ra.danger:hover {
        background: #fde8e6;
        color: #d93025;
      }

      /* ── TRASH BAR ── */
      .trash-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #fef7e0;
        border-top: 1px solid #f9ab00;
        font-size: 13px;
        color: #7b4f00;
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
        border: 1px solid #f9ab00;
        padding: 5px 14px;
        border-radius: 20px;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        color: #7b4f00;
        font-weight: 500;
        transition: background 0.12s;
      }
      .tb-restore:hover {
        background: rgba(249, 171, 0, 0.15);
      }
      .tb-empty {
        background: #d93025;
        border: none;
        color: #fff;
        padding: 5px 14px;
        border-radius: 20px;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.12s;
      }
      .tb-empty:hover {
        background: #b31412;
      }

      /* ── CONTEXT MENU ── */
      .ctx-menu {
        position: fixed;
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
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
        font-family: inherit;
        font-size: 14px;
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
        background: var(--hover);
      }
      .ctx-item.danger {
        color: #d93025;
      }
      .ctx-item.danger mat-icon {
        color: #d93025;
      }
      .ctx-sep {
        height: 1px;
        background: var(--border);
      }

      /* ── PREVIEW OVERLAY ── */
      .pv-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
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
        border-radius: 16px;
        width: min(1100px, 97vw);
        height: min(90vh, 780px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.3);
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
        border-radius: 10px;
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
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pv-fmeta {
        font-size: 12px;
        color: var(--sub);
        margin-top: 2px;
      }
      .pv-head-btns {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .pv-hb {
        background: none;
        border: 1px solid var(--border);
        border-radius: 8px;
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
      .pv-hb mat-icon {
        font-size: 20px;
      }
      .pv-hb:hover {
        background: var(--hover);
        color: var(--text);
        border-color: #c7c7cc;
      }
      .pv-hb.danger-hb:hover {
        background: #fde8e6;
        color: #d93025;
        border-color: #d93025;
      }
      .pv-hb.close-hb {
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
        background: #0f0f0f;
        padding: 16px;
      }
      .pv-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 6px;
      }
      .pv-iframe {
        flex: 1;
        height: 100%;
        border: none;
      }

      .pv-nopreview {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 32px;
      }
      .pv-np-icon {
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
        font-weight: 600;
      }
      .pv-np-sub {
        font-size: 14px;
        color: var(--sub);
      }
      .pv-dl-cta {
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
        margin-top: 8px;
        transition: background 0.15s;
      }
      .pv-dl-cta:hover {
        background: #004ed4;
      }
      .pv-dl-cta mat-icon {
        font-size: 18px;
      }

      .pv-info {
        width: 240px;
        flex-shrink: 0;
        border-left: 1px solid var(--border);
        padding: 20px 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .pi-head {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
      }
      .pi-actions {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pi-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--blue);
        color: #fff;
        text-decoration: none;
        padding: 9px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.15s;
      }
      .pi-btn:hover {
        background: #004ed4;
      }
      .pi-btn mat-icon {
        font-size: 17px;
      }
      .pi-btn-ghost {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: none;
        border: 1px solid var(--border);
        color: var(--text);
        padding: 9px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.12s;
      }
      .pi-btn-ghost:hover {
        background: var(--hover);
        border-color: #c7c7cc;
      }
      .pi-btn-ghost mat-icon {
        font-size: 17px;
        color: #f9ab00;
      }

      /* ── RENAME ── */
      .rename-box {
        background: var(--white);
        border-radius: 14px;
        padding: 24px 28px;
        width: 380px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        animation: scaleIn 0.18s ease;
      }
      .rb-title {
        font-size: 17px;
        font-weight: 600;
        margin-bottom: 14px;
      }
      .rb-input {
        width: 100%;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        padding: 10px 12px;
        font-family: inherit;
        font-size: 15px;
        outline: none;
        transition: border-color 0.15s;
      }
      .rb-input:focus {
        border-color: var(--blue);
        box-shadow: 0 0 0 3px rgba(0, 97, 254, 0.1);
      }
      .rb-btns {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .rb-cancel {
        padding: 8px 18px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
        transition: background 0.12s;
      }
      .rb-cancel:hover {
        background: var(--hover);
      }
      .rb-ok {
        padding: 8px 18px;
        border-radius: 8px;
        border: none;
        background: var(--blue);
        color: #fff;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.12s;
      }
      .rb-ok:hover {
        background: #004ed4;
      }

      /* ── DELETE CONFIRM ── */
      .del-box {
        background: var(--white);
        border-radius: 14px;
        padding: 28px 32px;
        width: 400px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        animation: scaleIn 0.18s ease;
      }
      .del-ico {
        font-size: 52px;
        color: #d93025;
        display: block;
        margin-bottom: 10px;
      }
      .del-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .del-sub {
        font-size: 14px;
        color: var(--sub);
        line-height: 1.5;
      }
      .del-btns {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 20px;
      }
      .del-ok {
        padding: 9px 22px;
        border-radius: 8px;
        border: none;
        background: #d93025;
        color: #fff;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.12s;
      }
      .del-ok:hover {
        background: #b31412;
      }

      /* ── TOAST ── */
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: #3c3c3e;
        color: #fff;
        padding: 10px 20px;
        border-radius: 28px;
        font-size: 14px;
        font-weight: 500;
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
    { key: 'name' as SortKey, label: 'Name' },
    { key: 'modified' as SortKey, label: 'Last modified' },
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
          : 'folder';
  }

  constructor(
    private svc: DocumentService,
    private cdr: ChangeDetectorRef,
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
        const stateMap = new Map(
          this.rows.map((r) => [
            r.fileName,
            { starred: r.starred, trashed: r.trashed, trashedAt: r.trashedAt, selected: false },
          ]),
        );
        this.rows = docs.map((d) => {
          const ext = this.getExt(d.fileName);
          const prev = stateMap.get(d.fileName);
          return {
            ...d,
            ext,
            typeKey: getInfo(ext).key,
            starred: prev?.starred ?? false,
            trashed: prev?.trashed ?? false,
            trashedAt: prev?.trashedAt ?? null,
            selected: false,
          } as DocRow;
        });
        this.loading = false;
        this.applyAll();
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onQueryChange() {
    clearTimeout(this.searchTimer);
    if (!this.query.trim()) {
      this.applyAll();
      return;
    }
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
    }, 280);
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

  applyFiltersAndSort(pool: DocRow[]): DocRow[] {
    if (this.typeFilter !== 'all') {
      pool = pool.filter((d) => d.typeKey === this.typeFilter);
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

  bulkStar() {
    this.visible.filter((d) => d.selected).forEach((d) => (d.starred = true));
    this.clearSelection();
    this.showToast('Added to Starred', 'star');
  }
  bulkTrash() {
    this.visible
      .filter((d) => d.selected)
      .forEach((d) => {
        d.trashed = true;
        d.trashedAt = new Date();
      });
    this.clearSelection();
    this.applyAll();
    this.showToast('Moved to Trash', 'delete');
  }

  toggleStar(d: DocRow) {
    d.starred = !d.starred;
    this.applyAll();
    this.showToast(d.starred ? 'Added to Starred' : 'Removed from Starred', 'star');
  }

  trashDoc(d: DocRow) {
    d.trashed = true;
    d.trashedAt = new Date();
    d.starred = false;
    if (this.pvDoc === d) this.closePv();
    this.applyAll();
    this.showToast('Moved to Trash', 'delete', true, () => {
      d.trashed = false;
      d.trashedAt = null;
      this.applyAll();
    });
  }

  restoreDoc(d: DocRow) {
    d.trashed = false;
    d.trashedAt = null;
    this.applyAll();
    this.showToast('Restored', 'restore');
  }
  restoreAll() {
    this.visible.forEach((d) => {
      d.trashed = false;
      d.trashedAt = null;
    });
    this.applyAll();
    this.showToast('All restored', 'restore');
  }
  emptyTrash() {
    this.rows = this.rows.filter((r) => !r.trashed);
    this.applyAll();
    this.showToast('Trash emptied', 'delete_forever');
  }
  permanentDelete(d: DocRow) {
    this.delDoc = d;
  }
  confirmDelete() {
    if (!this.delDoc) return;
    this.rows = this.rows.filter((r) => r !== this.delDoc);
    this.delDoc = null;
    this.applyAll();
    this.showToast('Deleted permanently', 'delete_forever');
  }

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
    this.showToast('Renamed', 'drive_file_rename_outline');
  }

  copyLink(d: DocRow) {
    if (d.downloadUrl && navigator.clipboard) {
      navigator.clipboard
        .writeText(d.downloadUrl)
        .then(() => this.showToast('Link copied', 'link'));
    }
  }

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

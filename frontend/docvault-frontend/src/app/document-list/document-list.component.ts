import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
  pdf:  { key: 'pdf', icon: 'picture_as_pdf', color: '#D93025', bg: '#FDE8E6' },
  doc:  { key: 'doc', icon: 'description',    color: '#1A73E8', bg: '#E8F0FE' },
  docx: { key: 'doc', icon: 'description',    color: '#1A73E8', bg: '#E8F0FE' },
  txt:  { key: 'doc', icon: 'text_snippet',   color: '#5F6368', bg: '#F1F3F4' },
  rtf:  { key: 'doc', icon: 'description',    color: '#1A73E8', bg: '#E8F0FE' },
  xls:  { key: 'xls', icon: 'table_chart',    color: '#188038', bg: '#E6F4EA' },
  xlsx: { key: 'xls', icon: 'table_chart',    color: '#188038', bg: '#E6F4EA' },
  csv:  { key: 'xls', icon: 'table_chart',    color: '#188038', bg: '#E6F4EA' },
  ppt:  { key: 'ppt', icon: 'slideshow',      color: '#D56E0C', bg: '#FEF7E0' },
  pptx: { key: 'ppt', icon: 'slideshow',      color: '#D56E0C', bg: '#FEF7E0' },
  png:  { key: 'img', icon: 'image',          color: '#188038', bg: '#E6F4EA' },
  jpg:  { key: 'img', icon: 'image',          color: '#188038', bg: '#E6F4EA' },
  jpeg: { key: 'img', icon: 'image',          color: '#188038', bg: '#E6F4EA' },
  gif:  { key: 'img', icon: 'gif_box',        color: '#188038', bg: '#E6F4EA' },
  webp: { key: 'img', icon: 'image',          color: '#188038', bg: '#E6F4EA' },
  svg:  { key: 'img', icon: 'image',          color: '#188038', bg: '#E6F4EA' },
  bmp:  { key: 'img', icon: 'image',          color: '#188038', bg: '#E6F4EA' },
  mp4:  { key: 'vid', icon: 'video_file',     color: '#9334E6', bg: '#F3E8FD' },
  mov:  { key: 'vid', icon: 'video_file',     color: '#9334E6', bg: '#F3E8FD' },
  avi:  { key: 'vid', icon: 'video_file',     color: '#9334E6', bg: '#F3E8FD' },
  mp3:  { key: 'aud', icon: 'audio_file',     color: '#E8710A', bg: '#FEF3E2' },
  wav:  { key: 'aud', icon: 'audio_file',     color: '#E8710A', bg: '#FEF3E2' },
  zip:  { key: 'zip', icon: 'folder_zip',     color: '#F29900', bg: '#FEF9E5' },
  rar:  { key: 'zip', icon: 'folder_zip',     color: '#F29900', bg: '#FEF9E5' },
  '7z': { key: 'zip', icon: 'folder_zip',     color: '#F29900', bg: '#FEF9E5' },
};
function getInfo(ext: string) {
  return EXT_MAP[ext] ?? { key: 'other', icon: 'insert_drive_file', color: '#5F6368', bg: '#F1F3F4' };
}

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
    FormsModule,
  ],
  template: `
    <div style="padding: 24px">
      <h2>My Documents</h2>

      <!-- Search bar -->
      <mat-form-field style="width:300px; margin-right:16px">
        <input
          matInput
          placeholder="Search..."
          [(ngModel)]="searchQuery"
          (keyup.enter)="search()"
        />
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="search()">
        <mat-icon>search</mat-icon> Search
      </button>
      <button mat-stroked-button (click)="load()" style="margin-left:16px; margin-bottom:16px">
        <mat-icon>refresh</mat-icon> Refresh
      </button>
      <button class="chip" [class.on]="typeFilter==='zip'" (click)="setType('zip')">
        <span class="dot" style="background:#F29900"></span>Archives
      </button>
    </div>

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
              appearance="outline"
            >
              <input
                matInput
                [(ngModel)]="editingName"
                (keyup.enter)="confirmRename(d)"
                (keyup.escape)="cancelRename()"
                [id]="'rename-input-' + d.id"
                autofocus
              />
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
          <td mat-cell *matCellDef="let d">{{ d.uploadedAt | date: 'medium' }}</td>
        </ng-container>

        <!-- Actions column — Download + Rename / Save + Cancel -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let d">
            <!-- Download (always visible) -->
            <a
              mat-icon-button
              [href]="d.downloadUrl"
              target="_blank"
              color="primary"
              matTooltip="Download"
            >
              <mat-icon>download</mat-icon>
            </a>

            <!-- RENAME button (shown in view mode) -->
            <button
              *ngIf="editingId !== d.id"
              mat-icon-button
              color="accent"
              (click)="startRename(d)"
              matTooltip="Rename"
            >
              <mat-icon>edit</mat-icon>
            </button>

            <!-- SAVE button (shown in edit mode) -->
            <button
              *ngIf="editingId === d.id"
              mat-icon-button
              color="primary"
              (click)="confirmRename(d)"
              [disabled]="renaming"
              matTooltip="Save rename"
            >
              <mat-icon>check</mat-icon>
            </button>

            <!-- CANCEL button (shown in edit mode) -->
            <button
              *ngIf="editingId === d.id"
              mat-icon-button
              (click)="cancelRename()"
              matTooltip="Cancel"
            >
              <mat-icon>close</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>

      <p *ngIf="documents.length === 0" style="text-align:center; color:#999; margin-top:32px">
        No documents yet. Upload one above!
      </p>
    </div>
  `,
})
export class DocumentListComponent implements OnInit, OnDestroy {
  documents: DocumentMetadata[] = [];
  // Added 'actions' column to replace the old 'download' column
  cols = ['fileName', 'size', 'uploadedAt', 'actions'];
  searchQuery = '';

  // ─── Rename state ─────────────────────────────────────────────────────────
  editingId: string | null = null; // which row is being edited
  editingName = ''; // current value in the input
  renaming = false; // true while HTTP request is in flight
  // ─────────────────────────────────────────────────────────────────────────

  private refreshInterval: any;

  constructor(
    private svc: DocumentService,
    private snackBar: MatSnackBar,
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
    this.loading = true; this.cdr.markForCheck();
    this.svc.list().subscribe({
      next: (d) => (this.documents = d),
      error: (e) => console.error('Load failed', e),
    });
  }

  search() {
    if (this.searchQuery.trim()) {
      this.svc.search(this.searchQuery).subscribe({
        next: (d) => (this.documents = d),
        error: (e) => console.error('Search failed', e),
      });
    }, 150);
  }

  clearSearch() { this.query = ''; this.applyAll(); }

  setType(t: string) { this.typeFilter = t; this.applyAll(); }

  setSort(k: SortKey) {
    if (this.sortKey === k) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = k; this.sortDir = 'asc'; }
    this.sortOpen = false; this.applyAll();
  }

  applyAll() {
    let pool = [...this.rows];
    if (this.view === 'starred')     pool = pool.filter(d => d.starred && !d.trashed);
    else if (this.view === 'recent') pool = pool.filter(d => !d.trashed).slice(0, 20);
    else if (this.view === 'trash')  pool = pool.filter(d => d.trashed);
    else                             pool = pool.filter(d => !d.trashed);
    if (this.query.trim()) {
      const q = this.query.toLowerCase();
      pool = pool.filter(d => d.fileName.toLowerCase().includes(q));
    }
    this.visible = this.applyFiltersAndSort(pool);
    this.cdr.markForCheck();
  }

  clearDateFilter() { this.dateFrom = ''; this.dateTo = ''; this.applyAll(); }

  applyFiltersAndSort(pool: DocRow[]): DocRow[] {
    if (this.typeFilter !== 'all') pool = pool.filter(d => d.typeKey === this.typeFilter);
    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      pool = pool.filter(d => new Date(d.uploadedAt).getTime() >= from);
    }
    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      pool = pool.filter(d => new Date(d.uploadedAt).getTime() <= to.getTime());
    }
    return pool.sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (this.sortKey) {
        case 'name':      va = a.fileName.toLowerCase();          vb = b.fileName.toLowerCase(); break;
        case 'modified':  va = new Date(a.uploadedAt).getTime();  vb = new Date(b.uploadedAt).getTime(); break;
        case 'date-asc':  return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'date-desc': return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'size':      va = a.sizeBytes; vb = b.sizeBytes; break;
        case 'type':      va = a.ext; vb = b.ext; break;
        default:          va = vb = 0;
      }
      return (va < vb ? -1 : va > vb ? 1 : 0) * (this.sortDir === 'asc' ? 1 : -1);
    });
  }

  // ── PERSISTENCE ────────────────────────────────────────────────────────────
  private readonly STORAGE_KEY = 'docvault_file_state';

  private loadPersistedState(): Record<string, { starred: boolean; trashed: boolean; trashedAt: string | null }> {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) ?? '{}'); } catch { return {}; }
  }

  private savePersistedState() {
    const state: Record<string, { starred: boolean; trashed: boolean; trashedAt: string | null }> = {};
    // Save ALL files explicitly — unstar/untrash saved as false so it's never lost on refresh
    for (const r of this.rows) {
      state[r.fileName] = {
        starred:   r.starred,
        trashed:   r.trashed,
        trashedAt: r.trashedAt ? r.trashedAt.toISOString() : null,
      };
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  // ── SELECTION ──────────────────────────────────────────────────────────────
  toggleSelect(d: DocRow) { d.selected = !d.selected; this.cdr.markForCheck(); }
  clearSelection() { this.rows.forEach(r => r.selected = false); this.applyAll(); }
  toggleAll() { const all = this.allSelected; this.visible.forEach(d => d.selected = !all); this.cdr.markForCheck(); }

  onCardClick(d: DocRow, e: MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
      this.toggleSelect(d);
    } else if (e.shiftKey && this.selectedCount > 0) {
      const idxA = this.visible.findIndex(r => r.selected);
      const idxB = this.visible.indexOf(d);
      const lo = Math.min(idxA, idxB), hi = Math.max(idxA, idxB);
      this.visible.forEach((r, i) => { if (i >= lo && i <= hi) r.selected = true; });
      this.cdr.markForCheck();
    } else {
      this.clearSelection(); this.toggleSelect(d);
    }
  }
  onRowClick = this.onCardClick.bind(this);

  // ── BULK ACTIONS ───────────────────────────────────────────────────────────
  bulkStar() {
    this.visible.filter(d => d.selected).forEach(d => d.starred = true);
    this.savePersistedState();
    this.clearSelection();
    this.showToast('Added to Starred ⭐', 'star');
  }
  bulkTrash() {
    this.visible.filter(d => d.selected).forEach(d => { d.trashed = true; d.trashedAt = new Date(); });
    this.savePersistedState();
    this.clearSelection(); this.applyAll();
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
    d.trashed = true; d.trashedAt = new Date(); d.starred = false;
    this.savePersistedState();
    if (this.pvDoc === d) this.closePv();
    this.applyAll();
    this.showToast('Moved to Trash 🗑️', 'delete');
  }
  restoreDoc(d: DocRow) {
    d.trashed = false; d.trashedAt = null;
    this.savePersistedState();
    this.applyAll();
    this.showToast('Restored ✅', 'restore');
  }
  restoreAll() {
    this.visible.forEach(d => { d.trashed = false; d.trashedAt = null; });
    this.savePersistedState();
    this.applyAll();
    this.showToast('All restored ✅', 'restore');
  }

  // ── PERMANENT DELETE (calls cloud API) ─────────────────────────────────────
  async emptyTrash() {
    const trashed = this.rows.filter(r => r.trashed);
    if (trashed.length === 0) return;
    this.showToast(`Deleting ${trashed.length} file(s)…`, 'hourglass_empty');
    let completed = 0; let failed = 0;
    for (const d of trashed) {
      try {
        await this.svc.delete(d.id).toPromise();
        this.rows = this.rows.filter(r => r !== d);
        this.savePersistedState();
        completed++;
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch {
        failed++;
      }
    }
    this.applyAll();
    this.showToast(
      failed > 0 ? `Deleted ${completed}, ${failed} failed` : 'Trash emptied 🗑️',
      'delete_forever'
    );
    this.cdr.markForCheck();
  }

  permanentDelete(d: DocRow) { this.delDoc = d; }

  confirmDelete() {
    if (!this.delDoc) return;
    const target = this.delDoc;
    this.delDoc = null;
    this.showToast('Deleting…', 'hourglass_empty');
    this.svc.delete(target.id).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => r !== target);
        this.savePersistedState();
        this.applyAll();
        this.showToast('Deleted permanently 🗑️', 'delete_forever');
      },
      error: () => {
        this.showToast('Delete failed — please try again', 'error');
      }
    });
  }

  // ── RENAME ─────────────────────────────────────────────────────────────────
  openRename(d: DocRow) { this.renameDoc = d; this.renameName = d.fileName; }
  confirmRename() {
    if (!this.renameDoc || !this.renameName.trim()) return;
    this.renameDoc.fileName = this.renameName.trim();
    this.renameDoc.ext = this.getExt(this.renameDoc.fileName);
    this.renameDoc.typeKey = getInfo(this.renameDoc.ext).key;
    this.renameDoc = null; this.applyAll();
    this.showToast('Renamed ✏️', 'drive_file_rename_outline');
  }

  copyLink(d: DocRow) {
    if (d.downloadUrl && navigator.clipboard) {
      navigator.clipboard.writeText(d.downloadUrl).then(() => this.showToast('Link copied! 🔗', 'link'));
    }
  }

  // ─── Rename methods ───────────────────────────────────────────────────────

  /** Enter edit mode for a row */
  startRename(doc: DocumentMetadata) {
    this.editingId = doc.id;
    this.editingName = doc.fileName; // pre-fill with the current name
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
      next: (updated) => {
        // Update the row in-place so the table reflects the new name immediately
        const idx = this.documents.findIndex((d) => d.id === updated.id);
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
      error: (err) => {
        this.renaming = false;
        console.error('Rename failed', err);
        this.snackBar.open('Rename failed. Please try again.', 'Close', { duration: 4000 });
      },
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  fmt(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

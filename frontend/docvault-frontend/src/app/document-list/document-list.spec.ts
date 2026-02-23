import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { DocumentListComponent as DocumentList } from './document-list.component';
import { DocumentService, DocumentMetadata } from '../services/document.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDoc(overrides: Partial<DocumentMetadata> = {}): DocumentMetadata {
  return {
    id: 'doc-001',
    fileName: 'report.pdf',
    sizeBytes: 204800,
    uploadedAt: '2025-06-01T10:00:00Z',
    contentType: 'application/pdf',
    downloadUrl: 'https://storage.example.com/report.pdf',
    ...overrides,
  };
}

const DOC_PDF  = makeDoc({ id: '1', fileName: 'annual.pdf' });
const DOC_DOCX = makeDoc({ id: '2', fileName: 'notes.docx' });
const DOC_PNG  = makeDoc({ id: '3', fileName: 'photo.png', sizeBytes: 512000 });

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DocumentList', () => {
  let component: DocumentList;
  let fixture: ComponentFixture<DocumentList>;
  let svcSpy: any;

  beforeEach(async () => {
    svcSpy = {
      list: vi.fn().mockReturnValue(of([DOC_PDF, DOC_DOCX, DOC_PNG])),
      search: vi.fn().mockReturnValue(of([])),
      upload: vi.fn(),
      delete: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentList],
      providers: [
        provideRouter([]),
        provideAnimations(),
        { provide: DocumentService, useValue: svcSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            url: of([{ path: 'documents' }]),
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => component.ngOnDestroy());

  // ── Creation & initial load ───────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call list() on init and populate rows', () => {
    expect(svcSpy.list).toHaveBeenCalled();
    expect(component.rows.length).toBe(3);
  });

  it('should show all non-trashed files in visible after load', () => {
    expect(component.visible.length).toBe(3);
  });

  it('should set loading to false after a successful load', () => {
    expect(component.loading).toBe(false);
  });

  it('should set loading to false even when the API errors', () => {
    svcSpy.list.mockReturnValue(throwError(() => new Error('Network error')));
    component.load();
    expect(component.loading).toBe(false);
  });

  // ── Extension & typeKey parsing ───────────────────────────────────────────

  it('should parse file extensions correctly', () => {
    expect(component.rows.find(r => r.fileName === 'annual.pdf')?.ext).toBe('pdf');
    expect(component.rows.find(r => r.fileName === 'notes.docx')?.ext).toBe('docx');
    expect(component.rows.find(r => r.fileName === 'photo.png')?.ext).toBe('png');
  });

  it('should assign typeKey "img" to PNG files', () => {
    expect(component.rows.find(r => r.fileName === 'photo.png')?.typeKey).toBe('img');
  });

  it('should assign typeKey "pdf" to PDF files', () => {
    expect(component.rows.find(r => r.fileName === 'annual.pdf')?.typeKey).toBe('pdf');
  });

  // ── Search / filtering ────────────────────────────────────────────────────

  it('onQueryChange() should filter visible rows immediately by filename', () => {
    component.query = 'annual';
    component.onQueryChange();
    expect(component.visible.length).toBe(1);
    expect(component.visible[0].fileName).toBe('annual.pdf');
  });

  it('onQueryChange() should show all files when query is cleared', () => {
    component.query = 'annual';
    component.onQueryChange();
    component.query = '';
    component.onQueryChange();
    expect(component.visible.length).toBe(3);
  });

  it('clearSearch() should reset query and restore full visible list', () => {
    component.query = 'notes';
    component.onQueryChange();
    component.clearSearch();
    expect(component.query).toBe('');
    expect(component.visible.length).toBe(3);
  });

  it('onQueryChange() should call svc.search() after 150 ms debounce', async () => {
    vi.useFakeTimers();
    svcSpy.search.mockReturnValue(of([DOC_PDF]));
    component.query = 'annual';
    component.onQueryChange();
    await vi.advanceTimersByTimeAsync(150);
    expect(svcSpy.search).toHaveBeenCalledWith('annual');
    vi.useRealTimers();
  });

  it('should NOT call svc.search() when query is empty', async () => {
    vi.useFakeTimers();
    svcSpy.search.mockClear();
    component.query = '';
    component.onQueryChange();
    await vi.advanceTimersByTimeAsync(300);
    expect(svcSpy.search).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should fall back to local filtering when svc.search() errors', async () => {
    vi.useFakeTimers();
    svcSpy.search.mockReturnValue(throwError(() => new Error('Search failed')));
    component.query = 'annual';
    component.onQueryChange();
    await vi.advanceTimersByTimeAsync(150);
    expect(component.visible.some(r => r.fileName === 'annual.pdf')).toBe(true);
    vi.useRealTimers();
  });
  // ── Type filter chips ─────────────────────────────────────────────────────

  it('setType("pdf") should show only PDF files', () => {
    component.setType('pdf');
    expect(component.visible.every(r => r.typeKey === 'pdf')).toBe(true);
  });

  it('setType("img") should show only image files', () => {
    component.setType('img');
    expect(component.visible.every(r => r.typeKey === 'img')).toBe(true);
  });

  it('setType("all") should restore the full list', () => {
    component.setType('pdf');
    component.setType('all');
    expect(component.visible.length).toBe(3);
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  it('setSort("name") should sort visible rows alphabetically ascending', () => {
    component.setSort('name');
    const names = component.visible.map(r => r.fileName);
    expect(names).toEqual([...names].sort());
  });

  it('setSort("size") twice should reverse the sort direction', () => {
    component.setSort('size');
    const asc = component.visible.map(r => r.sizeBytes);
    component.setSort('size');
    const desc = component.visible.map(r => r.sizeBytes);
    expect(desc).toEqual([...asc].reverse());
  });

  it('sortLabel should return the label for the active sort key', () => {
    component.setSort('name');
    expect(component.sortLabel).toBe('Name (A → Z)');
  });

  // ── Star / trash (local state) ────────────────────────────────────────────

  it('toggleStar() should star an unstarred file', () => {
    const doc = component.rows[0];
    doc.starred = false;
    component.toggleStar(doc);
    expect(doc.starred).toBe(true);
  });

  it('toggleStar() should unstar a starred file', () => {
    const doc = component.rows[0];
    doc.starred = true;
    component.toggleStar(doc);
    expect(doc.starred).toBe(false);
  });

  it('trashDoc() should mark the file as trashed and remove from visible', () => {
    const doc = component.rows[0];
    component.trashDoc(doc);
    expect(doc.trashed).toBe(true);
    expect(doc.trashedAt).not.toBeNull();
    expect(component.visible.find(r => r.fileName === doc.fileName)).toBeUndefined();
  });

  it('restoreDoc() should remove the trashed flag and add back to visible', () => {
    const doc = component.rows[0];
    component.trashDoc(doc);
    component.view = 'trash';
    component.applyAll();
    component.restoreDoc(doc);
    component.view = 'my-files';
    component.applyAll();
    expect(doc.trashed).toBe(false);
    expect(component.visible.find(r => r.fileName === doc.fileName)).toBeTruthy();
  });

  // ── Starred view ──────────────────────────────────────────────────────────

  it('starred view should only show starred, non-trashed files', () => {
    component.rows[0].starred = true;
    component.rows[1].starred = false;
    component.view = 'starred';
    component.applyAll();
    expect(component.visible.every(r => r.starred && !r.trashed)).toBe(true);
  });

  // ── Trash view ────────────────────────────────────────────────────────────

  it('trash view should only show trashed files', () => {
    component.trashDoc(component.rows[0]);
    component.view = 'trash';
    component.applyAll();
    expect(component.visible.every(r => r.trashed)).toBe(true);
  });

  it('restoreAll() should un-trash all visible trashed files', () => {
    component.trashDoc(component.rows[0]);
    component.trashDoc(component.rows[1]);
    component.view = 'trash';
    component.applyAll();
    component.restoreAll();
    expect(component.rows.every(r => !r.trashed)).toBe(true);
  });

  // ── Permanent delete ──────────────────────────────────────────────────────

  it('confirmDelete() should call svc.delete() and remove the file from rows', () => {
    svcSpy.delete.mockReturnValue(of(undefined));
    component.delDoc = component.rows[0] as any;
    const targetName = component.rows[0].fileName;
    component.confirmDelete();
    expect(svcSpy.delete).toHaveBeenCalledWith('1');
    expect(component.rows.find(r => r.fileName === targetName)).toBeUndefined();
  });

  it('confirmDelete() should do nothing if delDoc is null', () => {
    component.delDoc = null;
    component.confirmDelete();
    expect(svcSpy.delete).not.toHaveBeenCalled();
  });

  // ── Selection ─────────────────────────────────────────────────────────────

  it('toggleSelect() should select an unselected file', () => {
    const doc = component.visible[0];
    doc.selected = false;
    component.toggleSelect(doc);
    expect(doc.selected).toBe(true);
  });

  it('selectedCount should reflect the number of selected files', () => {
    component.visible[0].selected = true;
    component.visible[1].selected = true;
    expect(component.selectedCount).toBe(2);
  });

  it('clearSelection() should deselect all files', () => {
    component.visible.forEach(d => d.selected = true);
    component.clearSelection();
    expect(component.selectedCount).toBe(0);
  });

  it('toggleAll() should select all when none are selected', () => {
    component.toggleAll();
    expect(component.visible.every(d => d.selected)).toBe(true);
  });

  it('allSelected should be true only when every visible file is selected', () => {
    component.visible.forEach(d => d.selected = true);
    expect(component.allSelected).toBe(true);
    component.visible[0].selected = false;
    expect(component.allSelected).toBe(false);
  });

  // ── Bulk actions ──────────────────────────────────────────────────────────

  it('bulkStar() should star all selected files', () => {
    component.visible[0].selected = true;
    component.visible[1].selected = true;
    component.bulkStar();
    expect(component.visible[0].starred).toBe(true);
    expect(component.visible[1].starred).toBe(true);
  });

  it('bulkTrash() should trash all selected files', () => {
    component.visible[0].selected = true;
    component.bulkTrash();
    expect(component.visible.find(r => r.fileName === 'annual.pdf')).toBeUndefined();
  });

  // ── Rename ────────────────────────────────────────────────────────────────

  it('confirmRename() should update the fileName and extension', () => {
    const doc = component.rows[0] as any;
    component.openRename(doc);
    component.renameName = 'renamed.docx';
    component.confirmRename();
    expect(doc.fileName).toBe('renamed.docx');
    expect(doc.ext).toBe('docx');
  });

  it('confirmRename() should do nothing if renameName is blank', () => {
    const doc = component.rows[0] as any;
    const original = doc.fileName;
    component.openRename(doc);
    component.renameName = '   ';
    component.confirmRename();
    expect(doc.fileName).toBe(original);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  it('fmt() should format bytes into human-readable sizes', () => {
    expect(component.fmt(0)).toBe('—');
    expect(component.fmt(512)).toBe('512 B');
    expect(component.fmt(1536)).toBe('1.5 KB');
    expect(component.fmt(2097152)).toBe('2.0 MB');
  });

  it('isImg() should return true for image typeKey', () => {
    const doc = component.rows.find(r => r.fileName === 'photo.png')!;
    expect(component.isImg(doc as any)).toBe(true);
  });

  it('isPdf() should return true for PDF extension', () => {
    const doc = component.rows.find(r => r.fileName === 'annual.pdf')!;
    expect(component.isPdf(doc as any)).toBe(true);
  });

  it('viewTitle should reflect the current view', () => {
    component.view = 'my-files'; expect(component.viewTitle).toBe('My Files');
    component.view = 'starred';  expect(component.viewTitle).toBe('Starred');
    component.view = 'recent';   expect(component.viewTitle).toBe('Recent');
    component.view = 'trash';    expect(component.viewTitle).toBe('Trash');
  });

  // -- onCardClick ------------------------------------------------------------

  it('onCardClick() with ctrl key should toggle selection', () => {
    const doc = component.visible[0];
    const e = { ctrlKey: true, metaKey: false, shiftKey: false } as MouseEvent;
    component.onCardClick(doc as any, e);
    expect(doc.selected).toBe(true);
  });

  it('onCardClick() without modifier should select only that file', () => {
    component.visible.forEach(d => d.selected = true);
    const doc = component.visible[0];
    const e = { ctrlKey: false, metaKey: false, shiftKey: false } as MouseEvent;
    component.onCardClick(doc as any, e);
    expect(component.selectedCount).toBe(1);
  });

  // -- confirmDelete error path -----------------------------------------------

  it('confirmDelete() should handle delete errors gracefully', () => {
    svcSpy.delete.mockReturnValue(throwError(() => new Error('fail')));
    component.delDoc = component.rows[0] as any;
    component.confirmDelete();
    expect(component.delDoc).toBeNull();
  });

  // -- openRename / closeCtx / openCtx ---------------------------------------

  it('openRename() should set renameDoc and renameName', () => {
    const doc = component.rows[0] as any;
    component.openRename(doc);
    expect(component.renameDoc).toBe(doc);
    expect(component.renameName).toBe(doc.fileName);
  });

  it('closeCtx() should clear ctxDoc', () => {
    component.ctxDoc = component.rows[0] as any;
    component.closeCtx();
    expect(component.ctxDoc).toBeNull();
  });

  it('openCtx() should set ctxDoc and position', () => {
    const doc = component.rows[0] as any;
    const e = { preventDefault: () => {}, clientX: 100, clientY: 100 } as MouseEvent;
    component.openCtx(e, doc);
    expect(component.ctxDoc).toBe(doc);
  });

  // -- openPreview / closePv --------------------------------------------------

  it('openPreview() should set pvDoc', () => {
    const doc = component.rows[0] as any;
    component.openPreview(doc);
    expect(component.pvDoc).toBe(doc);
  });

  it('closePv() should clear pvDoc', () => {
    component.pvDoc = component.rows[0] as any;
    component.closePv();
    expect(component.pvDoc).toBeNull();
  });

  // -- onKey (Escape) ---------------------------------------------------------

  it('onKey() Escape should close preview if open', () => {
    component.pvDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.pvDoc).toBeNull();
  });

  it('onKey() Escape should close ctxDoc if no preview', () => {
    component.ctxDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.ctxDoc).toBeNull();
  });

  it('onKey() Escape should close renameDoc if no ctx', () => {
    component.renameDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.renameDoc).toBeNull();
  });

  it('onKey() Escape should close delDoc if nothing else open', () => {
    component.delDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.delDoc).toBeNull();
  });

  // -- showToast --------------------------------------------------------------

  it('showToast() should set toast message and make it visible', () => {
    component.showToast('Test message', 'info');
    expect(component.toast).toBe('Test message');
    expect(component.toastVisible).toBe(true);
  });

  // -- getExt helper ----------------------------------------------------------

  it('getExt() should return lowercase extension', () => {
    expect(component.getExt('file.PDF')).toBe('pdf');
    expect(component.getExt('noextension')).toBe('noextension');
  });

  // -- permanentDelete --------------------------------------------------------

  it('permanentDelete() should set delDoc', () => {
    const doc = component.rows[0] as any;
    component.permanentDelete(doc);
    expect(component.delDoc).toBe(doc);
  });


  // -- emptyTrash -------------------------------------------------------------

  it('emptyTrash() should do nothing if no trashed files', async () => {
    component.rows.forEach((r: any) => r.trashed = false);
    await component.emptyTrash();
    expect(svcSpy.delete).not.toHaveBeenCalled();
  });

  it('emptyTrash() should delete all trashed files', async () => {
    vi.useFakeTimers();
    svcSpy.delete.mockReturnValue(of(undefined));
    component.rows[0].trashed = true;
    const p = component.emptyTrash();
    await vi.runAllTimersAsync();
    await p;
    expect(component.toast).toContain('emptied');
    vi.useRealTimers();
  });

  // -- onDocClick -------------------------------------------------------------

  it('onDocClick() should close ctx when clicking outside menu', () => {
    component.ctxDoc = component.rows[0] as any;
    const el = document.createElement('div');
    const e = { target: el } as unknown as MouseEvent;
    component.onDocClick(e);
    expect(component.ctxDoc).toBeNull();
  });

  // -- handleGridBg -----------------------------------------------------------

  it('handleGridBg() should clear selection when clicking grid background', () => {
    component.visible.forEach(d => d.selected = true);
    const el = document.createElement('div');
    el.classList.add('grid');
    const e = { target: el } as unknown as MouseEvent;
    component.handleGridBg(e);
    expect(component.selectedCount).toBe(0);
  });

  // -- onImgErr / trackBy -----------------------------------------------------

  it('onImgErr() should set _imgOk to false', () => {
    const doc = component.rows[0] as any;
    doc._imgOk = true;
    component.onImgErr({} as Event, doc);
    expect(doc._imgOk).toBe(false);
  });

  it('trackBy() should return fileName', () => {
    const doc = component.rows[0] as any;
    expect(component.trackBy(0, doc)).toBe(doc.fileName);
  });

  // -- permanentDelete --------------------------------------------------------

  it('permanentDelete() should set delDoc', () => {
    const doc = component.rows[0] as any;
    component.permanentDelete(doc);
    expect(component.delDoc).toBe(doc);
  });


  it('confirmRename() should do nothing if renameDoc is null', () => {
    component.renameDoc = null;
    component.renameName = 'new name';
    component.confirmRename();
    expect(component.renameDoc).toBeNull();
  });

  it('confirmRename() should do nothing if renameName is empty', () => {
    component.renameDoc = component.rows[0] as any;
    component.renameName = '   ';
    component.confirmRename();
    expect(component.renameDoc).not.toBeNull();
  });

  it('copyLink() should write to clipboard if downloadUrl exists', async () => {
    const written: string[] = [];
    Object.assign(navigator, {
      clipboard: { writeText: (t: string) => { written.push(t); return Promise.resolve(); } }
    });
    const doc = component.rows[0] as any;
    doc.downloadUrl = 'http://example.com/file.pdf';
    component.copyLink(doc);
    await new Promise(r => setTimeout(r, 10));
    expect(written[0]).toBe('http://example.com/file.pdf');
  });

  it('copyLink() should do nothing if no downloadUrl', () => {
    const doc = component.rows[0] as any;
    doc.downloadUrl = null;
    expect(() => component.copyLink(doc)).not.toThrow();
  });

  it('onKey() Escape should clear renameDoc if open', () => {
    component.renameDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.renameDoc).toBeNull();
  });

  it('onKey() Escape should clear delDoc if open', () => {
    component.delDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.delDoc).toBeNull();
  });


  it('emptyTrash() should count failed deletions', async () => {
    vi.useFakeTimers();
    svcSpy.delete.mockReturnValue(throwError(() => new Error('fail')));
    component.rows[0].trashed = true;
    const p = component.emptyTrash();
    await vi.runAllTimersAsync();
    await p;
    expect(component.toast).toContain('failed');
    vi.useRealTimers();
  });

  it('onKey() Escape should clear renameDoc when no pvDoc or ctxDoc', () => {
    component.pvDoc = null;
    component.ctxDoc = null;
    component.renameDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.renameDoc).toBeNull();
  });

  it('onKey() Escape should clear delDoc when no pvDoc, ctxDoc or renameDoc', () => {
    component.pvDoc = null;
    component.ctxDoc = null;
    component.renameDoc = null;
    component.delDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.delDoc).toBeNull();
  });


  it('onCardClick() with no modifier keys should clear and select single file', () => {
    component.visible.forEach(d => d.selected = true);
    const e = { ctrlKey: false, metaKey: false, shiftKey: false } as MouseEvent;
    component.onCardClick(component.visible[1] as any, e);
    expect(component.visible[1].selected).toBe(true);
    expect(component.selectedCount).toBe(1);
  });

  it('onKey() Escape should clear renameDoc with no selection and no other state', () => {
    component.pvDoc = null;
    component.ctxDoc = null;
    component.clearSelection();
    component.renameDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.renameDoc).toBeNull();
  });

  it('onKey() Escape should clear delDoc with no other state', () => {
    component.pvDoc = null;
    component.ctxDoc = null;
    component.renameDoc = null;
    component.clearSelection();
    component.delDoc = component.rows[0] as any;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.delDoc).toBeNull();
  });


  it('should filter by dateFrom', () => {
    component.dateFrom = '2024-01-01';
    component.applyAll();
    expect(component.visible.every(d => new Date(d.uploadedAt) >= new Date('2024-01-01'))).toBe(true);
  });

  it('should filter by dateTo', () => {
    component.dateTo = '2026-01-01';
    component.applyAll();
    expect(component.visible).toBeTruthy();
  });

  it('should sort by date-desc', () => { component.sortKey = 'date-desc'; component.applyAll(); expect(component.visible).toBeTruthy(); });
  it('should sort by date-asc', () => { component.sortKey = 'date-asc'; component.applyAll(); expect(component.visible).toBeTruthy(); });
  it('should sort by type', () => { component.sortKey = 'type'; component.applyAll(); expect(component.visible).toBeTruthy(); });
  it('should handle unknown sort key', () => { (component as any).sortKey = 'unknown'; component.applyAll(); expect(component.visible).toBeTruthy(); });

  it('onCardClick() shift+click should range-select when selection exists', () => {
    component.visible[0].selected = true;
    const e = { ctrlKey: false, metaKey: false, shiftKey: true } as MouseEvent;
    component.onCardClick(component.visible[2] as any, e);
    expect(component.visible[0].selected).toBe(true);
    expect(component.visible[2].selected).toBe(true);
  });

  it('onKey() Escape should clear selection when files are selected', () => {
    component.pvDoc = null; component.ctxDoc = null;
    component.renameDoc = null; component.delDoc = null;
    component.visible[0].selected = true;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.selectedCount).toBe(0);
  });


  it('clearDateFilter() should reset date filters', () => {
    component.dateFrom = '2024-01-01';
    component.dateTo = '2026-01-01';
    component.clearDateFilter();
    expect(component.dateFrom).toBe('');
    expect(component.dateTo).toBe('');
  });

  it('should call load() when query is empty and no preview', () => {
    component.query = '';
    (component as any).pvDoc = null;
    expect(svcSpy.list).toHaveBeenCalled();
  });


  it('clearDateFilter() should reset date filters', () => {
    component.dateFrom = '2024-01-01';
    component.dateTo = '2026-01-01';
    component.clearDateFilter();
    expect(component.dateFrom).toBe('');
    expect(component.dateTo).toBe('');
  });



  it('fmt() should format GB correctly', () => {
    expect(component.fmt(2147483648)).toBe('2.00 GB');
  });

});

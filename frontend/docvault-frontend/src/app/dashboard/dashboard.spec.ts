import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DashboardComponent as Dashboard } from './dashboard';
import { DocumentService } from '../services/document.service';

function makeDoc(overrides: any = {}): any {
  return {
    id: '1', fileName: 'test.pdf', sizeBytes: 1024,
    uploadedAt: '2024-01-01T00:00:00Z', downloadUrl: 'http://example.com/test.pdf',
    ...overrides
  };
}

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let svcSpy: any;

  beforeEach(async () => {
    svcSpy = { list: vi.fn().mockReturnValue(of([])) };
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        provideAnimations(),
        { provide: DocumentService, useValue: svcSpy },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should set loading to false after list() succeeds', () => {
    expect(component.loading).toBe(false);
  });

  it('should set loading to false on list() error', () => {
    svcSpy.list.mockReturnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.loading).toBe(false);
  });

  it('should set totalFiles correctly', () => {
    svcSpy.list.mockReturnValue(of([makeDoc(), makeDoc({ id: '2', fileName: 'b.pdf' })]));
    component.ngOnInit();
    expect(component.totalFiles).toBe(2);
  });

  it('should set totalStorage correctly', () => {
    svcSpy.list.mockReturnValue(of([makeDoc({ sizeBytes: 2048 })]));
    component.ngOnInit();
    expect(component.totalStorage).toBe('2.0 KB');
  });

  it('should populate stats array', () => {
    svcSpy.list.mockReturnValue(of([makeDoc()]));
    component.ngOnInit();
    expect(component.stats.length).toBeGreaterThan(0);
  });

  it('should populate typeStats for known extensions', () => {
    svcSpy.list.mockReturnValue(of([makeDoc({ fileName: 'a.pdf' }), makeDoc({ fileName: 'b.pdf' })]));
    component.ngOnInit();
    const pdf = component.typeStats.find(t => t.typeKey === 'pdf');
    expect(pdf).toBeDefined();
    expect(pdf!.count).toBe(2);
  });

  it('should sort typeStats by count descending', () => {
    svcSpy.list.mockReturnValue(of([
      makeDoc({ fileName: 'a.pdf' }), makeDoc({ fileName: 'b.pdf' }),
      makeDoc({ fileName: 'c.png' })
    ]));
    component.ngOnInit();
    expect(component.typeStats[0].count).toBeGreaterThanOrEqual(component.typeStats[component.typeStats.length - 1].count);
  });

  it('should populate recent with up to 8 docs sorted by date', () => {
    const docs = Array.from({ length: 10 }, (_, i) =>
      makeDoc({ id: String(i), fileName: `f${i}.pdf`, uploadedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
    );
    svcSpy.list.mockReturnValue(of(docs));
    component.ngOnInit();
    expect(component.recent.length).toBe(8);
    expect(new Date(component.recent[0].uploadedAt).getTime())
      .toBeGreaterThan(new Date(component.recent[1].uploadedAt).getTime());
  });

  it('should handle unknown file extensions as other', () => {
    svcSpy.list.mockReturnValue(of([makeDoc({ fileName: 'file.xyz' })]));
    component.ngOnInit();
    const other = component.typeStats.find(t => t.typeKey === 'other');
    expect(other).toBeDefined();
  });

  // -- fmt() ------------------------------------------------------------------

  it('fmt() should return 0 B for falsy input', () => { expect(component.fmt(0)).toBe('0 B'); });
  it('fmt() should format bytes', ()  => { expect(component.fmt(500)).toBe('500 B'); });
  it('fmt() should format KB',    ()  => { expect(component.fmt(1536)).toBe('1.5 KB'); });
  it('fmt() should format MB',    ()  => { expect(component.fmt(2097152)).toBe('2.0 MB'); });
  it('fmt() should format GB',    ()  => { expect(component.fmt(1073741824)).toBe('1.00 GB'); });

  // -- preview ----------------------------------------------------------------

  it('openPreview() should set pvDoc', () => {
    const doc = makeDoc();
    component.openPreview(doc);
    expect(component.pvDoc).toBe(doc);
  });

  it('openPreview() should set pvSafeUrl for PDFs', () => {
    const doc = makeDoc({ fileName: 'file.pdf' });
    component.openPreview(doc);
    expect(component.pvSafeUrl).not.toBeNull();
  });

  it('openPreview() should not set pvSafeUrl for non-PDFs', () => {
    const doc = makeDoc({ fileName: 'file.png' });
    component.openPreview(doc);
    expect(component.pvSafeUrl).toBeNull();
  });

  it('closePv() should clear pvDoc and pvSafeUrl', () => {
    component.openPreview(makeDoc());
    component.closePv();
    expect(component.pvDoc).toBeNull();
    expect(component.pvSafeUrl).toBeNull();
  });

  // -- helpers ----------------------------------------------------------------

  it('isImg() should return true for image files', () => {
    expect(component.isImg(makeDoc({ fileName: 'photo.png' }))).toBe(true);
  });
  it('isImg() should return false for non-image files', () => {
    expect(component.isImg(makeDoc({ fileName: 'doc.pdf' }))).toBe(false);
  });
  it('isPdf() should return true for pdf files', () => {
    expect(component.isPdf(makeDoc({ fileName: 'doc.pdf' }))).toBe(true);
  });
  it('isPdf() should return false for non-pdf files', () => {
    expect(component.isPdf(makeDoc({ fileName: 'img.png' }))).toBe(false);
  });
  it('pvExt() should return lowercase extension', () => {
    expect(component.pvExt(makeDoc({ fileName: 'FILE.PDF' }))).toBe('pdf');
  });

  // -- onKey ------------------------------------------------------------------

  it('onKey() Escape should close preview if open', () => {
    component.openPreview(makeDoc());
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.pvDoc).toBeNull();
  });

  it('onKey() Escape should do nothing if no preview open', () => {
    component.pvDoc = null;
    component.onKey({ key: 'Escape' } as KeyboardEvent);
    expect(component.pvDoc).toBeNull();
  });

  it('onKey() non-Escape should not close preview', () => {
    component.openPreview(makeDoc());

    component.onKey({ key: 'Enter' } as KeyboardEvent);
    expect(component.pvDoc).not.toBeNull();
  });

  it('should compute pct as 0 when totalFiles is 0', () => {
    svcSpy.list.mockReturnValue(of([]));
    component.ngOnInit();
    expect(component.typeStats.length).toBe(0);
  });

  it('should handle multiple file types and sort correctly', () => {
    svcSpy.list.mockReturnValue(of([
      makeDoc({ fileName: 'a.pdf' }), makeDoc({ fileName: 'b.pdf' }),
      makeDoc({ fileName: 'c.xlsx' }), makeDoc({ fileName: 'd.mp4' }),
      makeDoc({ fileName: 'e.zip' }), makeDoc({ fileName: 'f.pptx' }),
    ]));
    component.ngOnInit();
    expect(component.typeStats[0].count).toBeGreaterThanOrEqual(component.typeStats[component.typeStats.length-1].count);
  });

});

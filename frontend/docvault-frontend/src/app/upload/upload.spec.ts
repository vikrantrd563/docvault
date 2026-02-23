import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError, Observable } from 'rxjs';
import { vi } from 'vitest';
import { UploadComponent as Upload } from './upload.component';
import { DocumentService } from '../services/document.service';
import { MatSnackBar } from '@angular/material/snack-bar';

function makeFile(name = 'test.pdf', size = 1024, type = 'application/pdf'): File {
  return new File(['x'.repeat(size)], name, { type });
}

describe('Upload', () => {
  let component: Upload;
  let fixture: ComponentFixture<Upload>;
  let svcSpy: any;
  let snackSpy: any;

  beforeEach(async () => {
    svcSpy = { upload: vi.fn().mockReturnValue(of({ id: '1', fileName: 'test.pdf' })) };
    snackSpy = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Upload],
      providers: [
        provideRouter([]),
        provideAnimations(),
        { provide: DocumentService, useValue: svcSpy },
        { provide: MatSnackBar, useValue: snackSpy },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(Upload);
    component = fixture.componentInstance;
    (component as any).snack = snackSpy;

  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('should start with empty queue', () => { expect(component.queue.length).toBe(0); });
  it('should start with dragging false', () => { expect(component.dragging).toBe(false); });
  it('should start with uploading false', () => { expect(component.uploading).toBe(false); });

  it('enqueue() should add files to the queue', () => {
    component.enqueue([makeFile('a.pdf'), makeFile('b.docx')]);
    expect(component.queue.length).toBe(2);
  });
  it('enqueue() should not add duplicate files', () => {
    const f = makeFile('a.pdf', 1024);
    component.enqueue([f, f]);
    expect(component.queue.length).toBe(1);
  });
  it('enqueue() should set status to pending', () => {
    component.enqueue([makeFile('a.pdf')]);
    expect(component.queue[0].status).toBe('pending');
  });
  it('remove() should remove file at given index', () => {
    component.enqueue([makeFile('a.pdf'), makeFile('b.pdf')]);
    component.remove(0);
    expect(component.queue.length).toBe(1);
    expect(component.queue[0].file.name).toBe('b.pdf');
  });
  it('clearFinished() should remove done and error items', () => {
    component.enqueue([makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')]);
    component.queue[0].status = 'done';
    component.queue[1].status = 'error';
    component.clearFinished();
    expect(component.queue.length).toBe(1);
  });
  it('pendCount should count pending items', () => {
    component.enqueue([makeFile('a.pdf'), makeFile('b.pdf')]);
    component.queue[0].status = 'done';
    expect(component.pendCount).toBe(1);
  });
  it('doneCount should count done items', () => {
    component.enqueue([makeFile('a.pdf'), makeFile('b.pdf')]);
    component.queue[0].status = 'done';
    component.queue[1].status = 'done';
    expect(component.doneCount).toBe(2);
  });
  it('errCount should count error items', () => {
    component.enqueue([makeFile('a.pdf')]);
    component.queue[0].status = 'error';
    expect(component.errCount).toBe(1);
  });
  it('overallPct should return 0 when all pending', () => {
    component.enqueue([makeFile('a.pdf')]);
    expect(component.overallPct).toBe(0);
  });
  it('overallPct should return 100 when all done', () => {
    component.enqueue([makeFile('a.pdf')]);
    component.queue[0].status = 'done';
    expect(component.overallPct).toBe(100);
  });
  it('onDragOver() should set dragging to true', () => {
    const e = { preventDefault: vi.fn() } as any;
    component.onDragOver(e);
    expect(component.dragging).toBe(true);
  });
  it('onDrop() should enqueue dropped files', () => {
    const e = { preventDefault: vi.fn(), dataTransfer: { files: [makeFile('dropped.pdf')] } } as any;
    component.onDrop(e);
    expect(component.queue.length).toBe(1);
    expect(component.dragging).toBe(false);
  });
  it('onDrop() should handle null dataTransfer', () => {
    const e = { preventDefault: vi.fn(), dataTransfer: null } as any;
    component.onDrop(e);
    expect(component.queue.length).toBe(0);
  });
  it('onDragLeave() should set dragging to false when leaving container', () => {
    component.dragging = true;
    const el = document.createElement('div');
    const e = { currentTarget: el, relatedTarget: null } as any;
    component.onDragLeave(e);
    expect(component.dragging).toBe(false);
  });
  it('onPick() should enqueue selected files', () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [makeFile('picked.pdf')] });
    component.onPick({ target: input } as any);
    expect(component.queue.length).toBe(1);
  });
  it('overallPct should handle mixed statuses', () => {
    component.enqueue([makeFile('a.pdf'), makeFile('b.pdf')]);
    component.queue[0].status = 'done';
    component.queue[1].status = 'uploading';
    component.queue[1].progress = 50;
    expect(component.overallPct).toBeGreaterThan(0);
  });

  it('uploadAll() should do nothing if no pending items', () => {
    component.uploadAll();
    expect(svcSpy.upload).not.toHaveBeenCalled();
  });
  it('uploadAll() should upload pending files and show snack on success', () => {
    svcSpy.upload.mockReturnValue(of({ id: '1', fileName: 'a.pdf' }));
    component.enqueue([makeFile('a.pdf')]);
    component.uploadAll();
    expect(svcSpy.upload).toHaveBeenCalled();
    expect(snackSpy.open).toHaveBeenCalled();
  });
  it('uploadAll() should set item status to error on failure', async () => {
    vi.useFakeTimers();
    svcSpy.upload.mockReturnValue(throwError(() => ({ error: { message: 'Server error' } })));
    component.enqueue([makeFile('a.pdf')]);
    component.uploadAll();
    await vi.runAllTimersAsync();
    expect(component.queue[0].status).toBe('error');
    expect(component.uploading).toBe(false);
    vi.useRealTimers();
  });
  it('extInfo() should return icon info for known extensions', () => {
    const info = component.extInfo(makeFile('doc.pdf'));
    expect(info).toHaveProperty('icon');
  });
  it('extInfo() should return default for unknown extensions', () => {
    const info = component.extInfo(makeFile('file.xyz'));
    expect(info.icon).toBe('insert_drive_file');
  });
  it('fmtSize() should format bytes correctly', () => {
    expect(component.fmtSize(500)).toBe('500 B');
    expect(component.fmtSize(1536)).toBe('1.5 KB');
    expect(component.fmtSize(2097152)).toBe('2.0 MB');
  });
  it('trackIdx() should return the index', () => {
    expect(component.trackIdx(3)).toBe(3);
  });

  it('enqueue() should set preview for image files via FileReader', async () => {
    const mockResult = 'data:image/png;base64,abc';
    class MockFileReader {
      onload: any = null;
      readAsDataURL(_f: File) { setTimeout(() => this.onload({ target: { result: mockResult } }), 0); }
    }
    vi.stubGlobal('FileReader', MockFileReader);
    const imgFile = makeFile('photo.png', 100, 'image/png');
    component.enqueue([imgFile]);
    await new Promise(r => setTimeout(r, 20));
    expect(component.queue[0].preview).toBe(mockResult);
    vi.unstubAllGlobals();
  });

  it('uploadAll() should increment progress via setInterval tick', async () => {
    vi.useFakeTimers();
    let resolveFn: any;
    svcSpy.upload.mockReturnValue(new Observable((obs: any) => {
      resolveFn = () => { obs.next({ id: '1' }); obs.complete(); };
    }));
    component.enqueue([makeFile('a.pdf')]);
    component.uploadAll();
    await vi.advanceTimersByTimeAsync(300);
    expect(component.queue[0].progress).toBeGreaterThan(0);
    resolveFn();
    vi.useRealTimers();
  });
});











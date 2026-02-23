import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DocumentService } from './document.service';
import { environment } from '../../environments/environment';

describe('DocumentService', () => {
  let service: DocumentService;
  let http: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DocumentService]
    });
    service = TestBed.inject(DocumentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => { expect(service).toBeTruthy(); });

  it('list() should GET /documents', () => {
    const mock = [{ id: '1', fileName: 'a.pdf' }];
    service.list().subscribe(res => expect(res).toEqual(mock));
    http.expectOne(`${base}/documents`).flush(mock);
  });

  it('upload() should POST /documents', () => {
    const mock = { id: '1', fileName: 'a.pdf' };
    const fd = new FormData();
    service.upload(fd).subscribe(res => expect(res).toEqual(mock));
    http.expectOne(`${base}/documents`).flush(mock);
  });

  it('search() should GET /documents/search with encoded query', () => {
    const mock = [{ id: '1', fileName: 'a.pdf' }];
    service.search('hello world').subscribe(res => expect(res).toEqual(mock));
    http.expectOne(`${base}/documents/search?q=hello%20world`).flush(mock);
  });

  it('delete() should DELETE /documents/:id', () => {
    service.delete('abc123').subscribe();
    http.expectOne(`${base}/documents/abc123`).flush(null);
  });
});


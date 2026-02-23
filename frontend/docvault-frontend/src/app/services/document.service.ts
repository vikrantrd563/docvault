import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentMetadata {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  contentType: string;
  downloadUrl: string;
  excerpt?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {

  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  upload(formData: FormData): Observable<DocumentMetadata> {
    return this.http.post<DocumentMetadata>(`${this.apiUrl}/documents`, formData);
  }

  list(): Observable<DocumentMetadata[]> {
    return this.http.get<DocumentMetadata[]>(`${this.apiUrl}/documents`);
  }

  search(query: string): Observable<DocumentMetadata[]> {
    return this.http.get<DocumentMetadata[]>(
      `${this.apiUrl}/documents/search?q=${encodeURIComponent(query)}`);
  }

  rename(id: string, fileName: string): Observable<DocumentMetadata> {
    return this.http.patch<DocumentMetadata>(`${this.apiUrl}/documents/${id}/rename`, { fileName });
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${id}`);
  }
}


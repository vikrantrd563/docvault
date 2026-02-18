import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
 
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
  
 private readonly apiUrl = 'http://10.10.11.178:5251/api';



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
}

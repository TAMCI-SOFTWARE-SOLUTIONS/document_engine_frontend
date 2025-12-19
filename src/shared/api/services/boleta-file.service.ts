import {Injectable} from '@angular/core';
import {catchError, map, Observable, retry} from 'rxjs';
import {BaseService} from './base.service';

@Injectable({
  providedIn: 'root'
})
export class BoletaFileService extends BaseService {

  constructor() {
    super();
    this.resourceEndpoint = 'boletas';
  }


  generatePdf(
    file: File,
    horizontalDuplicado: boolean = false
  ): Observable<Blob> {

    const formData = new FormData();
    formData.append('file', file);
    formData.append('horizontalDuplicado', String(horizontalDuplicado));

    return this.http.post(
      `${this.resourcePath()}/pdf`,
      formData,
      {
        responseType: 'blob'
      }
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }


  generatePdfAndOpen(
    file: File,
    horizontalDuplicado: boolean = false
  ): Observable<void> {

    return this.generatePdf(file, horizontalDuplicado).pipe(
      map((blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
    );
  }

  generatePdfAndDownload(
    file: File,
    horizontalDuplicado: boolean = false,
    filename: string = 'boleta.pdf'
  ): Observable<void> {

    return this.generatePdf(file, horizontalDuplicado).pipe(
      map((blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
      })
    );
  }
}

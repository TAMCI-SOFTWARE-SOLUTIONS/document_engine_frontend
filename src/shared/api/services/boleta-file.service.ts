import {Injectable} from '@angular/core';
import {catchError, map, Observable, retry} from 'rxjs';
import {BaseService} from './base.service';

export interface PdfGenerationResult {
  blob: Blob;
  filename: string;
}

@Injectable({
  providedIn: 'root'
})
export class BoletaFileService extends BaseService {

  constructor() {
    super();
    this.resourceEndpoint = 'boletas';
  }


  private extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      console.warn('[BoletaFileService] Content-Disposition header no encontrado');
      return null;
    }

    console.log('[BoletaFileService] Content-Disposition:', contentDisposition);

    const filenameRegex = /filename\s*=\s*"?([^";\n]+)"?/i;
    const matches = filenameRegex.exec(contentDisposition);

    if (matches && matches[1]) {
      let filename = matches[1].trim();

      try {
        filename = decodeURIComponent(filename);
      } catch (e) {
      }

      console.log('[BoletaFileService] Filename extraído:', filename);
      return filename;
    }

    console.warn('[BoletaFileService] No se pudo extraer el filename del header');
    return null;
  }

  generatePdf(
    file: File,
    horizontalDuplicado: boolean = false
  ): Observable<PdfGenerationResult> {

    const formData = new FormData();
    formData.append('file', file);
    formData.append('horizontalDuplicado', String(horizontalDuplicado));

    return this.http.post(
      `${this.resourcePath()}/pdf`,
      formData,
      {
        responseType: 'blob',
        observe: 'response'
      }
    ).pipe(
      retry(1),
      map((response) => {
        console.log('[BoletaFileService] Response headers:', response.headers.keys());

        const blob = response.body as Blob;
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = this.extractFilenameFromContentDisposition(contentDisposition) || 'documento.pdf';

        console.log('[BoletaFileService] Resultado final:', { filename, blobSize: blob.size });

        return { blob, filename };
      }),
      catchError(this.handleError)
    );
  }


  generatePdfAndOpen(
    file: File,
    horizontalDuplicado: boolean = false
  ): Observable<void> {

    return this.generatePdf(file, horizontalDuplicado).pipe(
      map((result: PdfGenerationResult) => {
        const url = window.URL.createObjectURL(result.blob);
        window.open(url, '_blank');
      })
    );
  }

  generatePdfAndDownload(
    file: File,
    horizontalDuplicado: boolean = false
  ): Observable<void> {

    return this.generatePdf(file, horizontalDuplicado).pipe(
      map((result: PdfGenerationResult) => {
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = result.filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);
      })
    );
  }
}

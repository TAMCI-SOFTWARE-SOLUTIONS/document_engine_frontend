import {inject, Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {BoletaFileService} from './boleta-file.service';
import {PdfFileItem} from '../../model/entities/pdf-file-item.interface';

export interface XmlUploadConfig {
  maxSizeMB?: number;
  maxFiles?: number;
  horizontalDuplicado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FileUploadManagerService {
  private readonly boletaFileService = inject(BoletaFileService);

  validateXmlFile(file: File, config: XmlUploadConfig): string | null {
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (fileExt !== '.xml' && file.type !== 'text/xml' && file.type !== 'application/xml') {
      return 'Solo se permiten archivos XML.';
    }

    if (config.maxSizeMB) {
      const max = config.maxSizeMB * 1024 * 1024;
      if (file.size > max) {
        return `El archivo supera el máximo de ${config.maxSizeMB} MB.`;
      }
    }

    return null;
  }

  async processXmlToPdf(
    item: PdfFileItem,
    config: XmlUploadConfig
  ): Promise<{ success: boolean; pdfBlob?: Blob; pdfFilename?: string; error?: string }> {
    const validationError = this.validateXmlFile(item.xmlFile, config);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      const result = await firstValueFrom(
        this.boletaFileService.generatePdf(
          item.xmlFile,
          config.horizontalDuplicado ?? false
        )
      );

      return {
        success: true,
        pdfBlob: result.blob,
        pdfFilename: result.filename
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error generando PDF desde XML.',
      };
    }
  }
}

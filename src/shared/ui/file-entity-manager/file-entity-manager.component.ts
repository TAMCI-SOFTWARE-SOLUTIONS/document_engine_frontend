import {CommonModule} from '@angular/common';
import {Component, HostListener, inject, input, OnDestroy, output, signal,} from '@angular/core';
import {FileUploaderComponent} from '../file-uploader/file-uploader.component';
import {FileUploadManagerService, XmlUploadConfig,} from '../../api/services/file-upload-manager.service';
import {ButtonComponent} from '../button/button.component';
import {generateUUID} from '../../model/utils/uuid.util';
import {PdfFileStore} from '../../model/stores/pdf-file.store';
import {PdfFileItem} from '../../model/entities/pdf-file-item.interface';

export interface FileUploadRejection {
  file: File;
  reason: 'type' | 'size' | 'maxFiles';
  message: string;
}

@Component({
  selector: 'app-file-entity-manager',
  standalone: true,
  imports: [CommonModule, FileUploaderComponent, ButtonComponent],
  templateUrl: './file-entity-manager.component.html',
})
export class FileEntityManagerComponent implements OnDestroy {
  label = input<string>('Archivos XML');
  description = input<string>('Sube archivos XML para generar PDFs');
  variant = input<'sm' | 'md' | 'lg'>('md');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  maxSizeMB = input<number>(10);
  maxFiles = input<number>(20);
  multiple = input<boolean>(true);
  horizontalDuplicado = input<boolean>(false);

  rejections = output<FileUploadRejection[]>();
  processingComplete = output<void>();

  private readonly uploadManager = inject(FileUploadManagerService);
  private readonly store = new PdfFileStore();

  readonly allItems = this.store.allItems;
  readonly processing = this.store.processing;
  readonly completed = this.store.completed;
  readonly failed = this.store.failed;
  readonly hasProcessing = this.store.hasProcessing;

  readonly showDeleteConfirmModal = signal<boolean>(false);
  readonly itemToDelete = signal<PdfFileItem | null>(null);

  private destroyed = false;

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasProcessing()) {
      event.preventDefault();
      event.returnValue = 'Hay archivos procesándose. Si sales ahora, perderás el progreso.';
    }
  }

  async onValidFiles(rawFiles: File[]): Promise<void> {
    if (!rawFiles.length) return;

    const { valid, rejected } = this.validateFiles(rawFiles);

    if (rejected.length) {
      this.rejections.emit(rejected);
    }

    if (!valid.length) return;

    const config: XmlUploadConfig = {
      maxSizeMB: this.maxSizeMB(),
      maxFiles: this.maxFiles(),
      horizontalDuplicado: this.horizontalDuplicado(),
    };

    for (const xmlFile of valid) {
      const id = generateUUID();
      const item: PdfFileItem = {
        id,
        originalXmlName: xmlFile.name,
        xmlFile,
        pdfBlob: null,
        pdfUrl: null,
        pdfFilename: null,
        status: 'pending',
        horizontalDuplicado: config.horizontalDuplicado,
      };

      this.store.addItem(item);
    }

    await this.processQueue(config);
  }

  private async processQueue(config: XmlUploadConfig): Promise<void> {
    const pending = this.allItems().filter((item) => item.status === 'pending');

    for (const item of pending) {
      if (this.destroyed) break;

      this.store.updateItem(item.id, { status: 'processing' });

      const result = await this.uploadManager.processXmlToPdf(item, config);

      if (result.success && result.pdfBlob) {
        const pdfUrl = URL.createObjectURL(result.pdfBlob);
        this.store.updateItem(item.id, {
          status: 'success',
          pdfBlob: result.pdfBlob,
          pdfUrl,
          pdfFilename: result.pdfFilename || 'documento.pdf',
        });
      } else {
        this.store.updateItem(item.id, {
          status: 'error',
          error: result.error || 'Error desconocido',
        });
      }
    }

    if (!this.hasProcessing()) {
      this.processingComplete.emit();
    }
  }

  private validateFiles(files: File[]): {
    valid: File[];
    rejected: FileUploadRejection[];
  } {
    const rejected: FileUploadRejection[] = [];
    const valid: File[] = [];

    const maxFiles = this.maxFiles();
    const currentCount = this.allItems().length;
    let slots = maxFiles - currentCount;

    for (const file of files) {
      if (slots <= 0) {
        rejected.push({
          file,
          reason: 'maxFiles',
          message: `Máximo permitido: ${maxFiles} archivos.`,
        });
        continue;
      }

      if (!this.isXmlFile(file)) {
        rejected.push({
          file,
          reason: 'type',
          message: 'Solo se permiten archivos XML.',
        });
        continue;
      }

      const sizeError = this.validateSize(file);
      if (sizeError) {
        rejected.push({
          file,
          reason: 'size',
          message: sizeError,
        });
        continue;
      }

      valid.push(file);
      slots--;
    }

    return { valid, rejected };
  }

  private isXmlFile(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return (
      ext === '.xml' || file.type === 'text/xml' || file.type === 'application/xml'
    );
  }

  private validateSize(file: File): string | null {
    const maxMB = this.maxSizeMB();
    const maxBytes = maxMB * 1_048_576;
    return file.size > maxBytes ? `El archivo supera el máximo de ${maxMB} MB.` : null;
  }

  onOpenPdf(item: PdfFileItem): void {
    if (!item.pdfUrl) return;
    window.open(item.pdfUrl, '_blank');
  }

  onDownloadPdf(item: PdfFileItem): void {
    if (!item.pdfUrl) return;
    const pdfName = item.pdfFilename || item.originalXmlName.replace(/\.xml$/i, '.pdf');
    const a = document.createElement('a');
    a.href = item.pdfUrl;
    a.download = pdfName;
    a.target = '_blank';
    a.click();
  }

  async onDownloadAll(): Promise<void> {
    const successItems = this.completed();
    if (successItems.length === 0) return;

    // Crear un mapa para detectar nombres duplicados
    const nameCount = new Map<string, number>();
    const itemsWithUniqueNames: Array<{ item: PdfFileItem; uniqueName: string }> = [];

    // Primera pasada: contar duplicados y generar nombres únicos
    for (const item of successItems) {
      if (!item.pdfUrl) continue;

      const baseName = item.pdfFilename || item.originalXmlName.replace(/\.xml$/i, '.pdf');
      const count = nameCount.get(baseName) || 0;
      nameCount.set(baseName, count + 1);

      let uniqueName = baseName;
      if (count > 0) {
        // Si es duplicado, agregar "-REPETIDO" antes de la extensión
        const extensionIndex = baseName.lastIndexOf('.pdf');
        if (extensionIndex !== -1) {
          const nameWithoutExt = baseName.substring(0, extensionIndex);
          uniqueName = `${nameWithoutExt}-REPETIDO.pdf`;
        } else {
          uniqueName = `${baseName}-REPETIDO`;
        }
      }

      itemsWithUniqueNames.push({ item, uniqueName });
    }

    // Segunda pasada: descargar cada archivo con un pequeño delay
    for (let i = 0; i < itemsWithUniqueNames.length; i++) {
      const { item, uniqueName } = itemsWithUniqueNames[i];

      const a = document.createElement('a');
      a.href = item.pdfUrl!;
      a.download = uniqueName;
      a.target = '_blank';
      a.click();

      // Delay de 300ms entre descargas para evitar bloqueo del navegador
      if (i < itemsWithUniqueNames.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  onRequestDelete(item: PdfFileItem): void {
    this.itemToDelete.set(item);
    this.showDeleteConfirmModal.set(true);
  }

  onCancelDelete(): void {
    this.showDeleteConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  onConfirmDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.store.removeItem(item.id);
    this.showDeleteConfirmModal.set(false);
    this.itemToDelete.set(null);
  }

  getItemNameForDelete(): string {
    const item = this.itemToDelete();
    return item?.originalXmlName || '';
  }

  getItemStatusLabel(status: PdfFileItem['status']): string {
    const labels: Record<PdfFileItem['status'], string> = {
      pending: 'Pendiente',
      processing: 'Procesando...',
      success: 'Completado',
      error: 'Error',
    };
    return labels[status];
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.store.clearAll();
  }
}

import {computed, signal} from '@angular/core';
import {PdfFileItem} from '../entities/pdf-file-item.interface';

export class PdfFileStore {
  private readonly items = signal<PdfFileItem[]>([]);

  readonly allItems = this.items.asReadonly();

  readonly processing = computed(() =>
    this.items().filter(item => item.status === 'processing')
  );

  readonly completed = computed(() =>
    this.items().filter(item => item.status === 'success')
  );

  readonly failed = computed(() =>
    this.items().filter(item => item.status === 'error')
  );

  readonly hasProcessing = computed(() =>
    this.items().some(item => item.status === 'processing')
  );

  readonly totalCount = computed(() => this.items().length);

  addItem(item: PdfFileItem): void {
    this.items.update(current => [...current, item]);
  }

  updateItem(id: string, updates: Partial<PdfFileItem>): void {
    this.items.update(current =>
      current.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  removeItem(id: string): void {
    const item = this.items().find(i => i.id === id);
    if (item?.pdfUrl) {
      URL.revokeObjectURL(item.pdfUrl);
    }
    this.items.update(current => current.filter(i => i.id !== id));
  }

  clearAll(): void {
    this.items().forEach(item => {
      if (item.pdfUrl) {
        URL.revokeObjectURL(item.pdfUrl);
      }
    });
    this.items.set([]);
  }

  getItem(id: string): PdfFileItem | undefined {
    return this.items().find(item => item.id === id);
  }
}

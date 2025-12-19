import {inject, Injectable, OnDestroy} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {BoletaFileService} from './boleta-file.service';

@Injectable({
  providedIn: 'root'
})
export class BoletaFileCacheService implements OnDestroy {

  private readonly boletaFileService = inject(BoletaFileService);

  /**
   * cacheKey -> blobUrl
   */
  private readonly cache = new Map<string, string>();

  /**
   * cacheKey -> pending promise
   */
  private readonly pendingRequests = new Map<string, Promise<string | null>>();

  /**
   * Obtiene la URL del PDF generado (con cache)
   */
  async getPdfUrl(
    cacheKey: string,
    file: File,
    horizontalDuplicado: boolean = false
  ): Promise<string | null> {

    if (!cacheKey) {
      return null;
    }

    // 1. Cache hit
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 2. Request ya en curso
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // 3. Nueva generación
    const requestPromise = this.fetchAndCachePdf(
      cacheKey,
      file,
      horizontalDuplicado
    );

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchAndCachePdf(
    cacheKey: string,
    file: File,
    horizontalDuplicado: boolean
  ): Promise<string | null> {

    try {
      const blob = await firstValueFrom(
        this.boletaFileService.generatePdf(file, horizontalDuplicado)
      );

      const blobUrl = URL.createObjectURL(blob);
      this.cache.set(cacheKey, blobUrl);

      return blobUrl;

    } catch (error) {
      console.error('Error generating boleta PDF:', cacheKey, error);
      return null;
    }
  }

  /**
   * Precarga múltiples PDFs
   */
  async preloadPdfs(
    items: {
      cacheKey: string;
      file: File;
      horizontalDuplicado?: boolean;
    }[]
  ): Promise<void> {

    if (!items || items.length === 0) {
      return;
    }

    const promises = items.map(item =>
      this.getPdfUrl(
        item.cacheKey,
        item.file,
        item.horizontalDuplicado ?? false
      )
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.warn('Some PDFs failed to preload', error);
    }
  }

  isCached(cacheKey: string): boolean {
    return this.cache.has(cacheKey);
  }

  invalidate(cacheKey: string): void {
    if (!this.cache.has(cacheKey)) return;

    const blobUrl = this.cache.get(cacheKey)!;
    URL.revokeObjectURL(blobUrl);
    this.cache.delete(cacheKey);
  }

  clearAll(): void {
    this.cache.forEach(blobUrl => {
      URL.revokeObjectURL(blobUrl);
    });

    this.cache.clear();
    this.pendingRequests.clear();
  }

  getCacheStats(): { size: number; pendingRequests: number } {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  ngOnDestroy(): void {
    this.clearAll();
  }
}

import { Component } from '@angular/core';
import { FileEntityManagerComponent } from '../../../shared/ui/file-entity-manager/file-entity-manager.component';
import { FileUploadRejection } from '../../../shared/ui/file-entity-manager/file-entity-manager.component';

@Component({
  selector: 'app-xml-to-pdf-converter',
  standalone: true,
  imports: [FileEntityManagerComponent],
  templateUrl: './xml-to-pdf-converter.component.html',
  styleUrl: './xml-to-pdf-converter.component.css',
})
export class XmlToPdfConverterComponent {
  orientation: 'vertical' | 'horizontal' = 'horizontal';

  onRejections(rejections: FileUploadRejection[]): void {
    console.warn('Archivos rechazados:', rejections);
  }

  onProcessingComplete(): void {
    console.log('Procesamiento completado');
  }

  setOrientation(orientation: 'vertical' | 'horizontal'): void {
    this.orientation = orientation;
  }
}

import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './file-uploader.component.html',
})
export class FileUploaderComponent {
  variant = input<'sm' | 'md' | 'lg'>('md');
  label = input<string>('Archivos');
  description = input<string>('Arrastra archivos o haz clic para seleccionarlos.');
  disabled = input<boolean>(false);

  accept = input<string | null>(null);
  multiple = input<boolean>(true);

  filesSelected = output<File[]>();

  readonly isDragging = signal(false);

  zoneClasses = computed(
    () =>
      ({
        sm: 'py-3 px-4 gap-3 text-sm',
        md: 'py-4 px-5 gap-4 text-base',
        lg: 'py-8 px-6 flex-col gap-3 text-lg text-center',
      })[this.variant()],
  );

  iconClasses = computed(
    () =>
      ({
        sm: 'text-base',
        md: 'text-xl',
        lg: 'text-2xl',
      })[this.variant()],
  );

  onClick(input: HTMLInputElement) {
    if (!this.disabled()) input.click();
  }

  onFileInput(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    if (!target.files) return;
    const files = Array.from(target.files);
    this.filesSelected.emit(files);
    target.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.disabled()) this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
      this.filesSelected.emit(files);
    }
  }
}

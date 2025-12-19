import {Component, computed, contentChild, input, output, TemplateRef} from '@angular/core';
import {CommonModule} from '@angular/common';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'ghost'
  | 'link';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export interface ButtonContext {
  state: ButtonState;
  disabled: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly state = input<ButtonState>('idle');

  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);

  readonly icon = input<string>('');
  readonly iconRight = input<string>('');
  readonly loadingIcon = input<string>('pi-spinner');

  readonly label = input<string>('');
  readonly loadingLabel = input<string>('Cargando...');

  readonly ariaLabel = input<string>('');
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  readonly customTemplate = contentChild<TemplateRef<ButtonContext>>('customContent');

  readonly clicked = output<MouseEvent>();

  readonly isDisabled = computed(
    () => this.disabled() || this.loading() || this.state() === 'loading',
  );

  readonly isLoading = computed(() => this.loading() || this.state() === 'loading');

  readonly currentLabel = computed(() => {
    if (this.isLoading() && this.loadingLabel()) return this.loadingLabel();
    return this.label();
  });

  readonly buttonClasses = computed(() => {
    const classes: string[] = [
      this.fullWidth()
        ? 'flex w-full items-center justify-center'
        : 'inline-flex items-center justify-center',

      'gap-2 font-medium transition-all duration-200 rounded-lg',
      'focus:outline-none focus:ring-1 focus:ring-sky-300 focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-60',
    ];

    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'px-2.5 py-1.5 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
    };
    classes.push(sizeClasses[this.size()]);
    classes.push(this.getVariantClasses());

    return classes.join(' ');
  });

  readonly iconClasses = computed(() => {
    const sizeMap: Record<ButtonSize, string> = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };
    return `pi ${sizeMap[this.size()]}`;
  });

  readonly context = computed<ButtonContext>(() => ({
    state: this.state(),
    disabled: this.isDisabled(),
    loading: this.isLoading(),
  }));

  private getVariantClasses(): string {
    const variant = this.variant();

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-gradient-to-r from-sky-500 to-cyan-500 text-white ' +
        'hover:shadow-md hover:shadow-sky-500/30 ' +
        'active:scale-[0.98]',

      secondary:
        'bg-white text-gray-700 border border-gray-300 ' +
        'hover:bg-gray-50 hover:border-gray-400',

      success:
        'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700',

      danger:
        'bg-red-600 text-white border border-red-600 hover:bg-red-700',

      warning:
        'bg-amber-500 text-white border border-amber-500 hover:bg-amber-600',

      ghost:
        'bg-transparent text-gray-600 hover:bg-gray-100',

      link:
        'bg-transparent text-sky-600 hover:underline',
    };

    return variants[variant];
  }

  onClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      return;
    }
    this.clicked.emit(event);
  }
}

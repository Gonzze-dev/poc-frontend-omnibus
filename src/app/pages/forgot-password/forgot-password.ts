import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: '../login/login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email } = this.form.getRawValue();

    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set(
          res.message || 'Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.',
        );
      },
      error: (err: { error?: unknown }) => {
        this.loading.set(false);
        const msg =
          typeof err?.error === 'string'
            ? err.error
            : err?.error != null && typeof err.error === 'object' && 'message' in err.error
              ? String((err.error as { message?: string }).message)
              : null;
        this.errorMessage.set(msg || 'No se pudo enviar la solicitud. Intentá de nuevo.');
      },
    });
  }
}

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordsMatchGroupValidator(
  group: AbstractControl,
): ValidationErrors | null {
  const pwd = group.get('password');
  const conf = group.get('confirmPassword');
  if (!pwd || !conf) {
    return null;
  }
  const a = pwd.value as string;
  const b = conf.value as string;
  if (!a?.length || !b?.length) {
    return null;
  }
  return a === b ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './reset-password.html',
  styleUrl: '../login/login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly missingToken = signal(false);
  readonly validating = signal(true);
  readonly tokenOk = signal(false);
  readonly tokenError = signal<string | null>(null);
  readonly expiresAt = signal<string | null>(null);

  private readonly recoveryToken = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatchGroupValidator] },
  );

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (!token) {
      this.missingToken.set(true);
      this.validating.set(false);
      return;
    }

    this.recoveryToken.set(token);

    this.auth
      .validateRecoveryToken(token)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res) => {
          this.validating.set(false);
          if (res.valid) {
            this.tokenOk.set(true);
            this.expiresAt.set(res.expiresAt);
          } else {
            this.tokenError.set('El enlace no es válido o expiró.');
          }
        },
        error: () => {
          this.validating.set(false);
          this.tokenError.set('El enlace no es válido o expiró.');
        },
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.recoveryToken();
    if (!token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { password } = this.form.getRawValue();

    this.auth.resetPassword(token, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/login'], {
          queryParams: { reset: 'ok' },
        });
      },
      error: (err: { error?: unknown }) => {
        this.loading.set(false);
        const msg =
          typeof err?.error === 'string'
            ? err.error
            : err?.error != null && typeof err.error === 'object' && 'message' in err.error
              ? String((err.error as { message?: string }).message)
              : null;
        this.errorMessage.set(
          msg || 'No se pudo actualizar la contraseña. El enlace podría haber expirado.',
        );
      },
    });
  }
}

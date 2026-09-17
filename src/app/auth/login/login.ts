import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

type Mode = 'signin' | 'signup' | 'verify';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);

  protected readonly mode = signal<Mode>('signin');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly name = signal('');
  protected readonly otp = signal('');
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly info = signal<string | null>(null);

  protected readonly emailValid = computed(() => EMAIL_RE.test(this.email().trim()));
  protected readonly passwordValid = computed(() => this.password().length >= MIN_PASSWORD);
  protected readonly otpValid = computed(() => this.otp().trim().length > 0);

  protected readonly formValid = computed(() => {
    if (this.submitting()) return false;
    const m = this.mode();
    if (m === 'signin') return this.emailValid() && this.passwordValid();
    if (m === 'signup') return this.emailValid() && this.passwordValid();
    return this.otpValid();
  });

  protected readonly passwordInputType = computed(() => (this.showPassword() ? 'text' : 'password'));

  protected toggleMode(): void {
    this.mode.update(m => {
      this.clearMessages();
      return m === 'signin' ? 'signup' : 'signin';
    });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.formValid()) {
      return;
    }
    this.clearMessages();
    this.submitting.set(true);
    try {
      const m = this.mode();
      if (m === 'signin') {
        await this.auth.signIn(this.email().trim(), this.password());
      } else if (m === 'signup') {
        await this.auth.signUp(this.email().trim(), this.password(), this.name().trim() || undefined);
      } else {
        await this.auth.verifyEmail(this.email(), this.otp().trim());
      }
    } catch (e) {
      this.error.set(extractMessage(e));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async onResendOtp(): Promise<void> {
    const email = this.auth.pendingVerificationEmail() ?? this.email();
    if (!email) {
      return;
    }
    this.clearMessages();
    this.submitting.set(true);
    try {
      await this.auth.resendVerification(email);
      this.info.set('Te reenviamos el código. Revisa tu email.');
    } catch (e) {
      this.error.set(extractMessage(e));
    } finally {
      this.submitting.set(false);
    }
  }

  protected onBackToSignIn(): void {
    this.clearMessages();
    this.otp.set('');
    this.mode.set('signin');
  }

  private clearMessages(): void {
    this.error.set(null);
    this.info.set(null);
  }
}

function extractMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    const body = e.error;
    if (body && typeof body === 'object') {
      if (typeof body.message === 'string' && body.message) {
        return body.message;
      }
      if (typeof body.error === 'string' && body.error) {
        return body.error;
      }
    }
    return `HTTP ${e.status} ${e.statusText || 'sin detalle'}`;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'Error desconocido';
}

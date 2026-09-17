import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

type Mode = 'signin' | 'signup' | 'verify';

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
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly info = signal<string | null>(null);

  protected toggleMode(): void {
    this.mode.update(m => {
      if (m === 'signin') {
        this.clearMessages();
        return 'signup';
      }
      this.clearMessages();
      return 'signin';
    });
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.clearMessages();
    this.submitting.set(true);
    try {
      const m = this.mode();
      if (m === 'signin') {
        await this.auth.signIn(this.email(), this.password());
      } else if (m === 'signup') {
        await this.auth.signUp(this.email(), this.password(), this.name());
      } else {
        await this.auth.verifyEmail(this.email(), this.otp());
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

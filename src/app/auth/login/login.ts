import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);

  protected readonly mode = signal<'signin' | 'signup'>('signin');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly name = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected toggleMode(): void {
    this.mode.update(m => (m === 'signin' ? 'signup' : 'signin'));
    this.error.set(null);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set(null);
    this.submitting.set(true);
    try {
      if (this.mode() === 'signin') {
        await this.auth.signIn(this.email(), this.password());
      } else {
        await this.auth.signUp(this.email(), this.password(), this.name());
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      this.submitting.set(false);
    }
  }
}

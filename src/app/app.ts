import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NewTask, Task, TasksService } from './tasks';
import { TaskItem } from './task-item/task-item';
import { TaskForm } from './task-form/task-form';
import { AuthService } from './auth/auth.service';
import { Login } from './auth/login/login';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TaskItem, TaskForm, Login],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private tasksService = inject(TasksService);
  protected auth = inject(AuthService);

  protected readonly tasks = this.tasksService.value;
  protected readonly pendingCount = this.tasksService.pendingCount;
  protected readonly isLoading = this.tasksService.isLoading;
  protected readonly error = this.tasksService.error;

  protected readonly editing = signal<Task | null>(null);
  protected readonly isCreating = signal(false);

  onToggle(id: string): void {
    const task = this.tasks().find(t => t.id === id);
    if (task) {
      void this.tasksService.toggleDone(task);
    }
  }

  onRemove(id: string): void {
    void this.tasksService.remove(id);
  }

  onEdit(task: Task): void {
    this.editing.set(task);
    this.isCreating.set(false);
  }

  onCancelEdit(): void {
    this.editing.set(null);
    this.isCreating.set(false);
  }

  onStartCreate(): void {
    this.editing.set(null);
    this.isCreating.set(true);
  }

  async onSave(task: NewTask | Task): Promise<void> {
    if ('id' in task) {
      const existing = task as Task;
      await this.tasksService.update(existing.id, existing);
      this.editing.set(null);
    } else {
      const userId = this.auth.currentUser()?.id ?? null;
      await this.tasksService.create(task as NewTask, userId);
      this.isCreating.set(false);
    }
  }

  onSignOut(): void {
    this.auth.signOut();
    this.editing.set(null);
    this.isCreating.set(false);
  }

  protected getErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return 'algo falló';
  }
}

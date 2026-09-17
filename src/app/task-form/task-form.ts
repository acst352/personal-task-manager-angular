import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewTask, Task } from '../task';

export type TaskDraft = NewTask | Task;

@Component({
  selector: 'app-task-form',
  imports: [FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm {
  task = input<Task | null>(null);

  save = output<TaskDraft>();
  cancel = output<void>();

  protected readonly title = signal('');
  protected readonly priority = signal<'low' | 'medium' | 'high'>('medium');

  protected readonly isEdit = computed(() => this.task() !== null);

  constructor() {
    queueMicrotask(() => {
      const existing = this.task();
      if (existing) {
        this.title.set(existing.title);
        this.priority.set(existing.priority);
      }
    });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    const title = this.title().trim();
    if (!title) {
      return;
    }
    const priority = this.priority();
    const existing = this.task();
    if (existing) {
      this.save.emit({ ...existing, title, priority });
    } else {
      this.save.emit({ title, done: false, priority });
    }
  }
}

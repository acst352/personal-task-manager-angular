import { Injectable, computed, signal } from '@angular/core';
import { Task } from './task';

export type NewTask = Omit<Task, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly _tasks = signal<Task[]>([]);

  readonly tasks = this._tasks.asReadonly();
  readonly pendingCount = computed(() => this._tasks().filter(t => !t.done).length);

  toggle(id: number): void {
    this._tasks.update(arr =>
      arr.map(t => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  remove(id: number): void {
    this._tasks.update(arr => arr.filter(t => t.id !== id));
  }

  add(task: NewTask): Task {
    const created: Task = { ...task, id: this.nextId() };
    this._tasks.update(arr => [...arr, created]);
    return created;
  }

  update(task: Task): void {
    this._tasks.update(arr => arr.map(t => (t.id === task.id ? task : t)));
  }

  private nextId(): number {
    return this._tasks().reduce((max, t) => Math.max(max, t.id), 0) + 1;
  }
}

import { Injectable, computed, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { environment } from '../environments/environment';
import { NewTask, Task, TaskUpdate } from './task';

export type { NewTask, Task, TaskUpdate } from './task';

const TABLE = 'tasks';

interface CreatePayload extends NewTask {
  user_id?: string | null;
}
type UpdatePayload = TaskUpdate;

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private http = inject(HttpClient);

  readonly tasks = httpResource<Task[]>(() => ({
    url: `${environment.insforge.baseUrl}/api/database/records/${TABLE}?select=*&order=created_at.desc`,
    headers: { apikey: environment.insforge.anonKey },
  }));

  readonly value = computed(() => this.tasks.value() ?? []);
  readonly isLoading = computed(() => this.tasks.isLoading());
  readonly error = computed(() => this.tasks.error());

  readonly pendingCount = computed(
    () => this.value().filter(t => !t.done).length,
  );

  async create(task: NewTask, userId: string | null = null): Promise<Task> {
    const payload: CreatePayload = { ...task, user_id: userId };
    const res = await this.http
      .post<Task[]>(
        `${environment.insforge.baseUrl}/api/database/records/${TABLE}`,
        [payload],
        {
          headers: {
            apikey: environment.insforge.anonKey,
            Prefer: 'return=representation',
          },
        },
      )
      .toPromise();
    const created = (res ?? [])[0];
    this.tasks.reload();
    return created;
  }

  async update(id: string, patch: TaskUpdate): Promise<Task> {
    const payload: UpdatePayload = patch;
    const res = await this.http
      .patch<Task[]>(
        `${environment.insforge.baseUrl}/api/database/records/${TABLE}?id=eq.${id}`,
        payload,
        {
          headers: {
            apikey: environment.insforge.anonKey,
            Prefer: 'return=representation',
          },
        },
      )
      .toPromise();
    const updated = (res ?? [])[0];
    this.tasks.reload();
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.http
      .delete(
        `${environment.insforge.baseUrl}/api/database/records/${TABLE}?id=eq.${id}`,
        { headers: { apikey: environment.insforge.anonKey } },
      )
      .toPromise();
    this.tasks.reload();
  }

  async toggleDone(task: Task): Promise<Task> {
    return this.update(task.id, { ...task, done: !task.done });
  }
}

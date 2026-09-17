import { Injectable, computed, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { environment } from '../environments/environment';
import { NewTask, Task, TaskUpdate } from './task';
import { AuthService } from './auth/auth.service';

export type { NewTask, Task, TaskUpdate } from './task';

const TABLE = 'tasks';

interface CreatePayload extends NewTask {
  user_id: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly tasks = httpResource<Task[]>(() => ({
    url: `${environment.insforge.baseUrl}/api/database/records/${TABLE}?select=*&order=created_at.desc`,
    headers: { 'X-Track-User': this.auth.currentUser()?.id ?? 'anon' },
  }));

  readonly value = computed(() => this.tasks.value() ?? []);
  readonly isLoading = computed(() => this.tasks.isLoading());
  readonly error = computed(() => this.tasks.error());

  readonly pendingCount = computed(
    () => this.value().filter(t => !t.done).length,
  );

  async create(task: NewTask, userId: string): Promise<Task> {
    const payload: CreatePayload = { ...task, user_id: userId };
    const res = await this.http
      .post<Task[]>(
        `${environment.insforge.baseUrl}/api/database/records/${TABLE}`,
        [payload],
        { headers: { Prefer: 'return=representation' } },
      )
      .toPromise();
    const created = (res ?? [])[0];
    if (!created) {
      throw new Error('No se pudo crear la tarea');
    }
    this.tasks.reload();
    return created;
  }

  async update(id: string, patch: TaskUpdate): Promise<Task> {
    const res = await this.http
      .patch<Task[]>(
        `${environment.insforge.baseUrl}/api/database/records/${TABLE}?id=eq.${id}`,
        patch,
        { headers: { Prefer: 'return=representation' } },
      )
      .toPromise();
    const updated = (res ?? [])[0];
    if (!updated) {
      throw new Error('No se pudo actualizar la tarea (no existe o no tienes permiso)');
    }
    this.tasks.reload();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const res = await this.http
      .delete<Task[]>(
        `${environment.insforge.baseUrl}/api/database/records/${TABLE}?id=eq.${id}`,
        { headers: { Prefer: 'return=representation' } },
      )
      .toPromise();
    if (!res || res.length === 0) {
      throw new Error('No se pudo borrar la tarea (no existe o no tienes permiso)');
    }
    this.tasks.reload();
  }

  async toggleDone(task: Task): Promise<Task> {
    return this.update(task.id, { ...task, done: !task.done });
  }
}

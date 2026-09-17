import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TasksService } from './tasks';
import { Task } from './task';
import { environment } from '../environments/environment';

describe('TasksService', () => {
  let service: TasksService;
  let httpMock: HttpTestingController;

  const TASKS_URL = `${environment.insforge.baseUrl}/api/database/records/tasks`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TasksService],
    });
    service = TestBed.inject(TasksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('create', () => {
    it('POSTs to tasks with user_id matching caller', async () => {
      const promise = service.create(
        { title: 't', done: false, priority: 'medium' },
        'user-uuid-1',
      );
      const req = httpMock.expectOne(TASKS_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Prefer')).toBe('return=representation');
      expect(req.request.body).toEqual([
        { title: 't', done: false, priority: 'medium', user_id: 'user-uuid-1' },
      ]);
      req.flush([{
        id: 'new-id', title: 't', done: false, priority: 'medium',
        user_id: 'user-uuid-1', created_at: 't', updated_at: 't',
      }]);
      const result = await promise;
      expect(result.id).toBe('new-id');
    });

    it('throws on 403 RLS denial — bug #2 regression', async () => {
      const promise = service.create(
        { title: 't', done: false, priority: 'medium' },
        'wrong-user',
      );
      const req = httpMock.expectOne(TASKS_URL);
      req.flush(
        { code: '42501', message: 'new row violates row-level security policy' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(promise).rejects.toBeDefined();
    });

    it('throws when response array is empty', async () => {
      const promise = service.create(
        { title: 't', done: false, priority: 'medium' },
        'u1',
      );
      const req = httpMock.expectOne(TASKS_URL);
      req.flush([]);
      await expect(promise).rejects.toThrow(/crear/i);
    });
  });

  describe('update', () => {
    it('PATCHes with id filter and representation', async () => {
      const promise = service.update('task-1', { title: 'new', done: true, priority: 'high' });
      const req = httpMock.expectOne(`${TASKS_URL}?id=eq.task-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.get('Prefer')).toBe('return=representation');
      expect(req.request.body).toEqual({ title: 'new', done: true, priority: 'high' });
      req.flush([{
        id: 'task-1', title: 'new', done: true, priority: 'high',
        user_id: 'u1', created_at: 't', updated_at: 't',
      }]);
      const result = await promise;
      expect(result.title).toBe('new');
    });

    it('throws when 0 rows returned — bug #1 regression on update', async () => {
      const promise = service.update('not-mine', { title: 'x', done: true, priority: 'low' });
      const req = httpMock.expectOne(`${TASKS_URL}?id=eq.not-mine`);
      req.flush([]);
      await expect(promise).rejects.toThrow(/actualizar/i);
    });
  });

  describe('remove — bug #1 regression', () => {
    it('DELETEs with id filter and representation', async () => {
      const promise = service.remove('task-1');
      const req = httpMock.expectOne(`${TASKS_URL}?id=eq.task-1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('Prefer')).toBe('return=representation');
      req.flush([{
        id: 'task-1', title: 'gone', done: false, priority: 'low',
        user_id: 'u1', created_at: 't', updated_at: 't',
      }]);
      await promise;
    });

    it('throws when 0 rows returned — silent DELETE would have failed here', async () => {
      const promise = service.remove('not-mine');
      const req = httpMock.expectOne(`${TASKS_URL}?id=eq.not-mine`);
      req.flush([]);
      await expect(promise).rejects.toThrow(/borrar/i);
    });

    it('throws on 403 RLS denial', async () => {
      const promise = service.remove('not-mine');
      const req = httpMock.expectOne(`${TASKS_URL}?id=eq.not-mine`);
      req.flush(
        { code: '42501', message: 'permission denied' },
        { status: 403, statusText: 'Forbidden' },
      );
      await expect(promise).rejects.toBeDefined();
    });
  });

  describe('toggleDone', () => {
    it('inverts the done flag via PATCH', async () => {
      const task: Task = {
        id: 'task-1', title: 't', done: false, priority: 'medium',
        user_id: 'u1', created_at: 't', updated_at: 't',
      };
      const promise = service.toggleDone(task);
      const req = httpMock.expectOne(`${TASKS_URL}?id=eq.task-1`);
      expect(req.request.body).toMatchObject({ id: 'task-1', done: true });
      req.flush([{ ...task, done: true }]);
      const result = await promise;
      expect(result.done).toBe(true);
      expect(result.id).toBe('task-1');
    });
  });

  describe('derived signals', () => {
    it('pendingCount returns 0 when value is empty', () => {
      expect(service.value()).toEqual([]);
      expect(service.pendingCount()).toBe(0);
    });
  });
});

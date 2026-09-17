import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Task } from './task';
import { TaskItem } from './task-item/task-item';
import { NewTask, TasksService } from './tasks';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TaskItem],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private tasksService = inject(TasksService);

  protected readonly title = 'task-manager';

  protected readonly tasks = this.tasksService.tasks;
  protected readonly pendingCount = this.tasksService.pendingCount;

  onToggle(id: number): void {
    this.tasksService.toggle(id);
  }

  onRemove(id: number): void {
    this.tasksService.remove(id);
  }

  onAdd(task: NewTask): void {
    this.tasksService.add(task);
  }

  onUpdate(task: Task): void {
    this.tasksService.update(task);
  }
}

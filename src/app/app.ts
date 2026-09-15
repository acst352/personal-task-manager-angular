import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Task } from './task';
import { TaskItem } from './task-item/task-item';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TaskItem],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('task-manager');
  tasks = signal<Task[]>([
    { id: 1, title: 'Aprender signals', done: false, priority: 'high' },
    { id: 2, title: 'Conectar InsForge', done: false, priority: 'medium' },
    { id: 3, title: 'Armar el login', done: true, priority: 'low' },
  ])

  onToggle(id: number) {
    const before = this.tasks().find(t => t.id === id);
    console.log('Tarea antes:', before);

    this.tasks.update(tasks =>
      tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );

    const after = this.tasks().find(t => t.id === id);
    console.log('Tarea después:', after);
  }

  onRemove(id: number) {
    // this.tasks = this.tasks.filter(t => t.id !== id);
  }
}


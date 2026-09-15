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
  protected readonly tasks: Task[] = [
    { id: 1, title: 'Aprender signals', done: false, priority: 'high' },
    { id: 2, title: 'Conectar InsForge', done: false, priority: 'medium' },
    { id: 3, title: 'Armar el login', done: true, priority: 'low' },
  ];

  onToggle(id: number) {
    console.log("Has Toggleado")
  }

  onRemove(id: number) {
    console.log("Has Removido")
  }
}

import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('task-manager');
  protected readonly tasks = [
    { id: 1, title: 'Aprender signals', done: false, priority: 'high' },
    { id: 2, title: 'Conectar InsForge', done: false, priority: 'medium' },
    { id: 3, title: 'Armar el login', done: true, priority: 'low' },
  ];
}

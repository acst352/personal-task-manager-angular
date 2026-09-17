export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewTask = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type TaskUpdate = Pick<Task, 'title' | 'done' | 'priority'>;

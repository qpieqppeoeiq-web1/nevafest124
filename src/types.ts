export type UrgencyColor = 'red' | 'yellow' | 'green';
export type TaskStatus = 'new' | 'in_progress' | 'completed';
export type UserRole = 'volunteer' | 'organizer' | 'admin';

export interface User {
  id: number;
  username: string;
  first_name: string;
  role: UserRole;
  tags: string[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  urgency_color: UrgencyColor;
  links: string[];
  image_url?: string;
  status: TaskStatus;
  assigned_to: number[];
  tags: string[];
  created_by?: number;
  created_at: string;
  completed_at?: string;
}

export interface Message {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  text: string;
  created_at: string;
}

export interface ProgressBar {
  id: number;
  title: string;
  tags: string[];
  target_count: number;
  completed_count?: number;
  percent?: number;
}

export interface ProjectFile {
  path: string;
  name: string;
  language: string;
  category: 'backend' | 'frontend' | 'deploy' | 'docs';
  content: string;
  description: string;
}

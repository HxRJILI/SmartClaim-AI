// packages/features/smartclaim/types/index.ts

export type TicketStatus = 
  | 'new'
  | 'in_progress'
  | 'pending_review'
  | 'resolved'
  | 'closed'
  | 'rejected';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketCategory =
  | 'safety'
  | 'quality'
  | 'maintenance'
  | 'logistics'
  | 'hr'
  | 'other';

export type UserRole = 'worker' | 'department_manager' | 'admin';

export type InputType = 'text' | 'voice' | 'file' | 'combined';

export type ActivityType = 'comment' | 'status_change' | 'assignment' | 'resolution';

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  department_id?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: string;
  assigned_to_department?: string;
  assigned_to_user?: string;
  input_type?: InputType;
  original_content?: Record<string, any>;
  ai_summary?: string;
  ai_confidence_score?: number;
  sla_deadline?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  creator?: UserProfile;
  department?: Department;
  assigned_user?: UserProfile;
  attachments?: TicketAttachment[];
  activities?: TicketActivity[];
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  file_url: string;
  extracted_text?: string;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  user_id: string;
  activity_type: ActivityType;
  content?: string;
  metadata?: Record<string, any>;
  created_at: string;
  user?: UserProfile;
}

export interface TicketMetrics {
  id: string;
  metric_date: string;
  department_id?: string;
  total_tickets: number;
  new_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  avg_resolution_time?: string;
  sla_compliance_rate?: number;
  metrics_data?: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  input_type?: InputType;
  original_content?: Record<string, any>;
  files?: File[];
}

export interface TicketFilters {
  status?: TicketStatus[];
  category?: TicketCategory[];
  priority?: TicketPriority[];
  department?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface DashboardStats {
  total_tickets: number;
  new_tickets: number;
  in_progress: number;
  resolved: number;
  avg_resolution_time: number;
  sla_compliance: number;
}
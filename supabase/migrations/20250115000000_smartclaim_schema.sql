-- apps/web/supabase/migrations/20250115000000_smartclaim_schema.sql

/*
 * -------------------------------------------------------
 * SmartClaim Application Schema
 * Intelligent Management of Claims and Non-Conformities
 * Created: 2025-01-15
 * -------------------------------------------------------
 */

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Create enum types
create type public.ticket_status as enum (
  'new',
  'in_progress',
  'pending_review',
  'resolved',
  'closed',
  'rejected'
);

create type public.ticket_priority as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.ticket_category as enum (
  'safety',
  'quality',
  'maintenance',
  'logistics',
  'hr',
  'other'
);

create type public.user_role as enum (
  'worker',
  'department_manager',
  'admin'
);

-- Departments table
create table public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  manager_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.departments is 'Departments/Services for ticket assignment';

-- User profiles with roles
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'worker',
  department_id uuid references public.departments(id),
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.user_profiles is 'Extended user profiles with role-based access';

-- Tickets table
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text not null unique,
  title text not null,
  description text not null,
  category ticket_category not null,
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'new',
  
  -- User and department assignment
  created_by uuid references auth.users(id) not null,
  assigned_to_department uuid references public.departments(id),
  assigned_to_user uuid references auth.users(id),
  
  -- Input metadata
  input_type text,
  original_content jsonb,
  
  -- AI processing
  ai_summary text,
  ai_confidence_score numeric(3,2),
  
  -- SLA tracking
  sla_deadline timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.tickets is 'Main tickets/claims table';

-- Ticket attachments
create table public.ticket_attachments (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_size bigint,
  file_url text not null,
  extracted_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.ticket_attachments is 'File attachments for tickets';

-- Ticket comments/activity log
create table public.ticket_activities (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  activity_type text not null,
  content text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.ticket_activities is 'Activity log and comments for tickets';

-- Vector store for RAG system
create table public.knowledge_base (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  metadata jsonb,
  embedding vector(1536),
  department_id uuid references public.departments(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.knowledge_base is 'Vector embeddings for RAG-powered assistant';

-- Chat history for assistant
create table public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  session_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.chat_sessions is 'Chat history for AI assistant';

-- Analytics/Metrics cache
create table public.ticket_metrics (
  id uuid primary key default uuid_generate_v4(),
  metric_date date not null,
  department_id uuid references public.departments(id),
  total_tickets integer default 0,
  new_tickets integer default 0,
  in_progress_tickets integer default 0,
  resolved_tickets integer default 0,
  avg_resolution_time interval,
  sla_compliance_rate numeric(5,2),
  metrics_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.ticket_metrics is 'Cached metrics for dashboard analytics';

-- Indexes for performance
create index idx_tickets_created_by on public.tickets(created_by);
create index idx_tickets_department on public.tickets(assigned_to_department);
create index idx_tickets_status on public.tickets(status);
create index idx_tickets_category on public.tickets(category);
create index idx_tickets_created_at on public.tickets(created_at desc);
create index idx_ticket_activities_ticket on public.ticket_activities(ticket_id);
create index idx_knowledge_base_embedding on public.knowledge_base using ivfflat (embedding vector_cosine_ops);
create index idx_knowledge_base_department on public.knowledge_base(department_id);

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('ticket_attachments', 'ticket_attachments', false)
on conflict (id) do nothing;

-- Row Level Security (RLS)
alter table public.departments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_activities enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.ticket_metrics enable row level security;

-- RLS Policies

-- Departments: Everyone can read, only admins can modify
create policy "Departments are viewable by authenticated users"
  on public.departments for select
  to authenticated
  using (true);

create policy "Departments modifiable by admins"
  on public.departments for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- User profiles: Users can read all, update their own
create policy "Profiles are viewable by authenticated users"
  on public.user_profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Tickets: Users can see their own tickets or department tickets
create policy "Users can view their own tickets"
  on public.tickets for select
  to authenticated
  using (
    created_by = auth.uid()
    or assigned_to_user = auth.uid()
    or assigned_to_department in (
      select department_id from public.user_profiles
      where id = auth.uid()
    )
    or exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

create policy "Users can create tickets"
  on public.tickets for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Department managers and admins can update tickets"
  on public.tickets for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and (
        user_profiles.role = 'admin'
        or (
          user_profiles.role = 'department_manager'
          and user_profiles.department_id = tickets.assigned_to_department
        )
      )
    )
  );

-- Ticket attachments: Follow ticket permissions
create policy "Attachments viewable if ticket is viewable"
  on public.ticket_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets
      where tickets.id = ticket_attachments.ticket_id
    )
  );

create policy "Users can insert attachments for their tickets"
  on public.ticket_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tickets
      where tickets.id = ticket_attachments.ticket_id
      and tickets.created_by = auth.uid()
    )
  );

-- Ticket activities: Follow ticket permissions
create policy "Activities viewable if ticket is viewable"
  on public.ticket_activities for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets
      where tickets.id = ticket_activities.ticket_id
    )
  );

create policy "Users can add activities to accessible tickets"
  on public.ticket_activities for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tickets
      where tickets.id = ticket_activities.ticket_id
    )
    and user_id = auth.uid()
  );

-- Knowledge base: Department-based access
create policy "Knowledge base viewable by department or admins"
  on public.knowledge_base for select
  to authenticated
  using (
    department_id is null
    or department_id in (
      select department_id from public.user_profiles
      where id = auth.uid()
    )
    or exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- Chat sessions: Users can only access their own
create policy "Users can view own chat sessions"
  on public.chat_sessions for all
  to authenticated
  using (user_id = auth.uid());

-- Metrics: Department managers see their department, admins see all
create policy "Metrics viewable by department or admins"
  on public.ticket_metrics for select
  to authenticated
  using (
    department_id in (
      select department_id from public.user_profiles
      where id = auth.uid()
    )
    or exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- Storage policies
create policy "Users can upload attachments for their tickets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket_attachments'
  );

create policy "Users can view attachments for accessible tickets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket_attachments'
  );

-- Functions

-- Function to generate ticket numbers
create or replace function public.generate_ticket_number()
returns text as $$
declare
  new_number text;
  year_prefix text;
begin
  year_prefix := to_char(now(), 'YYYY');
  select 'TKT-' || year_prefix || '-' || lpad((count(*) + 1)::text, 6, '0')
  into new_number
  from public.tickets
  where ticket_number like 'TKT-' || year_prefix || '%';
  
  return new_number;
end;
$$ language plpgsql security definer;

-- Trigger to auto-generate ticket numbers
create or replace function public.set_ticket_number()
returns trigger as $$
begin
  if new.ticket_number is null or new.ticket_number = '' then
    new.ticket_number := public.generate_ticket_number();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trigger_set_ticket_number
  before insert on public.tickets
  for each row
  execute function public.set_ticket_number();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_departments_updated_at before update on public.departments
  for each row execute function public.update_updated_at_column();

create trigger update_user_profiles_updated_at before update on public.user_profiles
  for each row execute function public.update_updated_at_column();

create trigger update_tickets_updated_at before update on public.tickets
  for each row execute function public.update_updated_at_column();

create trigger update_knowledge_base_updated_at before update on public.knowledge_base
  for each row execute function public.update_updated_at_column();

-- Function to create user profile after account creation
-- Only creates profile if it doesn't already exist (to allow pre-seeded accounts)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Only insert if profile doesn't exist (allows pre-seeded admin accounts)
  if not exists (select 1 from public.user_profiles where id = new.id) then
    insert into public.user_profiles (id, role, full_name)
    values (
      new.id, 
      'worker', 
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Insert seed data for departments
insert into public.departments (id, name, description) values
  ('d1111111-1111-1111-1111-111111111111', 'Safety & Security', 'Handles all safety-related incidents and security concerns'),
  ('d2222222-2222-2222-2222-222222222222', 'Quality Control', 'Manages product and process quality issues'),
  ('d3333333-3333-3333-3333-333333333333', 'Maintenance', 'Responsible for equipment and facility maintenance'),
  ('d4444444-4444-4444-4444-444444444444', 'Logistics', 'Handles supply chain and logistics issues'),
  ('d5555555-5555-5555-5555-555555555555', 'Human Resources', 'Manages employee-related concerns')
on conflict (id) do nothing;
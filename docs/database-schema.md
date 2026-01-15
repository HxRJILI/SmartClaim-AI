# Database Schema

SmartClaim AI uses Supabase (PostgreSQL) for data storage.

## Entity Relationship Diagram

```
┌─────────────────┐      ┌─────────────────┐
│     users       │      │   departments   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ email           │◄────►│ name            │
│ role            │      │ description     │
│ department_id   │      │ manager_id      │
│ created_at      │      │ created_at      │
└────────┬────────┘      └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐      ┌─────────────────┐
│     tickets     │      │   attachments   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │◄────►│ id (PK)         │
│ ticket_number   │      │ ticket_id (FK)  │
│ user_id (FK)    │      │ file_url        │
│ category        │      │ file_type       │
│ priority        │      │ created_at      │
│ status          │      └─────────────────┘
│ description     │
│ ai_classification│
│ sla_prediction  │
│ created_at      │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│    comments     │
├─────────────────┤
│ id (PK)         │
│ ticket_id (FK)  │
│ user_id (FK)    │
│ content         │
│ created_at      │
└─────────────────┘
```

## Tables

### users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR | User email |
| role | ENUM | worker, manager, admin |
| department_id | UUID | Foreign key to departments |
| display_name | VARCHAR | Display name |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### departments

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Department name |
| description | TEXT | Description |
| manager_id | UUID | Foreign key to users |
| created_at | TIMESTAMP | Creation time |

### tickets

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_number | VARCHAR | Human-readable ID (SC-2025-001) |
| user_id | UUID | Foreign key to users |
| department_id | UUID | Assigned department |
| category | ENUM | safety, quality, maintenance, etc. |
| priority | ENUM | critical, high, medium, low |
| status | ENUM | pending, assigned, in_progress, etc. |
| description | TEXT | Incident description |
| ai_classification | JSONB | AI analysis results |
| sla_prediction | JSONB | SLA prediction data |
| assigned_to | UUID | Assigned handler |
| resolved_at | TIMESTAMP | Resolution time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### attachments

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | Foreign key to tickets |
| file_url | VARCHAR | Storage URL |
| file_type | VARCHAR | MIME type |
| file_name | VARCHAR | Original filename |
| file_size | INTEGER | Size in bytes |
| created_at | TIMESTAMP | Upload time |

### comments

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | Foreign key to tickets |
| user_id | UUID | Foreign key to users |
| content | TEXT | Comment content |
| created_at | TIMESTAMP | Creation time |

### policies

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | VARCHAR | Policy title |
| content | TEXT | Policy content |
| category | VARCHAR | Policy category |
| department_id | UUID | Applicable department |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMP | Creation time |

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### users
- Users can read their own profile
- Admins can read/write all users

### tickets
- Workers can CRUD their own tickets
- Managers can read/write department tickets
- Admins have full access

### comments
- Visible to ticket owner and handlers
- Admins have full access

## Indexes

```sql
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_department_id ON tickets(department_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);
```

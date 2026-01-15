# User Roles

SmartClaim AI implements role-based access control (RBAC) with three primary roles.

## Worker Role

Workers are the primary users who submit and track incident tickets.

### Permissions

| Action | Allowed |
|--------|---------|
| Submit tickets | ✅ Yes |
| View own tickets | ✅ Yes |
| Add comments to own tickets | ✅ Yes |
| Use AI chat assistant | ✅ Yes |
| View department tickets | ❌ No |
| Assign tickets | ❌ No |
| Access analytics | ❌ No |
| Manage users | ❌ No |

### Dashboard Features

- My Tickets list
- New Ticket submission form
- AI Chat assistant
- Profile settings
- Notification center

## Manager Role

Managers oversee their department's tickets and team performance.

### Permissions

| Action | Allowed |
|--------|---------|
| Submit tickets | ✅ Yes |
| View department tickets | ✅ Yes |
| Assign tickets | ✅ Yes |
| Change priority/status | ✅ Yes |
| Access department analytics | ✅ Yes |
| Generate reports | ✅ Yes |
| View other departments | ❌ No |
| Manage users | ❌ No |
| System configuration | ❌ No |

### Dashboard Features

- Department ticket queue
- Team assignment interface
- Performance analytics
- SLA compliance tracking
- Report generation

## Admin Role

Administrators have full system access and configuration capabilities.

### Permissions

| Action | Allowed |
|--------|---------|
| All Worker permissions | ✅ Yes |
| All Manager permissions | ✅ Yes |
| Cross-department access | ✅ Yes |
| User management | ✅ Yes |
| Department management | ✅ Yes |
| System configuration | ✅ Yes |
| AI service monitoring | ✅ Yes |
| Audit log access | ✅ Yes |

### Dashboard Features

- System-wide analytics
- User management
- Department configuration
- AI health monitoring
- Settings panel
- Audit logs

## Role Assignment

Roles are assigned by administrators through the user management interface:

1. Navigate to **Admin > User Management**
2. Select a user
3. Choose the appropriate role
4. Assign to a department (for managers)
5. Save changes

## Department Association

- Workers are associated with one department
- Managers manage one or more departments
- Admins have access to all departments

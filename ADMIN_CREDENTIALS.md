# SmartClaim Admin Credentials

## Pre-Configured Accounts

These accounts have been pre-seeded in the database with fixed credentials:

### System Administrator
- **Email**: `admin@smartclaim.com`
- **Password**: `Admin@2025`
- **Role**: Admin (full system access)
- **Permissions**: Can view all tickets, manage all departments, view analytics

### Department Managers

#### Safety Department Manager
- **Email**: `safety.manager@smartclaim.com`
- **Password**: `Safety@2025`
- **Role**: Department Manager
- **Department**: Safety
- **Permissions**: Can view and manage Safety department tickets

#### Quality Department Manager
- **Email**: `quality.manager@smartclaim.com`
- **Password**: `Quality@2025`
- **Role**: Department Manager
- **Department**: Quality
- **Permissions**: Can view and manage Quality department tickets

#### Maintenance Department Manager
- **Email**: `maintenance.manager@smartclaim.com`
- **Password**: `Maintenance@2025`
- **Role**: Department Manager
- **Department**: Maintenance
- **Permissions**: Can view and manage Maintenance department tickets

#### Logistics Department Manager
- **Email**: `logistics.manager@smartclaim.com`
- **Password**: `Logistics@2025`
- **Role**: Department Manager
- **Department**: Logistics
- **Permissions**: Can view and manage Logistics department tickets

#### HR Department Manager
- **Email**: `hr.manager@smartclaim.com`
- **Password**: `HR@2025`
- **Role**: Department Manager
- **Department**: HR
- **Permissions**: Can view and manage HR department tickets

#### IT & Technology Department Manager
- **Email**: `it.manager@smartclaim.com`
- **Password**: `IT@2025`
- **Role**: Department Manager
- **Department**: IT & Technology
- **Permissions**: Can view and manage IT department tickets

#### Customer Service Department Manager
- **Email**: `service.manager@smartclaim.com`
- **Password**: `Service@2025`
- **Role**: Department Manager
- **Department**: Customer Service
- **Permissions**: Can view and manage Customer Service department tickets

#### Finance Department Manager
- **Email**: `finance.manager@smartclaim.com`
- **Password**: `Finance@2025`
- **Role**: Department Manager
- **Department**: Finance
- **Permissions**: Can view and manage Finance department tickets

#### Procurement & Stock Department Manager
- **Email**: `procurement.manager@smartclaim.com`
- **Password**: `Procurement@2025`
- **Role**: Department Manager
- **Department**: Procurement & Stock
- **Permissions**: Can view and manage Procurement department tickets

#### Legal Department Manager
- **Email**: `legal.manager@smartclaim.com`
- **Password**: `Legal@2025`
- **Role**: Department Manager
- **Department**: Legal
- **Permissions**: Can view and manage Legal department tickets

## Worker Accounts

### Existing Worker
- **Email**: `rjilihoussam55@gmail.com`
- **Password**: (your password)
- **Role**: Worker
- **Department**: Not set (needs onboarding)
- **Note**: This account needs to complete onboarding to select a department

### New Signups
All new users who sign up through the app will automatically be assigned the **Worker** role. They will need to:
1. Complete the onboarding process
2. Select their department
3. Then they can submit tickets/complaints

## Important Notes

⚠️ **These admin and department manager accounts are permanent and should not be deleted**

✅ **The trigger function has been updated** to skip profile creation if a user already exists (allows pre-seeded accounts to work)

✅ **All new signups** will automatically get `role='worker'` and must complete onboarding to select their department

## Testing the System

1. **As Admin**: Login with `admin@smartclaim.com` to access full system
2. **As Department Manager**: Login with any `*.manager@smartclaim.com` to see department-specific dashboard
3. **As Worker**: Signup a new account or use existing account to submit tickets

## Database Reset Note

If you run `npx supabase db reset` again, all these accounts will be recreated automatically from the migration files.

// apps/web/config/paths.config.ts
import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    dashboard: z.string().min(1),
    tickets: z.string().min(1),
    ticketDetails: z.string().min(1),
    department: z.string().min(1),
    departmentTickets: z.string().min(1),
    departmentTicketDetails: z.string().min(1),
    admin: z.string().min(1),
    adminUsers: z.string().min(1),
    onboarding: z.string().min(1),
    profileSettings: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/smartclaim/dashboard',
    dashboard: '/smartclaim/dashboard',
    tickets: '/smartclaim/tickets',
    ticketDetails: '/smartclaim/tickets/:id',
    department: '/smartclaim/department',
    departmentTickets: '/smartclaim/department/tickets',
    departmentTicketDetails: '/smartclaim/department/tickets/:id',
    admin: '/smartclaim/admin',
    adminUsers: '/smartclaim/admin/users',
    onboarding: '/smartclaim/onboarding',
    profileSettings: '/smartclaim/settings',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;
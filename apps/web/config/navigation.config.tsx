// apps/web/config/navigation.config.tsx
import { 
  Home, 
  Ticket, 
  Building2, 
  Shield, 
  User,
  LayoutDashboard,
  Users,
  Settings,
  ClipboardList
} from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/makerkit/navigation-config.schema';

import pathsConfig from './paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'SmartClaim',
    children: [
      {
        label: 'Dashboard',
        path: pathsConfig.app.dashboard,
        Icon: <LayoutDashboard className={iconClasses} />,
        end: true,
      },
      {
        label: 'My Tickets',
        path: pathsConfig.app.tickets,
        Icon: <Ticket className={iconClasses} />,
      },
    ],
  },
  {
    label: 'Management',
    children: [
      {
        label: 'Department',
        path: pathsConfig.app.department,
        Icon: <Building2 className={iconClasses} />,
      },
      {
        label: 'Ticket Management',
        path: pathsConfig.app.departmentTickets,
        Icon: <ClipboardList className={iconClasses} />,
      },
      {
        label: 'Admin Dashboard',
        path: pathsConfig.app.admin,
        Icon: <Shield className={iconClasses} />,
      },
      {
        label: 'User Management',
        path: pathsConfig.app.adminUsers,
        Icon: <Users className={iconClasses} />,
      },
    ],
  },
  {
    label: 'Account',
    children: [
      {
        label: 'Profile Settings',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE ?? 'sidebar',
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED === 'true',
});
// apps/web/app/(app)/smartclaim/admin/_components/admin-tabs.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  LayoutDashboardIcon,
  UsersIcon,
  BuildingIcon,
  SettingsIcon,
  GaugeIcon,
  ClockIcon,
} from 'lucide-react';
import { GlobalStats } from './global-stats';
import { DepartmentComparison } from './department-comparison';
import { IndustrialKPIs } from './industrial-kpis';
import { SLAMonitoring } from './sla-monitoring';
import { UserManagement } from './user-management';
import { DepartmentManagement } from './department-management';
import { SettingsManagement } from './settings-management';
import { ChatAssistant } from './chat-assistant';

interface AdminTabsProps {
  stats: {
    total_tickets: number;
    new_tickets: number;
    in_progress: number;
    resolved: number;
    today_tickets: number;
    week_tickets: number;
    month_tickets: number;
    total_users: number;
    total_departments: number;
  };
  avgResolutionTime: number;
  tickets: any[];
  departments: any[];
  users: any[];
  userId: string;
}

export function AdminTabs({
  stats,
  avgResolutionTime,
  tickets,
  departments,
  users,
  userId,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboardIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="sla" className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4" />
          <span className="hidden sm:inline">SLA</span>
        </TabsTrigger>
        <TabsTrigger value="users" className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Users</span>
        </TabsTrigger>
        <TabsTrigger value="departments" className="flex items-center gap-2">
          <BuildingIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Departments</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <GlobalStats stats={stats} avgResolutionTime={avgResolutionTime} />
        <DepartmentComparison departments={departments} />
        <IndustrialKPIs tickets={tickets} />
        <ChatAssistant userId={userId} />
      </TabsContent>

      {/* SLA Tab */}
      <TabsContent value="sla" className="space-y-6">
        <SLAMonitoring tickets={tickets} />
      </TabsContent>

      {/* Users Tab */}
      <TabsContent value="users" className="space-y-6">
        <UserManagement 
          users={users} 
          departments={departments.map((d: any) => ({ id: d.id, name: d.name }))} 
        />
      </TabsContent>

      {/* Departments Tab */}
      <TabsContent value="departments" className="space-y-6">
        <DepartmentManagement 
          departments={departments} 
          users={users} 
        />
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-6">
        <SettingsManagement />
      </TabsContent>
    </Tabs>
  );
}

// apps/web/app/(app)/smartclaim/admin/_components/global-stats.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { 
  TicketIcon, 
  UsersIcon, 
  BuildingIcon,
  TrendingUpIcon,
  CalendarIcon,
  TimerIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from 'lucide-react';

interface GlobalStatsProps {
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
}

export function GlobalStats({ stats, avgResolutionTime }: GlobalStatsProps) {
  const cards = [
    {
      title: 'Total Tickets',
      value: stats.total_tickets,
      icon: TicketIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: 'New Tickets',
      value: stats.new_tickets,
      icon: AlertCircleIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: TimerIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: 'Today',
      value: stats.today_tickets,
      icon: CalendarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      title: 'This Week',
      value: stats.week_tickets,
      icon: TrendingUpIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-950',
    },
    {
      title: 'This Month',
      value: stats.month_tickets,
      icon: TrendingUpIcon,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-950',
    },
    {
      title: 'Avg Resolution',
      value: `${avgResolutionTime.toFixed(1)}h`,
      icon: TimerIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    },
    {
      title: 'Total Users',
      value: stats.total_users,
      icon: UsersIcon,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-950',
    },
    {
      title: 'Departments',
      value: stats.total_departments,
      icon: BuildingIcon,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-950',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
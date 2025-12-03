// apps/web/app/(app)/smartclaim/department/_components/department-stats.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { 
  TicketIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  TrendingUpIcon,
  AlertCircleIcon,
  TimerIcon,
  TargetIcon,
} from 'lucide-react';

interface DepartmentStatsProps {
  stats: {
    total: number;
    new: number;
    in_progress: number;
    pending_review: number;
    resolved: number;
    today_new: number;
  };
  avgResolutionTime: number;
  slaComplianceRate: number;
}

export function DepartmentStats({ stats, avgResolutionTime, slaComplianceRate }: DepartmentStatsProps) {
  const cards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: TicketIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      title: 'New Today',
      value: stats.today_new,
      icon: TrendingUpIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      title: 'New',
      value: stats.new,
      icon: AlertCircleIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: ClockIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
    },
    {
      title: 'Pending Review',
      value: stats.pending_review,
      icon: TimerIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-950',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      title: 'Avg Resolution Time',
      value: `${avgResolutionTime.toFixed(1)}h`,
      icon: TimerIcon,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-950',
    },
    {
      title: 'SLA Compliance',
      value: `${slaComplianceRate.toFixed(1)}%`,
      icon: TargetIcon,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
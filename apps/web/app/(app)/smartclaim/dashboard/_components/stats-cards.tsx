// apps/web/app/(app)/smartclaim/dashboard/_components/stats-cards.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { TicketIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

interface StatsCardsProps {
  stats?: {
    total: number;
    new: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: TicketIcon,
      color: 'text-blue-600',
    },
    {
      title: 'New',
      value: stats.new,
      icon: ClockIcon,
      color: 'text-yellow-600',
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: ClockIcon,
      color: 'text-orange-600',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircleIcon,
      color: 'text-green-600',
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
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
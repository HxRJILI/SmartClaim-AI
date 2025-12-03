// apps/web/app/(app)/smartclaim/dashboard/_components/ticket-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Ticket } from '@kit/smartclaim/types';

interface TicketChartProps {
  tickets: Partial<Ticket>[];
}

export function TicketChart({ tickets }: TicketChartProps) {
  // Group tickets by category
  const categoryData = tickets.reduce((acc, ticket) => {
    const category = ticket.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryData).map(([category, count]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count,
  }));

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Tickets by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
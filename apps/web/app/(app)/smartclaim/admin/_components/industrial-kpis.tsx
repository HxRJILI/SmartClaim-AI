// apps/web/app/(app)/smartclaim/admin/_components/industrial-kpis.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

interface IndustrialKPIsProps {
  tickets: any[];
}

export function IndustrialKPIs({ tickets }: IndustrialKPIsProps) {
  // Calculate MTTR (Mean Time To Resolution)
  const resolvedTickets = tickets.filter(t => t.resolved_at);
  const mttr = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        return sum + (resolved - created);
      }, 0) / resolvedTickets.length / (1000 * 60 * 60)
    : 0;

  // Calculate First Response Time
  const ticketsWithActivity = tickets.filter(t => 
    t.activities && t.activities.length > 0
  );
  const avgFirstResponse = ticketsWithActivity.length > 0
    ? ticketsWithActivity.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const firstActivity = new Date(t.activities[0].created_at).getTime();
        return sum + (firstActivity - created);
      }, 0) / ticketsWithActivity.length / (1000 * 60 * 60)
    : 0;

  // Calculate ticket volume by category (recurring issues)
  const categoryVolume = tickets.reduce((acc, ticket) => {
    const category = ticket.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryVolume)
    .map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Ticket creation trend (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const trendData = last30Days.map(date => {
    const dayTickets = tickets.filter(t => 
      t.created_at.split('T')[0] === date
    );
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tickets: dayTickets.length,
      resolved: dayTickets.filter(t => t.resolved_at).length,
    };
  });

  // Calculate resolution rate over time
  const resolutionRate = tickets.length > 0 
    ? (resolvedTickets.length / tickets.length) * 100 
    : 0;

  // Calculate backlog (open tickets)
  const backlog = tickets.filter(t => 
    t.status !== 'resolved' && t.status !== 'closed'
  ).length;

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MTTR (Mean Time To Resolution)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mttr.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average resolution time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              First Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgFirstResponse.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg time to first response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolutionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tickets resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Backlog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{backlog}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Open tickets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>30-Day Ticket Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval={4}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tickets" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring Issues by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
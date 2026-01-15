// apps/web/app/(app)/smartclaim/admin/_components/sla-monitoring.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { isPast, differenceInHours, formatDistanceToNow } from 'date-fns';

interface SLAMonitoringProps {
  tickets: any[];
}

export function SLAMonitoring({ tickets }: SLAMonitoringProps) {
  // Filter tickets with SLA
  const ticketsWithSLA = tickets.filter(t => t.sla_deadline);
  
  // Calculate SLA metrics
  const now = new Date();
  
  const slaMetrics = ticketsWithSLA.reduce((acc, ticket) => {
    const deadline = new Date(ticket.sla_deadline);
    const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
    const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
    
    if (isResolved) {
      // Check if resolved before deadline
      if (resolvedAt && resolvedAt <= deadline) {
        acc.met++;
      } else {
        acc.breached++;
      }
    } else {
      // Still open
      if (isPast(deadline)) {
        acc.overdue++;
      } else {
        const hoursRemaining = differenceInHours(deadline, now);
        if (hoursRemaining < 4) {
          acc.atRisk++;
        } else {
          acc.onTrack++;
        }
      }
    }
    return acc;
  }, { met: 0, breached: 0, overdue: 0, atRisk: 0, onTrack: 0 });
  
  const totalWithSLA = ticketsWithSLA.length;
  const slaComplianceRate = totalWithSLA > 0 
    ? ((slaMetrics.met) / (slaMetrics.met + slaMetrics.breached + slaMetrics.overdue)) * 100 
    : 100;
  
  // SLA by category
  type CategorySummary = { met: number; breached: number; total: number };
  const slaByCategorySummary: Record<string, CategorySummary> = tickets.reduce((acc: Record<string, CategorySummary>, ticket) => {
    const category = ticket.category || 'other';
    if (!acc[category]) {
      acc[category] = { met: 0, breached: 0, total: 0 };
    }
    acc[category].total++;
    
    if (ticket.sla_deadline && ticket.resolved_at) {
      const deadline = new Date(ticket.sla_deadline);
      const resolvedAt = new Date(ticket.resolved_at);
      if (resolvedAt <= deadline) {
        acc[category].met++;
      } else {
        acc[category].breached++;
      }
    }
    return acc;
  }, {});
  
  const slaByCategoryData = Object.entries(slaByCategorySummary).map(([category, data]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    compliance: data.met + data.breached > 0 
      ? Math.round((data.met / (data.met + data.breached)) * 100) 
      : 100,
    total: data.total,
  })).sort((a, b) => a.compliance - b.compliance);
  
  // Pie chart data for SLA status distribution
  const statusDistribution = [
    { name: 'Met', value: slaMetrics.met, color: '#22c55e' },
    { name: 'On Track', value: slaMetrics.onTrack, color: '#3b82f6' },
    { name: 'At Risk', value: slaMetrics.atRisk, color: '#eab308' },
    { name: 'Overdue', value: slaMetrics.overdue, color: '#ef4444' },
    { name: 'Breached', value: slaMetrics.breached, color: '#991b1b' },
  ].filter(d => d.value > 0);
  
  // Get critical tickets (overdue or at risk)
  const criticalTickets = tickets
    .filter(t => {
      if (!t.sla_deadline) return false;
      if (t.status === 'resolved' || t.status === 'closed') return false;
      const deadline = new Date(t.sla_deadline);
      return isPast(deadline) || differenceInHours(deadline, now) < 4;
    })
    .sort((a, b) => new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime())
    .slice(0, 5);
  
  return (
    <div className="space-y-6">
      {/* SLA Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              SLA Met
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{slaMetrics.met}</div>
            <p className="text-xs text-muted-foreground mt-1">Resolved within SLA</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-blue-500" />
              On Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{slaMetrics.onTrack}</div>
            <p className="text-xs text-muted-foreground mt-1">Open, within SLA</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{slaMetrics.atRisk}</div>
            <p className="text-xs text-muted-foreground mt-1">&lt;4 hours remaining</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-red-500" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{slaMetrics.overdue}</div>
            <p className="text-xs text-muted-foreground mt-1">Past deadline</p>
          </CardContent>
        </Card>
        
        <Card className={slaComplianceRate >= 90 ? 'bg-green-50 dark:bg-green-950' : slaComplianceRate >= 70 ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-red-50 dark:bg-red-950'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA Compliance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              slaComplianceRate >= 90 ? 'text-green-600' : 
              slaComplianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {slaComplianceRate.toFixed(1)}%
            </div>
            <Progress value={slaComplianceRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SLA Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* SLA Compliance by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SLA Compliance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={slaByCategoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="category" width={100} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="compliance" name="Compliance Rate">
                  {slaByCategoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.compliance >= 90 ? '#22c55e' : entry.compliance >= 70 ? '#eab308' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Critical Tickets Alert */}
      {criticalTickets.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-lg text-red-600 flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5" />
              Critical Tickets Requiring Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalTickets.map(ticket => {
                const deadline = new Date(ticket.sla_deadline);
                const isOverdue = isPast(deadline);
                
                return (
                  <div 
                    key={ticket.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={isOverdue ? 'bg-red-600' : 'bg-yellow-600'}>
                        {isOverdue ? 'OVERDUE' : 'AT RISK'}
                      </Badge>
                      <div>
                        <p className="font-medium">{ticket.ticket_number}: {ticket.title?.slice(0, 50)}...</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {ticket.category} • {ticket.priority} priority
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                        {isOverdue ? 'Overdue by ' : ''}{formatDistanceToNow(deadline, { addSuffix: !isOverdue })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.department?.name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

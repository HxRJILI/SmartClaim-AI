// apps/web/app/(app)/smartclaim/admin/_components/department-comparison.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Badge } from '@kit/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Progress } from '@kit/ui/progress';

interface DepartmentComparisonProps {
  departments: any[];
}

export function DepartmentComparison({ departments }: DepartmentComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">New</TableHead>
              <TableHead className="text-right">Resolved</TableHead>
              <TableHead className="text-right">Resolution Rate</TableHead>
              <TableHead className="text-right">Avg Time (h)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No departments found
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    {dept.manager ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={dept.manager.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {dept.manager.full_name?.charAt(0) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{dept.manager.full_name}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">No Manager</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{dept.total_tickets}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{dept.new_tickets}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-100 text-green-800">
                      {dept.resolved_tickets}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2">
                      <Progress value={dept.resolution_rate} className="w-16" />
                      <span className="text-sm font-medium">
                        {dept.resolution_rate.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {dept.avg_resolution_time.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
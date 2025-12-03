// apps/web/app/(app)/smartclaim/admin/users/_components/users-table.tsx
'use client';

import { Card } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { EditIcon } from 'lucide-react';
import { UserProfile } from '@kit/smartclaim/types';
import { format } from 'date-fns';

interface UsersTableProps {
  users: UserProfile[];
}

const roleColors = {
  worker: 'bg-blue-100 text-blue-800',
  department_manager: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};

export function UsersTable({ users }: UsersTableProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{user.id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`capitalize ${roleColors[user.role]}`}>
                  {user.role.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {user.department ? (
                  <span>{user.department.name}</span>
                ) : (
                  <Badge variant="outline">No Department</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(user.created_at), 'PPP')}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <EditIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
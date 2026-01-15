// apps/web/app/(app)/smartclaim/admin/_components/department-management.tsx
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import {
  BuildingIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  UsersIcon,
  TicketIcon,
  UserIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { createDepartment, updateDepartment, deleteDepartment } from '../_lib/actions';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  manager?: { id: string; full_name: string; avatar_url: string | null } | null;
  user_count?: number;
  ticket_count?: number;
}

interface DepartmentManagementProps {
  departments: Department[];
  users: User[];
}

export function DepartmentManagement({ departments, users }: DepartmentManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    manager_id: '',
  });

  // Get potential managers (anyone except admins can be a department manager)
  const potentialManagers = users.filter(
    u => u.role !== 'admin'
  );

  const resetForm = () => {
    setForm({ name: '', description: '', manager_id: '' });
  };

  const handleCreateClick = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEditClick = (dept: Department) => {
    setEditingDepartment(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      manager_id: dept.manager_id || 'none',
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateDepartment = async () => {
    if (!form.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    startTransition(async () => {
      const result = await createDepartment({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        manager_id: form.manager_id === 'none' ? null : form.manager_id || null,
      });

      if (result.success) {
        toast.success('Department created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to create department');
      }
    });
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !form.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    startTransition(async () => {
      const result = await updateDepartment(editingDepartment.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        manager_id: form.manager_id === 'none' ? null : form.manager_id || null,
      });

      if (result.success) {
        toast.success('Department updated successfully');
        setIsEditDialogOpen(false);
        setEditingDepartment(null);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to update department');
      }
    });
  };

  const handleDeleteDepartment = async (deptId: string) => {
    startTransition(async () => {
      const result = await deleteDepartment(deptId);
      if (result.success) {
        toast.success('Department deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete department');
      }
    });
  };

  // Stats
  const totalUsers = departments.reduce((sum, d) => sum + (d.user_count || 0), 0);
  const totalTickets = departments.reduce((sum, d) => sum + (d.ticket_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BuildingIcon className="h-4 w-4" />
              Total Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Assigned Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TicketIcon className="h-4 w-4" />
              Assigned Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTickets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Department Management Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BuildingIcon className="h-5 w-5" />
                Department Management
              </CardTitle>
              <CardDescription>
                Create and manage organizational departments
              </CardDescription>
            </div>
            <Button onClick={handleCreateClick}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BuildingIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No departments created yet</p>
                <Button variant="outline" className="mt-4" onClick={handleCreateClick}>
                  Create First Department
                </Button>
              </div>
            ) : (
              departments.map((dept) => (
                <Card key={dept.id} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditClick(dept)}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Department</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{dept.name}"? This will unassign all users
                            and tickets from this department. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDepartment(dept.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg pr-16">{dept.name}</CardTitle>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dept.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Manager */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={dept.manager?.avatar_url || undefined} />
                        <AvatarFallback>
                          {dept.manager?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {dept.manager?.full_name || 'No Manager'}
                        </p>
                        <p className="text-xs text-muted-foreground">Department Manager</p>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex gap-4 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.user_count || 0} users</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TicketIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.ticket_count || 0} tickets</span>
                      </div>
                    </div>
                    
                    {/* Created date */}
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(dept.created_at), 'MMM d, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Department Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
            <DialogDescription>
              Add a new department to your organization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Department Name *</Label>
              <Input
                id="create-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Safety Department"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the department's responsibilities"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-manager">Department Manager</Label>
              <Select
                value={form.manager_id}
                onValueChange={(value) => setForm({ ...form, manager_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {potentialManagers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        {user.full_name || 'Unknown'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDepartment} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information and manager assignment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Safety Department"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the department's responsibilities"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-manager">Department Manager</Label>
              <Select
                value={form.manager_id}
                onValueChange={(value) => setForm({ ...form, manager_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {potentialManagers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        {user.full_name || 'Unknown'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDepartment} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

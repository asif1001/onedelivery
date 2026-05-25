import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Users, Building, Plus, Edit, MapPin } from 'lucide-react';

// Form schema for assigning existing users to branches
const branchUserSchema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  branchId: z.string().min(1, 'Please select a branch'),
  role: z.literal('branch_user'),
});

// Form schema for creating new branch users
const createBranchUserSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Please enter full name'),
  branchId: z.string().min(1, 'Please select a branch'),
  empNo: z.string().optional(),
});

type BranchUserForm = z.infer<typeof branchUserSchema>;
type CreateBranchUserForm = z.infer<typeof createBranchUserSchema>;

export default function AdminBranchUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Get all users
  const { data: allUsers } = useQuery<any[]>({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000,
  });

  // Get all branches
  const { data: branches } = useQuery<any[]>({
    queryKey: ['/api/branches'],
    staleTime: 5 * 60 * 1000,
  });

  // Get branch users
  const { data: branchUsers } = useQuery<any[]>({
    queryKey: ['/api/branch-users'],
    staleTime: 5 * 60 * 1000,
  });

  // Forms
  const form = useForm<BranchUserForm>({
    resolver: zodResolver(branchUserSchema),
    defaultValues: {
      role: 'branch_user',
    },
  });

  const createForm = useForm<CreateBranchUserForm>({
    resolver: zodResolver(createBranchUserSchema),
    defaultValues: {},
  });

  // Assign branch user mutation
  const assignBranchUserMutation = useMutation({
    mutationFn: async (data: BranchUserForm) => {
      const response = await apiRequest('PATCH', `/api/users/${data.userId}/role`, {
        role: data.role,
        branchId: data.branchId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Branch user assigned successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/branch-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign branch user',
        variant: 'destructive',
      });
    },
  });

  // Create new branch user mutation
  const createBranchUserMutation = useMutation({
    mutationFn: async (data: CreateBranchUserForm) => {
      const response = await apiRequest('POST', '/api/branch-users/create', {
        ...data,
        role: 'branch_user',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Branch user created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/branch-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      createForm.reset();
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create branch user',
        variant: 'destructive',
      });
    },
  });

  // Remove branch user mutation
  const removeBranchUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}/role`, {
        role: 'user',
        branchId: null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Branch user removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/branch-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove branch user',
        variant: 'destructive',
      });
    },
  });

  const handleAssignBranchUser = (data: BranchUserForm) => {
    assignBranchUserMutation.mutate(data);
  };

  const handleCreateBranchUser = (data: CreateBranchUserForm) => {
    createBranchUserMutation.mutate(data);
  };

  const handleRemoveBranchUser = (userId: string) => {
    if (confirm('Are you sure you want to remove this branch user?')) {
      removeBranchUserMutation.mutate(userId);
    }
  };

  // Filter users that are not already branch users
  const availableUsers = allUsers?.filter(user => user.role !== 'branch_user') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="./logo.png" 
                alt="OneDelivery" 
                className="h-8 w-8"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Branch User Management</h1>
                <p className="text-sm text-gray-500">Create and assign users to branch locations</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-branch-user" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Branch User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Branch User</DialogTitle>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(handleCreateBranchUser)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" {...field} data-testid="input-display-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email address" {...field} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" {...field} data-testid="input-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="empNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee Number (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter employee number" {...field} data-testid="input-emp-no" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="branchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Branch</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-branch">
                                  <SelectValue placeholder="Select a branch" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {branches?.map((branch: any) => (
                                  <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createBranchUserMutation.isPending}
                          data-testid="button-submit-create"
                        >
                          {createBranchUserMutation.isPending ? 'Creating...' : 'Create Branch User'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-assign-branch-user" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Assign Existing User
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Branch User</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAssignBranchUser)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-user">
                                <SelectValue placeholder="Select a user" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-branch">
                                <SelectValue placeholder="Select a branch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches?.map((branch: any) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name} - {branch.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={assignBranchUserMutation.isPending}
                        data-testid="button-assign"
                      >
                        {assignBranchUserMutation.isPending ? 'Assigning...' : 'Assign'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Branch Users</CardTitle>
              <Users className="w-4 h-4 ml-auto text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branchUsers?.length || 0}</div>
              <p className="text-xs text-gray-600">Active branch assignments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Branches</CardTitle>
              <Building className="w-4 h-4 ml-auto text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branches?.length || 0}</div>
              <p className="text-xs text-gray-600">Total branch locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Users</CardTitle>
              <Users className="w-4 h-4 ml-auto text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableUsers.length}</div>
              <p className="text-xs text-gray-600">Users available for assignment</p>
            </CardContent>
          </Card>
        </div>

        {/* Branch Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span>Branch Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {branchUsers && branchUsers.length > 0 ? (
              <div className="space-y-4">
                {branchUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary">Branch User</Badge>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{user.branchName || 'Unknown Branch'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Pre-fill form for editing
                          form.setValue('userId', user.id);
                          form.setValue('branchId', user.branchId);
                          setIsDialogOpen(true);
                        }}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveBranchUser(user.id)}
                        disabled={removeBranchUserMutation.isPending}
                        data-testid={`button-remove-${user.id}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Branch Users Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start by assigning users to branch locations to enable branch-level oil management.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-assign-first-user">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign First Branch User
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branch Overview */}
        {branches && branches.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-green-500" />
                <span>Branch Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branches.map((branch: any) => {
                  const assignedUsers = branchUsers?.filter(user => user.branchId === branch.id) || [];
                  return (
                    <div key={branch.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Building className="w-4 h-4 text-green-500" />
                        <h3 className="font-semibold">{branch.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{branch.address}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Assigned Users:</span>
                        <Badge variant={assignedUsers.length > 0 ? "default" : "secondary"}>
                          {assignedUsers.length}
                        </Badge>
                      </div>
                      {assignedUsers.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {assignedUsers.map((user: any) => (
                            <div key={user.id} className="text-xs text-gray-600">
                              • {user.firstName} {user.lastName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, EditIcon, TrashIcon, UsersIcon, CalendarIcon, IdCardIcon, CreditCardIcon, SearchIcon, FilterIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
  empNo?: string;
  driverLicenceNo?: string;
  tankerLicenceNo?: string;
  licenceExpiryDate?: Date;
  branchIds?: string[];
}

interface CreateUser {
  email: string;
  password: string;
  displayName: string;
  role: string;
  empNo: string;
  driverLicenceNo?: string;
  tankerLicenceNo?: string;
  licenceExpiryDate?: string;
  branchIds?: string[];
}

interface AdminUsersProps {
  drivers: User[];
  branches: any[];
  onAddDriver: (user: CreateUser) => void;
  onUpdateDriver: (id: string, driver: Partial<User>) => void;
  onDeleteDriver: (id: string) => void;
  onToggleDriverStatus: (id: string, active: boolean) => void;
}

export default function AdminUsers({ 
  drivers, 
  branches,
  onAddDriver, 
  onUpdateDriver, 
  onDeleteDriver,
  onToggleDriverStatus
}: AdminUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [changingPasswordFor, setChangingPasswordFor] = useState<User | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: '',
    empNo: '',
    driverLicenceNo: '',
    tankerLicenceNo: '',
    licenceExpiryDate: '',
    branchIds: [] as string[]
  });
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      role: '',
      empNo: '',
      driverLicenceNo: '',
      tankerLicenceNo: '',
      licenceExpiryDate: '',
      branchIds: []
    });
    setEditingDriver(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);

      if (!formData.email || !formData.displayName || !formData.role) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields including role",
          variant: "destructive"
        });
        return;
      }

      if (!editingDriver && !formData.password) {
        toast({
          title: "Missing Password",
          description: "Password is required for new users",
          variant: "destructive"
        });
        return;
      }

      // Validate role-specific fields
      if (formData.role === 'warehouse' && (!formData.branchIds || formData.branchIds.length === 0)) {
        toast({
          title: "Missing Branch Assignment",
          description: "Please assign at least one branch to this warehouse user",
          variant: "destructive"
        });
        return;
      }

      if (formData.role === 'driver' && (!formData.driverLicenceNo || !formData.tankerLicenceNo)) {
        toast({
          title: "Missing Driver Information",
          description: "Driver licence numbers are required for driver role",
          variant: "destructive"
        });
        return;
      }

      if (formData.role === 'branch_user' && (!formData.branchIds || formData.branchIds.length === 0)) {
        toast({
          title: "Missing Branch Assignment",
          description: "At least one branch assignment is required for branch user role",
          variant: "destructive"
        });
        return;
      }

      if (editingDriver) {
        const updateData = {
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          empNo: formData.empNo,
          driverLicenceNo: formData.driverLicenceNo,
          tankerLicenceNo: formData.tankerLicenceNo,
          licenceExpiryDate: formData.licenceExpiryDate ? new Date(formData.licenceExpiryDate) : undefined,
          // CRITICAL: Include branchIds for branch users
          branchIds: formData.role === 'branch_user' ? formData.branchIds : []
        };
        
        console.log('📝 Updating user with data:', updateData);
        onUpdateDriver(editingDriver.uid, updateData);
        toast({
          title: "Success",
          description: `${formData.role === 'driver' ? 'Driver' : formData.role === 'branch_user' ? 'Branch user' : 'User'} updated successfully`
        });
      } else {
        onAddDriver(formData as CreateUser);
        toast({
          title: "Success",
          description: `${formData.role === 'driver' ? 'Driver' : formData.role === 'branch_user' ? 'Branch user' : 'User'} added successfully`
        });
      }

      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting user:', error);
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (driver: User) => {
    setEditingDriver(driver);
    setFormData({
      email: driver.email || '',
      password: '',
      displayName: driver.displayName || '',
      role: driver.role || '',
      empNo: driver.empNo || '',
      driverLicenceNo: driver.driverLicenceNo || '',
      tankerLicenceNo: driver.tankerLicenceNo || '',
      licenceExpiryDate: driver.licenceExpiryDate ? 
        (driver.licenceExpiryDate instanceof Date ? 
          driver.licenceExpiryDate.toISOString().split('T')[0] :
          new Date(driver.licenceExpiryDate).toISOString().split('T')[0]
        ) : '',
      branchIds: driver.branchIds || []
    });
    setIsOpen(true);
  };

  const handleDelete = async (driver: User) => {
    if (window.confirm(`Are you sure you want to delete ${driver.displayName || driver.email}? This will permanently remove all their data including complaints, tasks, and transactions.`)) {
      try {
        console.log('🗑️ Deleting user:', driver.uid, driver.email);
        await onDeleteDriver(driver.uid);
        toast({
          title: "Success",
          description: "User deleted successfully from database and authentication"
        });
      } catch (error) {
        console.error('Error in delete handler:', error);
        toast({
          title: "Error",
          description: "Failed to delete user completely",
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleStatus = (driver: User) => {
    onToggleDriverStatus(driver.uid, !driver.active);
    toast({
      title: "Success",
      description: `Driver ${driver.active ? 'deactivated' : 'activated'} successfully`
    });
  };

  const handlePasswordChange = async () => {
    if (isChangingPassword) return; // Prevent double submission

    try {
      setIsChangingPassword(true);

      if (!changingPasswordFor) {
        throw new Error("No user selected for password reset");
      }

      // Import Firebase Admin functions for password reset
      const { updateUserPassword } = await import('@/lib/firebaseUserCreation');
      
      // Send password reset email to the user
      const result = await updateUserPassword(changingPasswordFor.uid, '');
      
      toast({
        title: "Password Reset Email Sent",
        description: result.message,
        duration: 8000
      });

      setPasswordChangeData({ newPassword: '', confirmPassword: '' });
      setIsPasswordChangeOpen(false);
      setChangingPasswordFor(null);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isLicenceExpiring = (driver: User) => {
    if (!driver.licenceExpiryDate) return false;
    const expiryDate = new Date(driver.licenceExpiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate <= thirtyDaysFromNow;
  };

  // Filter and search functionality
  const filteredDrivers = drivers.filter(driver => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      driver.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (driver.empNo && driver.empNo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Role filter
    const matchesRole = roleFilter === 'all' || driver.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Get unique roles for filter dropdown
  const availableRoles = Array.from(new Set(drivers.map(driver => driver.role))).filter(Boolean);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not set';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage users across different roles: drivers, warehouse, branch users, and admins</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsOpen(true); }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Full Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
              </div>
              
              {!editingDriver && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                </div>
              )}

              {/* Role Selection */}
              <div>
                <Label htmlFor="role">User Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="warehouse">Warehouse User</SelectItem>
                    <SelectItem value="branch_user">Branch User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Multiple Branch Selection for Branch Users and Warehouse Users */}
              {(formData.role === 'branch_user' || formData.role === 'warehouse') && (
                <div>
                  <Label>
                    Assign to Branches
                    {formData.role === 'warehouse' && (
                      <span className="text-sm text-gray-500 ml-1">
                        (Warehouse user will only be able to view/manage assigned branches)
                      </span>
                    )}
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {branches?.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`branch-${branch.id}`}
                          checked={formData.branchIds?.includes(branch.id) || false}
                          onChange={(e) => {
                            const branchIds = formData.branchIds || [];
                            if (e.target.checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                branchIds: [...branchIds, branch.id] 
                              }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                branchIds: branchIds.filter(id => id !== branch.id) 
                              }));
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`branch-${branch.id}`} className="text-sm font-normal">
                          {branch.name}
                          {branch.location && (
                            <span className="text-xs text-gray-500 ml-1">({branch.location})</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.branchIds?.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Selected: {formData.branchIds.length} branch{formData.branchIds.length !== 1 ? 'es' : ''}
                    </div>
                  )}
                  {formData.role === 'warehouse' && formData.branchIds?.length === 0 && (
                    <div className="text-sm text-amber-600 mt-1">
                      ⚠️ Warning: Warehouse user without branch assignment will have no access to any branches
                    </div>
                  )}
                </div>
              )}

              {/* Employee Number */}
              <div>
                <Label htmlFor="empNo">Employee Number (Optional)</Label>
                <Input
                  id="empNo"
                  value={formData.empNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, empNo: e.target.value }))}
                  placeholder="Enter employee number"
                />
              </div>

              {/* Driver-specific fields */}
              {formData.role === 'driver' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="driverLicenceNo">Driver Licence Number</Label>
                    <Input
                      id="driverLicenceNo"
                      value={formData.driverLicenceNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, driverLicenceNo: e.target.value }))}
                      placeholder="Enter driver licence number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tankerLicenceNo">Tanker Licence Number</Label>
                    <Input
                      id="tankerLicenceNo"
                      value={formData.tankerLicenceNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tankerLicenceNo: e.target.value }))}
                      placeholder="Enter tanker licence number"
                    />
                  </div>
                </div>
              )}

              {/* Licence expiry date for drivers */}
              {formData.role === 'driver' && (
                <div>
                  <Label htmlFor="licenceExpiryDate">Licence Expiry Date</Label>
                  <Input
                    id="licenceExpiryDate"
                    type="date"
                    value={formData.licenceExpiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, licenceExpiryDate: e.target.value }))}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingDriver ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    `${editingDriver ? 'Update' : 'Add'} User`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordChangeOpen} onOpenChange={setIsPasswordChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password for {changingPasswordFor?.displayName}</DialogTitle>
            <DialogDescription>
              This will send a password reset email to {changingPasswordFor?.email}. The user will need to check their email and follow the reset link to create a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Secure Password Reset</p>
                  <p className="text-sm text-blue-600">
                    For security reasons, Firebase requires users to reset their own passwords via email verification.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsPasswordChangeOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Reset Email...
                  </>
                ) : (
                  "Send Password Reset Email"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, email, or employee number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <div className="w-full sm:w-48">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <div className="flex items-center">
                  <FilterIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filter by role" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.replace('_', ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredDrivers.length} of {drivers.length} users
            {searchQuery && ` matching "${searchQuery}"`}
            {roleFilter !== 'all' && ` with role "${roleFilter.replace('_', ' ')}"`}
          </span>
          {(searchQuery || roleFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers?.map((driver) => (
          <Card key={driver.uid} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{driver.displayName}</CardTitle>
                    <p className="text-sm text-gray-600">{driver.email}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(driver)}>
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(driver)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Role:</span>
                  <Badge variant="outline" className="capitalize">
                    {driver.role?.replace('_', ' ')}
                  </Badge>
                </div>
                
                {/* Show branch assignments for branch users and warehouse users */}
                {(driver.role === 'branch_user' || driver.role === 'warehouse') && driver.branchIds && driver.branchIds.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Assigned Branches:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {driver.branchIds.map((branchId, index) => {
                        const branch = branches?.find(b => b.id === branchId);
                        return branch ? (
                          <Badge key={branchId} variant="secondary" className="text-xs">
                            {branch.name}
                            {branch.location && (
                              <span className="ml-1 text-xs opacity-75">({branch.location})</span>
                            )}
                          </Badge>
                        ) : (
                          <Badge key={branchId} variant="outline" className="text-xs">
                            Branch {index + 1}
                          </Badge>
                        );
                      })}
                    </div>
                    {driver.role === 'warehouse' && (
                      <p className="text-xs text-gray-500 mt-1">
                        This warehouse user can only access these assigned branches
                      </p>
                    )}
                  </div>
                )}
                
                {/* Warning for warehouse users without branch assignments */}
                {driver.role === 'warehouse' && (!driver.branchIds || driver.branchIds.length === 0) && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="text-amber-600">⚠️</div>
                      <div>
                        <p className="text-xs font-medium text-amber-800">No Branch Assignment</p>
                        <p className="text-xs text-amber-600">This warehouse user has no access to any branches</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge 
                    variant={driver.active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => handleToggleStatus(driver)}
                  >
                    {driver.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                {driver.empNo && (
                  <div className="flex items-center space-x-2">
                    <IdCardIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Emp #: {driver.empNo}</span>
                  </div>
                )}
                
                {(driver.driverLicenceNo || driver.tankerLicenceNo) && (
                  <div className="space-y-1">
                    {driver.driverLicenceNo && (
                      <div className="flex items-center space-x-2">
                        <CreditCardIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">DL: {driver.driverLicenceNo}</span>
                      </div>
                    )}
                    {driver.tankerLicenceNo && (
                      <div className="flex items-center space-x-2">
                        <CreditCardIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">TL: {driver.tankerLicenceNo}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {driver.licenceExpiryDate && (
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Expires: {formatDate(driver.licenceExpiryDate)}
                    </span>
                    {isLicenceExpiring(driver) && (
                      <Badge variant="destructive" className="text-xs">
                        Expiring Soon
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="pt-2 space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setChangingPasswordFor(driver);
                      setIsPasswordChangeOpen(true);
                    }}
                  >
                    Change Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!drivers || drivers.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first driver.</p>
            <Button onClick={() => setIsOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Driver
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
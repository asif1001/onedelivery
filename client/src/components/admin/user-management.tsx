import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlusIcon, UserIcon, SearchIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Mock users data for demonstration
const mockUsers = [
  { id: "1", email: "john.doe@example.com", firstName: "John", lastName: "Doe", role: "user", createdAt: "2024-01-15" },
  { id: "2", email: "jane.driver@example.com", firstName: "Jane", lastName: "Smith", role: "driver", createdAt: "2024-01-10" },
  { id: "3", email: "business@corp.com", firstName: "Corp", lastName: "Business", role: "business", createdAt: "2024-01-05" }
];

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "user" as const
  });
  const { toast } = useToast();

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      // This would call the API to create a user
      // For now, just simulate success
      console.log("Creating user:", userData);
      return userData;
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user has been successfully created.",
      });
      setNewUser({ email: "", firstName: "", lastName: "", role: "user" });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // This would call the API to update user role
      console.log("Updating role:", userId, role);
      return { userId, role };
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = mockUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-admin text-admin-foreground';
      case 'driver': return 'bg-driver text-driver-foreground';
      case 'business': return 'bg-business text-business-foreground';
      case 'user':
      default: return 'bg-user text-user-foreground';
    }
  };

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.firstName) {
      toast({
        title: "Validation Error",
        description: "Email and first name are required.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  return (
    <section className="px-4 mb-6">
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="font-semibold text-gray-800">User Management</CardTitle>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-admin hover:bg-admin/90 text-white"
              size="sm"
              data-testid="button-create-user"
            >
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {/* Create User Form */}
          {showCreateForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-800 mb-3">Create New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Input
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  data-testid="input-new-user-email"
                />
                <Input
                  placeholder="First Name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  data-testid="input-new-user-firstname"
                />
                <Input
                  placeholder="Last Name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  data-testid="input-new-user-lastname"
                />
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as any })}>
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="bg-admin hover:bg-admin/90 text-white"
                  size="sm"
                  data-testid="button-confirm-create-user"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  size="sm"
                  data-testid="button-cancel-create-user"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800" data-testid={`user-name-${user.id}`}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-600" data-testid={`user-email-${user.id}`}>
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getRoleColor(user.role)}`} data-testid={`user-role-${user.id}`}>
                      {user.role}
                    </Badge>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
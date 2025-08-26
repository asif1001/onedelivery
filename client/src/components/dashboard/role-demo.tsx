import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrownIcon, UserIcon, TruckIcon, BriefcaseIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RoleOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const roles: RoleOption[] = [
  {
    id: 'admin',
    name: 'Admin Dashboard',
    description: 'Full system access, user management, analytics',
    icon: CrownIcon,
    colorClass: 'text-admin',
    bgClass: 'bg-admin/5',
    borderClass: 'border-admin/20'
  },
  {
    id: 'user',
    name: 'User Dashboard',
    description: 'Personal profile, bookings, history',
    icon: UserIcon,
    colorClass: 'text-user',
    bgClass: 'bg-user/5',
    borderClass: 'border-user/20'
  },
  {
    id: 'driver',
    name: 'Driver Dashboard',
    description: 'Active trips, earnings, vehicle status',
    icon: TruckIcon,
    colorClass: 'text-driver',
    bgClass: 'bg-driver/5',
    borderClass: 'border-driver/20'
  },
  {
    id: 'business',
    name: 'Business Dashboard',
    description: 'Analytics, fleet management, billing',
    icon: BriefcaseIcon,
    colorClass: 'text-business',
    bgClass: 'bg-business/5',
    borderClass: 'border-business/20'
  }
];

export default function RoleDemo() {
  const { user } = useAuth();
  
  const currentRole = user?.role || 'user';

  const handleRoleSwitch = (roleId: string) => {
    // TODO: Implement role switching or navigation
    console.log('Role switch requested:', roleId);
  };

  return (
    <section className="px-4 mb-6">
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <CardTitle className="font-semibold text-gray-800">Role-Based Views</CardTitle>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-normal">
              Demo
            </Badge>
          </div>
          
          <div className="space-y-3">
            {roles.map((role) => {
              const Icon = role.icon;
              const isCurrentRole = role.id === currentRole;
              
              return (
                <div 
                  key={role.id} 
                  className={`flex items-center p-3 rounded-lg border ${role.bgClass} ${role.borderClass} ${
                    isCurrentRole ? 'ring-2 ring-primary ring-opacity-50' : ''
                  }`}
                  data-testid={`role-option-${role.id}`}
                >
                  <div className={`bg-${role.id} rounded-full w-8 h-8 flex items-center justify-center mr-3`}>
                    <Icon className="text-white w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${role.colorClass}`} data-testid={`role-name-${role.id}`}>
                      {role.name}
                      {isCurrentRole && (
                        <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                      )}
                    </p>
                    <p className="text-xs text-gray-600" data-testid={`role-description-${role.id}`}>
                      {role.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoleSwitch(role.id)}
                    disabled={isCurrentRole}
                    className={`text-sm font-medium px-3 py-1 border rounded-lg transition-colors ${
                      isCurrentRole 
                        ? 'opacity-50 cursor-not-allowed' 
                        : `${role.colorClass} border-current hover:bg-current hover:bg-opacity-10`
                    }`}
                    data-testid={`button-switch-${role.id}`}
                  >
                    {isCurrentRole ? 'Active' : 'Switch'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

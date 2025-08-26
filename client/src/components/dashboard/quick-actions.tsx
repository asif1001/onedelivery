import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCogIcon, TruckIcon, BuildingIcon, BarChart3Icon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ActionButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  roles: string[];
}

const quickActions: ActionButton[] = [
  {
    id: 'manage-users',
    label: 'Manage Users',
    icon: UserCogIcon,
    colorClass: 'bg-admin/10 border-admin/20 hover:bg-admin/20 text-admin',
    roles: ['admin']
  },
  {
    id: 'driver-panel',
    label: 'Driver Panel',
    icon: TruckIcon,
    colorClass: 'bg-driver/10 border-driver/20 hover:bg-driver/20 text-driver',
    roles: ['admin', 'driver']
  },
  {
    id: 'businesses',
    label: 'Businesses',
    icon: BuildingIcon,
    colorClass: 'bg-business/10 border-business/20 hover:bg-business/20 text-business',
    roles: ['admin', 'business']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3Icon,
    colorClass: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-primary',
    roles: ['admin', 'business', 'user']
  }
];

export default function QuickActions() {
  const { user } = useAuth();
  
  const userRole = user?.role || 'user';
  
  // Filter actions based on user role
  const availableActions = quickActions.filter(action => 
    action.roles.includes(userRole)
  );

  const handleActionClick = (actionId: string) => {
    // TODO: Implement navigation based on action
    console.log('Quick action clicked:', actionId);
  };

  return (
    <section className="px-4 mb-6">
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-4">
          <CardTitle className="font-semibold text-gray-800 mb-4">Quick Actions</CardTitle>
          {availableActions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No quick actions available for your role</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="ghost"
                    onClick={() => handleActionClick(action.id)}
                    className={`flex flex-col items-center p-4 rounded-xl border transition-colors h-auto ${action.colorClass}`}
                    data-testid={`button-action-${action.id}`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BellIcon, ChevronDownIcon, UsersIcon } from "lucide-react";
import { OilDeliveryLogo } from "@/components/ui/logo";

export default function TopNavigation() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'driver':
        return 'Driver Dashboard';
      case 'business':
        return 'Business Dashboard';
      case 'user':
      default:
        return 'User Dashboard';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary rounded-lg w-10 h-10 flex items-center justify-center">
              <OilDeliveryLogo className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">RoleManager</h1>
              <p className="text-xs text-gray-500" data-testid="text-role-display">
                {getRoleDisplay(user?.role)}
              </p>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-notifications"
            >
              <BellIcon className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
            </Button>
            
            {/* User Profile */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-user-menu"
            >
              <img 
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face"} 
                alt="User Profile" 
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                data-testid="img-user-avatar"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-700" data-testid="text-user-name">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500" data-testid="text-user-email">{user?.email}</p>
              </div>
              <ChevronDownIcon className="text-gray-400 w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

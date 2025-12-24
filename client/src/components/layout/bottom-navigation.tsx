import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HomeIcon, UsersIcon, BarChart3Icon, SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'analytics', label: 'Analytics', icon: BarChart3Icon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomNavigation() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center py-2 px-3 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-gray-400 hover:text-gray-600"
              )}
              data-testid={`button-nav-${item.id}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

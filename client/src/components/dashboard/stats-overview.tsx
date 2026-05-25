import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { UsersIcon, TruckIcon, BuildingIcon, TrendingUpIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Stats {
  totalUsers: number;
  activeDrivers: number;
  businesses: number;
  revenue: string;
}

export default function StatsOverview() {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    retry: false,
    meta: {
      onError: (error: Error) => {
        if (isUnauthorizedError(error)) {
          toast({
            title: "Unauthorized",
            description: "You are logged out. Logging in again...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return;
        }
      },
    },
  });

  if (isLoading) {
    return (
      <section className="p-4">
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-2 w-48"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-64"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="w-8 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const statsData = stats || {
    totalUsers: 0,
    activeDrivers: 0,
    businesses: 0,
    revenue: "$0"
  };

  const statCards = [
    {
      icon: UsersIcon,
      color: "bg-admin",
      value: statsData.totalUsers,
      label: "Total Users",
      change: "+12%",
      testId: "stat-total-users"
    },
    {
      icon: TruckIcon,
      color: "bg-driver",
      value: statsData.activeDrivers,
      label: "Active Drivers",
      change: "+8%",
      testId: "stat-active-drivers"
    },
    {
      icon: BuildingIcon,
      color: "bg-business",
      value: statsData.businesses,
      label: "Businesses",
      change: "+5%",
      testId: "stat-businesses"
    },
    {
      icon: TrendingUpIcon,
      color: "bg-user",
      value: statsData.revenue,
      label: "Revenue",
      change: "+15%",
      testId: "stat-revenue"
    }
  ];

  return (
    <section className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Dashboard Overview</h2>
        <p className="text-gray-600 text-sm">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.testId} className="shadow-sm border border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.color} rounded-lg w-10 h-10 flex items-center justify-center`}>
                    <Icon className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xs text-green-600 font-medium">{stat.change}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1" data-testid={`value-${stat.testId}`}>
                  {stat.value}
                </h3>
                <p className="text-sm text-gray-600" data-testid={`label-${stat.testId}`}>
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

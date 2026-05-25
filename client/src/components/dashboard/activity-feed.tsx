import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon, BuildingIcon, AlertTriangleIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

const getActivityIcon = (iconName: string) => {
  switch (iconName) {
    case 'user-plus':
      return UserPlusIcon;
    case 'building':
      return BuildingIcon;
    case 'exclamation-triangle':
      return AlertTriangleIcon;
    default:
      return UserPlusIcon;
  }
};

const getActivityColorClasses = (color: string) => {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-600';
    case 'blue':
      return 'bg-blue-100 text-blue-600';
    case 'orange':
      return 'bg-orange-100 text-orange-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export default function ActivityFeed() {
  const { toast } = useToast();

  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
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
      <section className="px-4 mb-6">
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const activitiesData = activities || [];

  return (
    <section className="px-4 mb-6">
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="font-semibold text-gray-800">Recent Activities</CardTitle>
            <Button variant="ghost" className="text-primary text-sm font-medium p-0 h-auto" data-testid="button-view-all-activities">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activitiesData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">No recent activities</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activitiesData.map((activity) => {
                const Icon = getActivityIcon(activity.icon);
                const colorClasses = getActivityColorClasses(activity.color);
                
                return (
                  <div key={activity.id} className="p-4 flex items-center space-x-3" data-testid={`activity-${activity.id}`}>
                    <div className={`${colorClasses} rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800" data-testid={`activity-message-${activity.id}`}>
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`activity-timestamp-${activity.id}`}>
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

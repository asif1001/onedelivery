import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TruckIcon, 
  UsersIcon, 
  MapPinIcon, 
  DropletIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from "lucide-react";

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  contactNo: string;
}

interface OilType {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
}

interface AdminHomeProps {
  user: User;
  drivers: User[];
  branches: Branch[];
  oilTypes: OilType[];
  tasks: Task[];
  recentDeliveries: any[];
}

export default function AdminHome({ 
  user, 
  drivers, 
  branches, 
  oilTypes, 
  tasks, 
  recentDeliveries 
}: AdminHomeProps) {
  const activeDrivers = drivers.filter(d => d.active);
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user.displayName}!</h1>
        <p className="text-blue-100">Here's an overview of your oil delivery operations</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDrivers.length}</div>
            <p className="text-xs text-muted-foreground">
              of {drivers.length} total drivers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
            <p className="text-xs text-muted-foreground">
              locations managed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oil Types</CardTitle>
            <DropletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{oilTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              products available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              tasks awaiting action
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Priority Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-red-500" />
              High Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highPriorityTasks.length > 0 ? (
              <div className="space-y-3">
                {highPriorityTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-600">
                        Due: {task.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No high priority tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-blue-500" />
              Recent Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDeliveries.length > 0 ? (
              <div className="space-y-3">
                {recentDeliveries.slice(0, 5).map((delivery, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {delivery.customerName || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {delivery.oilType} - {delivery.quantity}L
                      </p>
                    </div>
                    <Badge className={delivery.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {delivery.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <XCircleIcon className="h-8 w-8 mx-auto mb-2" />
                <p>No recent deliveries</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 cursor-pointer">
              <UsersIcon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Add Driver</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 cursor-pointer">
              <MapPinIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Add Branch</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 cursor-pointer">
              <DropletIcon className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium">Add Oil Type</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg text-center hover:bg-gray-50 cursor-pointer">
              <ClockIcon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">Create Task</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
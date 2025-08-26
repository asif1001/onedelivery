import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  getAllTasks, 
  updateTask, 
  deleteTask, 
  saveTask,
  getAllUsers,
  updateTaskStatus,
  addTaskComment,
  addTaskDocument
} from "@/lib/firebase";
import TaskCreationDialog from "@/components/task-creation-dialog";
import TaskList from "@/components/task-list";
import EnhancedTaskModal from "@/components/EnhancedTaskModal";
import { 
  CalendarIcon, 
  ClockIcon, 
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ArrowLeftIcon,
  LogOutIcon,
  ClipboardListIcon
} from "lucide-react";
import { Link } from "wouter";
import { OilDeliveryLogo } from "@/components/ui/logo";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: Date;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  assignedTo?: string;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [showEnhancedTaskModal, setShowEnhancedTaskModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const { toast } = useToast();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      const { auth } = await import('@/lib/firebase');
      await auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, driversData] = await Promise.all([
        getAllTasks(),
        getAllUsers()
      ]);
      
      setTasks(tasksData as Task[]);
      // Filter only drivers from all users
      setDrivers((driversData as User[]).filter(user => user.role === 'driver'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks and drivers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTask = async (task: CreateTask) => {
    try {
      // Enhanced task data with user display names
      const enhancedTask = {
        ...task,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Task Manager',
        assignedToName: task.assignedTo ? (drivers.find(d => d.uid === task.assignedTo || d.id === task.assignedTo)?.displayName || drivers.find(d => d.uid === task.assignedTo || d.id === task.assignedTo)?.email || 'Unknown User') : ''
      };
      await saveTask(enhancedTask);
      await loadData();
      toast({
        title: "Success",
        description: "Task created successfully"
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTask = async (id: string, task: Partial<Task>) => {
    try {
      await updateTask(id, task);
      await loadData();
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      await loadData();
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  // Enhanced task management functions
  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateTaskStatus(taskId, newStatus, userData);
      await loadData();
      toast({
        title: "Success",
        description: `Task status updated to ${newStatus.replace('-', ' ')}`
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error", 
        description: "Failed to update task status",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTaskComment = async (taskId: string, commentText: string) => {
    setIsAddingComment(true);
    try {
      await addTaskComment(taskId, {
        text: commentText,
        author: userData?.displayName || userData?.email || 'User'
      });
      await loadData();
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding task comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment", 
        variant: "destructive"
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleUploadTaskDocument = async (taskId: string, files: FileList) => {
    setIsUploadingDocument(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentData = {
          name: file.name,
          url: `tasks/${taskId}/${Date.now()}_${file.name}`,
          type: file.type,
          size: file.size,
          uploadedBy: userData?.displayName || userData?.email || 'User'
        };
        await addTaskDocument(taskId, documentData);
      }
      
      await loadData();
      toast({
        title: "Success",
        description: `${files.length} document(s) uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading task documents:', error);
      toast({
        title: "Error",
        description: "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTaskForDetails(task);
    setShowEnhancedTaskModal(true);
  };

  const getTasksByStatus = (status?: string) => {
    if (!status || status === 'all') return tasks;
    return tasks.filter(task => task.status === status);
  };

  const getTodayTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate >= today && taskDate < tomorrow;
    });
  };

  const getOverdueTasks = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate < today && task.status !== 'completed';
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const pendingTasks = getTasksByStatus('pending');
  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <div className="mr-3">
                <OilDeliveryLogo className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">OneDelivery</h1>
                <p className="text-xs sm:text-sm text-gray-500">Task Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/admin-dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{userData?.displayName || userData?.email}</p>
                <p className="text-xs text-gray-500">{userData?.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center text-xs sm:text-sm px-2 sm:px-4"
              >
                <LogOutIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
            <p className="text-gray-600">Create and manage operational tasks</p>
          </div>
          <TaskCreationDialog onAdd={handleAddTask} drivers={drivers} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClipboardListIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Due Today</p>
                  <p className="text-2xl font-bold text-gray-900">{todayTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangleIcon className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{overdueTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
            <CardDescription>Create and manage daily operational tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <TaskList
                  tasks={getTasksByStatus('all')}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                  onViewDetails={openTaskDetails}
                  drivers={drivers}
                />
              </TabsContent>
              
              <TabsContent value="pending" className="mt-6">
                <TaskList
                  tasks={pendingTasks}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                  onViewDetails={openTaskDetails}
                  drivers={drivers}
                />
              </TabsContent>
              
              <TabsContent value="today" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Today's Deadline ({todayTasks.length} tasks)</h3>
                  </div>
                  <TaskList
                    tasks={todayTasks}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    onViewDetails={openTaskDetails}
                    drivers={drivers}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="overdue" className="mt-6">
                <div className="space-y-4">
                  {overdueTasks.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <AlertTriangleIcon className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-red-900">Overdue Tasks ({overdueTasks.length})</h3>
                    </div>
                  )}
                  <TaskList
                    tasks={overdueTasks}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    onViewDetails={openTaskDetails}
                    drivers={drivers}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="completed" className="mt-6">
                <TaskList
                  tasks={getTasksByStatus('completed')}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                  onViewDetails={openTaskDetails}
                  drivers={drivers}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Task Modal */}
      <EnhancedTaskModal
        task={selectedTaskForDetails}
        isOpen={showEnhancedTaskModal}
        onClose={() => {
          setShowEnhancedTaskModal(false);
          setSelectedTaskForDetails(null);
        }}
        onStatusUpdate={handleTaskStatusUpdate}
        onAddComment={handleAddTaskComment}
        onUploadDocument={handleUploadTaskDocument}
        user={userData}
        isUpdating={isUpdatingStatus}
        isAddingComment={isAddingComment}
        isUploading={isUploadingDocument}
      />
    </div>
  );
}
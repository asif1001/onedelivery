// OneDelivery Oil Management System - Production Ready
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginSimple from "@/pages/login-simple";
import Home from "@/pages/home";
import DriverDashboard from "@/pages/driver-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import TaskManagement from "@/pages/task-management";
import ComplaintManagement from "@/pages/complaint-management";
import BranchDashboard from "@/pages/branch-dashboard";
import AdminBranchUsers from "@/pages/admin-branch-users";
import WarehouseDashboard from "@/pages/warehouse-dashboard";
import FirestoreStats from "@/pages/firestore-stats";
import NotFound from "@/pages/not-found";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

function Router() {
  const { userData, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <LoginSimple />;
  }

  // Access Control Component for unauthorized routes
  const AccessDenied = ({ requiredRole }: { requiredRole: string }) => (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 14.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You don't have permission to access this page. This page requires <strong>{requiredRole}</strong> role access.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Your current role: <strong>{userData.role}</strong>
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Go to My Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <Switch>
      {userData.role === 'admin' ? (
        <>
          <Route path="/" component={() => <AdminDashboard user={userData} />} />
          <Route path="/admin-dashboard" component={() => <AdminDashboard user={userData} />} />
          <Route path="/task-management" component={() => <TaskManagement />} />
          <Route path="/complaint-management" component={() => <ComplaintManagement />} />
          <Route path="/admin-branch-users" component={() => <AdminBranchUsers />} />
          <Route path="/warehouse-dashboard" component={() => <WarehouseDashboard />} />
          <Route path="/firestore-stats" component={() => <FirestoreStats />} />
          <Route path="/driver-dashboard" component={() => <AccessDenied requiredRole="driver" />} />
          <Route path="/branch-dashboard" component={() => <AccessDenied requiredRole="branch user" />} />
        </>
      ) : userData.role === 'driver' ? (
        <>
          <Route path="/" component={() => <DriverDashboard user={{
            ...userData,
            id: userData.uid,
            firstName: userData.displayName?.split(' ')[0] || null,
            lastName: userData.displayName?.split(' ')[1] || null,
            profileImageUrl: null,
            createdAt: null,
            updatedAt: null,
            branchIds: (userData as any).branchIds || []
          }} />} />
          <Route path="/driver-dashboard" component={() => <DriverDashboard user={{
            ...userData,
            id: userData.uid,
            firstName: userData.displayName?.split(' ')[0] || null,
            lastName: userData.displayName?.split(' ')[1] || null,
            profileImageUrl: null,
            createdAt: null,
            updatedAt: null,
            branchIds: (userData as any).branchIds || []
          }} />} />
          <Route path="/warehouse-dashboard" component={() => <AccessDenied requiredRole="warehouse or admin" />} />
          <Route path="/admin-dashboard" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/branch-dashboard" component={() => <AccessDenied requiredRole="branch user" />} />
          <Route path="/task-management" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/complaint-management" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/admin-branch-users" component={() => <AccessDenied requiredRole="admin" />} />
        </>
      ) : userData.role === 'branch_user' ? (
        <>
          <Route path="/" component={() => <BranchDashboard />} />
          <Route path="/branch-dashboard" component={() => <BranchDashboard />} />
          <Route path="/warehouse-dashboard" component={() => <AccessDenied requiredRole="warehouse or admin" />} />
          <Route path="/admin-dashboard" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/driver-dashboard" component={() => <AccessDenied requiredRole="driver" />} />
          <Route path="/task-management" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/complaint-management" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/admin-branch-users" component={() => <AccessDenied requiredRole="admin" />} />
        </>
      ) : userData.role === 'warehouse' ? (
        <>
          <Route path="/" component={() => <WarehouseDashboard />} />
          <Route path="/warehouse" component={() => <WarehouseDashboard />} />
          <Route path="/warehouse-dashboard" component={() => <WarehouseDashboard />} />
          <Route path="/admin-dashboard" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/driver-dashboard" component={() => <AccessDenied requiredRole="driver" />} />
          <Route path="/branch-dashboard" component={() => <AccessDenied requiredRole="branch user" />} />
          <Route path="/task-management" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/complaint-management" component={() => <AccessDenied requiredRole="admin" />} />
          <Route path="/admin-branch-users" component={() => <AccessDenied requiredRole="admin" />} />
        </>
      ) : (
        <Route path="/" component={Home} />
      )}
      <Route path="/test-db" component={() => {
        const { DatabaseConnectionTest } = require('@/test-db-connection');
        return <DatabaseConnectionTest />;
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PWAInstallPrompt 
          onInstall={() => console.log('OneDelivery installed as desktop app!')}
          onDismiss={() => console.log('PWA install prompt dismissed')}
        />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

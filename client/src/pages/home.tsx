import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOutIcon, UserIcon, SettingsIcon, ImageIcon } from "lucide-react";
import { signOut } from "@/lib/firebase";

export default function Home() {
  const { user, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-logout"
            >
              <LogOutIcon className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.displayName || 'User'}!
          </h2>
          <p className="text-gray-600">Manage your profile and settings</p>
        </div>

        {/* User Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.photoURL || undefined} alt="Profile" />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {user?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800" data-testid="text-user-name">
                  {user?.displayName || 'Anonymous User'}
                </h3>
                <p className="text-gray-600 text-sm" data-testid="text-user-email">
                  {user?.email}
                </p>
                <p className="text-gray-500 text-xs">
                  Member since: {user?.metadata?.creationTime ? 
                    new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                data-testid="button-edit-profile"
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                data-testid="button-upload-photo"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-4 border border-gray-200 hover:bg-gray-50"
                data-testid="button-settings"
              >
                <div className="flex items-center">
                  <SettingsIcon className="w-5 h-5 mr-3 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Account Settings</p>
                    <p className="text-sm text-gray-600">Manage your account preferences</p>
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                className="justify-start h-auto p-4 border border-gray-200 hover:bg-gray-50"
                data-testid="button-upload-images"
              >
                <div className="flex items-center">
                  <ImageIcon className="w-5 h-5 mr-3 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800">Upload Images</p>
                    <p className="text-sm text-gray-600">Manage your photos with Cloudinary</p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

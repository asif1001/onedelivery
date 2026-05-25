import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFirestoreUsage } from "@/lib/firebase";
import { Link } from "wouter";
import { ArrowLeftIcon, DatabaseIcon, ImageIcon, UsersIcon } from "lucide-react";

export default function FirestoreStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const usage = await getFirestoreUsage();
      setStats(usage);
    } catch (error) {
      console.error('Error loading Firestore stats:', error);
      setError('Failed to load Firestore statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">Loading Firestore statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Firestore Statistics</h1>
          <p className="text-gray-600">Current database usage and collection counts</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Collections Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Collections
            </CardTitle>
            <CardDescription>Document counts by collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.firestore?.collections && Object.entries(stats.firestore.collections).map(([collection, count]: [string, any]) => (
                <div key={collection} className="flex justify-between items-center">
                  <span className="font-medium capitalize">{collection}</span>
                  <span className="text-sm text-gray-600">{count} docs</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center font-semibold">
                <span>Total Documents</span>
                <span>{stats?.firestore?.totalDocuments || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>Database and media storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Database Storage</span>
                <span className="text-sm font-medium">{stats?.firestore?.storage}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Photos</span>
                <span className="text-sm font-medium">{stats?.storage?.photos || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Photo Storage</span>
                <span className="text-sm font-medium">{stats?.storage?.estimatedPhotoStorage}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Storage</span>
                  <span>{stats?.storage?.totalEstimatedStorage}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>Authentication and user metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Total Users</span>
                <span className="text-sm font-medium">{stats?.authentication?.totalUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Active Users</span>
                <span className="text-sm font-medium">{stats?.authentication?.activeUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Admin Users</span>
                <span className="text-sm font-medium">{stats?.authentication?.adminUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Driver Users</span>
                <span className="text-sm font-medium">{stats?.authentication?.driverUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Collection Breakdown</CardTitle>
          <CardDescription>Complete overview of all Firestore collections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Collection</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Document Count</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {stats?.firestore?.collections && Object.entries(stats.firestore.collections).map(([collection, count]: [string, any]) => (
                  <tr key={collection}>
                    <td className="border border-gray-200 px-4 py-2 font-medium capitalize">{collection}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right">{count}</td>
                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                      {getCollectionDescription(collection)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getCollectionDescription(collection: string): string {
  const descriptions: Record<string, string> = {
    complaints: "User-reported issues and complaints",
    users: "System users and authentication data",
    tasks: "Task management and assignments",
    transactions: "Oil delivery and loading transactions",
    deliveries: "Delivery records and tracking",
    branches: "Branch locations and information",
    oilTypes: "Oil type definitions and specifications",
    loadSessions: "Loading session tracking data",
    counters: "Sequential numbering counters"
  };
  return descriptions[collection] || "System data collection";
}
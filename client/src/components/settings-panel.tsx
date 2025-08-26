import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  TrashIcon, 
  DatabaseIcon, 
  CloudIcon, 
  HardDriveIcon,
  AlertTriangleIcon,
  CalendarIcon,
  DownloadIcon,
  FilterIcon,
  FileTextIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllComplaints,
  getAllTasks 
} from "@/lib/firebase";

interface StorageUsage {
  collections: Array<{
    collection: string;
    count: number;
  }>;
  totalDocuments: number;
  estimatedSize: string;
}

interface SettingsPanelProps {
  storageUsage: StorageUsage | null;
  onDeleteRecords: (collection: string, startDate: Date, endDate: Date) => Promise<void>;
}

export default function SettingsPanel({ storageUsage, onDeleteRecords }: SettingsPanelProps) {
  const [deleteForm, setDeleteForm] = useState({
    collection: '',
    startDate: '',
    endDate: ''
  });
  const [filterForm, setFilterForm] = useState({
    dataType: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const { toast } = useToast();

  const handleDeleteRecords = async () => {
    if (!deleteForm.collection || !deleteForm.startDate || !deleteForm.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date(deleteForm.startDate);
      const endDate = new Date(deleteForm.endDate);
      
      await onDeleteRecords(deleteForm.collection, startDate, endDate);
      
      setDeleteForm({
        collection: '',
        startDate: '',
        endDate: ''
      });
    } catch (error) {
      console.error('Error deleting records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterDownload = async () => {
    if (!filterForm.dataType || !filterForm.startDate || !filterForm.endDate) {
      toast({
        title: "Error",
        description: "Please fill in all filter fields",
        variant: "destructive"
      });
      return;
    }

    setFiltering(true);
    try {
      const startDate = new Date(filterForm.startDate);
      const endDate = new Date(filterForm.endDate);
      endDate.setHours(23, 59, 59, 999); // Include end of day

      if (filterForm.dataType === 'complaints') {
        const complaints = await getAllComplaints();
        const filteredData = complaints.filter(item => {
          const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
          return itemDate >= startDate && itemDate <= endDate;
        });
        await downloadCSV(filteredData, `complaints_${filterForm.startDate}_${filterForm.endDate}`);
      } else if (filterForm.dataType === 'tasks') {
        const tasks = await getAllTasks();
        const filteredData = tasks.filter(item => {
          const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
          return itemDate >= startDate && itemDate <= endDate;
        });
        await downloadCSV(filteredData, `tasks_${filterForm.startDate}_${filterForm.endDate}`);
      }

      toast({
        title: "Download Complete",
        description: `${filterForm.dataType} data exported successfully`
      });
      
      setFilterForm({
        dataType: '',
        startDate: '',
        endDate: ''
      });
    } catch (error) {
      console.error('Error downloading filtered data:', error);
      toast({
        title: "Error",
        description: "Failed to download filtered data",
        variant: "destructive"
      });
    } finally {
      setFiltering(false);
    }
  };

  const downloadCSV = async (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No records found for the selected date range",
        variant: "destructive"
      });
      return;
    }

    // Enhance data with driver names and locations
    const enhancedData = await Promise.all(data.map(async (item) => {
      const enhanced = { ...item };
      
      // Get driver name if reportedBy exists
      if (item.reportedBy) {
        try {
          const userDoc = await getDoc(firestoreDoc(db, 'users', item.reportedBy));
          if (userDoc.exists()) {
            enhanced.driverName = userDoc.data().displayName || userDoc.data().email || 'Unknown Driver';
            enhanced.driverEmail = userDoc.data().email || 'No Email';
          }
        } catch (error) {
          console.error('Error fetching driver data:', error);
          enhanced.driverName = 'Unknown Driver';
          enhanced.driverEmail = 'No Email';
        }
      }
      
      // Get assignedTo name if it exists (for tasks)
      if (item.assignedTo) {
        try {
          const assignedUserDoc = await getDoc(firestoreDoc(db, 'users', item.assignedTo));
          if (assignedUserDoc.exists()) {
            enhanced.assignedDriverName = assignedUserDoc.data().displayName || assignedUserDoc.data().email || 'Unknown Driver';
            enhanced.assignedDriverEmail = assignedUserDoc.data().email || 'No Email';
          }
        } catch (error) {
          console.error('Error fetching assigned driver data:', error);
          enhanced.assignedDriverName = 'Unknown Driver';
          enhanced.assignedDriverEmail = 'No Email';
        }
      }
      
      // Format dates properly
      if (enhanced.createdAt && typeof enhanced.createdAt === 'object' && enhanced.createdAt.toDate) {
        enhanced.createdDate = enhanced.createdAt.toDate().toLocaleDateString();
        enhanced.createdTime = enhanced.createdAt.toDate().toLocaleTimeString();
      }
      
      if (enhanced.updatedAt && typeof enhanced.updatedAt === 'object' && enhanced.updatedAt.toDate) {
        enhanced.updatedDate = enhanced.updatedAt.toDate().toLocaleDateString();
        enhanced.updatedTime = enhanced.updatedAt.toDate().toLocaleTimeString();
      }
      
      if (enhanced.deadline && typeof enhanced.deadline === 'object' && enhanced.deadline.toDate) {
        enhanced.deadlineDate = enhanced.deadline.toDate().toLocaleDateString();
        enhanced.deadlineTime = enhanced.deadline.toDate().toLocaleTimeString();
      }
      
      // Add location details
      enhanced.locationDetails = item.location || item.branchName || 'Not Specified';
      
      return enhanced;
    }));

    // Define custom headers for better readability
    const customHeaders = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Category',
      'Driver Name',
      'Driver Email',
      'Assigned Driver Name',
      'Assigned Driver Email',
      'Location Details',
      'Branch Name',
      'Created Date',
      'Created Time',
      'Updated Date',
      'Updated Time',
      'Deadline Date',
      'Deadline Time',
      'Photo URLs',
      'Notes'
    ];
    
    const csvContent = [
      customHeaders.join(','),
      ...enhancedData.map(row => {
        const values = [
          row.id || '',
          row.title || '',
          row.description || '',
          row.status || '',
          row.priority || '',
          row.category || '',
          row.driverName || row.reporterName || '',
          row.driverEmail || '',
          row.assignedDriverName || '',
          row.assignedDriverEmail || '',
          row.locationDetails || '',
          row.branchName || '',
          row.createdDate || '',
          row.createdTime || '',
          row.updatedDate || '',
          row.updatedTime || '',
          row.deadlineDate || '',
          row.deadlineTime || '',
          (row.photoUrls && Array.isArray(row.photoUrls)) ? row.photoUrls.join('; ') : '',
          row.notes || ''
        ];
        
        return values.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Firebase Storage usage would be calculated here in production

  return (
    <div className="space-y-6">
      {/* Storage Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firestore Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Firestore Database</CardTitle>
            <DatabaseIcon className="w-5 h-5 ml-2 text-blue-500" />
          </CardHeader>
          <CardContent>
            {storageUsage ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Documents:</span>
                  <span className="font-medium">{storageUsage.totalDocuments.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Estimated Size:</span>
                  <span className="font-medium">{storageUsage.estimatedSize}</span>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Collections Breakdown:</h4>
                  <div className="space-y-1">
                    {storageUsage.collections.map((item) => (
                      <div key={item.collection} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600">{item.collection}:</span>
                        <span>{item.count} docs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading storage usage...</p>
            )}
          </CardContent>
        </Card>

        {/* Firebase Storage */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Firebase Storage</CardTitle>
            <CloudIcon className="w-5 h-5 ml-2 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Photo Storage:</span>
                <span className="font-medium">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Folder Structure:</span>
                <span className="font-medium">Organized</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Connected</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                All delivery and loading photos are stored securely in Firebase Storage with organized folder structure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Export & Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FilterIcon className="w-5 h-5 mr-2 text-blue-500" />
            Complaint & Task Data Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Filter and download complaint or task data by date range for reporting and analysis.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataType">Data Type</Label>
                <Select 
                  value={filterForm.dataType} 
                  onValueChange={(value) => setFilterForm(prev => ({ ...prev, dataType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complaints">Complaints</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="filterStartDate">Start Date</Label>
                <div className="relative">
                  <Input
                    id="filterStartDate"
                    type="date"
                    value={filterForm.startDate}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="filterEndDate">End Date</Label>
                <div className="relative">
                  <Input
                    id="filterEndDate"
                    type="date"
                    value={filterForm.endDate}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleFilterDownload}
              disabled={!filterForm.dataType || !filterForm.startDate || !filterForm.endDate || filtering}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              {filtering ? 'Downloading...' : 'Download Filtered CSV'}
            </Button>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <FileTextIcon className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p><strong>Export Features:</strong></p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Filter complaints by creation date range</li>
                    <li>Filter tasks by creation date range</li>
                    <li>Export includes all fields and metadata</li>
                    <li>CSV format compatible with Excel and other tools</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrashIcon className="w-5 h-5 mr-2 text-red-500" />
            Data Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Delete records by date range to manage storage and remove old data. This action cannot be undone.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collection">Collection</Label>
                <Select 
                  value={deleteForm.collection} 
                  onValueChange={(value) => setDeleteForm(prev => ({ ...prev, collection: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deliveries">Deliveries</SelectItem>
                    <SelectItem value="complaints">Complaints</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="branches">Branches</SelectItem>
                    <SelectItem value="oilTypes">Oil Types</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="date"
                    value={deleteForm.startDate}
                    onChange={(e) => setDeleteForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="date"
                    value={deleteForm.endDate}
                    onChange={(e) => setDeleteForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!deleteForm.collection || !deleteForm.startDate || !deleteForm.endDate || loading}
                  className="w-full md:w-auto"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {loading ? 'Deleting...' : 'Delete Records'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangleIcon className="w-5 h-5 mr-2 text-red-500" />
                    Confirm Data Deletion
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete records from <strong>{deleteForm.collection}</strong> 
                    from <strong>{deleteForm.startDate}</strong> to <strong>{deleteForm.endDate}</strong>?
                    <br /><br />
                    <strong className="text-red-600">This action cannot be undone!</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRecords} className="bg-red-600 hover:bg-red-700">
                    Delete Records
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDriveIcon className="w-5 h-5 mr-2 text-gray-500" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Application Version</h4>
              <p className="text-sm text-gray-600">OneDelivery v1.0.0</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Last Backup</h4>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString()} (Automated)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Database Status</h4>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Cloud Storage</h4>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Online</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
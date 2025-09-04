import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Removed Tabs components - now using sidebar navigation
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  TruckIcon, 
  LogOutIcon, 
  UsersIcon, 
  MapPinIcon, 
  DropletIcon, 
  SettingsIcon,
  FileTextIcon,
  AlertTriangleIcon,
  DownloadIcon,
  EyeIcon,
  ClockIcon,
  Calendar,
  XIcon,
  DownloadCloudIcon,
  CalendarIcon,
  FilterIcon,
  EditIcon,
  SaveIcon,
  ImageIcon,
  HardDriveIcon,
  Loader2Icon,
  TrashIcon,
  PlusIcon,
  BarChart3,
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  PaperclipIcon,
  MessageCircleIcon,
  PackageIcon,
  Package,
  ClipboardListIcon,
  BarChart3Icon,
  UserIcon,
  CameraIcon,
  DollarSignIcon

} from "lucide-react";
import { 
  getAllDeliveries, 
  getAllComplaints, 
  getAllUsers, 
  createDriverAccount,
  updateDriver,
  deleteDriver,
  saveBranch,
  getAllBranches,
  updateBranch,
  deleteBranch,
  saveOilType,
  getAllOilTypes,
  updateOilType,
  deleteOilType,
  deleteRecordsByDateRange,
  getFirestoreUsage,
  saveTask,
  getAllTasks,
  updateTask,
  deleteTask,
  getAllTransactions,
  addTaskComment,
  updateTaskStatus,
  addTaskDocument,
  addComplaintComment,
  updateComplaintStatus,
  addComplaintDocument,
  db,
  updateBranchNameCascading,
  updateOilTypeNameCascading,
  updateUserNameCascading,
  toggleBranchStatus,
  toggleTankStatus,
  getDrumCapacities,
  saveDrumCapacity,
  updateDrumCapacity,
  deleteDrumCapacity
} from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { createFirebaseUserReal } from "@/lib/firebaseUserCreation";
import { TransactionViewer } from "@/components/TransactionViewer";
import { AdminTransactionManagement } from "@/components/AdminTransactionManagement";
import EnhancedTaskModal from "@/components/EnhancedTaskModal";
import EnhancedComplaintModal from "@/components/EnhancedComplaintModal";
import { FirebaseUsageCalculator } from "@/components/FirebaseUsageCalculator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { OilDeliveryLogo } from "@/components/ui/logo";

// Task interface
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
  comments?: TaskComment[];
  documents?: TaskDocument[];
  lastUpdated?: Date;
  updatedBy?: string;
}

interface TaskComment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  type: 'comment' | 'status_change' | 'document_upload';
  oldStatus?: string;
  newStatus?: string;
}

interface TaskDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface CreateTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  assignedTo?: string;
}

// Basic types for the components that don't exist yet
interface User {
  uid: string;
  email: string | null;
  role: string;
  displayName: string | null;
  active?: boolean;
  empNo?: string;
  driverLicenceNo?: string;
  licenceExpiryDate?: Date;
}

interface Delivery {
  id: string;
  driverUid: string;
  driverName: string;
  status: 'completed' | 'loading' | 'unloading' | 'draft';
  oilTypeId: string | null;
  createdAt: Date | null;
  loadedOilLiters: number | null;
  completedTimestamp: Date | null;
}

interface Complaint {
  id: string;
  driverUid: string;
  driverName: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  description: string | null;
  createdAt: Date | null;
  photo: string | null;
  comments?: ComplaintComment[];
  documents?: ComplaintDocument[];
  lastUpdated?: Date;
  updatedBy?: string;
}

interface ComplaintComment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  type: 'comment' | 'status_change' | 'document_upload';
  oldStatus?: string;
  newStatus?: string;
}

interface ComplaintDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  contactNo: string;
  isActive?: boolean;
  oilTanks?: OilTank[];
}

interface OilTank {
  id: string;
  oilTypeId: string;
  oilTypeName: string;
  capacity: number;
  currentLevel: number;
  lastUpdated?: any;
  isActive?: boolean;
}

interface OilType {
  id: string;
  name: string;
  color?: string;
}

interface CreateBranch {
  name: string;
  address: string;
  contactNo: string;
}

interface CreateOilType {
  name: string;
  color?: string;
}

interface CreateDriver {
  displayName: string;
  email: string;
  password: string;
  empNo?: string;
  driverLicenceNo: string;
  licenceExpiryDate: string;
}

interface DrumCapacity {
  id: string;
  name: string;
  value: number;
  active?: boolean;
}

interface CreateDrumCapacity {
  name: string;
  value: number;
}

import AdminBranches from "./admin-branches";
import AdminOilTypes from "./admin-oil-types";
import AdminUsers from "./admin-drivers";
import AdminDrumCapacities from "@/components/AdminDrumCapacities";

import TaskCreationDialog from "@/components/task-creation-dialog";
import TaskList from "@/components/task-list";
import SettingsPanel from "@/components/settings-panel";

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [oilTypes, setOilTypes] = useState<OilType[]>([]);
  const [drumCapacities, setDrumCapacities] = useState<DrumCapacity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, label: string} | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isTransactionViewerOpen, setIsTransactionViewerOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'night' | 'midday'>('light');
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Date filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Date range filters for complaints CSV export
  const [complaintsStartDate, setComplaintsStartDate] = useState('');
  const [complaintsEndDate, setComplaintsEndDate] = useState('');
  const [csvStartDate, setCsvStartDate] = useState('');
  const [csvEndDate, setCsvEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Task and complaint editing states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingComplaint, setEditingComplaint] = useState<any>(null);
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [showComplaintEditModal, setShowComplaintEditModal] = useState(false);
  
  // Complaint photo viewing states
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showComplaintPhotoModal, setShowComplaintPhotoModal] = useState(false);
  
  // Data cleanup states
  const [cleanupMonths, setCleanupMonths] = useState('6');
  const [isCleanupLoading, setIsCleanupLoading] = useState(false);
  const [showCleanupConfirmModal, setShowCleanupConfirmModal] = useState(false);

  // Firebase usage monitoring states
  const [firestoreUsage, setFirestoreUsage] = useState<any>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    allowGalleryAccess: true
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Enhanced task and complaint management states
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [showEnhancedTaskModal, setShowEnhancedTaskModal] = useState(false);
  const [selectedComplaintForDetails, setSelectedComplaintForDetails] = useState<Complaint | null>(null);
  const [showEnhancedComplaintModal, setShowEnhancedComplaintModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Additional states for enhanced modals
  const [newComment, setNewComment] = useState('');
  const [taskLogs, setTaskLogs] = useState<{[taskId: string]: any[]}>({});
  const [taskDocuments, setTaskDocuments] = useState<{[taskId: string]: any[]}>({});
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  
  // New state for Recent Transactions and Logs Update
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const { toast } = useToast();
  const { logout } = useAuth();

  useEffect(() => {
    loadData();
    loadFirebaseUsage();
    loadSystemSettings();
  }, []);

  // Load system settings from Firebase
  const loadSystemSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'systemSettings', 'general'));
      if (settingsDoc.exists()) {
        setSystemSettings(settingsDoc.data());
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast({
        title: "Error Loading Settings",
        description: "Failed to load system settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Save system settings to Firebase
  const saveSystemSettings = async (newSettings: typeof systemSettings) => {
    try {
      await setDoc(doc(db, 'systemSettings', 'general'), newSettings, { merge: true });
      setSystemSettings(newSettings);
      toast({
        title: "Settings Updated",
        description: "System settings have been saved successfully."
      });
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast({
        title: "Error Saving Settings",
        description: "Failed to save system settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Toggle gallery access setting
  const toggleGalleryAccess = async (enabled: boolean) => {
    const newSettings = { ...systemSettings, allowGalleryAccess: enabled };
    await saveSystemSettings(newSettings);
  };

  const loadFirebaseUsage = async () => {
    setIsLoadingUsage(true);
    try {
      // Call actual Firebase usage API
      const usageData = await getFirestoreUsage();
      setFirestoreUsage(usageData);
    } catch (error) {
      console.error('Error loading Firebase usage:', error);
      // Fallback to basic stats if API fails
      const basicStats = {
        firestore: {
          documents: { reads: 'N/A', writes: 'N/A', deletes: 'N/A' },
          storage: "Check Firebase Console",
          billing: "API Required"
        },
        storage: {
          totalUsage: "Check Firebase Console",
          bandwidth: "N/A",
          billing: "API Required"
        },
        hosting: {
          bandwidth: "Check Firebase Console", 
          requests: 'N/A',
          billing: "API Required"
        },
        authentication: {
          activeUsers: 'N/A',
          monthlySignIns: 'N/A',
          billing: "Usually Free"
        },
        totalBilling: "Requires Firebase Billing API",
        error: "Firebase Admin API access required for live data"
      };
      setFirestoreUsage(basicStats);
      toast({
        title: "Limited Data Available",
        description: "Firebase Admin API setup required for live usage statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleTaskCommentUpdate = async (taskId: string, comment: string) => {
    try {
      // Add comment to task log
      const logEntry = {
        id: Date.now().toString(),
        type: 'comment',
        content: comment,
        timestamp: new Date(),
        user: user?.displayName || 'Admin'
      };

      // Update task logs
      const currentLogs = taskLogs[taskId] || [];
      setTaskLogs(prev => ({
        ...prev,
        [taskId]: [...currentLogs, logEntry]
      }));

      // Update task in Firebase (would include comments in task data)
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updatedTask = {
          ...task,
          comments: [...(task.comments || []), logEntry],
          lastUpdated: new Date()
        };
        await updateTask(taskId, updatedTask);
        await loadData();
        
        toast({
          title: "Success",
          description: "Task comment added successfully"
        });
      }
    } catch (error) {
      console.error('Error updating task comment:', error);
      toast({
        title: "Error",
        description: "Failed to add task comment",
        variant: "destructive"
      });
    }
  };

  const handleTaskDocumentUpload = async (taskId: string, file: File) => {
    setUploadingDocument(true);
    try {
      // This would upload to Firebase Storage
      // For now, we'll simulate the upload
      const documentUrl = URL.createObjectURL(file);
      const document = {
        id: Date.now().toString(),
        name: file.name,
        url: documentUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        uploadedBy: user?.displayName || 'Admin'
      };

      // Update task documents
      const currentDocs = taskDocuments[taskId] || [];
      setTaskDocuments(prev => ({
        ...prev,
        [taskId]: [...currentDocs, document]
      }));

      // Add to task log
      const logEntry = {
        id: Date.now().toString(),
        type: 'document',
        content: `Document uploaded: ${file.name}`,
        timestamp: new Date(),
        user: user?.displayName || 'Admin',
        documentId: document.id
      };

      const currentLogs = taskLogs[taskId] || [];
      setTaskLogs(prev => ({
        ...prev,
        [taskId]: [...currentLogs, logEntry]
      }));

      toast({
        title: "Success",
        description: `Document "${file.name}" uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        deliveriesData,
        complaintsData,
        driversData,
        branchesData,
        oilTypesData,
        drumCapacitiesData,
        tasksData,
        storageData,
        transactionsData
      ] = await Promise.all([
        getAllDeliveries().catch(() => []),
        getAllComplaints().catch(() => []),
        getAllUsers().catch(() => []),
        getAllBranches().catch(() => []),
        getAllOilTypes().catch(() => []),
        getDrumCapacities().catch(() => []),
        getAllTasks().catch(() => []),
        getFirestoreUsage().catch(() => null),
        getAllTransactions().catch(() => [])
      ]);

      setDeliveries(deliveriesData);
      setComplaints(complaintsData || []);
      setDrivers(driversData || []);
      setBranches(branchesData || []);
      setOilTypes(oilTypesData || []);
      setDrumCapacities(drumCapacitiesData || []);
      setTasks(tasksData || []);
      setStorageUsage(storageData);
      setTransactions(transactionsData);
      
      // Load recent transactions (last 20)
      const sortedTransactions = (transactionsData || []).sort((a: any, b: any) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || a.createdAt);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      setRecentTransactions(sortedTransactions.slice(0, 20));
      
      // Load logs (from various sources - deliveries, complaints, tasks, transactions)
      await loadLogs(deliveriesData, complaintsData, tasksData, transactionsData, driversData, branchesData, oilTypesData, drumCapacitiesData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load some data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load logs from various sources
  const loadLogs = async (deliveriesData: any[], complaintsData: any[], tasksData: any[], transactionsData: any[], driversData: any[], branchesData: any[], oilTypesData: any[]) => {
    try {
      const allLogs: any[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Helper function to get driver name
      const getDriverName = (driverUid: string) => {
        const driver = driversData.find(d => d.uid === driverUid || d.id === driverUid);
        return driver ? (driver.displayName || driver.email) : 'Unknown Driver';
      };

      // Helper function to get branch name
      const getBranchName = (branchId: string) => {
        const branch = branchesData.find(b => b.id === branchId);
        return branch ? branch.name : 'Unknown Branch';
      };

      // Helper function to get oil type name
      const getOilTypeName = (oilTypeId: string) => {
        const oilTypes = oilTypesData || [];
        const oilType = oilTypes.find((ot: any) => ot.id === oilTypeId);
        return oilType ? oilType.name : 'Unknown Oil Type';
      };

      console.log('🔍 Loading logs from data:', {
        deliveries: deliveriesData.length,
        complaints: complaintsData.length,
        tasks: tasksData.length,
        transactions: transactionsData.length,
        drivers: driversData.length,
        branches: branchesData.length,
        thirtyDaysAgo: thirtyDaysAgo.toISOString()
      });

      // Load tank update logs from Firebase
      let tankUpdateLogs: any[] = [];
      try {
        const tankLogsQuery = query(
          collection(db, 'tankUpdateLogs'),
          orderBy('updatedAt', 'desc'),
          limit(100)
        );
        const tankLogsSnapshot = await getDocs(tankLogsQuery);
        tankUpdateLogs = tankLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('📊 Tank update logs loaded:', tankUpdateLogs.length);
      } catch (error) {
        console.error('Error loading tank update logs:', error);
      }

      // Process tank update logs
      tankUpdateLogs.forEach(updateLog => {
        const updateDate = updateLog.updatedAt?.toDate ? updateLog.updatedAt.toDate() : new Date(updateLog.updatedAt);
        if (updateDate >= thirtyDaysAgo) {
          allLogs.push({
            id: `tank_update_${updateLog.id}`,
            type: 'tank_update',
            title: `Tank Level Updated - ${getOilTypeName(updateLog.oilTypeId)}`,
            description: `Tank level updated to ${updateLog.newLevel?.toLocaleString()}L at ${getBranchName(updateLog.branchId)}`,
            timestamp: updateDate,
            user: updateLog.updatedBy || 'System',
            location: getBranchName(updateLog.branchId),
            tank: updateLog.tankId || 'N/A',
            photos: [],
            documents: [],
            status: 'completed',
            metadata: {
              oldLevel: updateLog.oldLevel,
              newLevel: updateLog.newLevel,
              oilType: getOilTypeName(updateLog.oilTypeId)
            }
          });
        }
      });

      // Process deliveries into logs
      deliveriesData.forEach(delivery => {
        const deliveryDate = delivery.timestamp?.toDate ? delivery.timestamp.toDate() : new Date(delivery.createdAt);
        if (deliveryDate >= thirtyDaysAgo) {
          allLogs.push({
            id: `delivery_${delivery.id}`,
            type: 'delivery',
            title: `Oil Delivery - ${delivery.oilTypeName || 'Unknown Oil'}`,
            description: `${delivery.deliveredLiters || delivery.loadedOilLiters || 0}L delivered to ${getBranchName(delivery.branchId)}`,
            timestamp: deliveryDate,
            user: delivery.driverName || delivery.reporterName || delivery.reportedByName || getDriverName(delivery.driverUid),
            location: getBranchName(delivery.branchId),
            tank: delivery.tankId || 'N/A',
            photos: delivery.photos || [],
            documents: [],
            status: delivery.status,
            metadata: {
              quantity: delivery.deliveredLiters || delivery.loadedOilLiters || 0,
              oilType: delivery.oilTypeName,
              startMeter: delivery.startMeterReading,
              endMeter: delivery.endMeterReading
            }
          });
        }
      });

      // Process transactions into logs
      transactionsData.forEach(transaction => {
        const transactionDate = transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date(transaction.timestamp || transaction.createdAt);
        if (transactionDate >= thirtyDaysAgo) {
          allLogs.push({
            id: `transaction_${transaction.id}`,
            type: 'transaction',
            title: `${transaction.type?.toUpperCase() || 'TRANSACTION'} - ${transaction.oilTypeName || 'Unknown Oil'}`,
            description: `${transaction.quantity || transaction.deliveredLiters || transaction.loadedLiters || 0}L ${transaction.type === 'loading' ? 'loaded' : 'supplied'}`,
            timestamp: transactionDate,
            user: transaction.driverName || transaction.reporterName || transaction.reportedByName || getDriverName(transaction.driverUid),
            location: getBranchName(transaction.branchId),
            tank: transaction.tankId || 'N/A',
            photos: transaction.photos || [],
            documents: [],
            status: transaction.status || 'completed',
            metadata: {
              quantity: transaction.quantity || transaction.deliveredLiters || transaction.loadedLiters || 0,
              oilType: transaction.oilTypeName,
              sessionId: transaction.loadSessionId
            }
          });
        }
      });

      // Process complaints into logs
      complaintsData.forEach(complaint => {
        const complaintDate = complaint.createdAt?.toDate ? complaint.createdAt.toDate() : new Date(complaint.createdAt);
        if (complaintDate >= thirtyDaysAgo) {
          allLogs.push({
            id: `complaint_${complaint.id}`,
            type: 'complaint',
            title: `Complaint: ${complaint.title || 'Untitled'}`,
            description: complaint.description || 'No description',
            timestamp: complaintDate,
            user: complaint.reportedByName || complaint.createdBy || 'Unknown User',
            location: getBranchName(complaint.branchId),
            tank: 'N/A',
            photos: complaint.photos || [],
            documents: complaint.documents || [],
            status: complaint.status || 'open',
            metadata: {
              priority: complaint.priority,
              category: complaint.category
            }
          });
        }
      });

      // Process tasks into logs
      tasksData.forEach(task => {
        const taskDate = task.createdAt?.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
        if (taskDate >= thirtyDaysAgo) {
          allLogs.push({
            id: `task_${task.id}`,
            type: 'task',
            title: `Task: ${task.title || 'Untitled'}`,
            description: task.description || 'No description',
            timestamp: taskDate,
            user: task.assignedTo || task.createdBy || 'Unassigned',
            location: 'N/A',
            tank: 'N/A',
            photos: [],
            documents: task.documents || [],
            status: task.status || 'pending',
            metadata: {
              priority: task.priority,
              dueDate: task.dueDate
            }
          });
        }
      });

      // Process user creation/modification logs (simulated from user data activity)
      driversData.forEach(user => {
        if (user.createdAt) {
          const userDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          if (userDate >= thirtyDaysAgo) {
            allLogs.push({
              id: `user_created_${user.uid || user.id}`,
              type: 'user_management',
              title: `User Created - ${user.displayName || user.email}`,
              description: `New ${user.role} user account created`,
              timestamp: userDate,
              user: 'Admin',
              location: 'System',
              tank: 'N/A',
              photos: [],
              documents: [],
              status: 'completed',
              metadata: {
                userRole: user.role,
                userEmail: user.email,
                action: 'created'
              }
            });
          }
        }
      });

      // Process branch creation logs (simulated from branch data)
      branchesData.forEach(branch => {
        if (branch.createdAt) {
          const branchDate = branch.createdAt?.toDate ? branch.createdAt.toDate() : new Date(branch.createdAt);
          if (branchDate >= thirtyDaysAgo) {
            allLogs.push({
              id: `branch_created_${branch.id}`,
              type: 'branch_management',
              title: `Branch Created - ${branch.name}`,
              description: `New branch location added: ${branch.address || 'No address'}`,
              timestamp: branchDate,
              user: 'Admin',
              location: branch.name,
              tank: 'N/A',
              photos: [],
              documents: [],
              status: 'completed',
              metadata: {
                branchName: branch.name,
                branchAddress: branch.address,
                action: 'created'
              }
            });
          }
        }
      });

      // Sort logs by timestamp (newest first)
      allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log('📋 Total logs generated:', allLogs.length);
      console.log('📋 Log types:', allLogs.reduce((acc: any, log: any) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {}));
      
      setLogs(allLogs);
      setFilteredLogs(allLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  // Filter logs based on date criteria only
  const filterLogs = () => {
    let filtered = [...logs];

    if (logFilter.startDate) {
      const startDate = new Date(logFilter.startDate);
      filtered = filtered.filter(log => log.timestamp >= startDate);
    }

    if (logFilter.endDate) {
      const endDate = new Date(logFilter.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => log.timestamp <= endDate);
    }

    setFilteredLogs(filtered);
  };

  // Download logs as CSV
  const downloadLogsCSV = () => {
    const headers = [
      'Date & Time',
      'Type',
      'Title',
      'Description',
      'User',
      'Location',
      'Tank',
      'Status',
      'Photos',
      'Documents'
    ];

    const csvData = filteredLogs.map(log => [
      log.timestamp.toLocaleString(),
      log.type.toUpperCase(),
      log.title,
      log.description,
      log.user,
      log.location,
      log.tank,
      log.status,
      (log.photos || []).length,
      (log.documents || []).length
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Download complaints register as CSV with resolutions and status updates
  const downloadComplaintsCSV = () => {
    const headers = [
      'Complaint ID',
      'Date Submitted',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Branch',
      'Category',
      'Priority',
      'Status',
      'Description',
      'Driver Name',
      'Resolution',
      'Resolved By',
      'Resolution Date',
      'Last Updated',
      'Photos Count',
      'Follow-up Notes'
    ];

    // Filter complaints by date range if provided
    let filteredComplaints = complaints;
    
    if (complaintsStartDate || complaintsEndDate) {
      filteredComplaints = complaints.filter((complaint: any) => {
        if (!complaint.createdAt) return false;
        
        const complaintDate = new Date(complaint.createdAt);
        const startDate = complaintsStartDate ? new Date(complaintsStartDate) : null;
        const endDate = complaintsEndDate ? new Date(complaintsEndDate + 'T23:59:59') : null;
        
        if (startDate && complaintDate < startDate) return false;
        if (endDate && complaintDate > endDate) return false;
        
        return true;
      });
    }

    const csvData = filteredComplaints.map((complaint: any) => [
      complaint.id || '',
      complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : '',
      complaint.customerName || '',
      complaint.customerPhone || '',
      complaint.customerEmail || '',
      complaint.branchName || '',
      complaint.category || 'General',
      complaint.priority || 'Medium',
      complaint.status || 'Open',
      (complaint.description || '').replace(/"/g, '""'), // Escape quotes in description
      complaint.driverName || '',
      (complaint.resolution || '').replace(/"/g, '""'), // Escape quotes in resolution
      complaint.resolvedBy || '',
      complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleString() : '',
      complaint.updatedAt ? new Date(complaint.updatedAt).toLocaleString() : '',
      (complaint.photoUrls || []).length,
      (complaint.notes || '').replace(/"/g, '""') // Escape quotes in notes
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Include date range in filename if filters are applied
    let filename = 'complaints_register';
    if (complaintsStartDate || complaintsEndDate) {
      const startStr = complaintsStartDate ? complaintsStartDate : 'start';
      const endStr = complaintsEndDate ? complaintsEndDate : 'end';
      filename += `_${startStr}_to_${endStr}`;
    } else {
      filename += `_${new Date().toISOString().split('T')[0]}`;
    }
    filename += '.csv';
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Apply filters when filter criteria change
  useEffect(() => {
    filterLogs();
  }, [logFilter, logs]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      localStorage.removeItem('currentUser');
      window.location.href = '/';
    }
  };

  // Delivery stats
  const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
  const pendingDeliveries = deliveries.filter(d => d.status !== 'completed').length;
  const totalOilDelivered = deliveries
    .filter(d => d.status === 'completed')
    .reduce((total, d) => total + (d.loadedOilLiters || 0), 0);

  // Driver stats
  const activeDrivers = drivers.filter(d => d.active !== false).length;
  const totalDrivers = drivers.length;

  // Complaint stats
  const openComplaints = complaints.filter(c => c.status === 'open').length;
  const totalComplaints = complaints.length;

  // Task stats
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

  // Handler functions
  const handleAddDriver = async (userData: any) => {
    try {
      // Create user directly in Firebase Authentication and Firestore
      const firebaseUser = await createFirebaseUserReal(userData);
      
      // Reload data to show the new user
      await loadData();
      
      toast({
        title: "Success", 
        description: `${userData.role === 'driver' ? 'Driver' : userData.role === 'branch_user' ? 'Branch user' : userData.role === 'warehouse' ? 'Warehouse user' : 'User'} created successfully in Firebase`
      });
    } catch (error: any) {
      console.error('Error creating Firebase user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user in Firebase",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDriver = async (id: string, driver: Partial<User>) => {
    try {
      console.log('📝 Updating user:', id, driver);
      await updateDriver(id, driver);
      console.log('✅ User updated in database');
      
      // Force reload data to refresh UI
      await loadData();
      console.log('🔄 Data reloaded after update');
      
      toast({
        title: "Success",
        description: "User updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      console.log('🗑️ Admin dashboard deleting user:', id);
      await deleteDriver(id);
      console.log('✅ User deleted from database');
      
      // Force reload data to refresh UI
      await loadData();
      console.log('🔄 Data reloaded after deletion');
      
      toast({
        title: "Success",
        description: "User deleted successfully with all related data"
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleToggleDriverStatus = async (id: string, active: boolean) => {
    try {
      await updateDriver(id, { active });
      await loadData();
      toast({
        title: "Success",
        description: `Driver ${active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling driver status:', error);
      toast({
        title: "Error",
        description: "Failed to update driver status",
        variant: "destructive"
      });
    }
  };

  const handleAddBranch = async (branch: CreateBranch) => {
    try {
      await saveBranch(branch);
      await loadData();
      toast({
        title: "Success",
        description: "Branch added successfully"
      });
    } catch (error) {
      console.error('Error adding branch:', error);
      toast({
        title: "Error",
        description: "Failed to add branch",
        variant: "destructive"
      });
    }
  };

  const handleUpdateBranch = async (id: string, branch: Partial<Branch>) => {
    try {
      // Check if branch name is being updated - use cascading update
      if (branch.name) {
        await updateBranchNameCascading(id, branch.name);
        
        // Update other fields (non-name fields) separately
        const { name, ...otherFields } = branch;
        if (Object.keys(otherFields).length > 0) {
          await updateBranch(id, otherFields);
        }
        
        console.log(`✅ Branch name updated with cascading to: ${branch.name}`);
      } else {
        // No name change, use regular update
        await updateBranch(id, branch);
      }
      
      await loadData();
      toast({
        title: "Success",
        description: branch.name ? "Branch updated successfully (all records updated)" : "Branch updated successfully"
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      toast({
        title: "Error",
        description: "Failed to update branch",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBranch = async (id: string) => {
    try {
      await deleteBranch(id);
      await loadData();
      toast({
        title: "Success",
        description: "Branch deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive"
      });
    }
  };

  const handleToggleBranchStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleBranchStatus(id, isActive);
      await loadData();
      toast({
        title: "Success",
        description: `Branch ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling branch status:', error);
      toast({
        title: "Error",
        description: "Failed to update branch status",
        variant: "destructive"
      });
    }
  };

  const handleAddOilType = async (oilType: CreateOilType) => {
    try {
      await saveOilType(oilType);
      await loadData();
      toast({
        title: "Success",
        description: "Oil type added successfully"
      });
    } catch (error) {
      console.error('Error adding oil type:', error);
      toast({
        title: "Error",
        description: "Failed to add oil type",
        variant: "destructive"
      });
    }
  };

  const handleUpdateOilType = async (id: string, oilType: Partial<OilType>) => {
    try {
      // Check if oil type name is being updated - use cascading update
      if (oilType.name) {
        await updateOilTypeNameCascading(id, oilType.name);
        
        // Update other fields (non-name fields) separately
        const { name, ...otherFields } = oilType;
        if (Object.keys(otherFields).length > 0) {
          await updateOilType(id, otherFields);
        }
        
        console.log(`✅ Oil type name updated with cascading to: ${oilType.name}`);
      } else {
        // No name change, use regular update
        await updateOilType(id, oilType);
      }
      
      await loadData();
      toast({
        title: "Success",
        description: oilType.name ? "Oil type updated successfully (all records updated)" : "Oil type updated successfully"
      });
    } catch (error) {
      console.error('Error updating oil type:', error);
      toast({
        title: "Error",
        description: "Failed to update oil type",
        variant: "destructive"
      });
    }
  };

  const handleDeleteOilType = async (id: string) => {
    try {
      await deleteOilType(id);
      await loadData();
      toast({
        title: "Success",
        description: "Oil type deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting oil type:', error);
      toast({
        title: "Error",
        description: "Failed to delete oil type",
        variant: "destructive"
      });
    }
  };

  // Drum capacity handlers
  const handleAddDrumCapacity = async (capacityData: CreateDrumCapacity) => {
    try {
      await saveDrumCapacity(capacityData);
      await loadData();
      toast({
        title: "Success",
        description: "Drum capacity added successfully"
      });
    } catch (error) {
      console.error('Error adding drum capacity:', error);
      toast({
        title: "Error",
        description: "Failed to add drum capacity",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDrumCapacity = async (id: string, capacityData: Partial<DrumCapacity>) => {
    try {
      await updateDrumCapacity(id, capacityData);
      await loadData();
      toast({
        title: "Success",
        description: "Drum capacity updated successfully"
      });
    } catch (error) {
      console.error('Error updating drum capacity:', error);
      toast({
        title: "Error",
        description: "Failed to update drum capacity",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDrumCapacity = async (id: string) => {
    try {
      await deleteDrumCapacity(id);
      await loadData();
      toast({
        title: "Success",
        description: "Drum capacity deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting drum capacity:', error);
      toast({
        title: "Error",
        description: "Failed to delete drum capacity",
        variant: "destructive"
      });
    }
  };

  // Enhanced task management functions
  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateTaskStatus(taskId, newStatus, user);
      await loadData(); // Reload to get updated comments
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
        author: user.displayName || user.email || 'Admin'
      });
      await loadData(); // Reload to get updated comments
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
        
        // Create a simulated upload URL (in real app, upload to Firebase Storage)
        const documentData = {
          name: file.name,
          url: `tasks/${taskId}/${Date.now()}_${file.name}`,
          type: file.type,
          size: file.size,
          uploadedBy: user.displayName || user.email || 'Admin'
        };
        
        await addTaskDocument(taskId, documentData);
      }
      
      await loadData(); // Reload to get updated documents and comments
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

  // Enhanced complaint management functions
  const handleComplaintStatusUpdate = async (complaintId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await updateComplaintStatus(complaintId, newStatus, user);
      await loadData(); // Reload to get updated comments
      toast({
        title: "Success",
        description: `Complaint status updated to ${newStatus.replace('-', ' ')}`
      });
    } catch (error) {
      console.error('Error updating complaint status:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint status",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComplaintComment = async (complaintId: string, commentText: string) => {
    setIsAddingComment(true);
    try {
      await addComplaintComment(complaintId, {
        text: commentText,
        author: user.displayName || user.email || 'Admin'
      });
      await loadData(); // Reload to get updated comments
      toast({
        title: "Success", 
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding complaint comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleUploadComplaintDocument = async (complaintId: string, files: FileList) => {
    setIsUploadingDocument(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create a simulated upload URL (in real app, upload to Firebase Storage)
        const documentData = {
          name: file.name,
          url: `complaints/${complaintId}/${Date.now()}_${file.name}`,
          type: file.type,
          size: file.size,
          uploadedBy: user.displayName || user.email || 'Admin'
        };
        
        await addComplaintDocument(complaintId, documentData);
      }
      
      await loadData(); // Reload to get updated documents and comments
      toast({
        title: "Success",
        description: `${files.length} document(s) uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading complaint documents:', error);
      toast({
        title: "Error", 
        description: "Failed to upload documents",
        variant: "destructive"
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  // Open enhanced modals
  const openTaskDetails = (task: Task) => {
    setSelectedTaskForDetails(task);
    setShowEnhancedTaskModal(true);
  };

  const openComplaintDetails = (complaint: Complaint) => {
    setSelectedComplaintForDetails(complaint);
    setShowEnhancedComplaintModal(true);
  };

  const handleAddTask = async (task: CreateTask) => {
    try {
      // Enhanced task data with user display names
      const enhancedTask = {
        ...task,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Admin',
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

  const handleDeleteRecords = async (collection: string, startDate: Date, endDate: Date) => {
    try {
      await deleteRecordsByDateRange(collection, startDate, endDate);
      await loadData();
      toast({
        title: "Success",
        description: "Records deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting records:', error);
      toast({
        title: "Error",
        description: "Failed to delete records",
        variant: "destructive"
      });
    }
  };



  const downloadTransactionsCSV = (startDate?: string, endDate?: string) => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions available to download",
        variant: "destructive"
      });
      return;
    }

    // Prepare CSV headers
    const headers = [
      "Transaction ID",
      "Type",
      "Date",
      "Driver Name",
      "Oil Type",
      "Quantity (L)",
      "Branch",
      "Start Meter",
      "End Meter",
      "Delivery Order",
      "Tank Level Photo",
      "Hose Connection Photo",
      "Final Tank Photo",
      "Status"
    ];

    // Helper function to get driver name from UID
    const getDriverName = (driverUid: string) => {
      const driver = drivers.find(d => d.uid === driverUid || d.id === driverUid);
      return driver ? (driver.displayName || driver.email) : driverUid || 'Unknown Driver';
    };

    // Helper function to format date properly
    const formatDate = (timestamp: any, createdAt: any) => {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else if (createdAt) {
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      return 'Unknown Date';
    };

    // Filter transactions by date range if provided
    let filteredTransactions = transactions;
    let filteredDeliveries = deliveries;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the full end date
      
      filteredTransactions = transactions.filter((t: any) => {
        const transactionDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return transactionDate >= start && transactionDate <= end;
      });
      
      filteredDeliveries = deliveries.filter((d: any) => {
        const deliveryDate = d.completedTimestamp ? new Date(d.completedTimestamp) : new Date(d.createdAt);
        return deliveryDate >= start && deliveryDate <= end;
      });
    }

    // Combine filtered transactions with deliveries for complete export
    const allTransactions = [
      ...filteredDeliveries.map((delivery: any) => ({
        id: delivery.id,
        type: 'Supply',
        timestamp: delivery.completedTimestamp,
        createdAt: delivery.createdAt,
        driverUid: delivery.driverUid,
        oilTypeName: delivery.oilTypeName || 'Unknown',
        quantity: delivery.deliveredLiters || delivery.loadedOilLiters || 0,
        branchName: delivery.branchName || 'Unknown',
        startMeterReading: delivery.startMeterReading || 0,
        endMeterReading: delivery.endMeterReading || 0,
        deliveryOrderId: delivery.deliveryOrderId || 'N/A',
        photos: delivery.photos || {},
        tankLevelPhoto: delivery.tankLevelPhoto || 'No Photo',
        hoseConnectionPhoto: delivery.hoseConnectionPhoto || 'No Photo',
        finalTankLevelPhoto: delivery.finalTankLevelPhoto || 'No Photo',
        status: delivery.status || 'completed'
      })),
      ...filteredTransactions.map((transaction: any) => ({
        ...transaction,
        quantity: transaction.deliveredLiters || transaction.loadedLiters || transaction.quantity
      }))
    ];

    // Prepare CSV data with enriched information
    const csvData = allTransactions.map(transaction => [
      transaction.loadSessionId || transaction.deliveryOrderId || transaction.id || '',
      transaction.type || (transaction.deliveredLiters ? 'Supply' : 'Loading'),
      formatDate(transaction.timestamp, transaction.createdAt),
      transaction.driverName || transaction.reporterName || transaction.reportedByName || getDriverName(transaction.driverUid),
      transaction.oilTypeName || '',
      transaction.quantity || '',
      transaction.branchName || '',
      transaction.startMeterReading || '',
      transaction.endMeterReading || '',
      transaction.deliveryOrderId || '',
      transaction.photos?.tankLevelBefore || transaction.photos?.tankLevel || transaction.tankLevelPhoto || '',
      transaction.photos?.hoseConnection || transaction.hoseConnectionPhoto || '',
      transaction.photos?.tankLevelAfter || transaction.photos?.finalTankLevel || transaction.finalTankLevelPhoto || '',
      transaction.status || 'completed'
    ]);

    // Create CSV content
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `oil_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Downloaded ${allTransactions.length} transactions with proper dates and driver names`
    });
  };

  const viewTransactionDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  // Data cleanup functions
  const handlePhotoCleanup = async (type: 'transactions' | 'complaints' | 'all') => {
    setIsCleanupLoading(true);
    try {
      // Photo cleanup logic would go here - this is a stub
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate cleanup
      
      toast({
        title: "Success",
        description: `${type === 'all' ? 'All' : type} photos cleaned up successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to clean up ${type} photos`,
        variant: "destructive"
      });
    } finally {
      setIsCleanupLoading(false);
    }
  };



  // Theme classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'night':
        return {
          background: 'bg-gray-900',
          header: 'bg-gray-800 border-gray-700',
          sidebar: 'bg-gray-800 border-gray-700',
          card: 'bg-gray-800 border-gray-700 text-white',
          mobileNav: 'bg-gray-800 border-gray-700',
          text: 'text-white',
          secondaryText: 'text-gray-300',
          accent: 'text-blue-400'
        };
      case 'midday':
        return {
          background: 'bg-blue-50',
          header: 'bg-blue-100 border-blue-200',
          sidebar: 'bg-white border-blue-200',
          card: 'bg-white border-blue-200',
          mobileNav: 'bg-blue-100 border-blue-200',
          text: 'text-gray-900',
          secondaryText: 'text-gray-600',
          accent: 'text-blue-600'
        };
      default: // light
        return {
          background: 'bg-gray-50',
          header: 'bg-white border-gray-200',
          sidebar: 'bg-white border-gray-200',
          card: 'bg-white border-gray-200',
          mobileNav: 'bg-white border-gray-200',
          text: 'text-gray-900',
          secondaryText: 'text-gray-600',
          accent: 'text-blue-600'
        };
    }
  };

  const themeClasses = getThemeClasses();

  if (loading) {
    return (
      <div className={`min-h-screen ${themeClasses.background} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className={themeClasses.secondaryText}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      {/* Header */}
      <div className={`${themeClasses.header} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <div className="mr-3">
                <OilDeliveryLogo className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div>
                <h1 className={`text-lg sm:text-xl font-bold ${themeClasses.text}`}>OneDelivery</h1>
                <p className={`text-xs sm:text-sm ${themeClasses.secondaryText}`}>Admin Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Switcher */}
              <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-100 dark:bg-gray-700">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    theme === 'light' 
                      ? 'bg-white shadow text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="theme-light"
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setTheme('midday')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    theme === 'midday' 
                      ? 'bg-blue-500 shadow text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="theme-midday"
                >
                  🌤️ Midday
                </button>
                <button
                  onClick={() => setTheme('night')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    theme === 'night' 
                      ? 'bg-gray-800 shadow text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="theme-night"
                >
                  🌙 Night
                </button>
              </div>
              
              <div className={`text-right hidden sm:block`}>
                <p className={`text-sm font-medium ${themeClasses.text}`}>{user.displayName}</p>
                <p className={`text-xs ${themeClasses.secondaryText}`}>{user.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center text-xs sm:text-sm px-2 sm:px-4"
                data-testid="button-logout"
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
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-64px)] min-h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <div className={`hidden lg:flex lg:flex-col lg:w-64 ${themeClasses.sidebar} shadow-lg border-r`}>
          <div className="flex-1 px-4 py-6">
            <h2 className={`text-lg font-semibold ${themeClasses.text} mb-6`}>Admin Panel</h2>
            <nav className="space-y-1">
              {/* Main Navigation */}
              <div className="mb-4">
                <h3 className={`text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider mb-2`}>Dashboard</h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'overview' 
                      ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                      : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                  }`}
                >
                  <BarChart3Icon className="mr-3 h-5 w-5" />
                  Overview
                </button>
              </div>

              {/* Management Section */}
              <div className="mb-4">
                <h3 className={`text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider mb-2`}>Management</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('drivers')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'drivers' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <UsersIcon className="mr-3 h-5 w-5" />
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('branches')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'branches' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <MapPinIcon className="mr-3 h-5 w-5" />
                    Branches
                  </button>
                  <button
                    onClick={() => setActiveTab('oil-types')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'oil-types' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <DropletIcon className="mr-3 h-5 w-5" />
                    Oil Types
                  </button>
                  <button
                    onClick={() => setActiveTab('drum-capacities')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'drum-capacities' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <PackageIcon className="mr-3 h-5 w-5" />
                    Drum Capacities
                  </button>
                </div>
              </div>

              {/* Operations Section */}
              <div className="mb-4">
                <h3 className={`text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider mb-2`}>Operations</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('recent-transactions')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'recent-transactions' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <FileTextIcon className="mr-3 h-5 w-5" />
                    Recent Transactions
                  </button>
                  <button
                    onClick={() => setActiveTab('transaction-management')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'transaction-management' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <EditIcon className="mr-3 h-5 w-5" />
                    Transaction Management
                  </button>
                  <button
                    onClick={() => setActiveTab('logs-update')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'logs-update' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <ClockIcon className="mr-3 h-5 w-5" />
                    Logs Update
                  </button>
                  <Link to="/task-management">
                    <button className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <ClipboardListIcon className="mr-3 h-5 w-5" />
                      Tasks
                    </button>
                  </Link>
                  <Link to="/complaint-management">
                    <button className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <AlertTriangleIcon className="mr-3 h-5 w-5" />
                      Complaints
                    </button>
                  </Link>
                  <button
                    onClick={() => setActiveTab('warehouse')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'warehouse' 
                        ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                    }`}
                  >
                    <PackageIcon className="mr-3 h-5 w-5" />
                    Warehouse
                  </button>
                </div>
              </div>

              {/* Settings Section */}
              <div>
                <h3 className={`text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider mb-2`}>Configuration</h3>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'settings' 
                      ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500' 
                      : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : 'bg-gray-100'}`
                  }`}
                >
                  <SettingsIcon className="mr-3 h-5 w-5" />
                  Settings
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Mobile Navigation Menu (shown on smaller screens) */}
        <div className="lg:hidden w-full">
          <div className={`${themeClasses.mobileNav} border-b px-4 py-3 relative`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                  }}
                  className={`p-2 rounded-md ${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`}
                  data-testid="mobile-menu-toggle"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <span className={`ml-3 text-sm font-medium ${themeClasses.text}`}>
                  {activeTab === 'overview' && 'Overview'}
                  {activeTab === 'drivers' && 'Users'}
                  {activeTab === 'branches' && 'Branches'} 
                  {activeTab === 'oil-types' && 'Oil Types'}
                  {activeTab === 'recent-transactions' && 'Transactions'}
                  {activeTab === 'logs-update' && 'Logs'}
                  {activeTab === 'tasks' && 'Tasks'}
                  {activeTab === 'complaints' && 'Complaints'}
                  {activeTab === 'warehouse' && 'Warehouse'}
                  {activeTab === 'settings' && 'Settings'}
                </span>
              </div>
            </div>
            
            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div 
                className={`absolute top-full left-0 right-0 ${theme === 'night' ? 'bg-gray-800 border-gray-700' : theme === 'midday' ? 'bg-white border-blue-200' : 'bg-white border-gray-200'} border shadow-xl z-[100]`}
                style={{ 
                  minHeight: '300px',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}
              >
                <div className="py-2">
                  <button
                    onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'overview' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-overview"
                  >
                    📊 Overview
                  </button>
                  <button
                    onClick={() => { setActiveTab('drivers'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'drivers' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-users"
                  >
                    👥 Users
                  </button>
                  <button
                    onClick={() => { setActiveTab('branches'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'branches' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-branches"
                  >
                    🏢 Branches
                  </button>
                  <button
                    onClick={() => { setActiveTab('oil-types'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'oil-types' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-oil-types"
                  >
                    💧 Oil Types
                  </button>
                  <button
                    onClick={() => { setActiveTab('recent-transactions'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'recent-transactions' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-transactions"
                  >
                    📄 Recent Transactions
                  </button>
                  <button
                    onClick={() => { setActiveTab('transaction-management'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'transaction-management' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-transaction-management"
                  >
                    ✏️ Transaction Management
                  </button>
                  <button
                    onClick={() => { setActiveTab('logs-update'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'logs-update' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-logs"
                  >
                    🕐 Logs
                  </button>
                  <button
                    onClick={() => { 
                      console.log('Mobile Tasks clicked, setting activeTab to tasks');
                      setActiveTab('tasks'); 
                      setIsMobileMenuOpen(false); 
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'tasks' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-tasks"
                  >
                    📋 Tasks
                  </button>
                  <button
                    onClick={() => { 
                      console.log('Mobile Complaints clicked, setting activeTab to complaints');
                      setActiveTab('complaints'); 
                      setIsMobileMenuOpen(false); 
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'complaints' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-complaints"
                  >
                    ⚠️ Complaints
                  </button>
                  <button
                    onClick={() => { setActiveTab('warehouse'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'warehouse' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-warehouse"
                  >
                    📦 Warehouse
                  </button>
                  <button
                    onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'settings' 
                        ? 'bg-orange-100 text-orange-900' 
                        : `${themeClasses.text} hover:${theme === 'night' ? 'bg-gray-700' : theme === 'midday' ? 'bg-blue-100' : 'bg-gray-100'}`
                    }`}
                    data-testid="mobile-menu-settings"
                  >
                    ⚙️ Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto lg:overflow-auto">
          {/* Debug info - remove after fixing */}
          <div className="lg:hidden bg-yellow-100 p-2 text-xs">
            Current activeTab: {activeTab}
          </div>
          <div className={`${activeTab === 'tasks' || activeTab === 'complaints' ? 'p-2 lg:p-6' : 'p-3 lg:p-6'} min-h-full`}>
            {/* Overview Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
            {/* CSV Download Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold ${themeClasses.text}`}>Admin Overview</h2>
                <p className={`${themeClasses.secondaryText} text-sm`}>Today's operations and download reports</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Button
                  onClick={() => setIsTransactionViewerOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
                  data-testid="button-transaction-viewer"
                >
                  <FileTextIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">View Transactions</span>
                  <span className="sm:hidden">View</span>
                </Button>
                <Button 
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  variant="outline"
                  className="text-sm"
                >
                  <FilterIcon className="h-4 w-4 mr-2" />
                  Filter & Download CSV
                </Button>

              </div>
            </div>
            
            {/* Date Filter Section */}
            {showDateFilter && (
              <Card className={`mb-6 ${themeClasses.card}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="start-date" className="text-sm font-medium">From:</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={csvStartDate}
                        onChange={(e) => setCsvStartDate(e.target.value)}
                        className="w-auto text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="end-date" className="text-sm font-medium">To:</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={csvEndDate}
                        onChange={(e) => setCsvEndDate(e.target.value)}
                        className="w-auto text-sm"
                      />
                    </div>
                    <Button 
                      onClick={() => downloadTransactionsCSV(csvStartDate, csvEndDate)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm"
                      disabled={!csvStartDate || !csvEndDate}
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download Filtered CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Overview Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Task Management Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileTextIcon className="h-5 w-5 mr-2 text-green-600" />
                      Task Management Overview
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSection('tasks')}
                      className="text-xs"
                    >
                      Manage Tasks
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                      <div className="text-sm text-blue-700">Total Tasks</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{pendingTasks}</div>
                      <div className="text-sm text-orange-700">Pending</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{inProgressTasks}</div>
                      <div className="text-sm text-yellow-700">In Progress</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{tasks.filter((t: any) => t.status === 'completed').length}</div>
                      <div className="text-sm text-green-700">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Complaint Management Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
                      Complaint Management Overview
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveSection('complaints')}
                      className="text-xs"
                    >
                      Manage Complaints
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{complaints.length}</div>
                      <div className="text-sm text-blue-700">Total Complaints</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{openComplaints}</div>
                      <div className="text-sm text-red-700">Open</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{complaints.filter((c: any) => c.status === 'in-progress').length}</div>
                      <div className="text-sm text-yellow-700">In Progress</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{complaints.filter((c: any) => c.status === 'resolved').length}</div>
                      <div className="text-sm text-green-700">Resolved</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Oil Delivered by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DropletIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Today's Oil Delivered (by Oil Type)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Date selector */}
                  <div className="flex items-center space-x-2 mb-4">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  
                  {(() => {
                    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
                    const selectedDateString = selectedDateObj.toDateString();
                    
                    // Filter deliveries and transactions for the selected date
                    const dateDeliveries = deliveries.filter(d => 
                      d.completedTimestamp && new Date(d.completedTimestamp).toDateString() === selectedDateString
                    );
                    
                    const dateTransactions = transactions.filter((t: any) => {
                      const transactionDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
                      return transactionDate.toDateString() === selectedDateString && t.type === 'supply';
                    });
                    
                    // Combine data for comprehensive view
                    const allSupplyData = [
                      ...dateDeliveries.map((d: any) => ({
                        oilType: d.oilTypeName || 'Unknown',
                        quantity: d.deliveredLiters || d.loadedOilLiters || 0,
                        status: d.status || 'completed'
                      })),
                      ...dateTransactions.map((t: any) => ({
                        oilType: t.oilTypeName || 'Unknown',
                        quantity: t.quantity || t.deliveredLiters || t.loadedLiters || 0,
                        status: t.status || 'completed'
                      }))
                    ];
                    
                    const oilTypeTotals = allSupplyData.reduce((acc: any, item) => {
                      const oilType = item.oilType;
                      if (!acc[oilType]) {
                        acc[oilType] = { total: 0, supplies: 0, deliveries: 0 };
                      }
                      acc[oilType].total += item.quantity;
                      if (item.status === 'completed') {
                        acc[oilType].deliveries += 1;
                      } else {
                        acc[oilType].supplies += 1;
                      }
                      return acc;
                    }, {});

                    const totalDay = Object.values(oilTypeTotals).reduce((sum: number, data: any) => sum + data.total, 0);

                    return Object.keys(oilTypeTotals).length > 0 ? (
                      <>
                        {Object.entries(oilTypeTotals).map(([oilType, data]: [string, any]) => (
                          <div key={oilType} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                                <span className="font-medium">{oilType}</span>
                              </div>
                              <div className="text-xl font-bold text-blue-600">{data.total.toLocaleString()}L</div>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Supply: {data.supplies} operations</span>
                              <span>Delivery: {data.deliveries} completed</span>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-3 mt-3">
                          <div className="flex justify-between items-center font-bold text-lg">
                            <span>Total for {new Date(selectedDate).toLocaleDateString()}:</span>
                            <span className="text-blue-600">{totalDay.toLocaleString()}L</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <DropletIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No oil operations on {new Date(selectedDate).toLocaleDateString()}</p>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

              </div>
            )}

            {/* Users Content */}
            {activeTab === 'drivers' && (
              <AdminUsers
                drivers={drivers}
                branches={branches}
                onAddDriver={handleAddDriver}
                onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver}
                onToggleDriverStatus={handleToggleDriverStatus}
              />
            )}

            {/* Branches Content */}
            {activeTab === 'branches' && (
              <AdminBranches
                branches={branches}
                oilTypes={oilTypes}
                onAddBranch={handleAddBranch}
                onUpdateBranch={handleUpdateBranch}
                onDeleteBranch={handleDeleteBranch}
                onToggleBranchStatus={handleToggleBranchStatus}
              />
            )}

            {/* Oil Types Content */}
            {activeTab === 'oil-types' && (
              <AdminOilTypes
                oilTypes={oilTypes}
                onAddOilType={handleAddOilType}
                onUpdateOilType={handleUpdateOilType}
                onDeleteOilType={handleDeleteOilType}
              />
            )}

            {activeTab === 'drum-capacities' && (
              <AdminDrumCapacities
                drumCapacities={drumCapacities}
                onAddDrumCapacity={handleAddDrumCapacity}
                onUpdateDrumCapacity={handleUpdateDrumCapacity}
                onDeleteDrumCapacity={handleDeleteDrumCapacity}
              />
            )}



            {/* Warehouse Content */}
            {activeTab === 'warehouse' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Warehouse Management</h3>
                  <p className="text-sm text-gray-600">Access comprehensive inventory and warehouse operations</p>
                </div>
                <Button 
                  onClick={() => window.open('/warehouse-dashboard', '_blank')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <PackageIcon className="w-4 h-4 mr-2" />
                  Open Warehouse Dashboard
                </Button>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <Package className="h-4 w-4 mr-2 text-orange-600" />
                      Inventory Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">Monitor and manage oil tank levels across all branches with real-time status updates.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• Real-time tank monitoring</li>
                      <li>• Color-coded status indicators</li>
                      <li>• Tank adjustment tools</li>
                      <li>• Consumption recording</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <ClipboardListIcon className="h-4 w-4 mr-2 text-blue-600" />
                      Transaction History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">Complete transaction history with detailed photo evidence viewing capabilities.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• All system transactions</li>
                      <li>• Photo evidence viewer</li>
                      <li>• Detailed operation logs</li>
                      <li>• Export functionality</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                      <BarChart3Icon className="h-4 w-4 mr-2 text-green-600" />
                      Analytics & Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">Advanced analytics and management decision support tools for inventory optimization.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>• Tank status distribution</li>
                      <li>• Branch inventory overview</li>
                      <li>• Critical level alerts</li>
                      <li>• Management insights</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <PackageIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Warehouse Dashboard Access</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        The warehouse dashboard provides comprehensive inventory management across all branches with real-time monitoring, 
                        analytics, and photo evidence viewing capabilities for complete operational oversight.
                      </p>
                      <Button 
                        onClick={() => window.open('/warehouse-dashboard', '_blank')}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Launch Warehouse Dashboard →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

            
            {/* Transaction Management Content */}
            {activeTab === 'transaction-management' && (
              <AdminTransactionManagement />
            )}

            {/* Recent Transactions Content */}
            {activeTab === 'recent-transactions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Recent Transactions</h3>
                    <p className="text-sm text-gray-600">Last 20 system transactions</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Total: {recentTransactions.length} transactions
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-6">
                    {recentTransactions.length > 0 ? (
                      <div className="space-y-4">
                        {recentTransactions.map((transaction, index) => (
                          <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  transaction.type === 'loading' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {transaction.type === 'loading' ? 'LOADING' : 'SUPPLY'}
                                </span>
                                <span className="font-medium">{transaction.oilTypeName}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {(transaction.quantity || transaction.deliveredLiters || transaction.loadedLiters || 0).toLocaleString()}L
                                {(() => {
                                  const branch = branches.find(b => b.id === transaction.branchId);
                                  const branchName = branch ? branch.name : (transaction.branchName || 'Unknown Location');
                                  if (transaction.type === 'supply') {
                                    return <> • Delivered to {branchName}</>;
                                  } else if (transaction.type === 'loading') {
                                    return <> • Loaded from {branchName}</>;
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {(() => {
                                  if (transaction.timestamp?.toDate) {
                                    return transaction.timestamp.toDate().toLocaleString();
                                  } else if (transaction.timestamp && typeof transaction.timestamp === 'string') {
                                    return new Date(transaction.timestamp).toLocaleString();
                                  } else if (transaction.createdAt?.toDate) {
                                    return transaction.createdAt.toDate().toLocaleString();
                                  } else if (transaction.createdAt) {
                                    return new Date(transaction.createdAt).toLocaleString();
                                  } else if (transaction.actualDeliveryEndTime) {
                                    return new Date(transaction.actualDeliveryEndTime).toLocaleString();
                                  } else if (transaction.actualDeliveryStartTime) {
                                    return new Date(transaction.actualDeliveryStartTime).toLocaleString();
                                  }
                                  return 'Unknown date';
                                })()}
                              </div>
                              <div className="text-xs text-gray-500">Driver: {(() => {
                                // Enhanced driver name resolution with multiple fallbacks
                                if (transaction.driverName) return transaction.driverName;
                                if (transaction.reporterName) return transaction.reporterName;
                                if (transaction.reportedByName) return transaction.reportedByName;
                                
                                // Look up by UID/ID in drivers list
                                const driver = drivers.find(d => d.uid === transaction.driverUid || d.id === transaction.driverUid);
                                if (driver) return driver.displayName || driver.email;
                                
                                return transaction.driverUid ? `Driver (ID: ${transaction.driverUid.slice(-4)})` : 'Unknown Driver';
                              })()}</div>
                              {(() => {
                                const branch = branches.find(b => b.id === transaction.branchId);
                                const branchName = branch ? branch.name : (transaction.branchName || 'Unknown Location');
                                const locationLabel = transaction.type === 'loading' ? 'Source' : 'Branch';
                                return (
                                  <div className="text-xs text-gray-500">{locationLabel}: {branchName}</div>
                                );
                              })()}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setShowTransactionModal(true);
                              }}
                              className="flex items-center gap-2"
                              data-testid={`button-view-transaction-${index}`}
                            >
                              <EyeIcon className="h-4 w-4" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No recent transactions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Logs Update Content */}
            {activeTab === 'logs-update' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">System Logs</h3>
                    <p className="text-sm text-gray-600">Comprehensive activity logs from last 30 days</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadLogsCSV}
                      variant="outline"
                      disabled={filteredLogs.length === 0}
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                {/* Filter Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Filter Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="filter-start-date">Start Date</Label>
                        <Input
                          id="filter-start-date"
                          type="date"
                          value={logFilter.startDate}
                          onChange={(e) => setLogFilter(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="filter-end-date">End Date</Label>
                        <Input
                          id="filter-end-date"
                          type="date"
                          value={logFilter.endDate}
                          onChange={(e) => setLogFilter(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => setLogFilter({ startDate: '', endDate: '' })}
                        variant="outline"
                        size="sm"
                      >
                        Clear Filters
                      </Button>
                      <div className="text-sm text-gray-600 flex items-center">
                        Showing {filteredLogs.length} of {logs.length} logs
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Logs Display */}
                <Card>
                  <CardContent className="p-6">
                    {filteredLogs.length > 0 ? (
                      <div className="space-y-4">
                        {filteredLogs.map((log) => (
                          <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                                    log.type === 'delivery' ? 'bg-green-100 text-green-800' :
                                    log.type === 'transaction' ? 'bg-blue-100 text-blue-800' :
                                    log.type === 'complaint' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.type.toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    log.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    log.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    log.status === 'open' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {log.status.toUpperCase()}
                                  </span>
                                </div>
                                <h4 className="font-medium text-gray-900 mb-1">{log.title}</h4>
                                <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                  <span>📅 {log.timestamp.toLocaleString()}</span>
                                  <span>👤 {log.user}</span>
                                  <span>📍 {log.location}</span>
                                  <span>🛢️ {log.tank}</span>
                                  {log.photos && log.photos.length > 0 && (
                                    <span>📷 {log.photos.length} photo(s)</span>
                                  )}
                                  {log.documents && log.documents.length > 0 && (
                                    <span>📄 {log.documents.length} document(s)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No logs found matching the filter criteria</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings Content */}
            {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* System Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <SettingsIcon className="h-5 w-5 mr-2 text-blue-600" />
                    System Configuration
                  </CardTitle>
                  <CardDescription>
                    Control system-wide settings and user permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSettings ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2Icon className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Gallery Access for Gauge Photos (Step 3)</Label>
                          <p className="text-xs text-gray-500">
                            Allow branch users to select gauge photos from gallery. System photos (Step 5) always allow gallery access.
                          </p>
                        </div>
                        <Switch
                          checked={systemSettings.allowGalleryAccess}
                          onCheckedChange={toggleGalleryAccess}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Firebase Usage Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HardDriveIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Firebase Usage & Billing Monitor
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadFirebaseUsage}
                      disabled={isLoadingUsage}
                      className="ml-auto"
                    >
                      {isLoadingUsage ? (
                        <>
                          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingUsage ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2Icon className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : firestoreUsage ? (
                    <div className="space-y-6">
                      {/* Database Overview */}
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-blue-800">Total Documents:</span>
                          <span className="text-2xl font-bold text-blue-600">{firestoreUsage.firestore?.totalDocuments?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-blue-700">Total Storage Used:</span>
                          <span className="text-lg font-medium text-blue-600">{firestoreUsage.storage?.totalEstimatedStorage}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Firestore Collections */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center">
                              <FileTextIcon className="h-4 w-4 mr-2" />
                              Firestore Collections
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {Object.entries(firestoreUsage.firestore?.collections || {}).map(([collection, count]) => (
                              <div key={collection} className="flex justify-between">
                                <span className="text-sm capitalize">{collection}:</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-medium">Database Size:</span>
                              <span className="font-bold text-blue-600">{firestoreUsage.firestore?.storage}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Storage & Media */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center">
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Storage & Media
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Total Photos:</span>
                              <span className="font-medium">{firestoreUsage.storage?.photos}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Photo Storage:</span>
                              <span className="font-medium">{firestoreUsage.storage?.estimatedPhotoStorage}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-medium">Total Storage:</span>
                              <span className="font-bold text-green-600">{firestoreUsage.storage?.totalEstimatedStorage}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* User Analytics */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center">
                              <UsersIcon className="h-4 w-4 mr-2" />
                              User Analytics
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Total Users:</span>
                              <span className="font-medium">{firestoreUsage.authentication?.totalUsers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Active Users:</span>
                              <span className="font-medium">{firestoreUsage.authentication?.activeUsers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Admins:</span>
                              <span className="font-medium">{firestoreUsage.authentication?.adminUsers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Drivers:</span>
                              <span className="font-medium">{firestoreUsage.authentication?.driverUsers}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Data Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Data Categories
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-green-700">Operational Data:</span>
                              <div className="text-xs text-gray-600 ml-2">
                                Deliveries: {firestoreUsage.dataBreakdown?.operational?.deliveries} • 
                                Complaints: {firestoreUsage.dataBreakdown?.operational?.complaints} • 
                                Sessions: {firestoreUsage.dataBreakdown?.operational?.loadSessions}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-blue-700">Configuration:</span>
                              <div className="text-xs text-gray-600 ml-2">
                                Branches: {firestoreUsage.dataBreakdown?.configuration?.branches} • 
                                Oil Types: {firestoreUsage.dataBreakdown?.configuration?.oilTypes}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-purple-700">Management:</span>
                              <div className="text-xs text-gray-600 ml-2">
                                Tasks: {firestoreUsage.dataBreakdown?.management?.tasks} • 
                                Transactions: {firestoreUsage.dataBreakdown?.management?.transactions}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="text-xs text-gray-500 text-center">
                        Last updated: {new Date().toLocaleString()} • Real usage data from your Firebase project
                        <br />
                        <span className="text-gray-500">
                          Monitoring actual database usage - no billing API required
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <HardDriveIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Click "Refresh" to load Firebase usage statistics</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div>
                <h3 className="text-lg font-semibold">Data Management & Cleanup</h3>
                <p className="text-sm text-gray-600">Clean up old data and manage storage automatically</p>
              </div>
              
              {/* Data Cleanup Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transactions Cleanup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <TrashIcon className="h-5 w-5 mr-2" />
                      Transaction Data Cleanup
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>Total Transactions: <span className="font-medium">{transactions.length}</span></p>
                        <p>Total Deliveries: <span className="font-medium">{deliveries.length}</span></p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cleanup-months">Delete data older than:</Label>
                        <Select value={cleanupMonths} onValueChange={setCleanupMonths}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="6">6 months</SelectItem>
                            <SelectItem value="12">12 months</SelectItem>
                            <SelectItem value="24">24 months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button
                        onClick={() => setShowCleanupConfirmModal(true)}
                        variant="destructive"
                        className="w-full"
                        disabled={isCleanupLoading}
                      >
                        {isCleanupLoading ? (
                          <>
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            Cleaning up...
                          </>
                        ) : (
                          <>
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Start Cleanup
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Photo Storage Cleanup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-purple-600">
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Photo Storage Cleanup
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>Storage optimization and cleanup</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Transaction Photos</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePhotoCleanup('transactions')}
                            disabled={isCleanupLoading}
                          >
                            Clean
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Complaint Photos</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePhotoCleanup('complaints')}
                            disabled={isCleanupLoading}
                          >
                            Clean
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">All Photos</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePhotoCleanup('all')}
                            disabled={isCleanupLoading}
                          >
                            Clean All
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Storage Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <HardDriveIcon className="h-5 w-5 mr-2" />
                    Storage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{transactions.length + deliveries.length}</div>
                      <div className="text-sm text-gray-600">Total Records</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{drivers.length}</div>
                      <div className="text-sm text-gray-600">Active Drivers</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{branches.length}</div>
                      <div className="text-sm text-gray-600">Active Branches</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Firebase Usage & Billing Estimate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <DollarSignIcon className="h-5 w-5 mr-2" />
                    Usage & Billing Estimate
                  </CardTitle>
                  <CardDescription>
                    Firebase Blaze plan cost estimation based on current usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FirebaseUsageCalculator />
                </CardContent>
              </Card>

              {/* Settings Panel - Data Export & Filtering */}
              <SettingsPanel 
                storageUsage={null}
                onDeleteRecords={handleDeleteRecords}
              />
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Management Section */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 lg:space-y-6" style={{ display: 'block' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl lg:text-2xl font-bold ${themeClasses.text}`}>Task Management</h2>
              <p className={`text-sm lg:text-base ${themeClasses.secondaryText}`}>Manage tasks, track progress, and handle assignments</p>
            </div>
          </div>

          {/* Task Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
                  </div>
                  <FileTextIcon className="h-8 w-8 text-blue-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingTasks}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-orange-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-600">{inProgressTasks}</p>
                  </div>
                  <PlayIcon className="h-8 w-8 text-yellow-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{tasks.filter((t: any) => t.status === 'completed').length}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileTextIcon className="h-5 w-5 mr-2" />
                All Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No tasks available</p>
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <Badge variant={
                            task.status === 'completed' ? 'default' : 
                            task.status === 'in-progress' ? 'secondary' : 
                            task.status === 'hold' ? 'destructive' : 'outline'
                          }>
                            {task.status}
                          </Badge>
                          <Badge variant="outline" className={
                            task.priority === 'high' ? 'border-red-200 text-red-800 bg-red-50' :
                            task.priority === 'medium' ? 'border-yellow-200 text-yellow-800 bg-yellow-50' :
                            'border-green-200 text-green-800 bg-green-50'
                          }>
                            {task.priority} priority
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTaskForDetails(task);
                              setShowEnhancedTaskModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <SettingsIcon className="h-4 w-4" />
                            Manage
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>Assigned to: {task.assignedTo || 'Unassigned'}</span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              Due: {(() => {
                                if (task.dueDate.toDate) {
                                  return task.dueDate.toDate().toLocaleDateString();
                                } else if (task.dueDate instanceof Date) {
                                  return task.dueDate.toLocaleDateString();
                                } else {
                                  return new Date(task.dueDate).toLocaleDateString();
                                }
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <PaperclipIcon className="h-4 w-4" />
                              {task.attachments.length}
                            </span>
                          )}
                          {task.comments && task.comments.length > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <MessageCircleIcon className="h-4 w-4" />
                              {task.comments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complaints Management Section */}
      {activeTab === 'complaints' && (
        <div className="space-y-4 lg:space-y-6" style={{ display: 'block' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl lg:text-2xl font-bold ${themeClasses.text}`}>Complaint Management</h2>
              <p className={`text-sm lg:text-base ${themeClasses.secondaryText}`}>Manage complaints, track resolution status, and handle customer issues</p>
            </div>
          </div>

          {/* Complaint Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Complaints</p>
                    <p className="text-2xl font-bold text-blue-600">{complaints.length}</p>
                  </div>
                  <AlertTriangleIcon className="h-8 w-8 text-blue-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open</p>
                    <p className="text-2xl font-bold text-red-600">{complaints.filter((c: any) => c.status === 'open').length}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-red-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-600">{complaints.filter((c: any) => c.status === 'in-progress').length}</p>
                  </div>
                  <PlayIcon className="h-8 w-8 text-yellow-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Resolved</p>
                    <p className="text-2xl font-bold text-green-600">{complaints.filter((c: any) => c.status === 'resolved').length}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500 opacity-75" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Priority Breakdown - Non-Closed Complaints Only */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangleIcon className="h-5 w-5 mr-2 text-orange-600" />
                  Priority Breakdown
                </div>
                <span className="text-sm font-normal text-gray-500">Open & In Progress Only</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Filter for non-closed complaints (open + in-progress)
                const nonClosedComplaints = complaints.filter((c: any) => 
                  c.status === 'open' || c.status === 'in-progress'
                );
                
                const criticalCount = nonClosedComplaints.filter((c: any) => c.priority === 'critical').length;
                const highCount = nonClosedComplaints.filter((c: any) => c.priority === 'high').length;
                const mediumCount = nonClosedComplaints.filter((c: any) => c.priority === 'medium').length;
                const lowCount = nonClosedComplaints.filter((c: any) => c.priority === 'low').length;
                
                return (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
                      <div className="text-sm text-red-700 font-medium">Critical</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600">{highCount}</div>
                      <div className="text-sm text-orange-700 font-medium">High</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-3xl font-bold text-yellow-600">{mediumCount}</div>
                      <div className="text-sm text-yellow-700 font-medium">Medium</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-3xl font-bold text-green-600">{lowCount}</div>
                      <div className="text-sm text-green-700 font-medium">Low</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Complaints List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <AlertTriangleIcon className="h-5 w-5 mr-2" />
                  All Complaints
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-gray-700">From:</Label>
                    <Input
                      type="date"
                      value={complaintsStartDate}
                      onChange={(e) => setComplaintsStartDate(e.target.value)}
                      className="w-auto text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-gray-700">To:</Label>
                    <Input
                      type="date"
                      value={complaintsEndDate}
                      onChange={(e) => setComplaintsEndDate(e.target.value)}
                      className="w-auto text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadComplaintsCSV()}
                    className="flex items-center gap-2"
                    title="Download complaints register with date range filter"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complaints.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No complaints available</p>
                  </div>
                ) : (
                  complaints.map((complaint: any) => (
                    <div key={complaint.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{complaint.category || 'General'} Complaint</h3>
                          <Badge variant={
                            complaint.status === 'resolved' ? 'default' : 
                            complaint.status === 'in-progress' ? 'secondary' : 
                            complaint.status === 'closed' ? 'outline' : 'destructive'
                          }>
                            {complaint.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Priority: {complaint.priority || 'Medium'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {complaint.photoUrls && complaint.photoUrls.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setShowComplaintPhotoModal(true);
                              }}
                              className="flex items-center gap-1"
                            >
                              <ImageIcon className="h-4 w-4" />
                              Photos ({complaint.photoUrls.length})
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedComplaintForDetails(complaint);
                              setShowEnhancedComplaintModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <SettingsIcon className="h-4 w-4" />
                            Manage
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{complaint.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>Reported by: {complaint.reporterName}</span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {(() => {
                              if (complaint.createdAt) {
                                const date = complaint.createdAt.toDate ? complaint.createdAt.toDate() : new Date(complaint.createdAt);
                                return date.toLocaleDateString();
                              }
                              return 'Unknown date';
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {complaint.location && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <MapPinIcon className="h-4 w-4" />
                              {complaint.location}
                            </span>
                          )}
                          {complaint.attachments && complaint.attachments.length > 0 && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <PaperclipIcon className="h-4 w-4" />
                              {complaint.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Details Modal - Simple Working Version */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            View detailed information about this transaction including photos and metadata
          </DialogDescription>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedTransaction.type === 'loading' ? 'Oil Loading Transaction' : 'Oil Supply Transaction'}
                  </h3>
                  <div className="text-sm text-gray-500 mt-1">
                    <strong>Date & Time:</strong> {selectedTransaction.timestamp?.toDate ? 
                      selectedTransaction.timestamp.toDate().toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : 
                      selectedTransaction.createdAt ?
                      new Date(selectedTransaction.createdAt).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) :
                      'Unknown date'
                    }
                  </div>
                </div>
                <Badge variant={selectedTransaction.type === 'loading' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                  {selectedTransaction.type === 'loading' ? 'Loading' : 'Supply'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className={`font-medium ${
                    selectedTransaction.type === 'loading' 
                      ? 'text-blue-600' 
                      : 'text-orange-600'
                  }`}>
                    {selectedTransaction.type === 'loading' ? 'Oil Loading' : 'Oil Supply'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Oil Type</label>
                  <p className="font-medium">
                    {(() => {
                      const oilType = oilTypes.find(o => o.id === selectedTransaction.oilTypeId);
                      return oilType ? `${oilType.name} - ${oilType.viscosity}` : selectedTransaction.oilTypeName || 'Unknown Oil Type';
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Quantity</label>
                  <p className="font-medium">
                    {(selectedTransaction.deliveredLiters || selectedTransaction.loadedLiters || selectedTransaction.quantity || 0).toLocaleString()}L
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Driver</label>
                  <p className="font-medium">
                    {(() => {
                      const driver = drivers.find(d => d.uid === selectedTransaction.driverUid || d.id === selectedTransaction.driverUid);
                      return driver ? (driver.displayName || driver.email) : selectedTransaction.driverName || selectedTransaction.driverUid || 'Unknown Driver';
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Branch</label>
                  <p className="font-medium">
                    {(() => {
                      const branch = branches.find(b => b.id === selectedTransaction.branchId);
                      return branch ? branch.name : selectedTransaction.branchName || 'Unknown Branch';
                    })()}
                  </p>
                </div>
                {selectedTransaction.deliveryOrderId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Delivery Order</label>
                    <p className="font-medium">{selectedTransaction.deliveryOrderId}</p>
                  </div>
                )}
                {(selectedTransaction.startMeterReading || selectedTransaction.endMeterReading) && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Start Meter</label>
                      <p className="font-medium">{selectedTransaction.startMeterReading || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">End Meter</label>
                      <p className="font-medium">{selectedTransaction.endMeterReading || 'N/A'}</p>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className="font-medium text-green-600">{selectedTransaction.status || 'Completed'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Session ID</label>
                  <p className="font-medium text-xs text-gray-500">
                    {selectedTransaction.loadSessionId || selectedTransaction.id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Photos - Simple Working Implementation */}
              {selectedTransaction.photos && Object.keys(selectedTransaction.photos).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Photos</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(selectedTransaction.photos).map(([photoType, photoUrl]: [string, any]) => 
                      photoUrl && (
                        <div key={photoType} className="text-center">
                          <div className="relative group cursor-pointer"
                               onClick={() => {
                                 setSelectedPhoto({
                                   url: photoUrl,
                                   label: photoType.replace(/([A-Z])/g, ' $1').trim()
                                 });
                                 setShowPhotoModal(true);
                               }}>
                            <img 
                              src={photoUrl} 
                              alt={photoType} 
                              className="w-full h-20 object-cover rounded border hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                              <EyeIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            {photoType.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-Size Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
          <DialogDescription className="sr-only">
            Full size view of {selectedPhoto?.label || 'delivery photo'}
          </DialogDescription>
          {selectedPhoto && (
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
              {/* Header with photo label and close button */}
              <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-4 z-10 flex justify-between items-center">
                <h3 className="text-lg font-medium">{selectedPhoto.label}</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedPhoto.url;
                      link.download = `${selectedPhoto.label.replace(/\s+/g, '_')}_${new Date().getTime()}.jpg`;
                      link.click();
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <DownloadCloudIcon className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhotoModal(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Full-size image */}
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.label}
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 120px)' }}
                />
              </div>
              
              {/* Footer with actions */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4 z-10 flex justify-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedPhoto.url, '_blank')}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedPhoto.url;
                    link.download = `${selectedPhoto.label.replace(/\s+/g, '_')}_${new Date().getTime()}.jpg`;
                    link.click();
                  }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <DownloadCloudIcon className="h-4 w-4 mr-1" />
                  Download Photo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      {/* Transaction Viewer Modal */}
      {isTransactionViewerOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-auto bg-white rounded-lg p-3 sm:p-6">
            <TransactionViewer onClose={() => setIsTransactionViewerOpen(false)} />
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <Dialog open={showTaskEditModal} onOpenChange={setShowTaskEditModal}>
          <DialogContent className="max-w-md" aria-describedby="task-edit-description">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update task status and record changes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Task: {editingTask.title}</Label>
                <div className="text-sm text-gray-600">{editingTask.description}</div>
              </div>
              <div>
                <Label htmlFor="task-status">Status</Label>
                <Select 
                  value={editingTask.status} 
                  onValueChange={(value) => setEditingTask({...editingTask, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTaskEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  try {
                    await updateTask(editingTask.id, {
                      ...editingTask,
                      updatedAt: new Date()
                    });
                    await loadData();
                    setShowTaskEditModal(false);
                    toast({
                      title: "Success",
                      description: "Task updated successfully"
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update task",
                      variant: "destructive"
                    });
                  }
                }}>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Complaint Edit Modal */}
      {editingComplaint && (
        <Dialog open={showComplaintEditModal} onOpenChange={setShowComplaintEditModal}>
          <DialogContent className="max-w-md" aria-describedby="complaint-edit-description">
            <DialogHeader>
              <DialogTitle>Edit Complaint</DialogTitle>
              <DialogDescription>Update complaint status and record resolution.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Complaint: {editingComplaint.category || 'General'}</Label>
                <div className="text-sm text-gray-600">{editingComplaint.description}</div>
              </div>
              <div>
                <Label htmlFor="complaint-status">Status</Label>
                <Select 
                  value={editingComplaint.status} 
                  onValueChange={(value) => setEditingComplaint({...editingComplaint, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowComplaintEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  try {
                    const updates = {
                      ...editingComplaint,
                      updatedAt: new Date(),
                      ...(editingComplaint.status === 'resolved' && { resolvedAt: new Date() })
                    };
                    
                    await loadData();
                    setShowComplaintEditModal(false);
                    toast({
                      title: "Success",
                      description: "Complaint updated successfully"
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update complaint",
                      variant: "destructive"
                    });
                  }
                }}>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Complaint Photo Viewer Modal - Grid Layout */}
      {selectedComplaint && (
        <Dialog open={showComplaintPhotoModal} onOpenChange={setShowComplaintPhotoModal}>
          <DialogContent className="max-w-4xl w-[95%] h-[90%] max-h-[800px]">
            <DialogTitle>Complaint Photos</DialogTitle>
            <DialogDescription>
              Photos uploaded by {selectedComplaint.reporterName} for {selectedComplaint.category || 'General'} complaint
            </DialogDescription>
            <div className="flex-1 overflow-y-auto">
              {selectedComplaint.photoUrls && selectedComplaint.photoUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedComplaint.photoUrls.map((photoUrl: string, index: number) => (
                    <div key={index} className="text-center">
                      <div className="relative group cursor-pointer"
                           onClick={() => {
                             setSelectedPhoto({
                               url: photoUrl,
                               label: `Complaint Photo ${index + 1}`
                             });
                             setShowPhotoModal(true);
                           }}>
                        <img 
                          src={photoUrl} 
                          alt={`Complaint Photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded border hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                          <EyeIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Photo {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No photos available for this complaint</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Data Cleanup Confirmation Modal */}
      {showCleanupConfirmModal && (
        <Dialog open={showCleanupConfirmModal} onOpenChange={setShowCleanupConfirmModal}>
          <DialogContent className="max-w-md" aria-describedby="cleanup-confirm-description">
            <DialogHeader>
              <DialogTitle>Confirm Data Cleanup</DialogTitle>
              <DialogDescription>
                This will permanently delete all transactions, deliveries, complaints, and tasks older than {cleanupMonths} months.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCleanupConfirmModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  setIsCleanupLoading(true);
                  try {
                    const cutoffDate = new Date();
                    cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(cleanupMonths));
                    
                    // Delete old transaction data
                    await deleteRecordsByDateRange('transactions', new Date(0), cutoffDate);
                    
                    // Delete old delivery data  
                    await deleteRecordsByDateRange('deliveries', new Date(0), cutoffDate);
                    
                    // Delete old complaint data
                    await deleteRecordsByDateRange('complaints', new Date(0), cutoffDate);
                    
                    // Delete old task data
                    await deleteRecordsByDateRange('tasks', new Date(0), cutoffDate);
                    
                    await loadData();
                    setShowCleanupConfirmModal(false);
                    toast({
                      title: "Success",
                      description: `Data older than ${cleanupMonths} months has been cleaned up`
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to cleanup data",
                      variant: "destructive"
                    });
                  } finally {
                    setIsCleanupLoading(false);
                  }
                }}
                disabled={isCleanupLoading}
              >
                {isCleanupLoading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  "Confirm Cleanup"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Details Modal with Comments and Documents */}
      {selectedTaskForDetails && (
        <Dialog open={showTaskDetailsModal} onOpenChange={setShowTaskDetailsModal}>
          <DialogContent className="max-w-4xl w-[95%] h-[90%] max-h-[800px] flex flex-col" aria-describedby="task-details-description">
            <DialogHeader>
              <DialogTitle>Task Details & Management</DialogTitle>
              <DialogDescription>
                View task details, add comments, upload documents, and track activity
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex gap-6">
              {/* Left Side - Task Info */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Task Title</Label>
                    <p className="font-medium">{selectedTaskForDetails.title}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={
                      selectedTaskForDetails.status === 'completed' ? 'default' : 
                      selectedTaskForDetails.status === 'in-progress' ? 'secondary' : 'destructive'
                    }>{selectedTaskForDetails.status}</Badge>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Badge variant={selectedTaskForDetails.priority === 'high' ? 'destructive' : 'outline'}>
                      {selectedTaskForDetails.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <p>{selectedTaskForDetails.dueDate ? new Date(selectedTaskForDetails.dueDate).toLocaleDateString() : 'No due date'}</p>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTaskForDetails.description}</p>
                </div>

                {/* Add Comment Section */}
                <div className="border-t pt-4">
                  <Label>Add Comment</Label>
                  <div className="flex gap-2 mt-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Enter your comment..."
                      className="flex-1"
                      rows={2}
                    />
                    <Button 
                      onClick={async () => {
                        if (newComment.trim()) {
                          await handleTaskCommentUpdate(selectedTaskForDetails?.id || '', newComment);
                          setNewComment('');
                        }
                      }}
                      disabled={!newComment.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Document Upload Section */}
                <div className="border-t pt-4">
                  <Label>Upload Document</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleTaskDocumentUpload(selectedTaskForDetails?.id || '', file);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploadingDocument}
                    />
                    {uploadingDocument && (
                      <p className="text-sm text-gray-500 mt-1">
                        <Loader2Icon className="h-4 w-4 inline animate-spin mr-1" />
                        Uploading document...
                      </p>
                    )}
                  </div>
                </div>

                {/* Documents List */}
                {selectedTaskForDetails && taskDocuments[selectedTaskForDetails.id] && taskDocuments[selectedTaskForDetails.id].length > 0 && (
                  <div className="border-t pt-4">
                    <Label>Documents ({selectedTaskForDetails ? taskDocuments[selectedTaskForDetails.id]?.length || 0 : 0})</Label>
                    <div className="space-y-2 mt-2">
                      {selectedTaskForDetails && taskDocuments[selectedTaskForDetails.id]?.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <div className="flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded by {doc.uploadedBy} • {doc.uploadedAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => window.open(doc.url)}>
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Activity Log */}
              <div className="w-80 border-l pl-4">
                <div className="space-y-4">
                  <div>
                    <Label>Task Activity Log</Label>
                    <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
                      {selectedTaskForDetails && (taskLogs[selectedTaskForDetails.id] || []).map((log: any) => (
                        <div key={log.id} className="flex gap-3">
                          <div className="flex-shrink-0">
                            {log.type === 'comment' ? (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <FileTextIcon className="h-4 w-4 text-blue-600" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <DownloadIcon className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{log.user}</p>
                            <p className="text-sm text-gray-600 mt-1">{log.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {log.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!selectedTaskForDetails || !taskLogs[selectedTaskForDetails.id] || taskLogs[selectedTaskForDetails.id].length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No activity yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Task Management Modal */}
      <EnhancedTaskModal
        task={selectedTaskForDetails}
        isOpen={showEnhancedTaskModal}
        onClose={() => setShowEnhancedTaskModal(false)}
        onStatusUpdate={handleTaskStatusUpdate}
        onAddComment={handleAddTaskComment}
        onUploadDocument={handleUploadTaskDocument}
        user={user}
        isUpdating={isUpdatingStatus}
        isAddingComment={isAddingComment}
        isUploading={isUploadingDocument}
      />

      {/* Enhanced Complaint Management Modal */}
      <EnhancedComplaintModal
        complaint={selectedComplaintForDetails}
        isOpen={showEnhancedComplaintModal}
        onClose={() => setShowEnhancedComplaintModal(false)}
        onStatusUpdate={handleComplaintStatusUpdate}
        onAddComment={handleAddComplaintComment}
        onUploadDocument={handleUploadComplaintDocument}
        user={user}
        isUpdating={isUpdatingStatus}
        isAddingComment={isAddingComment}
        isUploading={isUploadingDocument}
        onPhotoClick={(url, label) => {
          setSelectedPhoto({ url, label });
          setShowPhotoModal(true);
        }}
      />

      {/* Footer with Creator Credit */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center">
        <p className="text-xs text-gray-500">Created by Asif Shaikh</p>
      </div>
    </div>
  );
}
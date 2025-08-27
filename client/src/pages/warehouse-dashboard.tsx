import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  WarehouseIcon,
  LogOutIcon, 
  RefreshCwIcon,
  ClipboardListIcon,
  BuildingIcon,
  DropletIcon,
  Calendar,
  UserIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  Eye,
  EyeIcon,
  ClockIcon,
  ImageIcon,
  TruckIcon,
  Package,
  MapPin,
  DownloadIcon,
  DownloadCloudIcon,
  Edit,
  Save,
  X,
  XIcon,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth, getAllBranches, getActiveBranchesOnly, getAllOilTypes, getAllTransactions, getUserData, updateOilTankLevel, getAllUsers } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";

interface Branch {
  id: string;
  name: string;
  location?: string;
  contactPerson?: string;
  active?: boolean;
}

interface OilType {
  id: string;
  name: string;
  category?: string;
  active?: boolean;
}

interface Transaction {
  id: string;
  type: 'loading' | 'supply' | 'delivery';
  quantity: number;
  oilTypeName: string;
  branchName: string;
  branchId: string;
  driverName?: string;
  createdAt: any;
  timestamp?: any;
  oilTypeId?: string;
  notes?: string;
  photos?: Record<string, string>;
}

interface OilTank {
  id: string;
  branchId: string;
  branchName: string;
  oilTypeId: string;
  oilTypeName: string;
  currentLevel: number;
  capacity: number;
  status: 'critical' | 'low' | 'normal' | 'full';
  lastUpdated: any;
}

interface UpdateLog {
  id: string;
  branchName: string;
  oilTypeName: string;
  oldLevel: number;
  newLevel: number;
  updatedBy: string;
  updatedAt: any;
  notes?: string;
  reason?: string;
  photos?: Record<string, string>;
}

export default function WarehouseDashboard() {
  const { userData: user, logout } = useAuth();
  
  // Core data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [oilTypes, setOilTypes] = useState<OilType[]>([]);
  const [oilTanks, setOilTanks] = useState<OilTank[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, label: string} | null>(null);
  
  // Filter states (moved above, consolidated)
  
  const [logFilters, setLogFilters] = useState({
    branch: '',
    oilType: '',
    dateRange: '',
    user: ''
  });
  
  // Bulk update states
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState<{[key: string]: number}>({});
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  
  // CSV upload states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploadStatus, setCsvUploadStatus] = useState<string>('');
  const [csvProcessing, setCsvProcessing] = useState(false);
  
  // Date range export states
  const [showTransactionDateFilter, setShowTransactionDateFilter] = useState(false);
  const [transactionStartDate, setTransactionStartDate] = useState('');
  const [transactionEndDate, setTransactionEndDate] = useState('');
  
  // Date range search states
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchedTransactions, setSearchedTransactions] = useState<Transaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Transaction tab and filter states
  const [activeTransactionTab, setActiveTransactionTab] = useState<'recent' | 'search'>('recent');
  const [transactionFilters, setTransactionFilters] = useState({
    type: '',
    branch: '',
    oilType: '',
    driver: ''
  });
  
  // CSV export states
  const [showCsvExport, setShowCsvExport] = useState(false);
  const [csvStartDate, setCsvStartDate] = useState('');
  const [csvEndDate, setCsvEndDate] = useState('');
  const [csvExporting, setCsvExporting] = useState(false);
  
  const [showLogDateFilter, setShowLogDateFilter] = useState(false);
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  useEffect(() => {
    if (user && user.role === 'warehouse') {
      console.log('✅ User authenticated for warehouse dashboard:', {
        email: user.email,
        displayName: user.displayName,
        role: user.role
      });
      loadAllData();
    } else {
      console.log('❌ No user authenticated for warehouse dashboard');
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      console.log('🏭 Loading warehouse dashboard data (ultra-fast mode)...');
      setLoading(true);
      
      // ULTRA-FAST MODE: Load only active branches for warehouse operations
      const branchesData = await getActiveBranchesOnly().catch(() => []);
      console.log('🏢 Using only active branches in warehouse operations');
      const oilTypesData = await getAllOilTypes().catch(() => []);
      
      console.log('⚡ Fast load:', { branches: branchesData.length, oilTypes: oilTypesData.length });
      
      // Set data and extract tanks immediately
      setBranches(branchesData || []);
      setOilTypes(oilTypesData || []);
      
      const oilTanksData = extractOilTanksFromBranches(branchesData, oilTypesData);
      setOilTanks(oilTanksData);
      
      console.log('⚡ Tanks ready:', oilTanksData.length);
      
      // Load everything else much later to avoid any blocking
      setTimeout(async () => {
        try {
          // Minimal recent transactions only
          const recentTxs = await getDocs(query(
            collection(db, 'transactions'),
            orderBy('timestamp', 'desc'),
            limit(10)
          )).then(snapshot => 
            snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data(), 
              driverName: 'Driver' 
            }))
          ).catch(() => []);
          
          setRecentTransactions(recentTxs);
          
          // Load drivers for proper transaction details
          const driversData = await getAllUsers().catch(() => []);
          console.log('👥 Got drivers:', driversData.length);
          setDrivers(driversData);
          
          // Minimal update logs
          const recentLogs = await getDocs(query(
            collection(db, 'tankUpdateLogs'),
            orderBy('updatedAt', 'desc'),
            limit(10)
          )).then(snapshot => 
            snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UpdateLog))
          ).catch(() => []);
          
          setUpdateLogs(recentLogs);
          
        } catch (error) {
          console.error('Background load error:', error);
        }
      }, 2000); // Wait 2 seconds before loading background data

      
    } catch (error) {
      console.error('❌ Error loading warehouse data:', error);
      // Don't show error toast immediately - let user see partial data
      console.log('Continuing with partial data...');
    } finally {
      setLoading(false);
    }
  };

  // Optimized function to extract oil tanks from branches
  const extractOilTanksFromBranches = (branchesData: any[], oilTypesData: any[]) => {
    const oilTypeMap = new Map(oilTypesData.map((ot: any) => [ot.id, ot.name]));
    const oilTanksData: any[] = [];
    
    branchesData.forEach((branch: any) => {
      if (branch.oilTanks && Array.isArray(branch.oilTanks)) {
        branch.oilTanks.forEach((tank: any, index: number) => {
          oilTanksData.push({
            id: `${branch.id}_tank_${index}`,
            branchId: branch.id,
            branchName: branch.name,
            ...tank
          });
        });
      } else if (branch.oilTanks && typeof branch.oilTanks === 'object') {
        const tankKeys = Object.keys(branch.oilTanks);
        tankKeys.forEach((tankKey: string) => {
          oilTanksData.push({
            id: `${branch.id}_${tankKey}`,
            branchId: branch.id,
            branchName: branch.name,
            ...branch.oilTanks[tankKey]
          });
        });
      }
    });

    // Process tanks with status calculation
    const processedTanks: OilTank[] = oilTanksData.map((tankData: any) => {
      const oilTypeName = oilTypeMap.get(tankData.oilTypeId) || tankData.oilTypeName || 'Unknown Oil Type';
      const currentLevel = Number(tankData.currentLevel) || 0;
      const capacity = Number(tankData.capacity) || 0;
      const percentage = capacity > 0 ? (currentLevel / capacity) * 100 : 0;
      
      let status = 'normal';
      if (percentage <= 5) status = 'critical';
      else if (percentage <= 25) status = 'low';
      else if (percentage >= 95) status = 'full';
      
      return {
        id: tankData.id,
        branchId: tankData.branchId,
        branchName: tankData.branchName,
        oilTypeId: tankData.oilTypeId || 'unknown',
        oilTypeName: oilTypeName,
        currentLevel: currentLevel,
        capacity: capacity,
        status: status as 'critical' | 'low' | 'normal' | 'full',
        lastUpdated: tankData.lastUpdated || Timestamp.now()
      };
    });

    return processedTanks;
  };

  const handleLogout = async () => {
    try {
      logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out"
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Search transactions by date range
  const searchTransactionsByDateRange = async () => {
    if (!searchStartDate || !searchEndDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    if (new Date(searchStartDate) > new Date(searchEndDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      console.log('🔍 Searching transactions from', searchStartDate, 'to', searchEndDate);
      
      // Convert dates to Timestamp objects for Firestore query
      const startDate = new Date(searchStartDate + 'T00:00:00');
      const endDate = new Date(searchEndDate + 'T23:59:59');
      
      // Query transactions collection with date range
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(transactionsQuery);
      const allTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by date range in JavaScript since Firestore queries can be complex
      const filteredTransactions = allTransactions.filter(transaction => {
        let transactionDate = null;
        
        if (transaction.timestamp?.toDate) {
          transactionDate = transaction.timestamp.toDate();
        } else if (transaction.timestamp && typeof transaction.timestamp === 'string') {
          transactionDate = new Date(transaction.timestamp);
        } else if (transaction.createdAt?.toDate) {
          transactionDate = transaction.createdAt.toDate();
        } else if (transaction.createdAt) {
          transactionDate = new Date(transaction.createdAt);
        }
        
        if (!transactionDate) return false;
        
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      console.log('📦 Found transactions:', filteredTransactions.length);
      setSearchedTransactions(filteredTransactions);
      setShowSearchResults(true);
      setActiveTransactionTab('search'); // Switch to search results tab
      
      toast({
        title: "Search completed",
        description: `Found ${filteredTransactions.length} transactions in the selected date range`
      });
      
    } catch (error) {
      console.error('❌ Error searching transactions:', error);
      toast({
        title: "Search failed",
        description: "Failed to search transactions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Export transactions to CSV with specified format
  const exportTransactionsToCSV = async () => {
    if (!csvStartDate || !csvEndDate) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates for CSV export",
        variant: "destructive"
      });
      return;
    }

    if (new Date(csvStartDate) > new Date(csvEndDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive"
      });
      return;
    }

    setCsvExporting(true);
    try {
      console.log('📊 Exporting CSV from', csvStartDate, 'to', csvEndDate);
      
      // Convert dates for filtering
      const startDate = new Date(csvStartDate + 'T00:00:00');
      const endDate = new Date(csvEndDate + 'T23:59:59');
      
      // Query all transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(transactionsQuery);
      const allTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by date range
      const filteredTransactions = allTransactions.filter(transaction => {
        let transactionDate = null;
        
        if (transaction.timestamp?.toDate) {
          transactionDate = transaction.timestamp.toDate();
        } else if (transaction.timestamp && typeof transaction.timestamp === 'string') {
          transactionDate = new Date(transaction.timestamp);
        } else if (transaction.createdAt?.toDate) {
          transactionDate = transaction.createdAt.toDate();
        } else if (transaction.createdAt) {
          transactionDate = new Date(transaction.createdAt);
        }
        
        if (!transactionDate) return false;
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      // CSV Headers based on Firebase field mapping
      const headers = [
        'ID No',
        'Date and Time',
        'Order / Delivery No',
        'Supply Type',
        'Branch Name',
        'Oil Type',
        'Branch Level Before',
        'Start Meter reading',
        'End Meter Reading',
        'Qty Delivered',
        'Total Qty Supplied',
        'Drum Capacity',
        'No of Drum',
        'Branch Level After',
        'Driver Name'
      ];

      // Create CSV rows
      const csvRows = [headers.join(',')];
      
      filteredTransactions.forEach(transaction => {
        const branch = branches.find(b => b.id === transaction.branchId);
        const branchName = branch ? branch.name : (transaction.branchName || 'Unknown Branch');
        
        // Format date
        let dateTime = 'Unknown Date';
        if (transaction.timestamp?.toDate) {
          dateTime = transaction.timestamp.toDate().toLocaleString();
        } else if (transaction.createdAt?.toDate) {
          dateTime = transaction.createdAt.toDate().toLocaleString();
        } else if (transaction.createdAt) {
          dateTime = new Date(transaction.createdAt).toLocaleString();
        }
        
        // Extract fields directly from Firebase transaction data as per mapping
        
        // ID No - loadSessionId from Firebase
        const idNo = transaction.loadSessionId || transaction.sessionId || transaction.id || 'N/A';
        
        // Order / Delivery No - deliveryOrderNo from Firebase
        const orderDeliveryNo = transaction.deliveryOrderNo || 'N/A';
        
        // Supply Type - supplyType from Firebase
        const supplyType = transaction.supplyType || transaction.type || 'N/A';
        
        // Oil Type - oilTypeName from Firebase
        const oilType = transaction.oilTypeName || 'Unknown Oil Type';
        
        // Branch Level Before - branchTankBefore from Firebase
        const branchLevelBefore = transaction.branchTankBefore !== undefined ? transaction.branchTankBefore : 'N/A';
        
        // Start Meter reading - startMeterReading from Firebase
        const startMeterReading = transaction.startMeterReading !== undefined ? transaction.startMeterReading : 'N/A';
        
        // End Meter Reading - endMeterReading from Firebase
        const endMeterReading = transaction.endMeterReading !== undefined ? transaction.endMeterReading : 'N/A';
        
        // Qty Delivered - quantity from Firebase
        const qtyDelivered = transaction.quantity || 0;
        
        // Total Qty Supplied - totalLitersSupplied from Firebase
        const totalQtySupplied = transaction.totalLitersSupplied || transaction.quantity || 0;
        
        // Drum Capacity - drumCapacity from Firebase
        const drumCapacity = transaction.drumCapacity !== undefined ? transaction.drumCapacity : 'N/A';
        
        // No of Drum - numberOfDrums from Firebase
        const noOfDrum = transaction.numberOfDrums !== undefined ? transaction.numberOfDrums : 'N/A';
        
        // Branch Level After - branchTankAfter from Firebase
        const branchLevelAfter = transaction.branchTankAfter !== undefined ? transaction.branchTankAfter : 'N/A';
        
        // Driver Name - get from driverId field
        const driverName = transaction.driverName || transaction.driverDisplayName || 'Unknown Driver';
        
        // Escape commas and quotes in CSV data
        const escapeCSV = (field) => {
          if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };
        
        const row = [
          escapeCSV(idNo),
          escapeCSV(dateTime),
          escapeCSV(orderDeliveryNo),
          escapeCSV(supplyType),
          escapeCSV(branchName),
          escapeCSV(oilType),
          branchLevelBefore,
          startMeterReading,
          endMeterReading,
          qtyDelivered,
          totalQtySupplied,
          drumCapacity,
          noOfDrum,
          branchLevelAfter,
          escapeCSV(driverName)
        ];
        
        csvRows.push(row.join(','));
      });

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${csvStartDate}_to_${csvEndDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: "CSV Export Successful",
        description: `Exported ${filteredTransactions.length} transactions to CSV file`
      });
      
    } catch (error) {
      console.error('❌ CSV Export Error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export CSV. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCsvExporting(false);
    }
  };

  // Bulk update functions
  const handleBulkLevelChange = (tankId: string, newLevel: number) => {
    setBulkUpdates(prev => ({
      ...prev,
      [tankId]: newLevel
    }));
  };

  const cancelBulkUpdate = () => {
    setBulkUpdateMode(false);
    setBulkUpdates({});
  };

  const submitBulkUpdates = async () => {
    if (Object.keys(bulkUpdates).length === 0) {
      toast({
        title: "No changes",
        description: "Please make changes to oil tank levels before submitting",
        variant: "destructive"
      });
      return;
    }

    // VALIDATE ALL CAPACITY LIMITS BEFORE PROCESSING
    const capacityViolations: string[] = [];
    Object.entries(bulkUpdates).forEach(([tankId, newLevel]) => {
      const tank = oilTanks.find(t => t.id === tankId);
      if (tank && Number(newLevel) > Number(tank.capacity)) {
        capacityViolations.push(`${tank.branchName} - ${tank.oilTypeName}: ${newLevel}L exceeds capacity ${tank.capacity}L`);
      }
    });

    if (capacityViolations.length > 0) {
      toast({
        title: "Capacity limits exceeded",
        description: `Please fix these values before continuing:\n${capacityViolations.join('\n')}`,
        variant: "destructive"
      });
      console.error('❌ Bulk update blocked due to capacity violations:', capacityViolations);
      return; // Stop processing completely
    }

    setIsBulkSubmitting(true);
    console.log('🚀 Starting bulk update process:', bulkUpdates);
    console.log('📋 Available oil tanks for updating:', oilTanks.map(t => ({ id: t.id, branch: t.branchName, oilType: t.oilTypeName, currentLevel: t.currentLevel })));
    
    try {
      // Group updates by branch to avoid race conditions
      const updatesByBranch = new Map();
      
      Object.entries(bulkUpdates).forEach(([tankId, newLevel]) => {
        const tank = oilTanks.find(t => t.id === tankId);
        if (!tank) {
          console.error(`❌ Tank not found: ${tankId}`);
          return;
        }
        
        if (!updatesByBranch.has(tank.branchId)) {
          updatesByBranch.set(tank.branchId, []);
        }
        
        updatesByBranch.get(tank.branchId).push({
          tankId,
          newLevel,
          tank
        });
      });

      console.log(`📋 Processing updates for ${updatesByBranch.size} branches sequentially to avoid race conditions`);

      // Process each branch sequentially to avoid Firebase race conditions
      for (const [branchId, branchUpdates] of Array.from(updatesByBranch.entries())) {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) {
          console.error(`❌ Branch not found: ${branchId}`);
          continue;
        }

        console.log(`🏢 Processing ${branchUpdates.length} updates for branch: ${branch.name}`);

        // Get fresh branch data for each branch
        const branchDoc = await getDoc(doc(db, 'branches', branch.id));
        if (!branchDoc.exists()) {
          console.error(`❌ Branch document not found: ${branch.id}`);
          continue;
        }
        
        const branchData = branchDoc.data();
        if (!branchData.oilTanks || !Array.isArray(branchData.oilTanks)) {
          console.error(`❌ No oilTanks array found in branch ${branch.name}`);
          continue;
        }

        console.log(`📋 Current oilTanks in ${branch.name}:`, branchData.oilTanks);

        // Process each tank update using the centralized updateOilTankLevel function
        // This ensures consistent logging and data handling between warehouse and branch dashboards
        for (const updateInfo of branchUpdates) {
          const { tankId, newLevel, tank } = updateInfo;
          
          console.log(`🔄 Processing tank update: ${tankId} from ${tank.currentLevel}L to ${newLevel}L`);
          
          try {
            // Use the same function that branch dashboard uses for consistency
            await updateOilTankLevel(tankId, {
              currentLevel: Number(newLevel),
              lastUpdatedBy: user?.displayName || user?.email || 'Warehouse User',
              notes: 'Updated via warehouse bulk update',
              // These fields are optional for warehouse updates (no photos required)
              tankGaugePhoto: '',
              systemScreenPhoto: ''
            });
            
            console.log(`✅ Successfully updated tank ${tankId}: ${tank.currentLevel}L → ${newLevel}L`);
            
          } catch (error: any) {
            console.error(`❌ Failed to update tank ${tankId}:`, error);
            // Continue with other tanks even if one fails
            throw new Error(`Failed to update tank ${tank.oilTypeName} in ${branch.name}: ${error?.message || error}`);
          }
        }

        console.log(`✅ All tank updates completed for branch ${branch.name}`);
      }

      toast({
        title: "Bulk update successful",
        description: `Updated ${Object.keys(bulkUpdates).length} oil tank levels`
      });

      console.log('🔄 Bulk update completed, refreshing data...');
      
      // Reset bulk update mode and reload data
      setBulkUpdateMode(false);
      setBulkUpdates({});
      
      // Force a complete data refresh
      console.log('🔄 Starting complete data refresh after bulk update...');
      
      // Clear all existing state first
      setOilTanks([]);
      setBranches([]);
      setOilTypes([]);
      setRecentTransactions([]);
      setUpdateLogs([]);
      
      // Force loading state
      setLoading(true);
      
      // Add a small delay to ensure Firebase writes are committed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload all data fresh from Firebase
      await loadAllData();
      
      console.log('✅ Data refreshed after bulk update');
      
      // Small delay to ensure UI updates
      setTimeout(() => {
        const currentTankStatuses = oilTanks.map(t => ({
          id: t.id,
          branch: t.branchName,
          oilType: t.oilTypeName,
          level: t.currentLevel,
          capacity: t.capacity,
          percentage: ((t.currentLevel / t.capacity) * 100).toFixed(1) + '%',
          status: t.status
        }));
        console.log('🔄 Final oil tank statuses after bulk update:', currentTankStatuses);
        
        // Count how many tanks should show in alerts
        const alertTanks = oilTanks.filter(t => t.status === 'critical' || t.status === 'low');
        console.log(`📊 Tanks requiring alerts: ${alertTanks.length}`, alertTanks.map(t => `${t.branchName}-${t.oilTypeName}:${t.status}`));
      }, 500);

    } catch (error) {
      console.error('Error submitting bulk updates:', error);
      toast({
        title: "Update failed",
        description: "Failed to update oil tank levels. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Filter functions
  const getFilteredTransactions = () => {
    return recentTransactions.filter(transaction => {
      // Type filter
      if (transactionFilters.type && transaction.type !== transactionFilters.type) return false;
      
      // Branch filter
      if (transactionFilters.branch && transaction.branchId !== transactionFilters.branch) return false;
      
      // Oil type filter
      if (transactionFilters.oilType && transaction.oilTypeId !== transactionFilters.oilType) return false;
      
      // Date range filter
      if (transactionFilters.dateRange && transaction.createdAt) {
        const transactionDate = transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const now = new Date();
        
        switch (transactionFilters.dateRange) {
          case 'today':
            if (transactionDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            if (transactionDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            if (transactionDate < monthAgo) return false;
            break;
          case 'quarter':
            const quarterAgo = new Date();
            quarterAgo.setMonth(now.getMonth() - 3);
            if (transactionDate < quarterAgo) return false;
            break;
        }
      }
      
      return true;
    });
  };

  // Get recent transactions limited to 20 for display
  const getRecentTransactionsForDisplay = () => {
    const filtered = getFilteredTransactions();
    return filtered.slice(0, 20); // Limit to most recent 20 transactions
  }

  // Enhanced function to get detailed branch update status with tank-level tracking
  const getBranchUpdateStatus = () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return branches.map(branch => {
      const branchTanks = oilTanks.filter(tank => tank.branchId === branch.id);
      const branchLogs = updateLogs.filter(log => log.branchName === branch.name);

      // Get detailed tank update status
      const tankUpdateDetails = branchTanks.map(tank => {
        // Find the most recent update for this specific tank
        const tankLogs = branchLogs.filter(log => 
          log.oilTypeName === tank.oilTypeName && log.branchName === branch.name
        );

        let lastUpdate = null;
        let lastUpdateBy = null;
        let daysSinceUpdate = null;
        
        if (tankLogs.length > 0) {
          const mostRecentLog = tankLogs.reduce((latest, current) => {
            const currentDate = current.updatedAt?.toDate ? current.updatedAt.toDate() : new Date(current.updatedAt);
            const latestDate = latest.updatedAt?.toDate ? latest.updatedAt.toDate() : new Date(latest.updatedAt);
            return currentDate > latestDate ? current : latest;
          });
          lastUpdate = mostRecentLog.updatedAt?.toDate ? mostRecentLog.updatedAt.toDate() : new Date(mostRecentLog.updatedAt);
          lastUpdateBy = mostRecentLog.updatedBy;
          // Calculate calendar days difference (not 24-hour periods)
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const updateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
          daysSinceUpdate = Math.floor((nowDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          // Check tank's lastUpdated field if no logs found
          if (tank.lastUpdated) {
            lastUpdate = new Date(tank.lastUpdated);
            // Calculate calendar days difference (not 24-hour periods)
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const updateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
          daysSinceUpdate = Math.floor((nowDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        // Determine tank update status
        let updateStatus = 'never'; // never, recent, stale, old
        if (lastUpdate) {
          if (lastUpdate > oneDayAgo) updateStatus = 'recent';
          else if (lastUpdate > sevenDaysAgo) updateStatus = 'stale';
          else updateStatus = 'old';
        }

        return {
          tankId: tank.id,
          oilTypeName: tank.oilTypeName,
          currentLevel: tank.currentLevel,
          capacity: tank.capacity,
          lastUpdate,
          lastUpdateBy,
          daysSinceUpdate,
          updateStatus,
          percentage: ((tank.currentLevel / tank.capacity) * 100).toFixed(1)
        };
      });

      // Calculate overall branch status
      const recentlyUpdatedTanks = tankUpdateDetails.filter(t => t.updateStatus === 'recent').length;
      const staleTanks = tankUpdateDetails.filter(t => t.updateStatus === 'stale').length;
      const oldTanks = tankUpdateDetails.filter(t => t.updateStatus === 'old').length;
      const neverUpdatedTanks = tankUpdateDetails.filter(t => t.updateStatus === 'never').length;

      // Overall branch status logic based on user requirements:
      // Red: Branch not updated for more than 7 days (all tanks old/never updated)
      // Yellow: Branch has partial tank level updates (mixed status)
      // Green: Branch is up to date (all tanks recently updated)
      let branchStatus = 'up-to-date';
      
      const totalOutdatedTanks = neverUpdatedTanks + oldTanks;
      const totalUpToDateTanks = recentlyUpdatedTanks;
      
      if (totalOutdatedTanks === branchTanks.length) {
        // All tanks are outdated (7+ days) - RED
        branchStatus = 'needs-attention';
      } else if (totalUpToDateTanks === branchTanks.length) {
        // All tanks are up to date - GREEN
        branchStatus = 'fully-updated';
      } else {
        // Mixed status: some tanks updated, some not - YELLOW
        branchStatus = 'partially-updated';
      }

      // Find most recent update across all tanks
      const allUpdates = tankUpdateDetails
        .filter(t => t.lastUpdate)
        .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime());
      
      const lastBranchUpdate = allUpdates.length > 0 ? allUpdates[0].lastUpdate : null;

      return {
        id: branch.id,
        name: branch.name,
        status: branchStatus,
        totalTanks: branchTanks.length,
        recentlyUpdatedTanks,
        staleTanks,
        oldTanks,
        neverUpdatedTanks,
        lastUpdate: lastBranchUpdate,
        tankDetails: tankUpdateDetails,
        // Legacy compatibility
        isUpToDate: branchStatus === 'fully-updated' || branchStatus === 'up-to-date',
        lastUpdateDate: lastBranchUpdate,
        tankCount: branchTanks.length
      };
    });
  };

  const getFilteredLogs = () => {
    return updateLogs.filter(log => {
      // Branch filter - approximate matching since we might not have branchId
      if (logFilters.branch) {
        const selectedBranch = branches.find(b => b.id === logFilters.branch);
        if (selectedBranch && log.branchName !== selectedBranch.name) return false;
      }
      
      // Oil type filter - approximate matching since we might not have oilTypeId
      if (logFilters.oilType) {
        const selectedOilType = oilTypes.find(ot => ot.id === logFilters.oilType);
        if (selectedOilType && log.oilTypeName !== selectedOilType.name) return false;
      }
      
      // User filter
      if (logFilters.user && !log.updatedBy?.toLowerCase().includes(logFilters.user.toLowerCase())) return false;
      
      // Date range filter
      if (logFilters.dateRange && log.updatedAt) {
        const logDate = log.updatedAt.toDate ? log.updatedAt.toDate() : new Date(log.updatedAt);
        const now = new Date();
        
        switch (logFilters.dateRange) {
          case 'today':
            if (logDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            if (logDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            if (logDate < monthAgo) return false;
            break;
        }
      }
      
      return true;
    });
  };

  // Group oil tanks by branch for management view
  const tanksByBranch = oilTanks.reduce((acc, tank) => {
    if (!acc[tank.branchName]) {
      acc[tank.branchName] = [];
    }
    acc[tank.branchName].push(tank);
    return acc;
  }, {} as Record<string, OilTank[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'full': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // New Inventory Control Report with specified columns
  const downloadInventoryTransactionReport = async (startDate?: string, endDate?: string) => {
    // Fetch ALL transactions directly from Firebase for CSV export (not limited to display data)
    let allTransactions = [];
    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      allTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
    } catch (error) {
      console.error('Error fetching all transactions for CSV:', error);
      // Fallback to existing filtered data if fetch fails
      allTransactions = getFilteredTransactions();
    }

    let dataToExport = allTransactions;
    
    // Apply date range filter if specified
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end date
      
      dataToExport = dataToExport.filter(transaction => {
        const transactionDate = transaction.createdAt ? 
          (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt)) :
          (transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date(transaction.timestamp || Date.now()));
        return transactionDate >= start && transactionDate <= end;
      });
    } else if (transactionFilters.dateRange) {
      // Fallback to existing filter logic
      const now = new Date();
      let filterStartDate = new Date();
      
      switch (transactionFilters.dateRange) {
        case 'today':
          filterStartDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterStartDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterStartDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterStartDate.setMonth(now.getMonth() - 3);
          break;
        default:
          filterStartDate = new Date(0); // No filter
      }
      
      dataToExport = dataToExport.filter(transaction => {
        const transactionDate = transaction.createdAt ? 
          (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt)) :
          new Date();
        return transactionDate >= filterStartDate;
      });
    }
    
    // Include both supply and loading transactions for comprehensive inventory control
    const inventoryTransactions = dataToExport.filter(transaction => 
      transaction.type === 'supply' || transaction.type === 'loading'
    );
    
    const csvContent = [
      [
        'Date & Time',
        'Transaction No.',
        'Type of Transaction',
        'Type of Method',
        'Branch Name',
        'Oil Type',
        'Before Oil Level',
        'Supply / Loading Qty',
        'After Level',
        'Oil Tank Capacity',
        'Start Meter Reading',
        'End Meter Reading',
        'Driver Display Name',
        'Delivery / Order No',
        'Tank Level Photo',
        'Hose Connection Photo',
        'Final Tank Photo',
        'Meter Reading Photo'
      ].join(','),
      ...inventoryTransactions.map((transaction, index) => {
        const branchName = transaction.branchName || transaction.loadLocationName || 
          branches.find(b => b.id === (transaction.branchId || transaction.location))?.name || 'Unknown Branch';
        const oilTypeName = oilTypes.find(ot => ot.id === transaction.oilTypeId)?.name || 'Unknown Oil Type';
        
        // Format date and time properly
        const transactionDateTime = transaction.createdAt ? 
          (transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt)) : new Date();
        const formattedDateTime = transactionDateTime.toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        // Generate sequential transaction number (auto-increment)
        const transactionNumber = index + 1;
        
        // Get tank information
        const branch = branches.find(b => b.id === (transaction.branchId || transaction.location));
        const tank = branch?.oilTanks?.find((t: any) => t.oilTypeId === transaction.oilTypeId);
        const tankCapacity = tank?.capacity || 'N/A';
        
        // Determine transaction type and method
        let transactionType, methodType, beforeLevel, afterLevel, quantity, startMeter, endMeter, orderNo;
        
        if (transaction.type === 'supply') {
          transactionType = 'Supply';
          methodType = transaction.supplyType === 'drum' || transaction.numberOfDrums ? 'Drum' : 'Loose';
          beforeLevel = transaction.branchTankBefore || 'N/A';
          afterLevel = transaction.branchTankAfter || 'N/A';
          quantity = transaction.quantity || (transaction.numberOfDrums * transaction.drumCapacity) || 0;
          startMeter = transaction.startMeterReading || 0;
          endMeter = transaction.endMeterReading || transaction.finishMeterReading || 'N/A';
          orderNo = transaction.deliveryOrderId || transaction.deliveryOrderNo || 'N/A';
        } else if (transaction.type === 'loading') {
          transactionType = 'Loading';
          methodType = 'Loose'; // Loading is always loose as per requirement
          // For loading: Before Oil Level = tanker before level
          beforeLevel = transaction.tankerBefore || 'N/A';
          // For loading: After Level = tanker after level (tanker before + loading qty)
          afterLevel = transaction.tankerAfter || 'N/A';
          quantity = transaction.quantity || transaction.loadedLiters || 0;
          startMeter = 0; // Loading start meter = 0 as per requirement
          endMeter = transaction.loadMeterReading || transaction.meterReading || 'N/A';
          orderNo = transaction.loadSessionId || 'N/A';
        }
        
        // Simplified driver display name - use saved name directly since user confirmed it's correct in Firebase
        let driverDisplayName = transaction.driverName;
        
        // Only apply fallback logic if driverName is actually missing or empty
        if (!driverDisplayName) {
          driverDisplayName = transaction.reportedByName || 
            transaction.reporterName || 
            (transaction.driverUid ? `Driver (ID: ${transaction.driverUid.slice(-4)})` : 'Unknown Driver');
        }
        
        // Extract photo links from transaction
        const photos = transaction.photos || {};
        const tankLevelPhoto = photos.tankLevelPhoto || photos.beforePhoto || 'N/A';
        const hoseConnectionPhoto = photos.hoseConnectionPhoto || photos.duringPhoto || 'N/A';
        const finalTankPhoto = photos.finalTankPhoto || photos.afterPhoto || 'N/A';
        const meterReadingPhoto = photos.meterReadingPhoto || photos.meterPhoto || 'N/A';
        
        return [
          formattedDateTime, // 1) Date & Time
          transactionNumber, // 2) Transaction no. (numerical)
          transactionType, // 3) Type of transaction = Loading/Supply
          methodType, // 4) Type of method = Loose or Drum
          branchName, // 5) Branch Name
          oilTypeName, // 6) Oil Type
          beforeLevel, // 7) Before Oil Level
          quantity, // 8) Supply / Loading Qty
          afterLevel, // 9) After level
          tankCapacity, // 10) Oil Tank Capacity
          startMeter, // 11) Start Meter reading
          endMeter, // 12) End Meter reading
          driverDisplayName, // 13) Driver Display Name
          orderNo, // 14) Delivery / Order No
          tankLevelPhoto, // 15) Tank Level Photo Link
          hoseConnectionPhoto, // 16) Hose Connection Photo Link
          finalTankPhoto, // 17) Final Tank Photo Link
          meterReadingPhoto // 18) Meter Reading Photo Link
        ].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateRange = (startDate && endDate) ? `${startDate}_to_${endDate}` : (transactionFilters.dateRange || 'all');
    a.download = `inventory_control_report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const exportedCount = inventoryTransactions.length;
    const supplyCount = inventoryTransactions.filter(t => t.type === 'supply').length;
    const loadingCount = inventoryTransactions.filter(t => t.type === 'loading').length;
    
    toast({
      title: "Comprehensive Inventory Report Downloaded",
      description: `Downloaded ${exportedCount} transactions (${supplyCount} supply + ${loadingCount} loading) with complete inventory tracking`
    });
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Keep legacy function name for compatibility
  const downloadTransactionData = downloadInventoryTransactionReport;


  const downloadLogData = (startDate?: string, endDate?: string) => {
    let filteredData = getFilteredLogs();
    
    // Apply date range filter if specified
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end date
      
      filteredData = filteredData.filter(log => {
        const logDate = log.updatedAt ? 
          (log.updatedAt.toDate ? log.updatedAt.toDate() : new Date(log.updatedAt)) :
          new Date();
        return logDate >= start && logDate <= end;
      });
    }
    const csvContent = [
      ['Date', 'Branch', 'Oil Type', 'Old Level (L)', 'New Level (L)', 'Change (L)', 'Updated By'].join(','),
      ...filteredData.map(log => [
        log.updatedAt ? (log.updatedAt.toDate ? log.updatedAt.toDate().toLocaleDateString() : new Date(log.updatedAt).toLocaleDateString()) : 'Unknown',
        log.branchName || 'Unknown Branch',
        log.oilTypeName || 'Unknown Oil Type',
        log.oldLevel || 0,
        log.newLevel || 0,
        (log.newLevel || 0) - (log.oldLevel || 0),
        log.updatedBy || 'Unknown User'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateRange = (startDate && endDate) ? `${startDate}_to_${endDate}` : 'all';
    a.download = `warehouse_tank_logs_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const exportedCount = filteredData.length;
    toast({
      title: "Export Complete",
      description: `Downloaded ${exportedCount} log entries to CSV`
    });
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV Template Download Functions
  const downloadBulkUpdateTemplate = () => {
    const csvContent = [
      ['Branch Name', 'Oil Type', 'Current Level (L)', 'New Level (L)', 'Capacity (L)', 'Tank ID'].join(','),
      ...oilTanks.map(tank => [
        tank.branchName,
        tank.oilTypeName,
        tank.currentLevel,
        '', // Empty field for new level input
        tank.capacity,
        tank.id
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_update_template_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Fill in the 'New Level (L)' column and upload the file",
    });
  };

  const downloadCurrentStockTemplate = () => {
    const csvContent = [
      ['Branch Name', 'Oil Type', 'Current Level (L)', 'Capacity (L)', 'Status', 'Last Updated'].join(','),
      ...oilTanks.map(tank => [
        tank.branchName,
        tank.oilTypeName,
        tank.currentLevel,
        tank.capacity,
        tank.status,
        new Date().toLocaleDateString()
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `current_stock_levels_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Stock Report Downloaded",
      description: "Current stock levels exported successfully",
    });
  };

  // CSV Upload Processing Function
  const processCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload",
        variant: "destructive"
      });
      return;
    }

    setCsvProcessing(true);
    setCsvUploadStatus('Processing CSV file...');

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      // Validate headers
      const requiredHeaders = ['Branch Name', 'Oil Type', 'New Level (L)', 'Tank ID'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      const updates: {[key: string]: number} = {};
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const row: {[key: string]: string} = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const tankId = row['Tank ID'];
        const newLevel = parseFloat(row['New Level (L)']);
        
        if (!tankId || isNaN(newLevel)) {
          errors.push(`Row ${i + 1}: Invalid tank ID or new level`);
          continue;
        }

        const tank = oilTanks.find(t => t.id === tankId);
        if (!tank) {
          errors.push(`Row ${i + 1}: Tank not found - ${tankId}`);
          continue;
        }

        if (newLevel < 0 || newLevel > tank.capacity) {
          errors.push(`Row ${i + 1}: Invalid level ${newLevel}L (capacity: ${tank.capacity}L)`);
          continue;
        }

        updates[tankId] = newLevel;
      }

      if (errors.length > 0) {
        setCsvUploadStatus(`Found ${errors.length} errors in CSV file`);
        toast({
          title: "CSV Upload Errors",
          description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''),
          variant: "destructive"
        });
        setCsvProcessing(false);
        return;
      }

      // Apply updates to bulkUpdates state
      setBulkUpdates(prev => ({ ...prev, ...updates }));
      setBulkUpdateMode(true);
      
      setCsvUploadStatus(`Successfully loaded ${Object.keys(updates).length} tank updates from CSV`);
      toast({
        title: "CSV Uploaded Successfully",
        description: `Loaded ${Object.keys(updates).length} tank updates. Review and save changes.`,
      });
      
      setCsvFile(null);
      
    } catch (error) {
      console.error('CSV processing error:', error);
      setCsvUploadStatus('Error processing CSV file');
      toast({
        title: "CSV Upload Failed", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setCsvProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading warehouse dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="OneDelivery Logo" 
                  className="h-10 w-10 object-contain"
                  onLoad={() => console.log('Warehouse: OneDelivery logo loaded successfully')}
                  onError={(e) => {
                    console.error('Warehouse: OneDelivery logo failed to load, trying fallback:', e);
                    const target = e.target as HTMLImageElement;
                    target.src = '/onedelivery-logo.png'; // Fallback to backup logo
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OneDelivery Warehouse</h1>
                <p className="text-sm text-gray-500">Welcome, {user?.displayName || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAllData}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOutIcon className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4" />
              Overview Stats
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex items-center gap-2">
              <BuildingIcon className="h-4 w-4" />
              Branch Management
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <ClipboardListIcon className="h-4 w-4" />
              Inventory Control
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Update Logs
            </TabsTrigger>
          </TabsList>

          {/* Overview Statistics Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Branch Update Summary Card */}
              {(() => {
                const branchStatuses = getBranchUpdateStatus();
                const needsAttention = branchStatuses.filter(b => b.status === 'needs-attention').length;
                const partiallyUpdated = branchStatuses.filter(b => b.status === 'partially-updated').length;
                const fullyUpdated = branchStatuses.filter(b => b.status === 'fully-updated' || b.status === 'up-to-date').length;
                
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
                        Branch Updates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {needsAttention > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-red-700 font-medium">{needsAttention} need attention</span>
                          </div>
                        )}
                        {partiallyUpdated > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-yellow-700 font-medium">{partiallyUpdated} partial updates</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-700 font-medium">{fullyUpdated} up to date</span>
                        </div>
                        <div className="text-xs text-gray-500 pt-1">
                          Total: {branchStatuses.length} branches
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
              {/* Total Oil Available by Type */}
              {(() => {
                const oilTypeTotals = oilTanks.reduce((acc, tank) => {
                  const existingType = acc.find(t => t.oilTypeName === tank.oilTypeName);
                  if (existingType) {
                    existingType.totalAvailable += tank.currentLevel;
                    existingType.totalCapacity += tank.capacity;
                    existingType.tankCount += 1;
                  } else {
                    acc.push({
                      oilTypeName: tank.oilTypeName,
                      totalAvailable: tank.currentLevel,
                      totalCapacity: tank.capacity,
                      tankCount: 1
                    });
                  }
                  return acc;
                }, [] as Array<{oilTypeName: string, totalAvailable: number, totalCapacity: number, tankCount: number}>);

                return oilTypeTotals.map((oilType) => {
                  const percentage = oilType.totalCapacity > 0 ? (oilType.totalAvailable / oilType.totalCapacity) * 100 : 0;
                  return (
                    <Card key={oilType.oilTypeName}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1">
                          <DropletIcon className="h-4 w-4 text-blue-600" />
                          {oilType.oilTypeName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-gray-600 space-y-1">
                          <p className="font-medium">{(oilType.totalAvailable || 0).toLocaleString()}L available</p>
                          <p>{oilType.tankCount} tank{oilType.tankCount !== 1 ? 's' : ''}</p>
                          <p>{Math.round(percentage)}% of capacity</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              percentage <= 5 ? 'bg-red-500' :
                              percentage <= 25 ? 'bg-yellow-500' :
                              percentage >= 95 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>



            {/* Critical & Low Stock Tanks */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Critical Tanks */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-red-600" />
                    Critical Tanks
                    <Badge className="bg-red-100 text-red-800">
                      {oilTanks.filter(t => t.status === 'critical').length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {(() => {
                    const criticalTanks = oilTanks
                      .filter(t => t.status === 'critical')
                      .sort((a, b) => {
                        const percentageA = a.capacity > 0 ? (a.currentLevel / a.capacity) * 100 : 0;
                        const percentageB = b.capacity > 0 ? (b.currentLevel / b.capacity) * 100 : 0;
                        return percentageA - percentageB; // Most critical (lowest percentage) first
                      });
                    return criticalTanks.length > 0 ? (
                      <div className="space-y-2">
                        {criticalTanks.map(tank => {
                          const percentage = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
                          return (
                            <div key={tank.id} className="p-2 border border-red-200 rounded-lg bg-red-50">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-red-900">{tank.branchName}</p>
                                  <p className="text-xs text-red-700">{tank.oilTypeName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-red-900">{tank.currentLevel}L</p>
                                  <p className="text-xs text-red-700">{Math.round(percentage)}%</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No critical tanks</p>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Low Stock Tanks */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
                    Low Stock Tanks
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {oilTanks.filter(t => t.status === 'low').length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {(() => {
                    const lowTanks = oilTanks.filter(t => t.status === 'low');
                    return lowTanks.length > 0 ? (
                      <div className="space-y-2">
                        {lowTanks.map(tank => {
                          const percentage = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
                          return (
                            <div key={tank.id} className="p-2 border border-yellow-200 rounded-lg bg-yellow-50">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-yellow-900">{tank.branchName}</p>
                                  <p className="text-xs text-yellow-700">{tank.oilTypeName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-yellow-900">{tank.currentLevel}L</p>
                                  <p className="text-xs text-yellow-700">{Math.round(percentage)}%</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No low stock tanks</p>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Immediate Action Required */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangleIcon className="h-4 w-4 text-red-600" />
                  Immediate Action Required
                  <Badge className="bg-red-100 text-red-800">
                    {oilTanks.filter(t => t.status === 'critical' || t.status === 'low').length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {(() => {
                  const actionRequired = oilTanks
                    .filter(t => t.status === 'critical' || t.status === 'low')
                    .sort((a, b) => {
                      // First sort by status priority: critical comes before low
                      if (a.status === 'critical' && b.status === 'low') return -1;
                      if (a.status === 'low' && b.status === 'critical') return 1;
                      
                      // If same status, sort by percentage (lowest first)
                      const percentageA = a.capacity > 0 ? (a.currentLevel / a.capacity) * 100 : 0;
                      const percentageB = b.capacity > 0 ? (b.currentLevel / b.capacity) * 100 : 0;
                      return percentageA - percentageB;
                    });
                  
                  return actionRequired.length > 0 ? (
                    <div className="space-y-2">
                      {actionRequired.map(tank => {
                        const percentage = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
                        const isCritical = tank.status === 'critical';
                        return (
                          <div key={tank.id} className={`p-3 border rounded-lg ${
                            isCritical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <AlertTriangleIcon className={`h-4 w-4 ${
                                  isCritical ? 'text-red-600' : 'text-yellow-600'
                                }`} />
                                <div>
                                  <p className={`text-sm font-medium ${
                                    isCritical ? 'text-red-900' : 'text-yellow-900'
                                  }`}>
                                    {tank.branchName} - {tank.oilTypeName}
                                  </p>
                                  <p className={`text-xs ${
                                    isCritical ? 'text-red-700' : 'text-yellow-700'
                                  }`}>
                                    {isCritical ? 'CRITICAL: Refill immediately' : 'LOW: Schedule refill soon'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-bold ${
                                  isCritical ? 'text-red-900' : 'text-yellow-900'
                                }`}>
                                  {tank.currentLevel}L / {tank.capacity}L
                                </p>
                                <p className={`text-xs ${
                                  isCritical ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                  {Math.round(percentage)}% capacity
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-700 font-medium">All tanks have adequate levels</p>
                      <p className="text-xs text-green-600">No immediate action required</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branch Management Tab */}
          <TabsContent value="branches" className="space-y-4">
            {/* Bulk Update Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      Bulk Oil Stock Update
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Update multiple tank levels at once for faster inventory management
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!bulkUpdateMode ? (
                      <>
                        <Button 
                          onClick={() => {
                            setBulkUpdateMode(true);
                            setBulkUpdates({}); // Clear any existing updates
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Start Bulk Update
                        </Button>
                        <Button 
                          onClick={downloadBulkUpdateTemplate}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Download Template
                        </Button>
                        <Button 
                          onClick={downloadCurrentStockTemplate}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <DownloadIcon className="h-4 w-4" />
                          Export Current Stock
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          onClick={cancelBulkUpdate}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                        <Button 
                          onClick={submitBulkUpdates}
                          disabled={isBulkSubmitting || Object.keys(bulkUpdates).length === 0}
                          className="flex items-center gap-2"
                        >
                          {isBulkSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Changes ({Object.keys(bulkUpdates).length})
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {/* CSV Upload Section - Always visible when not in bulk update mode */}
              {!bulkUpdateMode && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Upload from CSV File</h3>
                        <p className="text-xs text-gray-600">Upload a CSV file to update multiple tank levels at once</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          cursor-pointer"
                      />
                      <Button
                        onClick={processCsvUpload}
                        disabled={!csvFile || csvProcessing}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        {csvProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload CSV
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {csvUploadStatus && (
                      <div className={`text-xs p-2 rounded ${
                        csvUploadStatus.includes('Successfully') || csvUploadStatus.includes('loaded') 
                          ? 'bg-green-100 text-green-700' 
                          : csvUploadStatus.includes('Error') || csvUploadStatus.includes('errors')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {csvUploadStatus}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
              
              {bulkUpdateMode && (
                <CardContent className="pt-0">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {oilTanks.map((tank) => {
                      const currentBulkValue = bulkUpdates[tank.id];
                      const displayValue = currentBulkValue !== undefined ? currentBulkValue : tank.currentLevel;
                      const percentage = tank.capacity > 0 ? (displayValue / tank.capacity) * 100 : 0;
                      const hasChanged = currentBulkValue !== undefined && currentBulkValue !== tank.currentLevel;
                      const exceedsCapacity = currentBulkValue !== undefined && currentBulkValue > tank.capacity;
                      
                      return (
                        <div key={tank.id} className={`p-3 border rounded-lg ${
                          exceedsCapacity 
                            ? 'border-red-500 bg-red-100 ring-2 ring-red-200' 
                            : hasChanged 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{tank.branchName}</p>
                                <p className="text-xs text-gray-600">{tank.oilTypeName}</p>
                              </div>
                              {exceedsCapacity ? (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  Exceeds Capacity
                                </Badge>
                              ) : hasChanged && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  Changed
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-xs text-gray-600">New Level (Liters)</label>
                              <input
                                type="number"
                                min="0"
                                max={tank.capacity}
                                value={currentBulkValue !== undefined ? currentBulkValue : ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    // Remove from bulk updates if empty
                                    setBulkUpdates(prev => {
                                      const updated = { ...prev };
                                      delete updated[tank.id];
                                      return updated;
                                    });
                                  } else {
                                    handleBulkLevelChange(tank.id, Number(value));
                                  }
                                }}
                                className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent ${
                                  exceedsCapacity
                                    ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder="Enter new level"
                              />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Current: {tank.currentLevel}L</span>
                                <span>Capacity: {tank.capacity}L</span>
                              </div>
                              {exceedsCapacity && (
                                <div className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                                  <AlertTriangleIcon className="h-3 w-3" />
                                  Value exceeds tank capacity ({tank.capacity}L)
                                </div>
                              )}
                            </div>
                            
                            {/* Updated Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  percentage <= 5 ? 'bg-red-500' :
                                  percentage <= 25 ? 'bg-yellow-500' :
                                  percentage >= 95 ? 'bg-blue-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-center text-xs text-gray-600">
                              {Math.round(percentage)}% capacity
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
            
            <div className="grid gap-4">
              {Object.entries(tanksByBranch).map(([branchName, tanks]) => (
                <Card key={branchName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BuildingIcon className="h-4 w-4 text-blue-600" />
                      {branchName}
                      <span className="text-xs text-gray-500 font-normal">
                        ({tanks.length} oil tank{tanks.length !== 1 ? 's' : ''} managed)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {tanks.map((tank) => {
                        const percentage = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
                        return (
                          <div key={tank.id} className="p-2 border rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <DropletIcon className="h-3 w-3 text-blue-600" />
                                <span className="font-medium text-xs">{tank.oilTypeName}</span>
                                <span className="text-xs text-gray-500">({Math.round(percentage)}% capacity)</span>
                              </div>
                              <Badge className={`text-xs ${getStatusColor(tank.status)}`}>
                                {tank.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              <p>{(tank.currentLevel || 0).toLocaleString()}L / {(tank.capacity || 0).toLocaleString()}L</p>
                            </div>
                            {/* Oil Level Visual Indicator */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  tank.status === 'critical' ? 'bg-red-500' :
                                  tank.status === 'low' ? 'bg-yellow-500' :
                                  tank.status === 'full' ? 'bg-blue-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {Object.keys(tanksByBranch).length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BuildingIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No branches with oil tanks found</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Branch Stock Update Tracking Card - Moved to Bottom */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircleIcon className="h-4 w-4 text-blue-600" />
                  Branch Stock Update Tracking
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Detailed tank-level update status for each branch. Shows which specific tanks have been updated recently.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Gallery-style grid layout: 4 cards per row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getBranchUpdateStatus().map((branch) => {
                    // Determine branch status based on update timeline:
                    // Red = not updated for more than 7 days (includes never updated and old tanks)
                    // Yellow = updated 1-7 days ago (stale tanks)
                    // Green = updated within 24 hours (recent tanks)
                    let branchStatus = 'green'; // default to green (current)
                    let bgColor = 'bg-green-50';
                    let borderColor = 'border-green-200';
                    let textColor = 'text-green-800';
                    let dotColor = 'bg-green-500';
                    let badgeVariant: 'default' | 'destructive' | 'secondary' = 'default';
                    
                    // Color coding based on branch status:
                    // Red: All tanks not updated for 7+ days
                    // Yellow: Partial tank level updates (mixed status)
                    // Green: All tanks up to date
                    if (branch.status === 'needs-attention') {
                      // Red for branches not updated for more than 7 days
                      branchStatus = 'red';
                      bgColor = 'bg-red-50';
                      borderColor = 'border-red-400';
                      textColor = 'text-red-800';
                      dotColor = 'bg-red-500';
                      badgeVariant = 'destructive';
                    } else if (branch.status === 'partially-updated') {
                      // Yellow for branches with partial tank level updates
                      branchStatus = 'yellow';
                      bgColor = 'bg-yellow-50';
                      borderColor = 'border-yellow-400';
                      textColor = 'text-yellow-800';
                      dotColor = 'bg-yellow-500';
                      badgeVariant = 'secondary';
                    }
                    
                    return (
                      <Card key={branch.id} className={`${
                        branchStatus === 'red' ? `${borderColor} ${bgColor} shadow-red-100` :
                        branchStatus === 'yellow' ? `${borderColor} ${bgColor} shadow-yellow-100` :
                        `${borderColor} ${bgColor} shadow-green-100 hover:shadow-md`
                      } transition-shadow duration-200 h-fit`}>
                        <CardContent className="p-4 space-y-3">
                          {/* Branch Header with Red Highlighting */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`}
                              />
                              <h4 className={`font-semibold text-sm truncate ${textColor}`} title={branch.name}>
                                {branch.name}
                              </h4>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              <Badge 
                                variant={badgeVariant}
                                className="text-xs"
                              >
                                {branch.recentlyUpdatedTanks}/{branch.totalTanks} updated
                              </Badge>
                              {branchStatus === 'red' && (
                                <Badge variant="destructive" className="text-xs">
                                  7+ Days
                                </Badge>
                              )}
                              {branchStatus === 'yellow' && (
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                  1-7 Days
                                </Badge>
                              )}
                              {branchStatus === 'green' && (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                  Current
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              {branch.lastUpdate 
                                ? `Last: ${branch.lastUpdate.toLocaleDateString()}`
                                : 'No updates'
                              }
                            </div>
                          </div>

                          {/* Tank Level Details - Compact */}
                          <div className="space-y-1">
                            {branch.tankDetails.slice(0, 3).map((tank) => (
                              <div key={tank.tankId} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      tank.updateStatus === 'recent' ? 'bg-green-500' :
                                      tank.updateStatus === 'stale' ? 'bg-yellow-500' :
                                      tank.updateStatus === 'old' ? 'bg-orange-500' :
                                      'bg-red-500'
                                    }`}
                                    title={
                                      tank.updateStatus === 'recent' ? 'Updated within 24 hours' :
                                      tank.updateStatus === 'stale' ? 'Updated 1-7 days ago' :
                                      tank.updateStatus === 'old' ? 'Updated over 7 days ago' :
                                      'Never updated'
                                    }
                                  />
                                  <span className="font-medium text-gray-700 truncate" title={tank.oilTypeName}>
                                    {tank.oilTypeName}
                                  </span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xs text-gray-600">{tank.percentage}%</div>
                                  {tank.lastUpdate ? (
                                    <div className="text-xs text-gray-400">
                                      {tank.daysSinceUpdate === 0 ? 'Today' : `${tank.daysSinceUpdate}d`}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-red-500">Not updated</div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {branch.tankDetails.length > 3 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{branch.tankDetails.length - 3} more tanks
                              </div>
                            )}
                          </div>

                          {/* Summary Stats - Compact */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                            {branch.recentlyUpdatedTanks > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-700">{branch.recentlyUpdatedTanks}</span>
                              </div>
                            )}
                            {branch.staleTanks > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                                <span className="text-xs text-yellow-700">{branch.staleTanks}</span>
                              </div>
                            )}
                            {branch.oldTanks > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                <span className="text-xs text-orange-700">{branch.oldTanks}</span>
                              </div>
                            )}
                            {branch.neverUpdatedTanks > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                <span className="text-xs text-red-700">{branch.neverUpdatedTanks}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {getBranchUpdateStatus().length === 0 && (
                  <p className="text-sm text-gray-500">No branches found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Control Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardListIcon className="h-5 w-5 text-blue-600" />
                      Transaction Management
                    </CardTitle>
                    <CardDescription>
                      View recent transactions or search by date range with advanced filtering
                    </CardDescription>
                  </div>
                  
                  {/* Date Range Search */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
                      <input
                        type="date"
                        value={searchStartDate}
                        onChange={(e) => setSearchStartDate(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        data-testid="input-search-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">End Date</label>
                      <input
                        type="date"
                        value={searchEndDate}
                        onChange={(e) => setSearchEndDate(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        data-testid="input-search-end-date"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={searchTransactionsByDateRange}
                        disabled={isSearching || !searchStartDate || !searchEndDate}
                        size="sm"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        data-testid="button-search-transactions"
                      >
                        {isSearching ? (
                          <>
                            <RefreshCwIcon className="h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <EyeIcon className="h-4 w-4" />
                            Search
                          </>
                        )}
                      </Button>
                      {showSearchResults && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchedTransactions([]);
                            setSearchStartDate('');
                            setSearchEndDate('');
                            setActiveTransactionTab('recent');
                          }}
                          className="flex items-center gap-2"
                          data-testid="button-clear-search"
                        >
                          <X className="h-4 w-4" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Transaction Tabs */}
                <Tabs value={activeTransactionTab} onValueChange={(value) => setActiveTransactionTab(value as 'recent' | 'search')}>
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="grid w-fit grid-cols-2">
                      <TabsTrigger value="recent" className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        Recent ({recentTransactions.length})
                      </TabsTrigger>
                      <TabsTrigger value="search" className="flex items-center gap-2" disabled={!showSearchResults}>
                        <Calendar className="h-4 w-4" />
                        Search Results ({searchedTransactions.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Quick Filters and CSV Export */}
                    <div className="flex items-center gap-2">
                      <select 
                        className="text-xs border rounded px-2 py-1 bg-white"
                        value={transactionFilters.type}
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="">All Types</option>
                        <option value="loading">Loading</option>
                        <option value="supply">Supply</option>
                      </select>
                      <select 
                        className="text-xs border rounded px-2 py-1 bg-white"
                        value={transactionFilters.branch}
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, branch: e.target.value }))}
                      >
                        <option value="">All Branches</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                      <select 
                        className="text-xs border rounded px-2 py-1 bg-white"
                        value={transactionFilters.oilType}
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, oilType: e.target.value }))}
                      >
                        <option value="">All Oil Types</option>
                        {oilTypes.map((oilType) => (
                          <option key={oilType.id} value={oilType.id}>{oilType.name}</option>
                        ))}
                      </select>
                      
                      {/* CSV Export Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCsvExport(!showCsvExport)}
                        className="flex items-center gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        data-testid="button-csv-export"
                      >
                        <DownloadIcon className="h-4 w-4" />
                        CSV Export
                      </Button>
                    </div>
                  </div>

                  {/* CSV Export Section */}
                  {showCsvExport && (
                    <Card className="mb-4 border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DownloadIcon className="h-4 w-4 text-green-600" />
                          Export Transactions to CSV
                        </CardTitle>
                        <CardDescription>
                          Download transactions in CSV format with date range filter (includes all 11 required fields)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                          <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Export Start Date</label>
                            <input
                              type="date"
                              value={csvStartDate}
                              onChange={(e) => setCsvStartDate(e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              data-testid="input-csv-start-date"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Export End Date</label>
                            <input
                              type="date"
                              value={csvEndDate}
                              onChange={(e) => setCsvEndDate(e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              data-testid="input-csv-end-date"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={exportTransactionsToCSV}
                              disabled={csvExporting || !csvStartDate || !csvEndDate}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                              data-testid="button-download-csv"
                            >
                              {csvExporting ? (
                                <>
                                  <RefreshCwIcon className="h-4 w-4 animate-spin" />
                                  Exporting...
                                </>
                              ) : (
                                <>
                                  <DownloadIcon className="h-4 w-4" />
                                  Download CSV
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowCsvExport(false)}
                              className="flex items-center gap-2"
                              data-testid="button-close-csv-export"
                            >
                              <X className="h-4 w-4" />
                              Close
                            </Button>
                          </div>
                        </div>
                        
                        {/* CSV Format Information */}
                        <div className="mt-4 p-3 bg-white border rounded-lg">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">CSV Export Format:</h5>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>1. ID No</div>
                            <div>2. Date and Time</div>
                            <div>3. Order / Delivery No</div>
                            <div>4. Supply Type</div>
                            <div>5. Branch Name</div>
                            <div>6. Oil Type</div>
                            <div>7. Branch Level Before</div>
                            <div>8. Start Meter reading</div>
                            <div>9. End Meter Reading</div>
                            <div>10. Qty Delivered</div>
                            <div>11. Total Qty Supplied</div>
                            <div>12. Drum Capacity</div>
                            <div>13. No of Drum</div>
                            <div>14. Branch Level After</div>
                            <div>15. Driver Name</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            *Fields extracted directly from Firebase transactions collection<br/>
                            **All data mapped from actual workflow database fields<br/>
                            ***Driver Name retrieved from transaction records
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Transactions Tab */}
                  <TabsContent value="recent" className="mt-0">
                    {(() => {
                      let filteredTransactions = recentTransactions;
                      
                      // Apply filters
                      if (transactionFilters.type) {
                        filteredTransactions = filteredTransactions.filter(t => t.type === transactionFilters.type);
                      }
                      if (transactionFilters.branch) {
                        filteredTransactions = filteredTransactions.filter(t => t.branchId === transactionFilters.branch);
                      }
                      if (transactionFilters.oilType) {
                        filteredTransactions = filteredTransactions.filter(t => t.oilTypeId === transactionFilters.oilType);
                      }
                      
                      return filteredTransactions.length > 0 ? (
                        <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                          {filteredTransactions.map((transaction, index) => (
                            <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-white bg-white shadow-sm">
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
                                  {transaction.timestamp?.toDate ? 
                                    transaction.timestamp.toDate().toLocaleString() : 
                                    transaction.createdAt ? (
                                      transaction.createdAt.toDate ? 
                                        transaction.createdAt.toDate().toLocaleString() :
                                        new Date(transaction.createdAt).toLocaleString()
                                    ) : 'Unknown date'
                                  }
                                </div>
                                <div className="text-xs text-gray-500">Driver: {(() => {
                                  const driver = drivers.find(d => d.uid === transaction.driverUid || d.id === transaction.driverUid);
                                  return driver ? (driver.displayName || driver.email) : transaction.driverName || transaction.driverUid || 'Unknown Driver';
                                })()}</div>
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
                          <p>{recentTransactions.length === 0 ? 'No recent transactions' : 'No transactions match the current filters'}</p>
                          {recentTransactions.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => setTransactionFilters({ type: '', branch: '', oilType: '', driver: '' })}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Search Results Tab */}
                  <TabsContent value="search" className="mt-0">
                    {(() => {
                      let filteredSearchResults = searchedTransactions;
                      
                      // Apply filters
                      if (transactionFilters.type) {
                        filteredSearchResults = filteredSearchResults.filter(t => t.type === transactionFilters.type);
                      }
                      if (transactionFilters.branch) {
                        filteredSearchResults = filteredSearchResults.filter(t => t.branchId === transactionFilters.branch);
                      }
                      if (transactionFilters.oilType) {
                        filteredSearchResults = filteredSearchResults.filter(t => t.oilTypeId === transactionFilters.oilType);
                      }
                      
                      return showSearchResults ? (
                        filteredSearchResults.length > 0 ? (
                          <div>
                            <div className="mb-3 text-sm text-gray-600">
                              Search results from {searchStartDate} to {searchEndDate} 
                              {filteredSearchResults.length !== searchedTransactions.length && 
                                ` (${filteredSearchResults.length} of ${searchedTransactions.length} shown after filtering)`
                              }
                            </div>
                            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                              {filteredSearchResults.map((transaction, index) => (
                                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-white bg-white shadow-sm">
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
                                      {transaction.timestamp?.toDate ? 
                                        transaction.timestamp.toDate().toLocaleString() : 
                                        transaction.createdAt ? (
                                          transaction.createdAt.toDate ? 
                                            transaction.createdAt.toDate().toLocaleString() :
                                            new Date(transaction.createdAt).toLocaleString()
                                        ) : 'Unknown date'
                                      }
                                    </div>
                                    <div className="text-xs text-gray-500">Driver: {(() => {
                                      const driver = drivers.find(d => d.uid === transaction.driverUid || d.id === transaction.driverUid);
                                      return driver ? (driver.displayName || driver.email) : transaction.driverName || transaction.driverUid || 'Unknown Driver';
                                    })()}</div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTransaction(transaction);
                                      setShowTransactionModal(true);
                                    }}
                                    className="flex items-center gap-2"
                                    data-testid={`button-view-searched-transaction-${index}`}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                    View
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>{searchedTransactions.length === 0 ? 'No transactions found in the selected date range' : 'No search results match the current filters'}</p>
                            {searchedTransactions.length > 0 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2"
                                onClick={() => setTransactionFilters({ type: '', branch: '', oilType: '', driver: '' })}
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>Use the date range search above to find specific transactions</p>
                        </div>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Update Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Tank Update Logs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogDateFilter(!showLogDateFilter)}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      {showLogDateFilter ? 'Hide' : 'Date Range'}
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Tank level updates with filtering options ({getFilteredLogs().length} of {updateLogs.length} shown)
                </CardDescription>
                
                {/* Date Range Filter for Logs */}
                {showLogDateFilter && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium">From:</label>
                        <input
                          type="date"
                          value={logStartDate}
                          onChange={(e) => setLogStartDate(e.target.value)}
                          className="border rounded px-3 py-1 text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium">To:</label>
                        <input
                          type="date"
                          value={logEndDate}
                          onChange={(e) => setLogEndDate(e.target.value)}
                          className="border rounded px-3 py-1 text-sm"
                        />
                      </div>
                      <Button 
                        onClick={() => downloadLogData(logStartDate, logEndDate)}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm"
                        disabled={!logStartDate || !logEndDate}
                      >
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Download Inventory Report CSV
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {/* Log Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Branch</label>
                    <select 
                      className="w-full text-sm border rounded px-3 py-1.5 bg-white"
                      value={logFilters.branch}
                      onChange={(e) => setLogFilters(prev => ({ ...prev, branch: e.target.value }))}
                    >
                      <option value="">All Branches</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Oil Type</label>
                    <select 
                      className="w-full text-sm border rounded px-3 py-1.5 bg-white"
                      value={logFilters.oilType}
                      onChange={(e) => setLogFilters(prev => ({ ...prev, oilType: e.target.value }))}
                    >
                      <option value="">All Oil Types</option>
                      {oilTypes.map((oilType) => (
                        <option key={oilType.id} value={oilType.id}>{oilType.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">User</label>
                    <input
                      type="text"
                      className="w-full text-sm border rounded px-3 py-1.5 bg-white"
                      placeholder="Filter by user..."
                      value={logFilters.user}
                      onChange={(e) => setLogFilters(prev => ({ ...prev, user: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Date Range</label>
                    <select 
                      className="w-full text-sm border rounded px-3 py-1.5 bg-white"
                      value={logFilters.dateRange}
                      onChange={(e) => setLogFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    >
                      <option value="">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>
                </div>

                {getFilteredLogs().length > 0 ? (
                  <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
                    {getFilteredLogs().map((log) => (
                      <div key={log.id} className="p-3 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <div>
                              <p className="font-medium text-sm">
                                {log.branchName || 'Unknown Branch'} • {log.oilTypeName || 'Unknown Oil Type'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {log.oldLevel || 0}L → {log.newLevel || 0}L • By {log.updatedBy || 'Unknown User'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-gray-500">
                                  {log.updatedAt ? (
                                    log.updatedAt.toDate ? 
                                      log.updatedAt.toDate().toLocaleString() :
                                      new Date(log.updatedAt).toLocaleString()
                                  ) : 'Unknown date'}
                                </div>
                                {log.photos && Object.keys(log.photos).length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    {Object.keys(log.photos).length} photo{Object.keys(log.photos).length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowLogModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {updateLogs.length === 0 ? 'No update logs found' : 'No logs match the current filters'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            View detailed information about this transaction including photos and metadata
          </DialogDescription>
          {selectedTransaction && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2" style={{ maxHeight: 'calc(90vh - 120px)' }}>
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

              {/* Photos - Complete Implementation */}
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

      {/* Tank Update Log Details Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Tank Update Log Details</DialogTitle>
          <DialogDescription>
            Detailed information about this tank level update
          </DialogDescription>
          {selectedLog && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Branch</label>
                  <p className="text-sm font-medium">{selectedLog.branchName || 'Unknown Branch'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Oil Type</label>
                  <p className="text-sm font-medium">{selectedLog.oilTypeName || 'Unknown Oil Type'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Previous Level</label>
                  <p className="text-sm font-medium">{selectedLog.oldLevel || 0}L</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Level</label>
                  <p className="text-sm font-medium">{selectedLog.newLevel || 0}L</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Change</label>
                  <p className="text-sm font-medium">
                    {((selectedLog.newLevel || 0) - (selectedLog.oldLevel || 0)) > 0 ? '+' : ''}
                    {(selectedLog.newLevel || 0) - (selectedLog.oldLevel || 0)}L
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Updated By</label>
                  <p className="text-sm font-medium">{selectedLog.updatedBy || 'Unknown User'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</label>
                  <p className="text-sm font-medium">
                    {selectedLog.updatedAt ? (
                      selectedLog.updatedAt.toDate ? 
                        selectedLog.updatedAt.toDate().toLocaleString() :
                        new Date(selectedLog.updatedAt).toLocaleString()
                    ) : 'Unknown date'}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              {(selectedLog.notes || selectedLog.reason) && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Notes</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {selectedLog.notes || selectedLog.reason || 'No additional notes available'}
                    </p>
                  </div>
                </div>
              )}

              {/* Photos */}
              {selectedLog.photos && Object.keys(selectedLog.photos).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                    Photos ({Object.keys(selectedLog.photos).length})
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedLog.photos).map(([key, url]) => (
                      <div key={key} className="relative group cursor-pointer" 
                           onClick={() => {
                             setSelectedPhoto({
                               url: url as string,
                               label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                             });
                             setShowPhotoModal(true);
                           }}>
                        <img
                          src={url as string}
                          alt={key}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs text-gray-600 mt-1 text-center truncate">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Photos Message */}
              {(!selectedLog.photos || Object.keys(selectedLog.photos).length === 0) && (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No photos available for this update</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer with Creator Credit */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center">
        <p className="text-xs text-gray-500">Created by Asif Shaikh</p>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
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
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  FileSpreadsheet,
  Search,
  RefreshCw,
  User,
  Clock,
  ChevronDown,
  ChevronUp
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
  addDoc,
  setDoc,
  where,
  runTransaction
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";

interface Branch {
  id: string;
  name: string;
  location?: string;
  contactPerson?: string;
  active?: boolean;
  oilTanks?: OilTank[];
}

interface OilType {
  id: string;
  name: string;
  category?: string;
  active?: boolean;
  viscosity?: string;
}

interface TransactionDebugRow {
  oilTypeName: string;
  driverName: string;
  createdAt: string;
  branchName: string;
  docId: string;
}

interface TankUpdateLogRow {
  oilTypeName: string;
  branchName: string;
  updatedAt: string;
  updatedBy: string;
  docId: string;
}

interface Transaction {
  id: string;
  type: 'loading' | 'supply' | 'delivery';
  quantity: number;
  oilTypeName: string;
  branchName: string;
  branchId: string;
  driverName?: string;
  driverDisplayName?: string;
  driverUid?: string;
  loadedLiters?: number;
  deliveredLiters?: number;
  createdAt: any;
  timestamp?: any;
  oilTypeId?: string;
  notes?: string;
  photos?: Record<string, string>;
  loadSessionId?: string;
  deliveryOrderId?: string;
  sessionId?: string;
  numberOfDrums?: number;
  supplyType?: string;
  deliveryOrderNo?: string;
  orderNumber?: string;
  orderNo?: string;
  branchTankBefore?: number;
  startMeterReading?: number;
  endMeterReading?: number;
  totalLitersSupplied?: number;
  drumCapacity?: number;
  branchTankAfter?: number;
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
  dailyUsage?: number;
}

interface UpdateLog {
  id: string;
  tankId?: string;
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
  const [showCsvUpload, setShowCsvUpload] = useState(true);
  
  // Daily Usage Update States
  const [showDailyUsageModal, setShowDailyUsageModal] = useState(false);
  const [dailyUsageFileUrl, setDailyUsageFileUrl] = useState("https://docs.google.com/spreadsheets/d/example-daily-usage-sheet/edit"); // Default or fetched from DB
  const [dailyUsageUploadFile, setDailyUsageUploadFile] = useState<File | null>(null);
  const [dailyUsageProcessing, setDailyUsageProcessing] = useState(false);
  const [madAutoUpdateIntervalMinutes, setMadAutoUpdateIntervalMinutes] = useState<number>(1440);
  const [madScheduleDayOfMonth, setMadScheduleDayOfMonth] = useState<number | null>(null);
  const [madScheduleTime, setMadScheduleTime] = useState<string>("08:00");
  const [lastMadAutoUpdateAt, setLastMadAutoUpdateAt] = useState<Date | null>(null);
  const [canUpdateMAD, setCanUpdateMAD] = useState(false);


  // Helper functions for real-time data fetching (same as debug view)
  const formatTimeAgo = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch (e) {
      return '';
    }
  };


  
  // Enhanced tank tracking data with real-time database queries
  const [enhancedBranchData, setEnhancedBranchData] = useState<any[]>([]);
  const [dataFetchingMode, setDataFetchingMode] = useState<'cached' | 'realtime'>('cached');
  const [tankActivityData, setTankActivityData] = useState<Map<string, {manualUpdateDisplay: string, supplyUpdateDisplay: string}>>(new Map());
  
  // Get user's assigned branches for filtering  
  const userBranchIds = (user as any)?.branchIds || [];
  const isRestrictedUser = user?.role === 'warehouse' && userBranchIds.length > 0;

  // Theme state
  const [theme, setTheme] = useState<'light' | 'night' | 'midday'>('light');
  
  // Load current user's MAD permission
  useEffect(() => {
    const loadPermission = async () => {
      try {
        if (!user?.uid) return;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setCanUpdateMAD(Boolean((data as any).canUpdateMAD));
        }
      } catch (e) {
        console.error('Failed to load MAD permission:', e);
      }
    };
    loadPermission();
  }, [user?.uid]);
  
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
  const [stockSearchQuery, setStockSearchQuery] = useState('');
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
  
  // Search-based logs states
  const [searchLogs, setSearchLogs] = useState<UpdateLog[]>([]);
  const [isSearchingLogs, setIsSearchingLogs] = useState(false);
  const [hasSearchedLogs, setHasSearchedLogs] = useState(false);
  const [logsSearchFilters, setLogsSearchFilters] = useState({
    startDate: '',
    endDate: '',
    branch: '',
    oilType: '',
    user: '',
    searchText: ''
  });
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
    driver: '',
    dateRange: ''
  });
  
  // CSV export states
  const [showCsvExport, setShowCsvExport] = useState(false);
  const [csvStartDate, setCsvStartDate] = useState('');
  const [csvEndDate, setCsvEndDate] = useState('');
  const [csvExporting, setCsvExporting] = useState(false);
  
  const [showLogDateFilter, setShowLogDateFilter] = useState(false);
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  // Monitoring debug states
  const [transactionRows, setTransactionRows] = useState<TransactionDebugRow[]>([]);
  const [tankUpdateRows, setTankUpdateRows] = useState<TankUpdateLogRow[]>([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [userAssignedBranches, setUserAssignedBranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && user.role === 'warehouse') {
      console.log('✅ User authenticated for warehouse dashboard:', {
        email: user.email,
        displayName: user.displayName,
        role: user.role
      });
      // Automatically load data when dashboard opens
      loadAllData();
    } else {
      console.log('❌ No user authenticated for warehouse dashboard');
      setLoading(false);
    }
  }, [user]);

  // Separate useEffect for monitoring data - loads once on initial mount
  useEffect(() => {
    if (user && user.role === 'warehouse') {
      // Load monitoring data on initial dashboard load
      fetchMonitoringDebugData();
    }
  }, [user]);

  // Function to process auto-update from URL
  const processDailyUsageFromUrl = async (sheetUrl: string) => {
    let csvUrl = sheetUrl;
    if (sheetUrl.includes('/edit')) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
    }
    // Handle OneDrive/SharePoint links by forcing direct download when possible
    if (
      sheetUrl.includes('onedrive.live.com') ||
      sheetUrl.includes('1drv.ms') ||
      sheetUrl.includes('sharepoint.com')
    ) {
      if (!sheetUrl.includes('download=1')) {
        csvUrl = sheetUrl + (sheetUrl.includes('?') ? '&' : '?') + 'download=1';
      } else {
        csvUrl = sheetUrl;
      }
    }

    try {
      console.log('🔄 Starting automatic MAD update...');
      const proxyUrl = `/api/proxy-sheet?url=${encodeURIComponent(csvUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const requiredHeaders = ['Branch Name', 'Oil Type', 'MAD'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        console.error('Missing headers in auto-update CSV:', missingHeaders);
        return;
      }
      
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const updatesByBranch: { [key: string]: { dailyUsage: number, oilTypeName: string }[] } = {};
      const branchMap = new Map<string, string>();
      
      branchesSnapshot.docs.forEach(doc => {
        const d = doc.data();
        branchMap.set(d.name, doc.id);
      });

      let updateCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const row: {[key: string]: string} = {};
        headers.forEach((header, index) => row[header] = values[index] || '');

        const branchName = row['Branch Name'];
        const oilTypeName = row['Oil Type'];
        const dailyUsage = parseFloat(row['MAD']);

        if (!branchName || !oilTypeName || isNaN(dailyUsage)) continue;

        const branchId = branchMap.get(branchName);
        if (!branchId) continue;

        if (!updatesByBranch[branchId]) updatesByBranch[branchId] = [];
        updatesByBranch[branchId].push({ dailyUsage, oilTypeName });
        updateCount++;
      }

      if (updateCount === 0) return;

      const branchIds = Object.keys(updatesByBranch);
      await Promise.all(branchIds.map(async (branchId) => {
        const branchRef = doc(db, 'branches', branchId);
        await runTransaction(db, async (transaction) => {
          const branchDoc = await transaction.get(branchRef);
          if (!branchDoc.exists()) return;

          const branchData = branchDoc.data();
          const currentTanks = branchData.oilTanks || [];
          let changed = false;
          const updates = updatesByBranch[branchId];

          const updatedTanks = currentTanks.map((tank: any) => {
            const update = updates.find((u: any) => u.oilTypeName === (tank.oilTypeName || ''));
            if (update && tank.dailyUsage !== update.dailyUsage) {
              changed = true;
              return { ...tank, dailyUsage: update.dailyUsage };
            }
            return tank;
          });

          if (changed) {
            transaction.update(branchRef, { oilTanks: updatedTanks });
          }
        });
      }));

      await setDoc(doc(db, 'settings', 'warehouse'), {
        lastDailyUsageAutoUpdate: new Date()
      }, { merge: true });
      setLastMadAutoUpdateAt(new Date());

      console.log(`✅ Auto-updated ${updateCount} daily usage records.`);
      toast({
        title: "Auto-Update Complete",
        description: `MAD updated for ${updateCount} tanks from linked sheet.`,
      });
      
      loadAllData();

    } catch (error) {
      console.error('Auto-update error:', error);
    }
  };

  const handleSaveMadSchedule = async () => {
    try {
      await setDoc(doc(db, 'settings', 'warehouse'), {
        madScheduleDayOfMonth: madScheduleDayOfMonth,
        madScheduleTime: madScheduleTime
      }, { merge: true });
      toast({
        title: "MAD Schedule Updated",
        description: "Monthly schedule has been saved successfully."
      });
      setShowDailyUsageModal(false);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save the schedule. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch warehouse settings (Daily Usage File URL)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'warehouse'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.dailyUsageFileUrl) {
            setDailyUsageFileUrl(data.dailyUsageFileUrl);
            if (data.madAutoUpdateIntervalMinutes) {
              setMadAutoUpdateIntervalMinutes(Number(data.madAutoUpdateIntervalMinutes));
            }
            if (data.madScheduleDayOfMonth !== undefined) {
              setMadScheduleDayOfMonth(Number(data.madScheduleDayOfMonth));
            }
            if (data.madScheduleTime) {
              setMadScheduleTime(String(data.madScheduleTime));
            }

            // Check for auto-update
            const lastUpdate = data.lastDailyUsageAutoUpdate?.toDate()?.getTime() || 0;
            const now = Date.now();
            const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
            if (lastUpdate) {
              setLastMadAutoUpdateAt(new Date(lastUpdate));
            }
            
            if (daysSinceUpdate >= 30) {
              processDailyUsageFromUrl(data.dailyUsageFileUrl);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching warehouse settings:", error);
      }
    };
    
    if (user) {
      fetchSettings();
    }
  }, [user]);

  // Scheduled auto-update for MAD from external file link
  useEffect(() => {
    if (!dailyUsageFileUrl) return;
    if (madScheduleDayOfMonth == null || !madScheduleTime) return;
    const intervalMs = 5 * 60 * 1000;
    const interval = setInterval(() => {
      const now = new Date();
      const [hh, mm] = madScheduleTime.split(':').map(n => parseInt(n, 10));
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const scheduledDay = Math.min(madScheduleDayOfMonth, lastDayOfMonth);
      const scheduledDate = new Date(year, month, scheduledDay, hh || 0, mm || 0, 0, 0);
      const lastRun = lastMadAutoUpdateAt?.getTime() || 0;
      if (now.getTime() >= scheduledDate.getTime() && lastRun < scheduledDate.getTime()) {
        processDailyUsageFromUrl(dailyUsageFileUrl);
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [dailyUsageFileUrl, madScheduleDayOfMonth, madScheduleTime, lastMadAutoUpdateAt]);

  // Fallback interval-based auto-update when no schedule is set
  useEffect(() => {
    if (!dailyUsageFileUrl) return;
    if (madScheduleDayOfMonth != null && madScheduleTime) return;
    const intervalMs = madAutoUpdateIntervalMinutes * 60 * 1000;
    const interval = setInterval(() => {
      processDailyUsageFromUrl(dailyUsageFileUrl);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [dailyUsageFileUrl, madAutoUpdateIntervalMinutes, madScheduleDayOfMonth, madScheduleTime]);

  // Note: No auto-refresh interval - monitoring data will only reload when user clicks refresh

  // Hierarchical data loading using debug page logic
  const loadTankActivityData = async (branchStatuses: any[]) => {
    console.log('🚀 Loading tank activity data using hierarchical approach...');
    const startTime = Date.now();
    
    try {
      // Fetch all data in parallel first (same as debug page)
      const since30d = Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000));
      
      console.log('📊 Fetching transactions and tank updates from last 30 days...');
      
      // Get branch mapping
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchMap = new Map<string, string>();
      branchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        branchMap.set(doc.id, data.name || doc.id);
      });
      
      // Fetch all transactions and tank updates in parallel
      const [transactionsSnapshot, tankLogsSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, "transactions"),
          where("createdAt", ">=", since30d),
          orderBy("createdAt", "desc"),
          limit(200)
        )),
        getDocs(query(
          collection(db, "tankUpdateLogs"),
          where("updatedAt", ">=", since30d),
          orderBy("updatedAt", "desc"), 
          limit(200)
        ))
      ]);
      
      // Process data using debug page logic
      const branchOilTypeData = new Map<string, {
        manualUpdate: { updatedAt: any; updatedBy: string } | null;
        supplyLoading: { createdAt: any; driverName: string } | null;
      }>();
      
      // Process tank updates (manual)
      tankLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId;
        const oilTypeName = data.oilTypeName;
        const key = `${branchName}-${oilTypeName}`;
        
        if (!branchOilTypeData.has(key) || !branchOilTypeData.get(key)?.manualUpdate) {
          const existing = branchOilTypeData.get(key) || { manualUpdate: null, supplyLoading: null };
          existing.manualUpdate = {
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy || '-'
          };
          branchOilTypeData.set(key, existing);
        }
      });
      
      // Process transactions (supply/loading)
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!['supply', 'loading'].includes(data.type)) return;
        
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId;
        const oilTypeName = data.oilTypeName;
        const key = `${branchName}-${oilTypeName}`;
        
        if (!branchOilTypeData.has(key) || !branchOilTypeData.get(key)?.supplyLoading) {
          const existing = branchOilTypeData.get(key) || { manualUpdate: null, supplyLoading: null };
          existing.supplyLoading = {
            createdAt: data.timestamp || data.createdAt,
            driverName: data.driverName || '-'
          };
          branchOilTypeData.set(key, existing);
        }
      });
      
      // Convert to tank-specific activity data for the UI
      const activityMap = new Map();
      
      branchStatuses.forEach(branch => {
        branch.tankDetails.slice(0, 3).forEach((tank: any) => {
          const key = `${branch.name}-${tank.oilTypeName}`;
          const data = branchOilTypeData.get(key);
          
          // Format display using same logic as debug page
          const manualDisplay = data?.manualUpdate 
            ? formatTimeAgo(data.manualUpdate.updatedAt) + ` by ${data.manualUpdate.updatedBy}`
            : 'No activity in last 30 days';
            
          const supplyDisplay = data?.supplyLoading
            ? formatTimeAgo(data.supplyLoading.createdAt) + ` by ${data.supplyLoading.driverName}`
            : 'No activity in last 30 days';
          
          activityMap.set(tank.tankId, {
            manualUpdateDisplay: manualDisplay,
            supplyUpdateDisplay: supplyDisplay
          });
        });
      });
      
      setTankActivityData(activityMap);
      
      const endTime = Date.now();
      console.log(`✅ Hierarchical tank activity data loaded in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.error('❌ Error loading hierarchical tank data:', error);
      
      // Fallback to show error state
      const activityMap = new Map();
      branchStatuses.forEach(branch => {
        branch.tankDetails.slice(0, 3).forEach((tank: any) => {
          activityMap.set(tank.tankId, {
            manualUpdateDisplay: 'Error loading data',
            supplyUpdateDisplay: 'Error loading data'
          });
        });
      });
      setTankActivityData(activityMap);
    }
  };

  const loadAllData = async () => {
    try {
      console.log('🏭 Loading warehouse dashboard data (ultra-fast mode)...');
      setLoading(true);
      
      // Load branches with filtering for warehouse users
      const branchesData = await getActiveBranchesOnly().catch(() => []);
      const oilTypesData = await getAllOilTypes().catch(() => []);
      
      // Filter branches for warehouse users with assigned branches
      const filteredBranches = isRestrictedUser 
        ? branchesData.filter(branch => userBranchIds.includes(branch.id))
        : branchesData;
      
      console.log(`🏢 Loaded ${filteredBranches.length} branches for ${user?.role} user:`, 
        filteredBranches.map(b => b.name));
      
      // Set data and extract tanks immediately
      setBranches(filteredBranches || []);
      setOilTypes(oilTypesData || []);
      
      const oilTanksData = extractOilTanksFromBranches(filteredBranches, oilTypesData);
      setOilTanks(oilTanksData);
      
      console.log('⚡ Tanks ready:', oilTanksData.length);
      
      // Load everything else much later to avoid any blocking
      setTimeout(async () => {
        try {
          // Load recent transactions (filtered for warehouse users)
          const allTxs = await getAllTransactions().catch(() => []);
          const filteredTxs = isRestrictedUser 
            ? allTxs.filter(tx => userBranchIds.includes(tx.branchId))
            : allTxs;
          
          // Take only recent 10 transactions
          const recentTxs = filteredTxs
            .sort((a, b) => {
              const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
              const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 10);
          
          setRecentTransactions(recentTxs);
          
          // Load drivers for proper transaction details
          const driversData = await getAllUsers().catch(() => []);
          console.log('👥 Got drivers:', driversData.length);
          setDrivers(driversData);
          
          // Don't auto-load logs anymore - they will be loaded only when searched
          
        } catch (error) {
          console.error('Background load error:', error);
        }
      }, 2000); // Wait 2 seconds before loading background data

      // Load enhanced tank data with real-time database queries
      setTimeout(async () => {
        try {
          console.log('🔄 Loading enhanced tank tracking data from entire database...');
          setDataFetchingMode('realtime');
          const enhancedData = await getBranchUpdateStatusWithFullData();
          setEnhancedBranchData(enhancedData);
          console.log('✅ Enhanced tank data loaded:', enhancedData.length, 'branches');
          
          // Start loading real-time activity data immediately (no additional delay)
          loadTankActivityData(enhancedData).then(() => {
            console.log('✅ Real-time tank activity data loaded');
          }).catch(error => {
            console.warn('⚠️ Failed to load tank activity data:', error);
          });
          
        } catch (error) {
          console.warn('⚠️ Failed to load enhanced data, using cached fallback:', error);
          setDataFetchingMode('cached');
        }
      }, 1500); // Reduced delay from 3 to 1.5 seconds
      
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
        lastUpdated: tankData.lastUpdated || Timestamp.now(),
        dailyUsage: tankData.dailyUsage
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
      })) as Transaction[];

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
      setSearchedTransactions(filteredTransactions as Transaction[]);
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
      })) as Transaction[];

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
        'Type',
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
        
        // ID No - Use formatted ID from Firebase (yyyy-00000 format)
        const idNo = transaction.loadSessionId || transaction.deliveryOrderId || transaction.sessionId || transaction.id || 'N/A';
        
        // Type - Enhanced type classification 
        let transactionType = 'Unknown';
        if (transaction.type === 'loading') {
          transactionType = 'Loading';
        } else if (transaction.type === 'supply') {
          if (transaction.numberOfDrums && transaction.numberOfDrums > 0) {
            transactionType = 'Supply by Drum';
          } else {
            transactionType = 'Supply loose';
          }
        } else if (transaction.supplyType === 'drum') {
          transactionType = 'Supply by Drum';
        } else if (transaction.supplyType === 'loose') {
          transactionType = 'Supply loose';
        }
        
        // Order / Delivery No - Include loading session order numbers and delivery order numbers
        const orderDeliveryNo = transaction.deliveryOrderNo || transaction.deliveryOrderId || transaction.orderNumber || transaction.orderNo || 'N/A';
        
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
        const escapeCSV = (field: any): string => {
          if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };
        
        const row = [
          escapeCSV(idNo),
          escapeCSV(dateTime),
          escapeCSV(transactionType),
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

  // Helper to format timestamps for monitoring debug
  const formatTimestamp = (ts: any): string => {
    if (!ts) return '-';
    try {
      const dt = ts?.toDate ? ts.toDate() : new Date(ts);
      return dt.toISOString();
    } catch (e) {
      return '-';
    }
  };

  const fetchMonitoringDebugData = async () => {
    setMonitoringLoading(true);
    setMonitoringError(null);
    
    try {
      console.log('🔍 Starting monitoring debug data fetch for last 30 days...');
      
      // Calculate 30 days ago
      const since30d = Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000));
      console.log(`📅 Fetching data since: ${since30d.toDate().toISOString()}`);
      
      // Get branches using the same filtering logic as Stock Update tab
      const branchesData = await getActiveBranchesOnly().catch(() => []);
      
      // Filter branches for warehouse users with assigned branches (same as loadAllData)
      const filteredBranches = isRestrictedUser 
        ? branchesData.filter(branch => userBranchIds.includes(branch.id))
        : branchesData;
      
      console.log(`🏢 Monitoring: Loaded ${filteredBranches.length} branches for ${user?.role} user:`, 
        filteredBranches.map(b => b.name));
      
      // Create branch mapping from filtered branches
      const branchMap = new Map<string, string>();
      const assignedBranchNames = new Set<string>();
      
      filteredBranches.forEach(branch => {
        branchMap.set(branch.id, branch.name);
        assignedBranchNames.add(branch.name);
      });
      
      console.log(`📊 Found ${branchMap.size} branches for monitoring (filtered for user)`);
      if (isRestrictedUser) {
        console.log(`🔒 Warehouse user - showing ${assignedBranchNames.size} assigned branches only: [${Array.from(assignedBranchNames).join(', ')}]`);
      } else {
        console.log(`👑 Admin user - showing all ${assignedBranchNames.size} branches`);
      }

      // Fetch transactions from last 30 days
      console.log('\n🚛 Fetching transactions from last 30 days...');
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('createdAt', '>=', since30d),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      let transactionsSnapshot;
      try {
        transactionsSnapshot = await getDocs(transactionsQuery);
      } catch (error: any) {
        console.log('❌ createdAt query failed, trying timestamp...');
        // Fallback to timestamp if createdAt fails
        const fallbackQuery = query(
          collection(db, 'transactions'),
          where('timestamp', '>=', since30d),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        transactionsSnapshot = await getDocs(fallbackQuery);
      }
      
      // Process transactions and keep only latest per branch+oilType
      const txnMap = new Map<string, TransactionDebugRow>();
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId || 'Unknown';
        const oilTypeName = data.oilTypeName || 'Unknown';
        const key = `${branchName}-${oilTypeName}`;
        
        const row: TransactionDebugRow = {
          oilTypeName: oilTypeName,
          driverName: data.driverName || '-',
          createdAt: formatTimestamp(data.createdAt || data.timestamp),
          branchName: branchName,
          docId: doc.id
        };
        
        // Keep only the latest (first in ordered results)
        if (!txnMap.has(key)) {
          txnMap.set(key, row);
          console.log(`✅ Latest Transaction for ${key}: ${row.createdAt} by ${row.driverName}`);
        } else {
          console.log(`⏭️ Skipping older transaction for ${key}`);
        }
      });
      
      const txnResults = Array.from(txnMap.values());

      // Fetch tankUpdateLogs from last 30 days
      console.log('\n🛢️ Fetching tankUpdateLogs from last 30 days...');
      const tankLogsQuery = query(
        collection(db, 'tankUpdateLogs'),
        where('updatedAt', '>=', since30d),
        orderBy('updatedAt', 'desc'),
        limit(100)
      );
      
      const tankLogsSnapshot = await getDocs(tankLogsQuery);
      
      // Process tank updates and keep only latest per branch+oilType
      const tankMap = new Map<string, TankUpdateLogRow>();
      tankLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId || 'Unknown';
        const oilTypeName = data.oilTypeName || 'Unknown';
        const key = `${branchName}-${oilTypeName}`;
        
        const row: TankUpdateLogRow = {
          oilTypeName: oilTypeName,
          branchName: branchName,
          updatedAt: formatTimestamp(data.updatedAt),
          updatedBy: data.updatedBy || '-',
          docId: doc.id
        };
        
        // Keep only the latest (first in ordered results)
        if (!tankMap.has(key)) {
          tankMap.set(key, row);
          console.log(`✅ Latest Tank Update for ${key}: ${row.updatedAt} by ${row.updatedBy}`);
        } else {
          console.log(`⏭️ Skipping older tank update for ${key}`);
        }
      });
      
      const tankResults = Array.from(tankMap.values());
      
      console.log(`\n✅ Monitoring debug fetch complete.`);
      console.log(`📋 Transactions (30d): ${txnResults.length}`);
      console.log(`📋 Tank Updates (30d): ${tankResults.length}`);
      
      setTransactionRows(txnResults);
      setTankUpdateRows(tankResults);
      setUserAssignedBranches(assignedBranchNames);
      
    } catch (error: any) {
      console.error('❌ Monitoring debug fetch error:', error);
      setMonitoringError(error.message);
    } finally {
      setMonitoringLoading(false);
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

  // Fetch latest manual update from tankUpdateLogs collection (last 30 days)
  const fetchLatestTankUpdate = async (branchId: string, oilTypeId: string, oilTypeName: string) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const tankUpdateLogsRef = collection(db, 'tankUpdateLogs');
      
      // Query by branchId and filter by oil type locally for better results
      const q = query(
        tankUpdateLogsRef, 
        where('branchId', '==', branchId),
        where('updatedAt', '>=', thirtyDaysAgo),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Filter for matching oil type (check both oilTypeId and oilTypeName)
        const matchingUpdates = snapshot.docs.filter(doc => {
          const data = doc.data();
          return data.oilTypeId === oilTypeId || data.oilTypeName === oilTypeName;
        });
        
        if (matchingUpdates.length > 0) {
          const doc = matchingUpdates[0]; // Most recent
          const data = doc.data();
          const updateDate = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            date: updateDate,
            by: data.updatedBy || 'Unknown User',
            daysAgo: daysDiff
          };
        }
      }
      
      return null; // No data found in last 30 days
    } catch (error) {
      console.warn(`Failed to fetch manual updates for ${branchId}:`, error);
      return null;
    }
  };

  // Fetch latest supply/loading transaction from transactions collection (last 30 days)
  const fetchLatestSupplyTransaction = async (branchId: string, oilTypeId: string, oilTypeName: string) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const transactionsRef = collection(db, 'transactions');
      
      // Query by branchId and filter by oil type locally for better results
      const q = query(
        transactionsRef,
        where('branchId', '==', branchId),
        where('timestamp', '>=', thirtyDaysAgo),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Filter locally for matching oil type and transaction type
        const matchingTransactions = snapshot.docs.filter(doc => {
          const data = doc.data();
          const matchesOilType = data.oilTypeId === oilTypeId || data.oilTypeName === oilTypeName;
          const matchesType = ['supply', 'loading'].includes(data.type);
          return matchesOilType && matchesType;
        });
        
        if (matchingTransactions.length > 0) {
          const doc = matchingTransactions[0]; // Most recent
          const data = doc.data();
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : 
                           data.createdAt?.toDate ? data.createdAt.toDate() :
                           new Date(data.timestamp || data.createdAt);
          
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get driver name with fallbacks
          const driverName = data.driverName || data.driverDisplayName ||
                            data.reportedByName || data.reporterName || 'Driver';
          
          return {
            date: timestamp,
            by: driverName,
            type: data.type,
            daysAgo: daysDiff
          };
        }
      }
      
      return null; // No data found in last 30 days
    } catch (error) {
      console.warn(`Failed to fetch supply transactions for ${branchId}:`, error);
      return null;
    }
  };

  // Enhanced async function to get detailed branch update status with tank-level tracking from entire database
  const getBranchUpdateStatusWithFullData = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const branchPromises = branches.map(async (branch) => {
      const branchTanks = oilTanks.filter(tank => tank.branchId === branch.id);

      // Get detailed tank update status with dual tracking from entire database (last 30 days)
      const tankPromises = branchTanks.map(async (tank) => {
        // Fetch latest manual update from tankUpdateLogs collection (last 30 days)
        const latestManualUpdate = await fetchLatestTankUpdate(branch.id, tank.oilTypeId, tank.oilTypeName);
        
        // Fetch latest supply/loading from transactions collection (last 30 days)
        const latestSupplyUpdate = await fetchLatestSupplyTransaction(branch.id, tank.oilTypeId, tank.oilTypeName);

        let lastManualUpdate = null;
        let lastManualUpdateBy = null;
        let daysSinceManualUpdate = null;
        let manualUpdateDisplay = null;
        
        if (latestManualUpdate) {
          lastManualUpdate = latestManualUpdate.date;
          lastManualUpdateBy = latestManualUpdate.by;
          daysSinceManualUpdate = latestManualUpdate.daysAgo;
          manualUpdateDisplay = `${daysSinceManualUpdate === 0 ? 'Today' : 
                                daysSinceManualUpdate === 1 ? 'Yesterday' : 
                                `${daysSinceManualUpdate}d ago`} by ${lastManualUpdateBy}`;
        } else {
          manualUpdateDisplay = 'No manual update in last 30 days';
          daysSinceManualUpdate = 31; // For status calculation
        }

        let lastSupplyLoading = null;
        let lastSupplyLoadingBy = null;
        let daysSinceSupplyLoading = null;
        let supplyUpdateDisplay = null;
        
        if (latestSupplyUpdate) {
          lastSupplyLoading = latestSupplyUpdate.date;
          lastSupplyLoadingBy = latestSupplyUpdate.by;
          daysSinceSupplyLoading = latestSupplyUpdate.daysAgo;
          supplyUpdateDisplay = `${daysSinceSupplyLoading === 0 ? 'Today' : 
                               daysSinceSupplyLoading === 1 ? 'Yesterday' : 
                               `${daysSinceSupplyLoading}d ago`} by ${lastSupplyLoadingBy}`;
        } else {
          supplyUpdateDisplay = 'No supply/loading in last 30 days';
          daysSinceSupplyLoading = 31; // For status calculation
        }

        // Use manual update for overall status calculation (legacy compatibility)
        let lastUpdate = lastManualUpdate;
        let lastUpdateBy = lastManualUpdateBy;
        let daysSinceUpdate = daysSinceManualUpdate;
        
        if (!lastUpdate && tank.lastUpdated) {
          lastUpdate = new Date(tank.lastUpdated);
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const updateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
          daysSinceUpdate = Math.floor((nowDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
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
          percentage: ((tank.currentLevel / tank.capacity) * 100).toFixed(1),
          // Dual tracking data from entire database (last 30 days)
          lastManualUpdate,
          lastManualUpdateBy,
          daysSinceManualUpdate,
          manualUpdateDisplay,
          lastSupplyLoading,
          lastSupplyLoadingBy,
          daysSinceSupplyLoading,
          supplyUpdateDisplay
        };
      });

      const tankUpdateDetails = await Promise.all(tankPromises);

      // Calculate overall branch status
      const recentlyUpdatedTanks = tankUpdateDetails.filter(t => t.updateStatus === 'recent').length;
      const staleTanks = tankUpdateDetails.filter(t => t.updateStatus === 'stale').length;
      const oldTanks = tankUpdateDetails.filter(t => t.updateStatus === 'old').length;
      const neverUpdatedTanks = tankUpdateDetails.filter(t => t.updateStatus === 'never').length;

      // Branch status logic - Green if ALL tanks have update in last 7 days, Red otherwise
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      let branchStatus = 'up-to-date'; // Default to green
      
      // Check if ALL tanks have at least one update (manual or supply/loading) in last 7 days
      for (const tank of tankUpdateDetails) {
        const hasRecentManualUpdate = tank.daysSinceManualUpdate !== null && tank.daysSinceManualUpdate <= 7;
        const hasRecentSupplyUpdate = tank.daysSinceSupplyLoading !== null && tank.daysSinceSupplyLoading <= 7;
        
        // If this tank has NO update in last 7 days, mark branch as not updated
        if (!hasRecentManualUpdate && !hasRecentSupplyUpdate) {
          branchStatus = 'needs-attention'; // Red badge
          break;
        }
      }

      const allUpdates = tankUpdateDetails
        .filter(t => t.lastUpdate)
        .sort((a, b) => b.lastUpdate!.getTime() - a.lastUpdate!.getTime());

      const lastBranchUpdate = allUpdates.length > 0 ? allUpdates[0].lastUpdate : null;
      const daysSinceLastUpdate = lastBranchUpdate ? 
        Math.floor((now.getTime() - lastBranchUpdate.getTime()) / (1000 * 60 * 60 * 24)) : null;

      return {
        branchId: branch.id,
        branchName: branch.name,
        status: branchStatus,
        tankDetails: tankUpdateDetails.slice(0, 3), // Show top 3 tanks
        recentlyUpdatedTanks,
        staleTanks,
        oldTanks,
        neverUpdatedTanks,
        lastUpdate: lastBranchUpdate,
        daysSinceLastUpdate,
        totalTanks: branchTanks.length
      };
    });

    return Promise.all(branchPromises);
  };

  // Fallback function using cached data (existing implementation)
  const getBranchUpdateStatus = () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return branches.map(branch => {
      const branchTanks = oilTanks.filter(tank => tank.branchId === branch.id);

      // Get detailed tank update status with dual tracking (manual + supply/loading)
      const tankUpdateDetails = branchTanks.map(tank => {
        // Manual Updates - Use cached data but acknowledge it might be limited
        // Note: This will be enhanced to fetch latest from entire collection in a future update
        const branchLogs = updateLogs.filter(log => log.branchName === branch.name);
        const tankLogs = branchLogs.filter(log => 
          log.oilTypeName === tank.oilTypeName && log.branchName === branch.name &&
          (log.tankId === tank.id || log.tankId === `${branch.id}_tank_${tank.id.split('_')[2]}`)
        ).sort((a, b) => {
          const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
          const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        let lastManualUpdate = null;
        let lastManualUpdateBy = null;
        let daysSinceManualUpdate = null;
        
        if (tankLogs.length > 0) {
          const mostRecentLog = tankLogs[0];
          lastManualUpdate = mostRecentLog.updatedAt?.toDate ? mostRecentLog.updatedAt.toDate() : new Date(mostRecentLog.updatedAt);
          lastManualUpdateBy = mostRecentLog.updatedBy;
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const updateDate = new Date(lastManualUpdate.getFullYear(), lastManualUpdate.getMonth(), lastManualUpdate.getDate());
          daysSinceManualUpdate = Math.floor((nowDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Supply/Loading - Use cached data but acknowledge it might be limited
        // Note: This will be enhanced to fetch latest from entire collection in a future update
        const tankTransactions = recentTransactions.filter(transaction => 
          transaction.branchId === branch.id && 
          transaction.oilTypeName === tank.oilTypeName && 
          (transaction.type === 'supply' || transaction.type === 'loading')
        ).sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : 
                       (a as any).timestamp?.toDate ? (a as any).timestamp.toDate() : 
                       new Date((a as any).timestamp || a.createdAt || 0);
          const dateB = b.createdAt instanceof Date ? b.createdAt : 
                       (b as any).timestamp?.toDate ? (b as any).timestamp.toDate() : 
                       new Date((b as any).timestamp || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        let lastSupplyLoading = null;
        let lastSupplyLoadingBy = null;
        let daysSinceSupplyLoading = null;
        
        if (tankTransactions.length > 0) {
          const lastTransaction = tankTransactions[0];
          lastSupplyLoading = lastTransaction.createdAt instanceof Date ? lastTransaction.createdAt : 
                             (lastTransaction as any).timestamp?.toDate ? (lastTransaction as any).timestamp.toDate() : 
                             new Date((lastTransaction as any).timestamp || lastTransaction.createdAt);
          // Get driver name using the same logic as the transaction display
          const driver = drivers.find(d => d.uid === lastTransaction.driverUid || d.id === lastTransaction.driverUid);
          lastSupplyLoadingBy = driver ? (driver.displayName || driver.email) : 
                               lastTransaction.driverName || 
                               lastTransaction.driverDisplayName ||
                               (lastTransaction as any).reportedByName ||
                               (lastTransaction as any).reporterName || 
                               'System';
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const movementDate = new Date(lastSupplyLoading.getFullYear(), lastSupplyLoading.getMonth(), lastSupplyLoading.getDate());
          daysSinceSupplyLoading = Math.floor((nowDate.getTime() - movementDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Use manual update for overall status calculation (legacy compatibility)
        let lastUpdate = lastManualUpdate;
        let lastUpdateBy = lastManualUpdateBy;
        let daysSinceUpdate = daysSinceManualUpdate;
        
        if (!lastUpdate && tank.lastUpdated) {
          lastUpdate = new Date(tank.lastUpdated);
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const updateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
          daysSinceUpdate = Math.floor((nowDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
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
          percentage: ((tank.currentLevel / tank.capacity) * 100).toFixed(1),
          // Dual tracking data
          lastManualUpdate,
          lastManualUpdateBy,
          daysSinceManualUpdate,
          lastSupplyLoading,
          lastSupplyLoadingBy,
          daysSinceSupplyLoading,
          // Real-time data placeholders - will be fetched dynamically
          manualUpdateDisplay: 'Loading...',
          supplyUpdateDisplay: 'Loading...'
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

  // Search logs with comprehensive filters
  const searchLogsWithFilters = async () => {
    try {
      setIsSearchingLogs(true);
      console.log('🔍 Searching warehouse logs with filters:', logsSearchFilters);
      
      const startDate = logsSearchFilters.startDate ? new Date(logsSearchFilters.startDate) : null;
      const endDate = logsSearchFilters.endDate ? new Date(logsSearchFilters.endDate) : null;
      
      if (endDate) {
        endDate.setHours(23, 59, 59, 999); // End of day
      }
      
      // Build Firestore query constraints (where clauses must come before orderBy)
      let constraints: any[] = [];
      
      // Add date filtering at the query level for efficiency
      if (startDate) {
        constraints.push(where('updatedAt', '>=', startDate));
      }
      if (endDate) {
        constraints.push(where('updatedAt', '<=', endDate));
      }
      
      // Add ordering and limit after where clauses
      constraints.push(orderBy('updatedAt', 'desc'));
      constraints.push(limit(200));
      
      // Fetch logs from Firebase
      const tankUpdateLogsRef = collection(db, 'tankUpdateLogs');
      const q = query(tankUpdateLogsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      let allLogs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as UpdateLog));
      
      console.log(`📋 Fetched ${allLogs.length} logs from Firebase`);
      
      // Apply user branch filtering for restricted warehouse users
      if (isRestrictedUser && userBranchIds.length > 0) {
        const userBranchNames = branches
          .filter(b => userBranchIds.includes(b.id))
          .map(b => b.name);
        
        allLogs = allLogs.filter(log => 
          userBranchNames.includes(log.branchName)
        );
        
        console.log(`🔒 Filtered to ${allLogs.length} logs for assigned branches:`, userBranchNames);
      }
      
      // Apply additional filters
      let filteredLogs = allLogs;
      
      // Branch filter
      if (logsSearchFilters.branch) {
        const selectedBranch = branches.find(b => b.id === logsSearchFilters.branch);
        if (selectedBranch) {
          filteredLogs = filteredLogs.filter(log => 
            log.branchName === selectedBranch.name
          );
        }
      }
      
      // Oil type filter  
      if (logsSearchFilters.oilType) {
        const selectedOilType = oilTypes.find(ot => ot.id === logsSearchFilters.oilType);
        if (selectedOilType) {
          filteredLogs = filteredLogs.filter(log => 
            log.oilTypeName === selectedOilType.name
          );
        }
      }
      
      // User filter (updated by)
      if (logsSearchFilters.user) {
        const searchTerm = logsSearchFilters.user.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          log.updatedBy?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Text search in notes/reason
      if (logsSearchFilters.searchText) {
        const searchTerm = logsSearchFilters.searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log =>
          (log.notes?.toLowerCase().includes(searchTerm)) ||
          (log.reason?.toLowerCase().includes(searchTerm)) ||
          (log.branchName?.toLowerCase().includes(searchTerm)) ||
          (log.oilTypeName?.toLowerCase().includes(searchTerm)) ||
          (log.updatedBy?.toLowerCase().includes(searchTerm))
        );
      }
      
      // Sort by most recent first
      filteredLogs.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setSearchLogs(filteredLogs);
      setHasSearchedLogs(true);
      
      toast({
        title: "Search Complete",
        description: `Found ${filteredLogs.length} log entries`,
      });
      
      console.log(`✅ Log search completed: ${filteredLogs.length} results`);
      
    } catch (error) {
      console.error('❌ Error searching logs:', error);
      toast({
        title: "Search Error", 
        description: "Failed to search logs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingLogs(false);
    }
  };

  // Reset logs search
  const resetLogsSearch = () => {
    setSearchLogs([]);
    setHasSearchedLogs(false);
    setLogsSearchFilters({
      startDate: '',
      endDate: '',
      branch: '',
      oilType: '',
      user: '',
      searchText: ''
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


  const downloadLogData = async (startDate?: string, endDate?: string) => {
    // Fetch ALL tank update logs directly from Firebase for CSV export (not limited to display data)
    let allTankLogs = [];
    try {
      const tankUpdateLogsRef = collection(db, 'tankUpdateLogs');
      const q = query(tankUpdateLogsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      allTankLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      console.log(`📊 Fetched ${allTankLogs.length} total tank update logs from Firebase`);
    } catch (error) {
      console.error('Error fetching all tank logs for CSV:', error);
      // Fallback to existing filtered data if fetch fails
      allTankLogs = getFilteredLogs();
    }

    let filteredData = allTankLogs;
    
    // Apply date range filter if specified
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include full end date
      
      filteredData = allTankLogs.filter(log => {
        const logDate = log.updatedAt ? 
          (log.updatedAt.toDate ? log.updatedAt.toDate() : new Date(log.updatedAt)) :
          new Date();
        return logDate >= start && logDate <= end;
      });
      
      console.log(`📊 Filtered to ${filteredData.length} logs in date range ${startDate} to ${endDate}`);
    } else if (logFilters.dateRange) {
      // Apply existing filter logic if no specific date range provided
      const now = new Date();
      let filterStartDate = new Date();
      
      switch (logFilters.dateRange) {
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
      
      filteredData = allTankLogs.filter(log => {
        const logDate = log.updatedAt ? 
          (log.updatedAt.toDate ? log.updatedAt.toDate() : new Date(log.updatedAt)) :
          new Date();
        return logDate >= filterStartDate;
      });
    }
    
    const csvContent = [
      ['Date & Time', 'Branch', 'Oil Type', 'Old Level (L)', 'New Level (L)', 'Change (L)', 'Updated By', 'Tank ID', 'Notes'].join(','),
      ...filteredData.map(log => {
        // Format date with time for better tracking
        const formattedDateTime = log.updatedAt ? 
          (log.updatedAt.toDate ? log.updatedAt.toDate().toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }) : new Date(log.updatedAt).toLocaleString('en-GB')) : 'Unknown';

        // Ensure Old Level shows the previous tank level (before the change)
        const oldLevel = log.previousLevel || log.oldLevel || 0;
        const newLevel = log.newLevel || 0;
        const changeAmount = newLevel - oldLevel;
        const changeFormatted = changeAmount >= 0 ? `+${changeAmount}` : `${changeAmount}`;

        return [
          formattedDateTime,                           // Date & Time with seconds
          log.branchName || 'Unknown Branch',         // Branch
          log.oilTypeName || 'Unknown Oil Type',      // Oil Type
          oldLevel,                                    // Old Level (L) - BEFORE the change
          newLevel,                                    // New Level (L) - AFTER the change
          changeFormatted,                             // Change (L) with +/- sign
          log.updatedBy || 'Unknown User',            // Updated By
          log.tankId || 'N/A',                        // Tank ID
          log.notes || 'N/A'                          // Notes
        ].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateRange = (startDate && endDate) ? `${startDate}_to_${endDate}` : (logFilters.dateRange || 'all');
    a.download = `tank_level_updates_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const exportedCount = filteredData.length;
    toast({
      title: "Tank Update Logs Downloaded",
      description: `Downloaded ${exportedCount} tank update log entries with complete change history`
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

  const handleUpdateDailyUsage = () => {
    setShowDailyUsageModal(true);
  };

  const downloadDailyUsageTemplate = () => {
    // CSV Template for Daily Usage Updates
    const csvContent = [
      ['Branch Name', 'Oil Type', 'MAD', 'Month', 'Year'].join(','),
      ...oilTanks.map(tank => [
        tank.branchName,
        tank.oilTypeName,
        '0', // Placeholder for Daily Usage value
        new Date().getMonth() + 1, // Current Month
        new Date().getFullYear()   // Current Year
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAD_Update_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Fill in the MAD values and upload the file",
    });
  };

  const handleProcessDailyUsageUpload = async () => {
    if (!dailyUsageUploadFile) {
      toast({
        title: "No File Selected",
        description: "Please select a MAD CSV file to upload",
        variant: "destructive"
      });
      return;
    }

    setDailyUsageProcessing(true);

    try {
      const text = await dailyUsageUploadFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      const requiredHeaders = ['Branch Name', 'Oil Type', 'MAD'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      let updatedCount = 0;
      const newOilTanks = [...oilTanks]; // Clone existing state
      const updatesByBranch: { [key: string]: { dailyUsage: number, oilTypeName: string }[] } = {};

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const row: {[key: string]: string} = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const branchName = row['Branch Name'];
        const oilTypeName = row['Oil Type'];
        const dailyUsageStr = row['MAD'];
        const dailyUsage = parseFloat(dailyUsageStr);

        if (!branchName || !oilTypeName || isNaN(dailyUsage)) {
          continue;
        }

        // Find matching tank in global state
        const tankIndex = newOilTanks.findIndex(t => 
          t.branchName === branchName && t.oilTypeName === oilTypeName
        );

        if (tankIndex !== -1) {
          const tank = newOilTanks[tankIndex];
          // Update the tank locally
          newOilTanks[tankIndex] = {
            ...tank,
            dailyUsage: dailyUsage
          };

          // Queue for Firestore update (Group by Branch ID)
          if (!updatesByBranch[tank.branchId]) {
            updatesByBranch[tank.branchId] = [];
          }
          
          updatesByBranch[tank.branchId].push({
             dailyUsage,
             oilTypeName: tank.oilTypeName
          });

          updatedCount++;
        }
      }

      // Optimize Firestore updates: Update each branch ONCE
      const branchIds = Object.keys(updatesByBranch);
      if (branchIds.length > 0) {
        toast({
          title: "Saving Updates",
          description: `Processing updates for ${updatedCount} tanks across ${branchIds.length} branches...`,
        });

        // Process branches in parallel
        await Promise.all(branchIds.map(async (branchId) => {
           try {
             const branchRef = doc(db, 'branches', branchId);
             const branchDoc = await getDoc(branchRef);
             
             if (!branchDoc.exists()) return;
             
             const branchData = branchDoc.data();
             const branchTanks = branchData.oilTanks || [];
             let branchUpdated = false;

             const updates = updatesByBranch[branchId];
             
             // Update the tanks in this branch
             const updatedBranchTanks = branchTanks.map((tank: any) => {
                const update = updates.find((u: any) => u.oilTypeName === (tank.oilTypeName || ''));
                if (update) {
                  branchUpdated = true;
                  return {
                    ...tank,
                    dailyUsage: update.dailyUsage
                  };
                }
                return tank;
             });

             if (branchUpdated) {
               await updateDoc(branchRef, {
                 oilTanks: updatedBranchTanks
               });
               console.log(`✅ Bulk updated Daily Usage for branch ${branchId}`);
             }

           } catch (err) {
             console.error(`Failed to update branch ${branchId}:`, err);
           }
        }));
      }

      setOilTanks(newOilTanks);

      toast({
        title: "MAD Update Successful",
        description: `Updated MAD for ${updatedCount} tanks.`,
        className: "bg-green-50 border-green-200 text-green-800"
      });
      setShowDailyUsageModal(false);

    } catch (error) {
      console.error('Daily Usage CSV processing error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to process CSV file",
        variant: "destructive"
      });
    } finally {
      setDailyUsageProcessing(false);
      setDailyUsageUploadFile(null);
    }
  };

  const handleSaveDailyUsageUrl = async () => {
    if (!dailyUsageFileUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL for the MAD file",
        variant: "destructive"
      });
      return;
    }

    try {
      await setDoc(doc(db, 'settings', 'warehouse'), {
        dailyUsageFileUrl: dailyUsageFileUrl
      }, { merge: true });

      toast({
        title: "MAD File Link Updated",
        description: "The link to the MAD file has been saved successfully.",
      });
      setShowDailyUsageModal(false);
    } catch (error) {
      console.error("Error saving daily usage URL:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save the URL. Please try again.",
        variant: "destructive"
      });
    }
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

  // Theme classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'night':
        return {
          background: 'bg-gray-900',
          header: 'bg-gray-800 border-gray-700',
          card: 'bg-gray-800 border-gray-700 text-white',
          text: 'text-white',
          secondaryText: 'text-gray-300',
          accent: 'text-blue-400'
        };
      case 'midday':
        return {
          background: 'bg-blue-50',
          header: 'bg-blue-100 border-blue-200',
          card: 'bg-white border-blue-200',
          text: 'text-gray-900',
          secondaryText: 'text-gray-600',
          accent: 'text-blue-600'
        };
      default: // light
        return {
          background: 'bg-gray-50',
          header: 'bg-white border-gray-200',
          card: 'bg-white border-gray-200',
          text: 'text-gray-900',
          secondaryText: 'text-gray-600',
          accent: 'text-blue-600'
        };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      {/* Header */}
      <div className={`${themeClasses.header} shadow-sm border-b`}>
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
                <h1 className={`text-xl font-bold ${themeClasses.text}`}>OneDelivery Warehouse</h1>
                <p className={`text-sm ${themeClasses.secondaryText}`}>Welcome, {user?.displayName || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadAllData();
                  fetchMonitoringDebugData();
                }}
                disabled={loading || monitoringLoading}
                className="flex items-center gap-2"
                title="Refresh all dashboard data"
              >
                <RefreshCwIcon className={`h-4 w-4 ${loading || monitoringLoading ? 'animate-spin' : ''}`} />
                {loading || monitoringLoading ? 'Loading...' : 'Refresh Data'}
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
        
        {/* Manual Refresh Notice */}
        {(!loading && branches.length === 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <RefreshCwIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Click "Refresh Data" to load dashboard information</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Data is loaded manually to optimize database usage and reduce costs.
            </p>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          {/* Mobile Tab Navigation - Scrollable */}
          <div className="block md:hidden">
            <TabsList className="flex w-full overflow-x-auto space-x-1 p-1">
              <TabsTrigger value="overview" className="flex items-center gap-1 whitespace-nowrap px-3 py-2">
                <TrendingUpIcon className="h-3 w-3" />
                <span className="text-xs">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="branches" className="flex items-center gap-1 whitespace-nowrap px-3 py-2">
                <BuildingIcon className="h-3 w-3" />
                <span className="text-xs">Stock</span>
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-1 whitespace-nowrap px-3 py-2">
                <AlertCircleIcon className="h-3 w-3" />
                <span className="text-xs">Monitor</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-1 whitespace-nowrap px-3 py-2">
                <ClipboardListIcon className="h-3 w-3" />
                <span className="text-xs">Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1 whitespace-nowrap px-3 py-2">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">Logs</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Desktop Tab Navigation - Grid Layout */}
          <div className="hidden md:block">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="branches" className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4" />
                Stock Update
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4" />
                Monitoring
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <ClipboardListIcon className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Update Logs
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Statistics Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Branch Update Summary Card - Using Monitoring Tab Logic */}
              {(() => {
                // Calculate branch statuses using the same logic as monitoring tab
                const calculateBranchStatuses = () => {
                  // Create hierarchical data structure (same as monitoring tab)
                  const branchData = new Map<string, {
                    branchName: string;
                    lastActivity: Date | null;
                    oilTypes: Map<string, {
                      oilTypeName: string;
                      manualUpdate: { updatedAt: string; updatedBy: string } | null;
                      supplyLoading: { createdAt: string; driverName: string } | null;
                    }>
                  }>();

                  // Process tank updates
                  updateLogs.forEach(tank => {
                    if (!branchData.has(tank.branchName)) {
                      branchData.set(tank.branchName, {
                        branchName: tank.branchName,
                        lastActivity: null,
                        oilTypes: new Map()
                      });
                    }
                    
                    const branch = branchData.get(tank.branchName)!;
                    if (!branch.oilTypes.has(tank.oilTypeName)) {
                      branch.oilTypes.set(tank.oilTypeName, {
                        oilTypeName: tank.oilTypeName,
                        manualUpdate: null,
                        supplyLoading: null
                      });
                    }
                    
                    const oilType = branch.oilTypes.get(tank.oilTypeName)!;
                    oilType.manualUpdate = {
                      updatedAt: tank.updatedAt,
                      updatedBy: tank.updatedBy
                    };
                  });

                  // Process transactions
                  recentTransactions.forEach(txn => {
                    if (!branchData.has(txn.branchName)) {
                      branchData.set(txn.branchName, {
                        branchName: txn.branchName,
                        lastActivity: null,
                        oilTypes: new Map()
                      });
                    }
                    
                    const branch = branchData.get(txn.branchName)!;
                    if (!branch.oilTypes.has(txn.oilTypeName)) {
                      branch.oilTypes.set(txn.oilTypeName, {
                        oilTypeName: txn.oilTypeName,
                        manualUpdate: null,
                        supplyLoading: null
                      });
                    }
                    
                    const oilType = branch.oilTypes.get(txn.oilTypeName)!;
                    oilType.supplyLoading = {
                      createdAt: txn.timestamp?.toDate ? txn.timestamp.toDate().toISOString() : (txn.timestamp || ''),
                      driverName: txn.driverName || ''
                    };
                  });

                  // Ensure all branches have all their configured oil types
                  branches.forEach(branchConfig => {
                    const branchOilTypes = oilTanks.filter(tank => tank.branchName === branchConfig.name);
                    
                    if (!branchData.has(branchConfig.name)) {
                      branchData.set(branchConfig.name, {
                        branchName: branchConfig.name,
                        lastActivity: null,
                        oilTypes: new Map()
                      });
                    }
                    
                    const branchDataEntry = branchData.get(branchConfig.name)!;
                    
                    branchOilTypes.forEach(tank => {
                      if (!branchDataEntry.oilTypes.has(tank.oilTypeName)) {
                        branchDataEntry.oilTypes.set(tank.oilTypeName, {
                          oilTypeName: tank.oilTypeName,
                          manualUpdate: null,
                          supplyLoading: null
                        });
                      }
                    });
                  });

                  // Filter branches for warehouse users
                  let filteredBranches = Array.from(branchData.values());
                  if (isRestrictedUser && userAssignedBranches.size > 0) {
                    filteredBranches = filteredBranches.filter(branch => 
                      userAssignedBranches.has(branch.branchName)
                    );
                  }

                  // Calculate status for each branch using monitoring tab logic
                  const branchStatuses = filteredBranches.map(branch => {
                    const getBranchStatus = (branch: any) => {
                      const now = new Date();
                      const oilTypesArray = Array.from(branch.oilTypes.values());
                      
                      let updatedOilTypes = 0;
                      let oldestUpdate: Date | null = null;
                      let newestUpdate: Date | null = null;
                      
                      oilTypesArray.forEach((oilType: any) => {
                        let lastUpdateMs = -Infinity;
                        
                        if (oilType.manualUpdate?.updatedAt) {
                          const manualMs = new Date(oilType.manualUpdate.updatedAt).getTime();
                          if (manualMs > lastUpdateMs) lastUpdateMs = manualMs;
                        }
                        
                        if (oilType.supplyLoading?.createdAt) {
                          const supplyMs = new Date(oilType.supplyLoading.createdAt).getTime();
                          if (supplyMs > lastUpdateMs) lastUpdateMs = supplyMs;
                        }
                        
                        if (Number.isFinite(lastUpdateMs)) {
                          const lastUpdateDate = new Date(lastUpdateMs);
                          updatedOilTypes++;
                          if (!oldestUpdate || lastUpdateDate < oldestUpdate) oldestUpdate = lastUpdateDate;
                          if (!newestUpdate || lastUpdateDate > newestUpdate) newestUpdate = lastUpdateDate;
                        }
                      });
                      
                      if (updatedOilTypes === 0) return 'red';
                      if (updatedOilTypes < oilTypesArray.length) return 'violet';
                      
                      const daysSinceOldest = oldestUpdate ? Math.floor((now.getTime() - (oldestUpdate as Date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
                      
                      if (daysSinceOldest > 7) return 'red';
                      else if (daysSinceOldest >= 2) return 'yellow';
                      else return 'green';
                    };

                    return {
                      branchName: branch.branchName,
                      status: getBranchStatus(branch)
                    };
                  });

                  return branchStatuses;
                };

                const branchStatuses = calculateBranchStatuses();
                const needsAttention = branchStatuses.filter(b => b.status === 'red').length;
                const partiallyUpdated = branchStatuses.filter(b => b.status === 'violet').length;
                const needsUpdateSoon = branchStatuses.filter(b => b.status === 'yellow').length;
                const fullyUpdated = branchStatuses.filter(b => b.status === 'green').length;
                
                return (
                  <Card className={themeClasses.card}>
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm flex items-center gap-1 ${themeClasses.text}`}>
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
                        {needsUpdateSoon > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-yellow-700 font-medium">{needsUpdateSoon} needs attention soon</span>
                          </div>
                        )}
                        {partiallyUpdated > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                            <span className="text-violet-700 font-medium">{partiallyUpdated} partial updates</span>
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
                    <Card key={oilType.oilTypeName} className={themeClasses.card}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm flex items-center gap-1 ${themeClasses.text}`}>
                          <DropletIcon className="h-4 w-4 text-blue-600" />
                          {oilType.oilTypeName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className={`text-xs ${themeClasses.secondaryText} space-y-1`}>
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
                  <div className="flex gap-2">
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
                        {canUpdateMAD && (
                          <Button 
                            onClick={handleUpdateDailyUsage}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <RefreshCwIcon className="h-4 w-4" />
                            Update MAD
                          </Button>
                        )}
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
                    <div 
                      className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      onClick={() => setShowCsvUpload(!showCsvUpload)}
                    >
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          Upload from CSV File
                          {showCsvUpload ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </h3>
                        <p className="text-xs text-gray-600">Upload a CSV file to update multiple tank levels at once</p>
                      </div>
                    </div>
                    
                    {showCsvUpload && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
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
            
            {/* Branch Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search by branch name..."
                className="pl-9 bg-white"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid gap-4">
              {Object.entries(tanksByBranch)
                .filter(([branchName]) => 
                  branchName.toLowerCase().includes(stockSearchQuery.toLowerCase())
                )
                .map(([branchName, tanks]) => (
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
                        
                        // Format last update date - Check if tank has real update data
                        let lastUpdateText = '>1m Ago';
                        let lastUpdateColor = 'text-gray-400';
                        
                        // Check if tank actually has update data by verifying it's not a default/placeholder timestamp
                        const hasValidUpdateData = tank.lastUpdated && 
                          tank.lastUpdated !== null && 
                          (tank.lastUpdated.toDate || tank.lastUpdated !== 'Invalid Date');
                        
                        if (hasValidUpdateData) {
                          try {
                            const lastUpdate = tank.lastUpdated.toDate ? tank.lastUpdated.toDate() : new Date(tank.lastUpdated);
                            
                            // Check if the date is valid and not a default placeholder
                            if (lastUpdate && !isNaN(lastUpdate.getTime())) {
                              const now = new Date();
                              const diffTime = now.getTime() - lastUpdate.getTime();
                              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                              const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                              const diffMinutes = Math.floor(diffTime / (1000 * 60));
                              
                              // Only show actual times if the update is real (not older than 180 days which indicates placeholder)
                              if (diffDays <= 180) {
                                if (diffDays > 0) {
                                  lastUpdateText = `${diffDays}d ago`;
                                  lastUpdateColor = diffDays > 7 ? 'text-red-600' : diffDays > 1 ? 'text-yellow-600' : 'text-green-600';
                                } else if (diffHours > 0) {
                                  lastUpdateText = `${diffHours}h ago`;
                                  lastUpdateColor = 'text-green-600';
                                } else if (diffMinutes > 0) {
                                  lastUpdateText = `${diffMinutes}m ago`;
                                  lastUpdateColor = 'text-green-600';
                                } else {
                                  lastUpdateText = 'Just now';
                                  lastUpdateColor = 'text-green-600';
                                }
                              }
                            }
                          } catch (e) {
                            // If there's an error parsing the date, treat as no data
                            lastUpdateText = '>1m Ago';
                            lastUpdateColor = 'text-gray-400';
                          }
                        }
                        
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
                            {/* Last Update Information */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-500">Last updated:</span>
                                <span className={`font-medium ${lastUpdateColor}`}>{lastUpdateText}</span>
                              </div>
                              {tank.dailyUsage && tank.dailyUsage > 0 && (
                                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  Stock Month: {(tank.currentLevel / tank.dailyUsage).toFixed(2)}
                                </div>
                              )}
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

          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="tracking" className="space-y-4">



            {/* Error Display */}
            {monitoringError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="font-medium">Error:</span> {monitoringError}
                </div>
              </div>
            )}

            {/* Status Legend */}
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="font-medium text-gray-700">Status Legend:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                    <span className="text-green-700">0-1 days (Current)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                    <span className="text-yellow-700">2-7 days (Needs attention)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                    <span className="text-red-700">&gt;7 days (Urgent)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-violet-100 border border-violet-200 rounded"></div>
                    <span className="text-violet-700">Partially updated</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={themeClasses.card}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-base flex items-center gap-2 ${themeClasses.text}`}>
                  <AlertCircleIcon className="h-4 w-4 text-blue-600" />
                  Branch Stock Update Tracking
                </CardTitle>
                <p className={`text-sm ${themeClasses.secondaryText}`}>
                  Detailed tank-level update status for each branch. Shows which specific tanks have been updated recently with manual adjustments and supply/loading activities.
                </p>
              </CardHeader>
              <CardContent>
                {monitoringLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600">Loading monitoring data...</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(() => {
                      // Create hierarchical data structure
                      const branchData = new Map<string, {
                        branchName: string;
                        lastActivity: Date | null;
                        oilTypes: Map<string, {
                          oilTypeName: string;
                          manualUpdate: { updatedAt: string; updatedBy: string } | null;
                          supplyLoading: { createdAt: string; driverName: string } | null;
                        }>
                      }>();
                      
                      // Process tank updates
                      tankUpdateRows.forEach(tank => {
                        if (!branchData.has(tank.branchName)) {
                          branchData.set(tank.branchName, {
                            branchName: tank.branchName,
                            lastActivity: null,
                            oilTypes: new Map()
                          });
                        }
                        
                        const branch = branchData.get(tank.branchName)!;
                        if (!branch.oilTypes.has(tank.oilTypeName)) {
                          branch.oilTypes.set(tank.oilTypeName, {
                            oilTypeName: tank.oilTypeName,
                            manualUpdate: null,
                            supplyLoading: null
                          });
                        }
                        
                        const oilType = branch.oilTypes.get(tank.oilTypeName)!;
                        oilType.manualUpdate = {
                          updatedAt: tank.updatedAt,
                          updatedBy: tank.updatedBy
                        };
                        
                        // Update last activity for branch
                        try {
                          const updateDate = new Date(tank.updatedAt);
                          if (!branch.lastActivity || updateDate > branch.lastActivity) {
                            branch.lastActivity = updateDate;
                          }
                        } catch (e) {}
                      });
                      
                      // Process transactions
                      transactionRows.forEach(txn => {
                        if (!branchData.has(txn.branchName)) {
                          branchData.set(txn.branchName, {
                            branchName: txn.branchName,
                            lastActivity: null,
                            oilTypes: new Map()
                          });
                        }
                        
                        const branch = branchData.get(txn.branchName)!;
                        if (!branch.oilTypes.has(txn.oilTypeName)) {
                          branch.oilTypes.set(txn.oilTypeName, {
                            oilTypeName: txn.oilTypeName,
                            manualUpdate: null,
                            supplyLoading: null
                          });
                        }
                        
                        const oilType = branch.oilTypes.get(txn.oilTypeName)!;
                        oilType.supplyLoading = {
                          createdAt: txn.createdAt,
                          driverName: txn.driverName
                        };
                        
                        // Update last activity for branch
                        try {
                          const txnDate = new Date(txn.createdAt);
                          if (!branch.lastActivity || txnDate > branch.lastActivity) {
                            branch.lastActivity = txnDate;
                          }
                        } catch (e) {}
                      });
                      
                      // Ensure all branches have all their configured oil types (even if no recent activity)
                      // This is important because oil types with no activity in last 30 days still need "Needs update" badge
                      branches.forEach(branchConfig => {
                        // For each configured branch, ensure all its oil types are represented
                        const branchOilTypes = oilTanks.filter(tank => tank.branchName === branchConfig.name);
                        
                        // Create branch entry if it doesn't exist
                        if (!branchData.has(branchConfig.name)) {
                          branchData.set(branchConfig.name, {
                            branchName: branchConfig.name,
                            lastActivity: null,
                            oilTypes: new Map()
                          });
                        }
                        
                        const branchDataEntry = branchData.get(branchConfig.name)!;
                        
                        branchOilTypes.forEach(tank => {
                          if (!branchDataEntry.oilTypes.has(tank.oilTypeName)) {
                            // Add oil type with no activity data (will show "Needs update")
                            branchDataEntry.oilTypes.set(tank.oilTypeName, {
                              oilTypeName: tank.oilTypeName,
                              manualUpdate: null,
                              supplyLoading: null
                            });
                            console.log(`➕ Added missing oil type ${tank.oilTypeName} for branch ${branchConfig.name} (no recent activity)`);
                          }
                        });
                      });
                      
                      // Filter branches based on user assignments (same logic as Stock Update tab)
                      let filteredBranches = Array.from(branchData.values());
                      
                      // Apply the same filtering logic as loadAllData function
                      if (isRestrictedUser && userAssignedBranches.size > 0) {
                        const originalCount = filteredBranches.length;
                        filteredBranches = filteredBranches.filter(branch => 
                          userAssignedBranches.has(branch.branchName)
                        );
                        console.log(`🔒 Monitoring filter: ${originalCount} → ${filteredBranches.length} branches (warehouse user assigned only)`);
                      } else if (user?.role === 'warehouse' && !isRestrictedUser) {
                        console.log(`⚠️ Warehouse user with no branch assignments`);
                      } else {
                        console.log(`👑 Admin/unrestricted user - showing all ${filteredBranches.length} branches`);
                      }
                      
                      // Sort by last activity
                      filteredBranches.sort((a, b) => {
                        if (!a.lastActivity && !b.lastActivity) return a.branchName.localeCompare(b.branchName);
                        if (!a.lastActivity) return 1;
                        if (!b.lastActivity) return -1;
                        return b.lastActivity.getTime() - a.lastActivity.getTime();
                      });

                      if (filteredBranches.length === 0) {
                        return (
                          <div className="col-span-full text-center py-8 text-gray-500">
                            No branch data available for monitoring
                          </div>
                        );
                      }

                      return filteredBranches.map(branch => {
                        const oilTypesArray = Array.from(branch.oilTypes.values());
                        
                        // Calculate branch status based on last updates
                        const getBranchStatus = (branch: any) => {
                          const now = new Date();
                          const oilTypesArray = Array.from(branch.oilTypes.values());
                          
                          // Track update status for each oil type
                          let updatedOilTypes = 0;
                          let oldestUpdate: Date | null = null;
                          let newestUpdate: Date | null = null;
                          
                          oilTypesArray.forEach((oilType: any) => {
                            let lastUpdateMs = -Infinity;
                            
                            // Check manual update
                            if (oilType.manualUpdate?.updatedAt) {
                              const manualMs = new Date(oilType.manualUpdate.updatedAt).getTime();
                              if (manualMs > lastUpdateMs) lastUpdateMs = manualMs;
                            }
                            
                            // Check supply activity
                            if (oilType.supplyLoading?.createdAt) {
                              const supplyMs = new Date(oilType.supplyLoading.createdAt).getTime();
                              if (supplyMs > lastUpdateMs) lastUpdateMs = supplyMs;
                            }
                            
                            if (Number.isFinite(lastUpdateMs)) {
                              const lastUpdateDate = new Date(lastUpdateMs);
                              updatedOilTypes++;
                              if (!oldestUpdate || lastUpdateDate < oldestUpdate) oldestUpdate = lastUpdateDate;
                              if (!newestUpdate || lastUpdateDate > newestUpdate) newestUpdate = lastUpdateDate;
                            }
                          });
                          
                          // If no updates at all
                          if (updatedOilTypes === 0) {
                            return { status: 'red', color: 'bg-red-50 border-red-200', textColor: 'text-red-800' };
                          }
                          
                          // If partially updated (some oil types have no updates)
                          if (updatedOilTypes < oilTypesArray.length) {
                            return { status: 'violet', color: 'bg-violet-50 border-violet-200', textColor: 'text-violet-800' };
                          }
                          
                          // Use oldest update to determine overall status
                          const daysSinceOldest = oldestUpdate ? Math.floor((now.getTime() - (oldestUpdate as Date).getTime()) / (1000 * 60 * 60 * 24)) : 999;
                          
                          if (daysSinceOldest > 7) {
                            return { status: 'red', color: 'bg-red-50 border-red-200', textColor: 'text-red-800' };
                          } else if (daysSinceOldest >= 2) {
                            return { status: 'yellow', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-800' };
                          } else {
                            return { status: 'green', color: 'bg-green-50 border-green-200', textColor: 'text-green-800' };
                          }
                        };
                        
                        const branchStatus = getBranchStatus(branch);
                        
                        return (
                          <div key={branch.branchName} className={`${branchStatus.color} rounded-lg p-4 transition-colors`}>
                            <div className="mb-3">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium ${branchStatus.textColor} text-sm`}>{branch.branchName}</h3>
                                {branchStatus.status === 'red' && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                    Needs attention
                                  </span>
                                )}
                                {branchStatus.status === 'violet' && (
                                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                                    Partially updated
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {branch.lastActivity ? `Last activity: ${branch.lastActivity.toLocaleDateString()}` : 'No recent activity'}
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              {oilTypesArray.map((oilType, index) => {
                                // Check if this oil type needs attention (no manual updates OR >7 days since manual update)
                                const getOilTypeStatus = (oilType: any) => {
                                  const now = new Date();
                                  
                                  // Check if there's a manual update
                                  if (!oilType.manualUpdate?.updatedAt) {
                                    // No manual updates at all - needs attention regardless of supply activity
                                    return 'red';
                                  }
                                  
                                  // Check how old the manual update is
                                  const manualDate = new Date(oilType.manualUpdate.updatedAt);
                                  const daysSinceManualUpdate = Math.floor((now.getTime() - manualDate.getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  return daysSinceManualUpdate > 7 ? 'red' : 'normal';
                                };
                                
                                const oilTypeStatus = getOilTypeStatus(oilType);
                                
                                return (
                                  <div key={oilType.oilTypeName} className={`text-xs ${oilTypeStatus === 'red' ? 'bg-red-50 border border-red-200 rounded p-2' : ''}`}>
                                    <div className={`font-medium mb-1 flex items-center gap-2 ${oilTypeStatus === 'red' ? 'text-red-700' : 'text-gray-700'}`}>
                                      <span>#{index + 1} {oilType.oilTypeName}</span>
                                      {oilTypeStatus === 'red' && (
                                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                                          Needs update
                                        </span>
                                      )}
                                    </div>
                                  
                                    <div className="space-y-1 pl-2">
                                      {oilType.manualUpdate ? (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                          <span className="text-gray-600">
                                            Manual: {new Date(oilType.manualUpdate.updatedAt).toLocaleDateString()} by {oilType.manualUpdate.updatedBy}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                                          <span className="text-gray-400">No manual updates</span>
                                        </div>
                                      )}
                                      
                                      {oilType.supplyLoading ? (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                          <span className="text-gray-600">
                                            Supply: {new Date(oilType.supplyLoading.createdAt).toLocaleDateString()} by {oilType.supplyLoading.driverName}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                                          <span className="text-gray-400">No supply activity</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
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
                              onClick={() => setTransactionFilters({ type: '', branch: '', oilType: '', driver: '', dateRange: '' })}
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
                                onClick={() => setTransactionFilters({ type: '', branch: '', oilType: '', driver: '', dateRange: '' })}
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

          {/* Tank Update Logs Search Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-600" />
                    Search Tank Update Logs
                  </div>
                  {hasSearchedLogs && (
                    <Badge variant="secondary" className="text-sm">
                      {searchLogs.length} results
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Search tank level update logs with date range and filters. Logs are loaded only when searched to optimize performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Enhanced Search Interface */}
                <div className="space-y-4 mb-6">
                  {/* Quick Date Presets */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Quick Date Ranges</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setLogsSearchFilters(prev => ({ ...prev, startDate: today, endDate: today }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          const dateStr = yesterday.toISOString().split('T')[0];
                          setLogsSearchFilters(prev => ({ ...prev, startDate: dateStr, endDate: dateStr }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        Yesterday
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                          const weekEnd = new Date();
                          setLogsSearchFilters(prev => ({ 
                            ...prev, 
                            startDate: weekStart.toISOString().split('T')[0],
                            endDate: weekEnd.toISOString().split('T')[0]
                          }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        This Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                          const monthEnd = new Date();
                          setLogsSearchFilters(prev => ({ 
                            ...prev, 
                            startDate: monthStart.toISOString().split('T')[0],
                            endDate: monthEnd.toISOString().split('T')[0]
                          }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        This Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const lastWeekStart = new Date(today.setDate(today.getDate() - today.getDay() - 7));
                          const lastWeekEnd = new Date(today.setDate(today.getDate() + 6));
                          setLogsSearchFilters(prev => ({ 
                            ...prev, 
                            startDate: lastWeekStart.toISOString().split('T')[0],
                            endDate: lastWeekEnd.toISOString().split('T')[0]
                          }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        Last Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                          setLogsSearchFilters(prev => ({ 
                            ...prev, 
                            startDate: lastMonthStart.toISOString().split('T')[0],
                            endDate: lastMonthEnd.toISOString().split('T')[0]
                          }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const last7Days = new Date();
                          last7Days.setDate(today.getDate() - 7);
                          setLogsSearchFilters(prev => ({ 
                            ...prev, 
                            startDate: last7Days.toISOString().split('T')[0],
                            endDate: today.toISOString().split('T')[0]
                          }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        Last 7 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const today = new Date();
                          const last30Days = new Date();
                          last30Days.setDate(today.getDate() - 30);
                          setLogsSearchFilters(prev => ({ 
                            ...prev, 
                            startDate: last30Days.toISOString().split('T')[0],
                            endDate: today.toISOString().split('T')[0]
                          }));
                        }}
                        className="text-xs hover:bg-purple-100 border-purple-300"
                      >
                        Last 30 Days
                      </Button>
                    </div>
                  </div>

                  {/* Date Range and Primary Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">From Date</label>
                      <input
                        type="date"
                        className="w-full text-sm border rounded px-3 py-2 bg-white"
                        value={logsSearchFilters.startDate}
                        onChange={(e) => setLogsSearchFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        placeholder="Start date"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">To Date</label>
                      <input
                        type="date"
                        className="w-full text-sm border rounded px-3 py-2 bg-white"
                        value={logsSearchFilters.endDate}
                        onChange={(e) => setLogsSearchFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        placeholder="End date"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Branch</label>
                      <select 
                        className="w-full text-sm border rounded px-3 py-2 bg-white"
                        value={logsSearchFilters.branch}
                        onChange={(e) => setLogsSearchFilters(prev => ({ ...prev, branch: e.target.value }))}
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
                        className="w-full text-sm border rounded px-3 py-2 bg-white"
                        value={logsSearchFilters.oilType}
                        onChange={(e) => setLogsSearchFilters(prev => ({ ...prev, oilType: e.target.value }))}
                      >
                        <option value="">All Oil Types</option>
                        {oilTypes.map((oilType) => (
                          <option key={oilType.id} value={oilType.id}>{oilType.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Secondary Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Updated By User</label>
                      <input
                        type="text"
                        className="w-full text-sm border rounded px-3 py-2 bg-white"
                        placeholder="Filter by user who made the update..."
                        value={logsSearchFilters.user}
                        onChange={(e) => setLogsSearchFilters(prev => ({ ...prev, user: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Search Text</label>
                      <input
                        type="text"
                        className="w-full text-sm border rounded px-3 py-2 bg-white"
                        placeholder="Search in notes, reason, branch, oil type..."
                        value={logsSearchFilters.searchText}
                        onChange={(e) => setLogsSearchFilters(prev => ({ ...prev, searchText: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Search Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={searchLogsWithFilters}
                      disabled={isSearchingLogs}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-testid="button-search-logs"
                    >
                      {isSearchingLogs ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search Logs
                        </>
                      )}
                    </Button>
                    
                    {hasSearchedLogs && (
                      <Button
                        variant="outline"
                        onClick={resetLogsSearch}
                        className="border-gray-300"
                        data-testid="button-reset-search"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Search
                      </Button>
                    )}

                    {searchLogs.length > 0 && (
                      <Button 
                        variant="outline"
                        onClick={() => downloadLogData(logsSearchFilters.startDate, logsSearchFilters.endDate)}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        disabled={!logsSearchFilters.startDate || !logsSearchFilters.endDate}
                      >
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Export CSV ({searchLogs.length})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {(() => {
                  if (!hasSearchedLogs) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">Search Tank Update Logs</h3>
                        <p className="mb-4">Enter search criteria above and click "Search Logs" to find specific log entries.</p>
                        <p className="text-sm text-gray-400">
                          Tip: Use date ranges for better performance and more targeted results
                        </p>
                      </div>
                    );
                  }

                  if (searchLogs.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No logs found matching your search criteria.</p>
                        <p className="text-sm mt-2">Try adjusting your filters or expanding the date range.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          Found {searchLogs.length} log entries
                          {logsSearchFilters.startDate && logsSearchFilters.endDate && (
                            <span> from {logsSearchFilters.startDate} to {logsSearchFilters.endDate}</span>
                          )}
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
                        {searchLogs.map((log) => (
                          <div key={log.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {log.branchName || 'Unknown Branch'} • {log.oilTypeName || 'Unknown Oil Type'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Level Change: {log.oldLevel || 0}L → {log.newLevel || 0}L 
                                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                                        (log.newLevel || 0) > (log.oldLevel || 0) 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {(log.newLevel || 0) > (log.oldLevel || 0) ? '+' : ''}{((log.newLevel || 0) - (log.oldLevel || 0))}L
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Updated by: {log.updatedBy || 'Unknown User'}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {log.updatedAt ? (
                                      log.updatedAt.toDate ? 
                                        log.updatedAt.toDate().toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }) :
                                        new Date(log.updatedAt).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                    ) : 'Unknown date'}
                                  </div>
                                  {log.photos && Object.keys(log.photos).length > 0 && (
                                    <Badge variant="outline" className="text-xs px-2">
                                      <ImageIcon className="h-3 w-3 mr-1" />
                                      {Object.keys(log.photos).length} photo{Object.keys(log.photos).length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>

                                {(log.notes || log.reason) && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    {log.reason && (
                                      <div><span className="font-medium">Reason:</span> {log.reason}</div>
                                    )}
                                    {log.notes && (
                                      <div><span className="font-medium">Notes:</span> {log.notes}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setShowLogModal(true);
                                }}
                                className="flex items-center gap-1 ml-4"
                                data-testid={`button-view-log-${log.id}`}
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
                {(selectedTransaction.loadSessionId || selectedTransaction.deliveryOrderId) && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                    <p className="font-medium text-sm text-gray-900">
                      {selectedTransaction.loadSessionId || selectedTransaction.deliveryOrderId}
                    </p>
                  </div>
                )}
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

      {/* MAD Update Modal */}
      <Dialog open={showDailyUsageModal} onOpenChange={setShowDailyUsageModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCwIcon className="h-5 w-5 text-blue-600" />
              Update MAD Configuration
            </DialogTitle>
            <DialogDescription>
              Manage MAD values via template upload or update the master file link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. Download Template Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <div className="bg-blue-100 p-1 rounded">
                  <DownloadIcon className="h-4 w-4 text-blue-600" />
                </div>
                1. Download Template
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Download the current MAD configuration template to make updates offline.
              </p>
              <Button 
                onClick={downloadDailyUsageTemplate} 
                variant="outline" 
                className="w-full sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download MAD Template
              </Button>
            </div>

            {/* 2. Upload Template Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <div className="bg-green-100 p-1 rounded">
                  <Upload className="h-4 w-4 text-green-600" />
                </div>
                2. Upload MAD Template
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Upload the filled template to update MAD values in the system.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setDailyUsageUploadFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                <Button 
                  onClick={handleProcessDailyUsageUpload}
                  disabled={!dailyUsageUploadFile || dailyUsageProcessing}
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  {dailyUsageProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Upload & Update
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 3. Update File Link Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <div className="bg-purple-100 p-1 rounded">
                  <Edit className="h-4 w-4 text-purple-600" />
                </div>
                3. Update MAD File Link
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Update the link to the master MAD document (e.g., Google Sheet).
              </p>
              <div className="space-y-3">
                <Label htmlFor="daily-usage-url" className="sr-only">MAD File URL</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    id="daily-usage-url"
                    placeholder="https://docs.google.com/..."
                    value={dailyUsageFileUrl}
                    onChange={(e) => setDailyUsageFileUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSaveDailyUsageUrl}
                    variant="default"
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Link
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 4. Schedule Auto Update */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <div className="bg-orange-100 p-1 rounded">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                4. Set Monthly Schedule
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Choose the day and time each month when the app should auto-update MAD using the configured file link.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-xs mb-1 block">Day of Month</Label>
                  <select
                    value={madScheduleDayOfMonth ?? ''}
                    onChange={(e) => setMadScheduleDayOfMonth(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:border-transparent border-gray-300 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <Label className="text-xs mb-1 block">Time</Label>
                  <Input
                    type="time"
                    value={madScheduleTime}
                    onChange={(e) => setMadScheduleTime(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button 
                    onClick={handleSaveMadSchedule}
                    variant="default"
                    className="w-full sm:w-auto"
                    disabled={madScheduleDayOfMonth == null || !madScheduleTime}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Schedule
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                The update runs when the app detects the scheduled time this month and the link is accessible. If the selected day does not exist in a month, it runs on the last day of that month.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDailyUsageModal(false)}>
              Close
            </Button>
          </DialogFooter>
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
                  <p className="text-sm font-medium">{selectedLog.previousLevel || selectedLog.oldLevel || 0}L</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Level</label>
                  <p className="text-sm font-medium">{selectedLog.newLevel || 0}L</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Change</label>
                  <p className="text-sm font-medium">
                    {(() => {
                      const oldLevel = selectedLog.previousLevel || selectedLog.oldLevel || 0;
                      const newLevel = selectedLog.newLevel || 0;
                      const change = newLevel - oldLevel;
                      return `${change >= 0 ? '+' : ''}${change}L`;
                    })()}
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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  FuelIcon,
  LogOutIcon, 
  DropletIcon, 
  CameraIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ImageIcon,
  ClipboardListIcon,
  BarChart3Icon,
  GaugeIcon,
  MonitorIcon,
  PlusIcon,
  SendIcon,
  CalendarIcon,
  ActivityIcon,
  PhoneIcon,
  TrashIcon,
  MapPinIcon,
  ClockIcon,
  EyeIcon,
  Calendar,
  HistoryIcon,
  Zap,
  MessageSquareIcon,
  XIcon,
  GalleryVerticalIcon
} from "lucide-react";
import { 
  getActiveBranchesOnly,
  getAllOilTypes,
  getAllComplaints,
  createComplaint,
  uploadPhoto,
  getAllTransactions,
  updateOilTankLevel,
  getOilTanksForBranches,
  createSampleTanks,
  fixExistingTankCapacities,
  subscribeToTankUpdates
} from "@/lib/firebase";
import { collection, doc, getDocs, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function to add watermarks to File objects
const addWatermarkToImage = async (file: File, watermarkText: string): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx!.drawImage(img, 0, 0);
        
        // Set up text styling
        const fontSize = Math.max(16, canvas.width * 0.03);
        ctx!.font = `bold ${fontSize}px Arial`;
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx!.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx!.lineWidth = 2;
        
        // Position text at bottom-left with padding
        const x = 20;
        const y = canvas.height - 20;
        
        // Draw text with outline
        ctx!.strokeText(watermarkText, x, y);
        ctx!.fillText(watermarkText, x, y);
        
        // Convert to blob and create File
        canvas.toBlob((blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(watermarkedFile);
          } else {
            reject(new Error('Failed to create watermarked image blob'));
          }
        }, 'image/jpeg', 0.9);
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image for watermarking'));
    img.src = URL.createObjectURL(file);
  });
};
import { useToast } from "@/hooks/use-toast";

// Helper function to format complaint dates consistently
const formatComplaintDate = (date: any, dateOnly: boolean = false) => {
  if (!date) return 'Unknown date';
  
  let d: Date;
  try {
    if (typeof date === 'string') {
      d = new Date(date);
    } else if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firebase Timestamp
      d = date.toDate();
    } else if (date.seconds) {
      // Handle Firebase Timestamp object with seconds property
      d = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      d = date;
    } else {
      return 'Invalid Date';
    }
    
    if (!d || isNaN(d.getTime())) return 'Invalid Date';
    
    if (dateOnly) {
      return d.toLocaleDateString();
    } else {
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Invalid Date';
  }
};

interface Branch {
  id: string;
  name: string;
  location: string;
  address?: string;
  contactNo?: string;
  oilTanks?: OilTank[];
}

interface OilTank {
  id: string;
  branchId: string;
  capacity: number;
  oilTypeId: string;
  oilTypeName?: string;
  currentLevel: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Legacy timestamp fields (for backward compatibility)
  lastUpdated?: any;
  lastUpdatedBy?: string;
  // New separated timestamp fields
  lastAdjustmentAt?: any;
  lastAdjustmentByUser?: string;
  lastAdjustmentByRole?: string;
  lastMovementAt?: any;
  lastMovementByUser?: string;
  lastMovementByRole?: string;
}

interface OilType {
  id: string;
  name: string;
  code: string;
}

interface Transaction {
  id: string;
  branchId: string;
  branchName?: string;
  oilTypeId: string;
  oilTypeName?: string;
  quantity: number;
  type: 'loading' | 'delivery' | 'supply';
  createdAt: Date;
  driverName?: string;
  photos?: string[];
}

interface TankUpdateData {
  tankId: string;
  branchId: string;
  newLevel: number;
  tankGaugePhoto?: File;
  systemScreenPhoto?: File;
  notes?: string;
}

interface Complaint {
  id: string;
  branchId: string;
  branchName: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  photos: string[];
  createdAt: Date;
  createdBy: string;
}

export default function BranchDashboard() {
  // Get current user from localStorage (matching the authentication system)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [oilTypes, setOilTypes] = useState<OilType[]>([]);
  const [oilTanks, setOilTanks] = useState<OilTank[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [selectedTank, setSelectedTank] = useState<OilTank | null>(null);
  
  const [updateData, setUpdateData] = useState<TankUpdateData>({
    tankId: '',
    branchId: '',
    newLevel: 0,
    notes: ''
  });

  const [updateStep, setUpdateStep] = useState<'branch' | 'tank' | 'gauge-photo' | 'quantity' | 'system-photo' | 'confirm'>('branch');
  const [selectedBranchForUpdate, setSelectedBranchForUpdate] = useState<string>('');
  const [selectedTankForUpdate, setSelectedTankForUpdate] = useState<string>('');
  const [gaugePhoto, setGaugePhoto] = useState<File | null>(null);
  const [systemPhoto, setSystemPhoto] = useState<File | null>(null);
  const [manualQuantity, setManualQuantity] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [isCreatingTanks, setIsCreatingTanks] = useState(false);
  const [myUpdateLogs, setMyUpdateLogs] = useState<any[]>([]);
  
  // Enhanced concurrent handling states
  const [realtimeTanks, setRealtimeTanks] = useState<any[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<any>(null);
  const [retryUpdateData, setRetryUpdateData] = useState<any>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, any>>(new Map());
  const [activeUsers, setActiveUsers] = useState<Map<string, string>>(new Map());
  const [showMyLogsDialog, setShowMyLogsDialog] = useState(false);
  const [allowGalleryAccess, setAllowGalleryAccess] = useState(true);

  const [complaintData, setComplaintData] = useState({
    branchId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    photos: [] as File[]
  });
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [showMyComplaintsDialog, setShowMyComplaintsDialog] = useState(false);
  const [userComplaints, setUserComplaints] = useState<any[]>([]);
  const [selectedComplaintForView, setSelectedComplaintForView] = useState<any>(null);
  const [showComplaintDetailsDialog, setShowComplaintDetailsDialog] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  
  // Transaction details modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, label: string} | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Load current user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      console.log('🔐 Branch Dashboard - Loaded user:', user.email, 'Role:', user.role, 'Branches:', user.branchIds);
    } else {
      // Redirect to login if no user found
      window.location.href = '/';
      return;
    }
  }, []);

  // Load system settings from Firebase
  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'systemSettings', 'general'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        setAllowGalleryAccess(settings.allowGalleryAccess !== false); // Default to true if not set
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      // Default to true if there's an error
      setAllowGalleryAccess(true);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData().then(() => {
        // Load user complaints after data is loaded
        loadUserComplaints();
      });
      loadMyUpdateLogs();
      // Load system settings
      loadSystemSettings();
    }
  }, [currentUser]);

  // Enhanced real-time tank updates with concurrent user support
  useEffect(() => {
    if (!branches.length) return;
    
    const unsubscribeFunctions: (() => void)[] = [];
    
    // Subscribe to tank updates for all branches
    branches.forEach((branch: any) => {
      const unsubscribe = subscribeToTankUpdates(branch.id, (updatedTanks) => {
        console.log(`🔄 Real-time tank update for branch ${branch.name}:`, updatedTanks);
        
        // Update oil tanks state with real-time data
        setOilTanks(prevTanks => {
          const newTanks = [...prevTanks];
          updatedTanks.forEach((updatedTank, index) => {
            const tankId = `${branch.id}_tank_${index}`;
            const existingIndex = newTanks.findIndex(tank => tank.id === tankId);
            
            if (existingIndex >= 0) {
              newTanks[existingIndex] = {
                ...newTanks[existingIndex],
                ...updatedTank,
                id: tankId,
                branchId: branch.id
              };
            }
          });
          
          return newTanks;
        });
        
        // Clear optimistic updates that are now confirmed
        setOptimisticUpdates(prev => {
          const newOptimistic = new Map(prev);
          updatedTanks.forEach((_, index) => {
            const tankId = `${branch.id}_tank_${index}`;
            newOptimistic.delete(tankId);
          });
          return newOptimistic;
        });
      });
      
      unsubscribeFunctions.push(unsubscribe);
    });
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [branches]);

  // Also load user complaints when global complaints data changes
  useEffect(() => {
    if (currentUser && complaints.length > 0) {
      loadUserComplaints();
    }
  }, [complaints, currentUser]);

  const loadData = async () => {
    if (!currentUser || !currentUser.branchIds || currentUser.branchIds.length === 0) {
      console.log('⚠️ No branches assigned to user:', currentUser?.email);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📊 Loading data for branches:', currentUser.branchIds);
      
      // PERFORMANCE OPTIMIZATION: Load all data in parallel instead of sequentially
      const [allBranches, allOilTypes, allTransactions, allComplaints] = await Promise.all([
        getActiveBranchesOnly(),
        getAllOilTypes(),
        getAllTransactions(),
        getAllComplaints()
      ]);

      // Filter branches for current user
      const userBranches = allBranches.filter((branch: any) => 
        currentUser.branchIds.includes(branch.id)
      );

      // Create Maps for O(1) lookups (performance optimization)
      const oilTypeMap = new Map(allOilTypes.map((ot: any) => [ot.id, ot]));
      const branchMap = new Map(userBranches.map((b: any) => [b.id, b]));

      // Process oil tanks from branches.oilTanks (embedded tanks)
      const tanksWithDetails: OilTank[] = [];
      userBranches.forEach((branch: any) => {
        if (branch.oilTanks && Array.isArray(branch.oilTanks)) {
          branch.oilTanks.forEach((tank: any, index: number) => {
            const oilType = oilTypeMap.get(tank.oilTypeId);
            tanksWithDetails.push({
              id: `${branch.id}_tank_${index}`,
              branchId: branch.id,
              ...tank,
              oilTypeName: oilType?.name || 'Unknown Oil Type',
              branchName: branch.name || 'Unknown Branch'
            });
          });
        }
      });

      // Process transactions with Map lookups - SORT BY LATEST FIRST
      const branchTransactions = allTransactions
        .filter((transaction: any) => currentUser.branchIds.includes(transaction.branchId))
        .sort((a: any, b: any) => {
          // Sort by timestamp descending (latest first)
          const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || a.createdAt);
          const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10) // Last 10 transactions
        .map((transaction: any) => {
          const branch = branchMap.get(transaction.branchId);
          const oilType = oilTypeMap.get(transaction.oilTypeId);
          return {
            ...transaction,
            branchName: branch?.name || 'Unknown Branch',
            oilTypeName: oilType?.name || 'Unknown Oil Type'
          };
        });

      // Process complaints
      const branchComplaints = allComplaints
        .filter((complaint: any) => currentUser.branchIds.includes(complaint.branchId))
        .map((complaint: any) => ({
          id: complaint.id || '',
          branchId: complaint.branchId || '',
          branchName: complaint.branchName || '',
          title: complaint.title || '',
          description: complaint.description || '',
          priority: complaint.priority || 'medium' as 'low' | 'medium' | 'high',
          status: complaint.status || 'open' as 'open' | 'in-progress' | 'resolved' | 'closed',
          photos: complaint.photos || [],
          createdAt: complaint.createdAt || new Date(),
          createdBy: complaint.createdBy || 'Unknown'
        }));

      // Update all state immediately with processed data
      setBranches(userBranches);
      setOilTypes(allOilTypes);
      setOilTanks(tanksWithDetails);
      setRecentTransactions(branchTransactions);
      setComplaints(branchComplaints);
      
      console.log('🔍 DATA SOURCE USED: branches.oilTanks (embedded tanks) instead of oilTanks collection');
      console.log('✅ Dashboard data loaded:', {
        branches: userBranches.length,
        tanks: tanksWithDetails.length,
        transactions: branchTransactions.length,
        complaints: branchComplaints.length
      });
      
    } catch (error) {
      console.error('Error loading branch data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load user's own update logs
  const loadMyUpdateLogs = async () => {
    try {
      if (!currentUser?.email) return;
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      // Use only where clause to avoid composite index requirement
      const q = query(
        collection(db, 'tankUpdateLogs'),
        where('updatedBy', '==', currentUser.displayName || currentUser.email)
      );
      
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }))
      // Sort in memory instead of using Firestore orderBy to avoid composite index
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
        const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      });
      
      // Keep only the last 10 logs (newest first)
      const recentLogs = logs.slice(0, 10);
      setMyUpdateLogs(recentLogs);
      console.log('📋 Loaded', recentLogs.length, 'recent update logs for user:', currentUser.email, `(${logs.length} total)`);
      console.log('📋 User update logs:', recentLogs.slice(0, 3)); // Log first 3 entries for debugging
    } catch (error) {
      console.error('Error loading user update logs:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  const createTanksForBranch = async (branchId: string) => {
    if (!oilTypes || oilTypes.length === 0) {
      toast({
        title: "Error",
        description: "No oil types found. Please contact administrator to set up oil types first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingTanks(true);
      console.log('Creating sample tanks for branch:', branchId);
      
      const createdTanks = await createSampleTanks(branchId, oilTypes);
      
      // Refresh the tank data
      await loadData();
      
      toast({
        title: "Success", 
        description: `Created ${createdTanks.length} oil tanks for the branch`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error creating tanks:', error);
      toast({
        title: "Error",
        description: "Failed to create tanks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTanks(false);
    }
  }

  const fixTankCapacities = async () => {
    try {
      console.log('Fixing tank capacities...');
      const updatedCount = await fixExistingTankCapacities();
      console.log(`✅ Fixed ${updatedCount} tank capacities`);
      return updatedCount;
    } catch (error) {
      console.error('Error fixing tank capacities:', error);
      throw error;
    }
  };

  // Helper function to determine tank level status based on current level vs capacity
  const getTankLevelStatus = (currentLevel: number, capacity: number) => {
    const percentage = (currentLevel / capacity) * 100;
    if (percentage < 20) return { status: 'critical', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' };
    if (percentage < 50) return { status: 'low', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' };
    return { status: 'normal', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' };
  };

  // Helper function to determine branch status based on tank updates (similar to warehouse dashboard)
  const getBranchUpdateStatus = () => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return branches.map(branch => {
      const branchTanks = oilTanks.filter(tank => tank.branchId === branch.id);
      
      // Calculate tank update status using transaction logs for accurate data
      const tankUpdateDetails = branchTanks.map(tank => {
        let lastAdjustment = null;
        let lastMovement = null;
        let daysSinceAdjustment = null;
        let daysSinceMovement = null;
        let lastAdjustmentBy = null;
        let lastMovementBy = null;
        let lastAdjustmentRole = null;
        let lastMovementRole = null;
        
        // Use transaction logs to get accurate movement vs adjustment data
        const tankId = `${tank.branchId}_tank_${tank.id.split('_tank_')[1] || '0'}`;
        
        // For now, use the existing tank timestamps but with corrected logic
        // In a future update, we can query transaction logs here for 100% accuracy
        
        // Handle manual adjustment timestamp (primary for staleness check)
        if (tank.lastAdjustmentAt) {
          lastAdjustment = tank.lastAdjustmentAt?.toDate ? tank.lastAdjustmentAt.toDate() : new Date(tank.lastAdjustmentAt);
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const adjustmentDate = new Date(lastAdjustment.getFullYear(), lastAdjustment.getMonth(), lastAdjustment.getDate());
          daysSinceAdjustment = Math.floor((nowDate.getTime() - adjustmentDate.getTime()) / (1000 * 60 * 60 * 24));
          lastAdjustmentBy = tank.lastAdjustmentByUser;
          lastAdjustmentRole = tank.lastAdjustmentByRole;
        }
        
        // Handle movement timestamp - only use if it's actually from a driver operation
        if (tank.lastMovementAt && tank.lastMovementByRole === 'driver') {
          lastMovement = tank.lastMovementAt?.toDate ? tank.lastMovementAt.toDate() : new Date(tank.lastMovementAt);
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const movementDate = new Date(lastMovement.getFullYear(), lastMovement.getMonth(), lastMovement.getDate());
          daysSinceMovement = Math.floor((nowDate.getTime() - movementDate.getTime()) / (1000 * 60 * 60 * 24));
          lastMovementBy = tank.lastMovementByUser;
          lastMovementRole = tank.lastMovementByRole;
        }
        
        // Fallback to legacy lastUpdated field ONLY for adjustment purposes
        if (!lastAdjustment && tank.lastUpdated) {
          const legacyUpdate = tank.lastUpdated?.toDate ? tank.lastUpdated.toDate() : new Date(tank.lastUpdated);
          lastAdjustment = legacyUpdate; // Treat as adjustment, not movement
          const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const updateDate = new Date(legacyUpdate.getFullYear(), legacyUpdate.getMonth(), legacyUpdate.getDate());
          daysSinceAdjustment = Math.floor((nowDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
          lastAdjustmentBy = tank.lastUpdatedBy || tank.updatedBy;
        }

        // Determine tank update status based on manual adjustments (not movements)
        let updateStatus = 'never';
        const referenceDate = lastAdjustment || lastMovement; // Prefer adjustment over movement
        const referenceDays = daysSinceAdjustment !== null ? daysSinceAdjustment : daysSinceMovement;
        
        if (referenceDate) {
          if (referenceDate > oneDayAgo) updateStatus = 'recent';
          else if (referenceDate > sevenDaysAgo) updateStatus = 'stale';
          else updateStatus = 'old';
        }

        return {
          ...tank,
          lastAdjustment,
          lastMovement,
          daysSinceAdjustment,
          daysSinceMovement,
          lastAdjustmentBy,
          lastMovementBy,
          lastAdjustmentRole,
          lastMovementRole,
          updateStatus,
          levelStatus: getTankLevelStatus(tank.currentLevel || 0, tank.capacity || 1),
          // Legacy field for backward compatibility
          lastUpdate: lastAdjustment || lastMovement,
          daysSinceUpdate: referenceDays
        };
      });

      // Determine overall branch status
      const outdatedTanks = tankUpdateDetails.filter(tank => tank.updateStatus === 'old' || tank.updateStatus === 'never');
      const upToDateTanks = tankUpdateDetails.filter(tank => tank.updateStatus === 'recent');
      
      let branchStatus = 'up-to-date';
      if (outdatedTanks.length === tankUpdateDetails.length) {
        branchStatus = 'needs-attention'; // All tanks outdated
      } else if (outdatedTanks.length > 0) {
        branchStatus = 'partially-updated'; // Some tanks outdated
      }

      return {
        ...branch,
        tankUpdateDetails,
        status: branchStatus,
        outdatedTanks: outdatedTanks.length,
        totalTanks: tankUpdateDetails.length
      };
    });
  };

  // Photo capture functions (same as oil supply process)
  const capturePhoto = (inputId: string, setPhoto: (file: File | null) => void, useCamera: boolean = false) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.accept = 'image/*';
      // Only set capture for camera mode, otherwise allow gallery selection
      if (useCamera) {
        input.capture = 'environment';
      } else {
        input.removeAttribute('capture');
      }
      input.click();
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          setPhoto(file);
        }
      };
    }
  };

  const captureComplaintPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = false;
    input.click();
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const newPhotos = [...capturedPhotos, file];
        setCapturedPhotos(newPhotos);
        setComplaintData(prev => ({ ...prev, photos: newPhotos }));
      }
    };
  };

  const removeComplaintPhoto = (index: number) => {
    const newPhotos = capturedPhotos.filter((_, i) => i !== index);
    setCapturedPhotos(newPhotos);
    setComplaintData(prev => ({ ...prev, photos: newPhotos }));
  };

  const loadUserComplaints = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 Loading complaints for user:', currentUser.uid, currentUser.email);
      const complaintsCollection = collection(db, 'complaints');
      
      // Try loading all complaints first, then filter client-side to avoid index issues
      const snapshot = await getDocs(complaintsCollection);
      const allComplaints = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📋 Total complaints in system:', allComplaints.length);
      console.log('📋 Sample complaint data:', allComplaints[0]);
      
      // Filter complaints for current user - check multiple possible field names
      // Only show active complaints (open, in-progress) - hide closed/completed/resolved
      const activeStatuses = ['open', 'in-progress', 'in_progress'];
      const userComplaints = allComplaints.filter((complaint: any) => {
        const isUserComplaint = (complaint.reportedBy === currentUser.uid || 
                                complaint.reportedByName === currentUser.displayName ||
                                complaint.reportedByName === currentUser.email ||
                                complaint.createdBy === currentUser.uid ||
                                complaint.createdBy === currentUser.displayName ||
                                complaint.createdBy === currentUser.email ||
                                // Also check if complaint is from user's branches (since user submitted it)
                                (currentUser.branchIds && currentUser.branchIds.includes(complaint.branchId)));
        
        const isActiveStatus = activeStatuses.includes(complaint.status?.toLowerCase()) || !complaint.status;
        
        return isUserComplaint && isActiveStatus;
      });
      
      // Sort by creation date (newest first)
      const sortedComplaints = userComplaints.sort((a: any, b: any) => {
        const getDate = (dateField: any) => {
          if (!dateField) return new Date(0);
          if (dateField.seconds) return new Date(dateField.seconds * 1000);
          if (dateField instanceof Date) return dateField;
          return new Date(dateField);
        };
        const dateA = getDate(a.createdAt);
        const dateB = getDate(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      setUserComplaints(sortedComplaints);
      console.log('📋 Loaded', sortedComplaints.length, 'complaints for user:', currentUser.email);
      console.log('📋 User complaints:', sortedComplaints);
    } catch (error) {
      console.error('Error loading user complaints:', error);
      console.log('📋 Available global complaints:', complaints.length);
      console.log('📋 Global complaints data:', complaints);
      
      // Try to get data from the global complaints state as fallback
      // Only show active complaints (open, in-progress) - hide closed/completed/resolved
      const activeStatuses = ['open', 'in-progress', 'in_progress'];
      const userFallbackComplaints = complaints.filter(complaint => {
        console.log('🔍 Checking complaint:', {
          id: complaint.id,
          branchId: complaint.branchId,
          status: complaint.status,
          reportedBy: complaint.reportedBy,
          reportedByName: complaint.reportedByName,
          createdBy: complaint.createdBy,
          currentUserId: currentUser.uid,
          currentUserName: currentUser.displayName,
          currentUserEmail: currentUser.email,
          currentUserBranches: currentUser.branchIds
        });
        
        const isUserComplaint = complaint.reportedBy === currentUser.uid ||
                                complaint.reportedByName === currentUser.displayName ||
                                complaint.reportedByName === currentUser.email ||
                                complaint.createdBy === currentUser.uid ||
                                complaint.createdBy === currentUser.displayName ||
                                complaint.createdBy === currentUser.email ||
                                // Also check if complaint is from user's branches (since user submitted it)
                                (currentUser.branchIds && currentUser.branchIds.includes(complaint.branchId));
        
        const isActiveStatus = activeStatuses.includes(complaint.status?.toLowerCase()) || !complaint.status;
        
        return isUserComplaint && isActiveStatus;
      });
      
      setUserComplaints(userFallbackComplaints);
      console.log('📋 Fallback: Loaded', userFallbackComplaints.length, 'complaints from global state');
    }
  };

  const addWatermarkToImage = (file: File, watermarkText: string): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        // Add watermark
        const fontSize = Math.max(16, img.width * 0.03);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        
        const text = watermarkText;
        const textMetrics = ctx.measureText(text);
        const x = img.width - textMetrics.width - 20;
        const y = img.height - 20;
        
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], file.name, { type: file.type });
            resolve(watermarkedFile);
          }
        }, file.type);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleStepNext = () => {
    switch (updateStep) {
      case 'branch':
        if (selectedBranchForUpdate) {
          setUpdateStep('tank');
        }
        break;
      case 'tank':
        if (selectedTankForUpdate) {
          setUpdateStep('gauge-photo');
        }
        break;
      case 'gauge-photo':
        if (gaugePhoto) {
          setUpdateStep('quantity');
        }
        break;
      case 'quantity':
        if (manualQuantity) {
          setUpdateStep('system-photo');
        }
        break;
      case 'system-photo':
        if (systemPhoto) {
          setUpdateStep('confirm');
        }
        break;
    }
  };

  const handleStepBack = () => {
    switch (updateStep) {
      case 'tank':
        setUpdateStep('branch');
        break;
      case 'gauge-photo':
        setUpdateStep('tank');
        break;
      case 'quantity':
        setUpdateStep('gauge-photo');
        break;
      case 'system-photo':
        setUpdateStep('quantity');
        break;
      case 'confirm':
        setUpdateStep('system-photo');
        break;
    }
  };

  // Enhanced tank update with concurrent user support and conflict resolution
  const handleSubmitTankUpdate = async () => {
    try {
      if (!selectedTankForUpdate || !manualQuantity || !gaugePhoto || !systemPhoto) {
        toast({
          title: "Error",
          description: "Please complete all steps before submitting",
          variant: "destructive"
        });
        return;
      }

      // Get selected tank details
      const selectedTank = oilTanks.find(tank => tank.id === selectedTankForUpdate);
      if (!selectedTank) {
        toast({
          title: "Error",
          description: "Selected tank not found. Please try selecting the tank again.",
          variant: "destructive"
        });
        return;
      }

      // VALIDATE CAPACITY LIMIT BEFORE PROCESSING
      const newLevel = parseFloat(manualQuantity);
      if (isNaN(newLevel) || newLevel < 0) {
        toast({
          title: "Invalid Quantity",
          description: "Please enter a valid positive number for the oil level",
          variant: "destructive"
        });
        return;
      }

      if (newLevel > selectedTank.capacity) {
        toast({
          title: "Capacity Exceeded",
          description: `Oil level (${newLevel.toLocaleString()}L) exceeds tank capacity (${selectedTank.capacity.toLocaleString()}L). Please enter a valid amount.`,
          variant: "destructive"
        });
        console.error('❌ Tank update blocked due to capacity violation:', {
          tankId: selectedTankForUpdate,
          newLevel,
          capacity: selectedTank.capacity,
          tank: selectedTank
        });
        return;
      }

      setLoading(true);
      console.log('🚀 Starting concurrent-safe tank update:', {
        tankId: selectedTankForUpdate,
        previousLevel: selectedTank.currentLevel,
        newLevel,
        capacity: selectedTank.capacity,
        user: currentUser.displayName || currentUser.email
      });

      // Apply optimistic update immediately
      const optimisticUpdate = {
        currentLevel: newLevel,
        lastUpdatedBy: currentUser.displayName || currentUser.email,
        lastUpdated: new Date(),
        updating: true
      };
      
      setOptimisticUpdates(prev => new Map(prev.set(selectedTankForUpdate, optimisticUpdate)));

      // Add watermarks to photos
      const timestamp = new Date().toLocaleString();
      const userInfo = `${currentUser.displayName || currentUser.email} - ${timestamp}`;
      
      const watermarkedGaugePhoto = await addWatermarkToImage(gaugePhoto, `Tank Gauge - ${userInfo}`);
      const watermarkedSystemPhoto = await addWatermarkToImage(systemPhoto, `System Screen - ${userInfo}`);

      // Upload photos
      const gaugePhotoUrl = await uploadPhoto(watermarkedGaugePhoto, `tank-updates/${selectedTankForUpdate}/gauge-${Date.now()}`);
      const systemPhotoUrl = await uploadPhoto(watermarkedSystemPhoto, `tank-updates/${selectedTankForUpdate}/system-${Date.now()}`);

      // Enhanced update data with concurrent handling
      const updateData = {
        currentLevel: newLevel,
        lastUpdatedBy: currentUser.displayName || currentUser.email,
        notes: updateNotes || '',
        tankGaugePhoto: gaugePhotoUrl,
        systemScreenPhoto: systemPhotoUrl,
        lastSeenUpdate: selectedTank.lastAdjustmentAt || selectedTank.lastMovementAt || selectedTank.lastUpdated,
        userRole: 'branch_user',
        expectedPreviousLevel: selectedTank.currentLevel,
        updateType: 'manual_with_photos',
        sessionId: `${currentUser.uid}_${Date.now()}`,
        userAgent: navigator.userAgent.substring(0, 100),
        concurrent: true
      };

      // Update tank level in database with concurrent support
      const result = await updateOilTankLevel(selectedTankForUpdate, updateData);

      // Clear optimistic update on success
      setOptimisticUpdates(prev => {
        const newOptimistic = new Map(prev);
        newOptimistic.delete(selectedTankForUpdate);
        return newOptimistic;
      });

      toast({
        title: "Success",
        description: `Tank level updated: ${result.levelDifference > 0 ? '+' : ''}${result.levelDifference}L with photo evidence`
      });

      // Reset dialog state
      setShowUpdateDialog(false);
      setUpdateStep('branch');
      setSelectedBranchForUpdate('');
      setSelectedTankForUpdate('');
      setGaugePhoto(null);
      setSystemPhoto(null);
      setManualQuantity('');
      setUpdateNotes('');
      
      // Log the successful update
      console.log('✅ Concurrent-safe tank update completed:', {
        tankId: selectedTankForUpdate,
        previousLevel: selectedTank.currentLevel,
        newLevel: result.newLevel,
        levelDifference: result.levelDifference,
        updateVersion: result.updateVersion,
        updatedBy: currentUser.displayName || currentUser.email,
        timestamp: new Date().toLocaleString(),
        photos: { gauge: gaugePhotoUrl, system: systemPhotoUrl }
      });
      
      // Load updated logs for user's viewing
      loadMyUpdateLogs();

    } catch (error: any) {
      console.error('Error updating tank:', error);
      
      // Clear optimistic update on error
      setOptimisticUpdates(prev => {
        const newOptimistic = new Map(prev);
        newOptimistic.delete(selectedTankForUpdate);
        return newOptimistic;
      });
      
      // Enhanced error handling for concurrent updates
      let errorMessage = "Failed to update tank level";
      let errorTitle = "Update Failed";
      let showRetryButton = false;

      if (error?.type === 'CONFLICT') {
        errorTitle = "Update Conflict";
        errorMessage = `Tank was updated by ${error.details?.serverUpdatedBy || 'another user'}. Current level: ${error.details?.serverLevel}L. Please refresh and try again.`;
        setConflictDetails(error.details);
        setRetryUpdateData({ 
          tankId: selectedTankForUpdate, 
          newLevel: parseFloat(manualQuantity),
          photos: { gauge: gaugePhoto, system: systemPhoto }
        });
        setConflictDialogOpen(true);
        return;
      } else if (error?.type === 'TRANSACTION_ABORTED') {
        errorTitle = "Concurrent Update";
        errorMessage = "Tank was being updated by another user. Would you like to retry?";
        showRetryButton = true;
      } else if (error?.message?.includes('permission-denied')) {
        errorTitle = "Permission Denied";
        errorMessage = "You don't have permission to update this tank. Please contact your administrator.";
      } else if (error?.message?.includes('not-found') || error?.message?.includes('Tank not found')) {
        errorTitle = "Tank Not Found";
        errorMessage = "The selected tank could not be found. Please refresh the page and try again.";
      } else if (error?.message?.includes('network') || error?.code === 'unavailable') {
        errorTitle = "Connection Error";
        errorMessage = "Network connection failed. Please check your internet connection and try again.";
        showRetryButton = true;
      } else if (error?.message?.includes('quota-exceeded')) {
        errorTitle = "Storage Limit Reached";
        errorMessage = "Photo storage limit exceeded. Please contact your administrator.";
      } else if (error?.message?.includes('invalid-argument')) {
        errorTitle = "Invalid Data";
        errorMessage = "The update data is invalid. Please check all fields and try again.";
      } else if (error?.message) {
        errorMessage = `Update failed: ${error.message}`;
      }

      const toastOptions: any = {
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      };

      if (showRetryButton) {
        toastOptions.action = {
          label: "Retry",
          onClick: () => handleSubmitTankUpdate()
        };
      }

      toast(toastOptions);

      // Log detailed error information for debugging
      console.error('❌ Tank update failed with detailed error:', {
        error: error.message || error,
        errorCode: error.code,
        errorType: error.type,
        tankId: selectedTankForUpdate,
        user: currentUser?.email,
        timestamp: new Date().toISOString(),
        conflictDetails: error.details
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComplaint = async () => {
    if (isSubmittingComplaint) return; // Prevent double submission

    try {
      setIsSubmittingComplaint(true);
      
      if (!complaintData.branchId || !complaintData.title || !complaintData.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Upload photos
      const photoUrls = [];
      for (const photo of complaintData.photos) {
        const url = await uploadPhoto(photo, 'complaints');
        photoUrls.push(url);
      }

      // Get branch name for the selected branch
      const selectedBranchName = branches.find(b => b.id === complaintData.branchId)?.name || '';
      const selectedBranchLocation = branches.find(b => b.id === complaintData.branchId)?.location || '';
      const fullBranchName = selectedBranchLocation ? `${selectedBranchName} - ${selectedBranchLocation}` : selectedBranchName;

      // Create complaint
      await createComplaint({
        branchId: complaintData.branchId,
        branchName: fullBranchName,
        title: complaintData.title,
        description: complaintData.description,
        priority: complaintData.priority,
        photos: photoUrls,
        reportedBy: currentUser.uid,
        reportedByName: currentUser.displayName || currentUser.email,
        status: 'open',
        createdAt: new Date()
      });

      // Refresh data
      await loadData();

      // Reset form
      setComplaintData({
        branchId: '',
        title: '',
        description: '',
        priority: 'medium',
        photos: []
      });
      setCapturedPhotos([]);
      setShowComplaintDialog(false);
      
      // Reload user complaints
      await loadUserComplaints();

      toast({
        title: "Success",
        description: "Complaint submitted successfully"
      });

    } catch (error) {
      console.error('Error creating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to submit complaint",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const openUpdateDialog = (tank: OilTank) => {
    setSelectedTank(tank);
    setUpdateData({
      tankId: tank.id,
      branchId: tank.branchId,
      newLevel: tank.currentLevel,
      notes: ''
    });
    setShowUpdateDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading branch dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/apple-touch-icon.png" 
                alt="OneDelivery Logo" 
                className="h-8 w-8 flex-shrink-0"
                onLoad={() => console.log('Branch: OneDelivery logo loaded successfully')}
                onError={(e) => {
                  console.error('Branch: OneDelivery logo failed to load, trying fallback');
                  const target = e.target as HTMLImageElement;
                  target.src = '/onedelivery-logo.png'; // Fallback to backup logo
                }}
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Branch Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Welcome, {currentUser.displayName || currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="hidden sm:flex px-2 py-1 text-xs">
                {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOutIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        {/* Quick Actions - Reorganized for Better Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-blue-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Essential daily operations and tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button 
                onClick={() => {
                  setShowUpdateDialog(true);
                  setUpdateStep('branch');
                  setSelectedBranchForUpdate('');
                  setSelectedTankForUpdate('');
                  setGaugePhoto(null);
                  setSystemPhoto(null);
                  setManualQuantity('');
                  setUpdateNotes('');
                }}
                className="h-16 bg-blue-600 hover:bg-blue-700 text-left justify-start px-4"
                disabled={oilTanks.length === 0}
              >
                <GaugeIcon className="h-6 w-6 mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Update Oil Level</div>
                  <div className="text-xs opacity-90 truncate">Tank level management</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => {
                  setComplaintData({
                    branchId: '',
                    title: '',
                    description: '',
                    priority: 'medium',
                    photos: []
                  });
                  setCapturedPhotos([]);
                  setShowComplaintDialog(true);
                }}
                variant="outline"
                className="h-16 border-orange-200 hover:bg-orange-50 text-left justify-start px-4"
                disabled={branches.length === 0}
              >
                <AlertTriangleIcon className="h-6 w-6 mr-3 flex-shrink-0 text-orange-600" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">Submit Complaint</div>
                  <div className="text-xs opacity-75 truncate">Report issues</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => setShowMyComplaintsDialog(true)}
                variant="outline"
                className="h-16 border-green-200 hover:bg-green-50 text-left justify-start px-4"
              >
                <MessageSquareIcon className="h-6 w-6 mr-3 flex-shrink-0 text-green-600" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">My Complaints ({userComplaints.length})</div>
                  <div className="text-xs opacity-75 truncate">View status & history</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => setShowMyLogsDialog(true)}
                variant="outline"
                className="h-16 border-purple-200 hover:bg-purple-50 text-left justify-start px-4"
              >
                <HistoryIcon className="h-6 w-6 mr-3 flex-shrink-0 text-purple-600" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">My Logs ({myUpdateLogs.length})</div>
                  <div className="text-xs opacity-75 truncate">Update history</div>
                </div>
              </Button>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    await fixTankCapacities();
                    await loadData();
                    await loadUserComplaints();
                  } catch (error) {
                    console.error('Error during refresh:', error);
                  } finally {
                    setLoading(false);
                  }
                }}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh All Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Branch Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Branch Management
                </CardTitle>
                <CardDescription>
                  Manage your oil delivery branches and tank capacities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {branches.length === 0 ? (
              <div className="text-center py-8">
                <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No branches assigned to your account</p>
                <p className="text-xs text-gray-500">Please contact an administrator to assign branches.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {getBranchUpdateStatus().map((branch) => {
                  // Determine branch styling based on update status
                  let branchCardClass = 'hover:shadow-lg transition-shadow';
                  let headerTextColor = 'text-gray-900';
                  let statusBadge = null;
                  
                  if (branch.status === 'needs-attention') {
                    branchCardClass = 'bg-red-50 border-red-400 shadow-red-100 hover:shadow-red-200 transition-shadow';
                    headerTextColor = 'text-red-800';
                    statusBadge = (
                      <Badge variant="destructive" className="text-xs">
                        Needs Attention ({branch.outdatedTanks} tanks)
                      </Badge>
                    );
                  } else if (branch.status === 'partially-updated') {
                    branchCardClass = 'bg-yellow-50 border-yellow-400 shadow-yellow-100 hover:shadow-yellow-200 transition-shadow';
                    headerTextColor = 'text-yellow-800';
                    statusBadge = (
                      <Badge variant="secondary" className="text-xs">
                        Partially Updated ({branch.outdatedTanks} tanks)
                      </Badge>
                    );
                  } else {
                    statusBadge = (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        Up to Date
                      </Badge>
                    );
                  }
                  
                  return (
                    <Card key={branch.id} className={branchCardClass}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <CardTitle className={`flex items-center gap-2 text-base sm:text-lg ${headerTextColor}`}>
                              <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                              <span className="truncate">{branch.name}</span>
                            </CardTitle>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{branch.location}</p>
                            {branch.contactNo && (
                              <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{branch.contactNo}</span>
                              </p>
                            )}
                            <div className="mt-2">
                              {statusBadge}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Oil Tanks ({branch.tankUpdateDetails.length})</h4>
                          {branch.tankUpdateDetails.length > 0 ? (
                            <div className="space-y-2">
                              {branch.tankUpdateDetails.map((tank, index) => {
                                const percentage = Math.round(((tank.currentLevel || 0) / (tank.capacity || 1)) * 100);
                                const progressBarColor = tank.levelStatus.color === 'red' ? 'bg-red-500' :
                                                        tank.levelStatus.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
                                
                                return (
                                  <div key={index} className={`p-2 sm:p-3 rounded-lg border ${tank.levelStatus.bgColor} ${tank.levelStatus.borderColor}`}>
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-sm font-medium truncate">{tank.oilTypeName}</p>
                                          <Badge 
                                            variant={tank.levelStatus.status === 'critical' ? 'destructive' : 
                                                    tank.levelStatus.status === 'low' ? 'secondary' : 'default'}
                                            className="text-xs px-1 py-0"
                                          >
                                            {tank.levelStatus.status === 'critical' ? 'Critical' :
                                             tank.levelStatus.status === 'low' ? 'Low' : 'Normal'}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                          Current Level: {tank.currentLevel?.toLocaleString() || '0'}L
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Capacity: {tank.capacity?.toLocaleString() || '0'}L
                                        </p>
                                        {/* Display separated timestamps: Manual Updates (primary) and Movements (secondary) */}
                                        <div className="mt-2 space-y-1">
                                          {/* Primary: Last Manual Update (adjustments) */}
                                          {tank.lastAdjustment ? (
                                            <div className={`text-xs flex items-center gap-1 ${
                                              (tank.daysSinceAdjustment ?? 999) === 0 ? 'text-green-600' :
                                              (tank.daysSinceAdjustment ?? 999) <= 1 ? 'text-green-600' :
                                              (tank.daysSinceAdjustment ?? 999) <= 7 ? 'text-yellow-600' : 'text-red-600 font-medium'
                                            }`}>
                                              <span className="font-medium">Last Manual Update:</span>
                                              <span>
                                                {(tank.daysSinceAdjustment ?? 999) === 0 ? 'Today' :
                                                 (tank.daysSinceAdjustment ?? 999) === 1 ? 'Yesterday' :
                                                 `${tank.daysSinceAdjustment} days ago`}
                                              </span>
                                              {tank.lastAdjustmentBy && (
                                                <span className="text-gray-500">by</span>
                                              )}
                                              {tank.lastAdjustmentBy && (
                                                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                                  {tank.lastAdjustmentRole === 'admin' ? '👑' : 
                                                   tank.lastAdjustmentRole === 'warehouse' ? '📦' : 
                                                   tank.lastAdjustmentRole === 'branch_user' ? '🏢' : ''}
                                                  {tank.lastAdjustmentBy.split(' ')[0]}
                                                </Badge>
                                              )}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-red-600 font-medium">
                                              <span className="font-medium">Last Manual Update:</span>
                                              <span className="ml-1">Never updated</span>
                                            </p>
                                          )}
                                          
                                          {/* Secondary: Last Movement (driver operations) */}
                                          {tank.lastMovement && (
                                            <div className="text-xs flex items-center gap-1 text-blue-600">
                                              <span className="font-medium">Last Movement:</span>
                                              <span>
                                                {tank.daysSinceMovement === 0 ? 'Today' :
                                                 tank.daysSinceMovement === 1 ? 'Yesterday' :
                                                 `${tank.daysSinceMovement} days ago`}
                                              </span>
                                              {tank.lastMovementBy && (
                                                <span className="text-gray-500">by</span>
                                              )}
                                              {tank.lastMovementBy && (
                                                <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-50">
                                                  🚛{tank.lastMovementBy.split(' ')[0]}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right ml-2">
                                        <p className={`text-xs mb-1 font-medium ${tank.levelStatus.textColor}`}>
                                          {percentage}%
                                        </p>
                                      </div>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${progressBarColor}`}
                                        style={{ 
                                          width: `${Math.min(percentage, 100)}%` 
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-500 mb-2">No tanks configured</p>
                              {oilTypes.length > 0 && (
                                <Button
                                  onClick={() => createTanksForBranch(branch.id)}
                                  disabled={isCreatingTanks}
                                  size="sm"
                                  variant="outline"
                                >
                                  {isCreatingTanks ? (
                                    <>
                                      <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    <>
                                      <PlusIcon className="h-4 w-4 mr-2" />
                                      Create Tanks
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Recent Transactions ({recentTransactions.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Complete history of loading and supply operations for your branches
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTransactions.length > 0 ? (
              <div className="max-h-80 overflow-y-auto space-y-2 sm:space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div key={transaction.id || index} className="p-3 sm:p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ${
                              transaction.type === 'loading' 
                                ? 'bg-blue-100 text-blue-800' 
                                : transaction.type === 'supply'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {transaction.type === 'loading' ? 'LOADING' : 
                               transaction.type === 'supply' ? 
                                 (transaction.supplyType === 'drum' || transaction.numberOfDrums) ? 'SUPPLY (DRUM)' : 'SUPPLY'
                               : 'DELIVERY'}
                            </span>
                            <span className="font-medium text-sm truncate">{transaction.oilTypeName || 'Unknown Oil Type'}</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {transaction.quantity?.toLocaleString()}L
                            {(() => {
                              if (transaction.type === 'loading') {
                                const locationName = transaction.loadLocationName || transaction.branchName || 'Loading Location';
                                return <span className="text-xs"> • Loaded from {locationName}</span>;
                              } else if (transaction.branchName) {
                                return <span className="text-xs"> • {transaction.branchName}</span>;
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-xs text-gray-500">
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {transaction.createdAt ? 
                                  new Date(transaction.createdAt).toLocaleDateString() : 
                                  'Unknown date'
                                }
                              </span>
                            </div>
                            {transaction.driverName && (
                              <div className="truncate">Driver: {transaction.driverName}</div>
                            )}
                            {transaction.type === 'supply' && (transaction.supplyType === 'drum' || transaction.numberOfDrums) && (
                              <div className="text-blue-600 text-xs">
                                Method: {transaction.numberOfDrums} drums × {transaction.drumCapacity}L each
                              </div>
                            )}
                            {transaction.photos && Object.keys(transaction.photos).length > 0 && (
                              <div className="flex items-center gap-1 text-blue-600 text-xs">
                                <EyeIcon className="h-3 w-3" />
                                <span>{Object.keys(transaction.photos).length} photos</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowTransactionModal(true);
                          }}
                          className="ml-2 flex-shrink-0 flex items-center gap-1"
                          data-testid={`button-view-transaction-${index}`}
                        >
                          <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Details</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent transactions found</p>
                <p className="text-sm">Transaction history for your assigned branches will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              View detailed information about this transaction including photos and metadata
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <div className="text-sm text-gray-500">
                  {new Date(selectedTransaction.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className={`font-medium ${
                    selectedTransaction.type === 'loading' 
                      ? 'text-blue-600' 
                      : selectedTransaction.type === 'supply'
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}>
                    {selectedTransaction.type === 'loading' ? 'Oil Loading' : 
                     selectedTransaction.type === 'supply' ? 
                       (selectedTransaction.supplyType === 'drum' || selectedTransaction.numberOfDrums) ? 'Oil Supply (via Drums)' : 'Oil Supply'
                     : 'Oil Delivery'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Oil Type</label>
                  <p className="font-medium">{selectedTransaction.oilTypeName || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Quantity</label>
                  <p className="font-medium">{selectedTransaction.quantity?.toLocaleString()}L</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Driver</label>
                  <p className="font-medium">
                    {selectedTransaction.driverName || selectedTransaction.reporterName || selectedTransaction.reportedByName || 'Unknown Driver'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Branch</label>
                  <p className="font-medium">{selectedTransaction.branchName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Transaction ID</label>
                  <p className="font-medium text-xs text-gray-500">{selectedTransaction.id}</p>
                </div>
              </div>

              {/* Photos - Same structure as driver dashboard */}
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

              {/* Additional Transaction Details */}
              {(selectedTransaction as any).notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Notes</label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{(selectedTransaction as any).notes}</p>
                </div>
              )}

              {/* Meter Readings if available */}
              {(selectedTransaction as any).startReading && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Start Reading</label>
                    <p className="font-medium">{(selectedTransaction as any).startReading}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">End Reading</label>
                    <p className="font-medium">{(selectedTransaction as any).endReading}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Modal - Same as driver dashboard */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
          <DialogDescription className="sr-only">
            Full size view of {selectedPhoto?.label || 'transaction photo'}
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
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhotoModal(false)}
                    className="text-white hover:bg-white/20"
                  >
                    ✕
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
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Tank Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Tank Level - Step {
              updateStep === 'branch' ? '1' :
              updateStep === 'tank' ? '2' :
              updateStep === 'gauge-photo' ? '3' :
              updateStep === 'quantity' ? '4' :
              updateStep === 'system-photo' ? '5' : '6'
            } of 6</DialogTitle>
            <DialogDescription>
              {updateStep === 'branch' && 'Select the branch to update'}
              {updateStep === 'tank' && 'Select the oil tank to update'}
              {updateStep === 'gauge-photo' && 'Take a photo of the tank level gauge'}
              {updateStep === 'quantity' && 'Enter the current oil quantity'}
              {updateStep === 'system-photo' && 'Take a photo of the system screen'}
              {updateStep === 'confirm' && 'Review and confirm the update'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Step 1: Select Branch */}
            {updateStep === 'branch' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Branch</Label>
                  <Select value={selectedBranchForUpdate} onValueChange={setSelectedBranchForUpdate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} - {branch.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Select Tank */}
            {updateStep === 'tank' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Tank</Label>
                  <Select value={selectedTankForUpdate} onValueChange={setSelectedTankForUpdate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a tank" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const filteredTanks = oilTanks.filter(tank => tank.branchId === selectedBranchForUpdate);
                        console.log('🔍 Debug tank selection:', {
                          selectedBranchForUpdate,
                          allTanks: oilTanks.length,
                          filteredTanks: filteredTanks.length,
                          tankDetails: filteredTanks
                        });
                        
                        if (filteredTanks.length === 0) {
                          return (
                            <SelectItem value="no-tanks" disabled>
                              No tanks found for this branch
                            </SelectItem>
                          );
                        }
                        
                        return filteredTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id}>
                            {tank.oilTypeName} - Current: {tank.currentLevel}L / {tank.capacity}L
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Tank Gauge Photo */}
            {updateStep === 'gauge-photo' && (
              <div className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <GaugeIcon className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-700">
                      Take a clear photo of the tank oil level gauge
                    </p>
                  </div>
                  
                  {!gaugePhoto ? (
                    <>
                      <div className={`grid gap-3 ${allowGalleryAccess ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <Button 
                          onClick={() => capturePhoto('gauge-photo-input', setGaugePhoto, true)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <CameraIcon className="h-4 w-4 mr-2" />
                          Take Photo
                        </Button>
                        {allowGalleryAccess && (
                          <Button 
                            onClick={() => capturePhoto('gauge-photo-input', setGaugePhoto, false)}
                            variant="outline"
                            className="w-full"
                          >
                            <GalleryVerticalIcon className="h-4 w-4 mr-2" />
                            From Gallery
                          </Button>
                        )}
                      </div>
                      <input id="gauge-photo-input" type="file" accept="image/*" className="hidden" />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-green-600 text-center">
                        ✓ Gauge photo captured: {gaugePhoto.name}
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setGaugePhoto(null)}
                        className="w-full"
                      >
                        Retake Photo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Manual Quantity Entry */}
            {updateStep === 'quantity' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-quantity">Current Oil Level (Liters)</Label>
                  {(() => {
                    const selectedTank = oilTanks.find(t => t.id === selectedTankForUpdate);
                    const currentValue = parseFloat(manualQuantity) || 0;
                    const capacity = selectedTank?.capacity || 0;
                    const isOverCapacity = currentValue > capacity;
                    const isNearCapacity = currentValue > capacity * 0.9;
                    
                    return (
                      <>
                        <Input
                          id="manual-quantity"
                          type="number"
                          value={manualQuantity}
                          onChange={(e) => setManualQuantity(e.target.value)}
                          placeholder="Enter the current oil level"
                          min="0"
                          max={capacity}
                          className={`transition-colors ${
                            isOverCapacity 
                              ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500" 
                              : isNearCapacity
                              ? "border-yellow-500 bg-yellow-50 focus:border-yellow-500 focus:ring-yellow-500"
                              : "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        
                        {selectedTank && (
                          <div className="space-y-2">
                            {/* Tank capacity info */}
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Tank capacity:</span>
                              <span className="font-medium text-gray-900">
                                {capacity.toLocaleString()}L
                              </span>
                            </div>
                            
                            {/* Current level vs capacity */}
                            {manualQuantity && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">You entered:</span>
                                <span className={`font-medium ${
                                  isOverCapacity ? "text-red-600" : isNearCapacity ? "text-yellow-600" : "text-green-600"
                                }`}>
                                  {currentValue.toLocaleString()}L ({((currentValue / capacity) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            )}
                            
                            {/* Visual capacity bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all ${
                                  isOverCapacity 
                                    ? "bg-red-500" 
                                    : isNearCapacity 
                                    ? "bg-yellow-500" 
                                    : "bg-green-500"
                                }`}
                                style={{ 
                                  width: `${Math.min((currentValue / capacity) * 100, 100)}%` 
                                }}
                              />
                            </div>
                            
                            {/* Warning messages */}
                            {isOverCapacity && (
                              <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <AlertTriangleIcon className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-red-700">
                                  Level exceeds tank capacity by {(currentValue - capacity).toLocaleString()}L
                                </span>
                              </div>
                            )}
                            
                            {isNearCapacity && !isOverCapacity && (
                              <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm text-yellow-700">
                                  Tank is near capacity (above {((capacity * 0.9) / 1000).toFixed(1)}K liters)
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Step 5: System Screen Photo */}
            {updateStep === 'system-photo' && (
              <div className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <MonitorIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-700">
                      Take a photo of the system screen showing the updated level
                    </p>
                  </div>
                  
                  {!systemPhoto ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={() => capturePhoto('system-photo-input', setSystemPhoto, true)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CameraIcon className="h-4 w-4 mr-2" />
                          Take Photo
                        </Button>
                        <Button 
                          onClick={() => capturePhoto('system-photo-input', setSystemPhoto, false)}
                          variant="outline"
                          className="w-full"
                        >
                          <GalleryVerticalIcon className="h-4 w-4 mr-2" />
                          From Gallery
                        </Button>
                      </div>
                      <input id="system-photo-input" type="file" accept="image/*" className="hidden" />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-green-600 text-center">
                        ✓ System screen photo captured: {systemPhoto.name}
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setSystemPhoto(null)}
                        className="w-full"
                      >
                        Retake Photo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Confirmation */}
            {updateStep === 'confirm' && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold">Review Update Details:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Branch:</strong> {branches.find(b => b.id === selectedBranchForUpdate)?.name}</p>
                    <p><strong>Tank:</strong> {oilTanks.find(t => t.id === selectedTankForUpdate)?.oilTypeName}</p>
                    <p><strong>New Level:</strong> {manualQuantity} Liters</p>
                    <p><strong>Gauge Photo:</strong> {gaugePhoto?.name}</p>
                    <p><strong>System Photo:</strong> {systemPhoto?.name}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="update-notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="update-notes"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Add any additional notes about this update..."
                    rows={3}
                    className="border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={updateStep === 'branch' ? () => setShowUpdateDialog(false) : handleStepBack}
              >
                {updateStep === 'branch' ? 'Cancel' : 'Back'}
              </Button>
              
              <Button 
                onClick={updateStep === 'confirm' ? handleSubmitTankUpdate : handleStepNext}
                disabled={
                  (updateStep === 'branch' && !selectedBranchForUpdate) ||
                  (updateStep === 'tank' && !selectedTankForUpdate) ||
                  (updateStep === 'gauge-photo' && !gaugePhoto) ||
                  (updateStep === 'quantity' && !manualQuantity) ||
                  (updateStep === 'system-photo' && !systemPhoto) ||
                  loading
                }
              >
                {updateStep === 'confirm' ? (loading ? 'Submitting...' : 'Submit Update') : 'Next'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Complaint</DialogTitle>
            <DialogDescription>
              Report any issues or concerns for your assigned branches
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={complaintData.branchId} onValueChange={(value) => setComplaintData(prev => ({ ...prev, branchId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} - {branch.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Issue Title</Label>
              <Input
                id="title"
                value={complaintData.title}
                onChange={(e) => setComplaintData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={complaintData.description}
                onChange={(e) => setComplaintData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the issue"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={complaintData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setComplaintData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Photos (Optional)</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={captureComplaintPhoto}
                    className="flex items-center gap-2"
                  >
                    <CameraIcon className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <span className="text-sm text-gray-500">
                    {capturedPhotos.length} photo{capturedPhotos.length !== 1 ? 's' : ''} captured
                  </span>
                </div>
                
                {capturedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Complaint photo ${index + 1}`}
                          className="w-full h-16 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeComplaintPhoto(index)}
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  Tip: Take clear photos showing the issue or damage for faster resolution
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowComplaintDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateComplaint}
                disabled={isSubmittingComplaint}
              >
                {isSubmittingComplaint ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Complaint"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* My Complaints Dialog */}
      <Dialog open={showMyComplaintsDialog} onOpenChange={setShowMyComplaintsDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Complaints ({userComplaints.length})</DialogTitle>
            <DialogDescription>
              View the status and details of all your submitted complaints
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {userComplaints.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquareIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No complaints found</p>
                <p className="text-sm text-gray-500">Your submitted complaints will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userComplaints.map((complaint, index) => (
                  <Card key={complaint.id || index} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangleIcon className="h-5 w-5 text-orange-600" />
                            Complaint #{complaint.complaintNumber || 'N/A'} - {complaint.title || 'Untitled Complaint'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {formatComplaintDate(complaint.createdAt)}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              complaint.status === 'open' ? 'destructive' : 
                              complaint.status === 'in-progress' || complaint.status === 'in_progress' ? 'default' : 
                              complaint.status === 'resolved' || complaint.status === 'closed' ? 'secondary' : 'outline'
                            }
                          >
                            {complaint.status?.replace('-', ' ').replace('_', ' ') || 'open'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            Priority: {complaint.priority || 'medium'}
                          </Badge>
                          {complaint.resolvedAt && (
                            <Badge variant="secondary" className="text-xs">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Description:</p>
                          <p className="text-sm mt-1">{complaint.description || 'No description provided'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Branch:</p>
                            <p className="text-sm">{complaint.branchName || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Priority:</p>
                            <p className="text-sm capitalize">{complaint.priority || 'medium'}</p>
                          </div>
                        </div>
                        
                        {/* Admin Actions & Resolution */}
                        {(complaint.adminNotes || complaint.resolutionNotes || complaint.resolvedAt) && (
                          <div className="border-t pt-3">
                            <p className="text-sm text-gray-600 font-medium mb-2">Admin Actions:</p>
                            <div className="space-y-2">
                              {complaint.adminNotes && (
                                <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                                  <p className="text-xs text-blue-600 font-medium">Admin Notes:</p>
                                  <p className="text-sm">{complaint.adminNotes}</p>
                                </div>
                              )}
                              {complaint.resolutionNotes && (
                                <div className="bg-green-50 p-2 rounded border-l-2 border-green-400">
                                  <p className="text-xs text-green-600 font-medium">Resolution:</p>
                                  <p className="text-sm">{complaint.resolutionNotes}</p>
                                </div>
                              )}
                              {complaint.resolvedAt && (
                                <div className="text-xs text-gray-500">
                                  Resolved on: {formatComplaintDate(complaint.resolvedAt)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Status Timeline */}
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600 font-medium mb-2">Status History:</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Submitted:</span>
                              <span>{formatComplaintDate(complaint.createdAt, true)}</span>
                            </div>
                            {complaint.updatedAt && (
                              <div className="flex justify-between text-xs">
                                <span>Last Updated:</span>
                                <span>{formatComplaintDate(complaint.updatedAt, true)}</span>
                              </div>
                            )}
                            {complaint.resolvedAt && (
                              <div className="flex justify-between text-xs text-green-600">
                                <span>Resolved:</span>
                                <span>{formatComplaintDate(complaint.resolvedAt, true)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {complaint.photos && complaint.photos.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-2">Photos ({complaint.photos.length}):</p>
                            <div className="grid grid-cols-4 gap-2">
                              {complaint.photos.map((photoUrl: string, photoIndex: number) => (
                                <div key={photoIndex} className="relative group cursor-pointer"
                                     onClick={() => {
                                       setSelectedPhoto({
                                         url: photoUrl,
                                         label: `Complaint Photo ${photoIndex + 1}`
                                       });
                                       setShowPhotoModal(true);
                                     }}>
                                  <img 
                                    src={photoUrl} 
                                    alt={`Complaint photo ${photoIndex + 1}`} 
                                    className="w-full h-16 object-cover rounded border hover:opacity-90 transition-opacity"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                                    <EyeIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-xs text-gray-500">
                            Complaint #{complaint.complaintNumber || 'N/A'}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedComplaintForView(complaint);
                              setShowComplaintDetailsDialog(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowMyComplaintsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint Details Dialog */}
      <Dialog open={showComplaintDetailsDialog} onOpenChange={setShowComplaintDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>
              Detailed view of your complaint and its current status
            </DialogDescription>
          </DialogHeader>
          
          {selectedComplaintForView && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">Complaint #{selectedComplaintForView.complaintNumber || 'N/A'} - {selectedComplaintForView.title}</h3>
                  <p className="text-sm text-gray-600">
                    Submitted on {formatComplaintDate(selectedComplaintForView.createdAt, true)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge 
                    variant={
                      selectedComplaintForView.status === 'open' ? 'destructive' : 
                      selectedComplaintForView.status === 'in-progress' ? 'default' : 
                      selectedComplaintForView.status === 'resolved' ? 'secondary' : 'outline'
                    }
                  >
                    {selectedComplaintForView.status?.replace('-', ' ') || 'unknown'}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedComplaintForView.priority}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded border text-sm">{selectedComplaintForView.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Branch</Label>
                    <p className="mt-1">{selectedComplaintForView.branchName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Priority</Label>
                    <p className="mt-1 capitalize">{selectedComplaintForView.priority}</p>
                  </div>
                </div>
                
                {selectedComplaintForView.resolutionNotes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Resolution Notes</Label>
                    <p className="mt-1 p-3 bg-green-50 rounded border text-sm">{selectedComplaintForView.resolutionNotes}</p>
                  </div>
                )}
                
                {selectedComplaintForView.photos && selectedComplaintForView.photos.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 block mb-2">Photos</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedComplaintForView.photos.map((photoUrl: string, photoIndex: number) => (
                        <div key={photoIndex} className="relative group cursor-pointer"
                             onClick={() => {
                               setSelectedPhoto({
                                 url: photoUrl,
                                 label: `Complaint Photo ${photoIndex + 1}`
                               });
                               setShowPhotoModal(true);
                             }}>
                          <img 
                            src={photoUrl} 
                            alt={`Complaint photo ${photoIndex + 1}`} 
                            className="w-full h-20 object-cover rounded border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded flex items-center justify-center">
                            <EyeIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowComplaintDetailsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* My Update Logs Dialog */}
      <Dialog open={showMyLogsDialog} onOpenChange={setShowMyLogsDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Tank Update History ({myUpdateLogs.length})</DialogTitle>
            <DialogDescription>
              Complete log of all your oil tank level updates with photos and details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {myUpdateLogs.length === 0 ? (
              <div className="text-center py-8">
                <HistoryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No tank updates found</p>
                <p className="text-sm text-gray-500">Your tank level updates will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myUpdateLogs.map((log, index) => (
                  <Card key={log.id || index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <DropletIcon className="h-5 w-5 text-blue-600" />
                            {log.branchName} - {log.oilTypeName}
                          </CardTitle>
                          <CardDescription>
                            {log.updatedAt ? new Date(log.updatedAt).toLocaleString() : 'Unknown date'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          {log.previousLevel}L → {log.newLevel}L
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm"><strong>Previous Level:</strong> {log.previousLevel?.toLocaleString()}L</p>
                          <p className="text-sm"><strong>New Level:</strong> {log.newLevel?.toLocaleString()}L</p>
                          <p className="text-sm"><strong>Change:</strong> 
                            <span className={`ml-1 font-medium ${
                              (log.newLevel - log.previousLevel) > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(log.newLevel - log.previousLevel) > 0 ? '+' : ''}{(log.newLevel - log.previousLevel)?.toLocaleString()}L
                            </span>
                          </p>
                          {log.notes && (
                            <p className="text-sm"><strong>Notes:</strong> {log.notes}</p>
                          )}
                        </div>
                        
                        {/* Photos */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Photo Evidence:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {log.photos?.gaugePhoto && (
                              <div className="text-center">
                                <img 
                                  src={log.photos.gaugePhoto} 
                                  alt="Tank Gauge"
                                  className="w-full h-20 object-cover rounded cursor-pointer border"
                                  onClick={() => setSelectedPhoto({url: log.photos.gaugePhoto, label: 'Tank Gauge'})}
                                />
                                <p className="text-xs text-gray-500 mt-1">Tank Gauge</p>
                              </div>
                            )}
                            {log.photos?.systemPhoto && (
                              <div className="text-center">
                                <img 
                                  src={log.photos.systemPhoto} 
                                  alt="System Screen"
                                  className="w-full h-20 object-cover rounded cursor-pointer border"
                                  onClick={() => setSelectedPhoto({url: log.photos.systemPhoto, label: 'System Screen'})}
                                />
                                <p className="text-xs text-gray-500 mt-1">System Screen</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog for Concurrent Updates */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
              <span>Update Conflict Detected</span>
            </DialogTitle>
            <DialogDescription>
              Another user updated this tank while you were making changes. Please review the conflict and choose how to proceed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {conflictDetails && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Server Level:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {conflictDetails.serverLevel?.toLocaleString()}L
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Updated By:</span>
                  <span className="text-sm text-gray-900">
                    {conflictDetails.serverUpdatedBy || 'Another user'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Updated At:</span>
                  <span className="text-sm text-gray-600">
                    {conflictDetails.serverUpdatedAt ? 
                      new Date(conflictDetails.serverUpdatedAt).toLocaleString() : 
                      'Just now'
                    }
                  </span>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Your Intended Level:</span>
                <span className="text-lg font-bold text-green-600">
                  {retryUpdateData?.newLevel?.toLocaleString()}L
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setConflictDialogOpen(false);
                setConflictDetails(null);
                setRetryUpdateData(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={() => {
                setConflictDialogOpen(false);
                // Refresh data to see the latest changes
                loadData();
                setConflictDetails(null);
                setRetryUpdateData(null);
              }}
            >
              Refresh & Start Over
            </Button>
            <Button 
              onClick={async () => {
                if (retryUpdateData) {
                  setConflictDialogOpen(false);
                  // Retry with the original data but fresh conflict check
                  setManualQuantity(retryUpdateData.newLevel.toString());
                  if (retryUpdateData.photos?.gauge) setGaugePhoto(retryUpdateData.photos.gauge);
                  if (retryUpdateData.photos?.system) setSystemPhoto(retryUpdateData.photos.system);
                  
                  // Force refresh the tank data first, then retry
                  await loadData();
                  setTimeout(() => {
                    handleSubmitTankUpdate();
                  }, 500);
                }
                setConflictDetails(null);
                setRetryUpdateData(null);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Retry Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer with Creator Credit */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center">
        <p className="text-xs text-gray-500">Created by Asif Shaikh</p>
      </div>
    </div>
  );
}
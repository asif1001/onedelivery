import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogOutIcon, 
  RefreshCwIcon,
  AlertCircleIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { OilDeliveryLogo } from '@/components/ui/logo';

const useTheme = () => ({ theme: 'light' });

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

const MonitoringDebug: React.FC = () => {
  const [transactionRows, setTransactionRows] = useState<TransactionDebugRow[]>([]);
  const [tankUpdateRows, setTankUpdateRows] = useState<TankUpdateLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAssignedBranches, setUserAssignedBranches] = useState<Set<string>>(new Set());
  const { theme } = useTheme();
  const { userData: user, logout } = useAuth();
  
  // Get user's assigned branches for filtering (same as warehouse dashboard)
  const userBranchIds = user?.branchIds || [];
  const isRestrictedUser = user?.role === 'warehouse' && userBranchIds.length > 0;

  // Helper to format timestamps
  const formatTimestamp = (ts: any): string => {
    if (!ts) return '-';
    try {
      const dt = ts?.toDate ? ts.toDate() : new Date(ts);
      return dt.toISOString();
    } catch (e) {
      return '-';
    }
  };

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting debug data fetch for last 30 days...');
      
      // Calculate 30 days ago
      const since30d = Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000));
      console.log(`📅 Fetching data since: ${since30d.toDate().toISOString()}`);
      
      // Get branches for branchId -> branchName conversion and user filtering
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchMap = new Map<string, string>();
      const assignedBranchNames = new Set<string>();
      
      branchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = data.name || doc.id;
        branchMap.set(doc.id, branchName);
        
        // If restricted user, collect assigned branch names
        if (isRestrictedUser && userBranchIds.includes(doc.id)) {
          assignedBranchNames.add(branchName);
        }
      });
      
      console.log(`📊 Found ${branchMap.size} branches for name mapping`);
      console.log(`🔍 User Role: ${user?.role}`);
      console.log(`🏢 User Branch IDs:`, userBranchIds);
      console.log(`🏪 Is Restricted User: ${isRestrictedUser}`);
      console.log(`🏪 Assigned Branch Names:`, Array.from(assignedBranchNames));
      
      if (isRestrictedUser) {
        console.log(`👤 Warehouse user - showing ${assignedBranchNames.size} assigned branches only`);
        console.log(`🔒 Will filter data to only show branches:`, Array.from(assignedBranchNames));
      } else {
        console.log(`👑 Admin user - showing all branches`);
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
      
      // Process transactions and keep only latest per branch+oilType (with user filtering)
      const txnMap = new Map<string, TransactionDebugRow>();
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId || 'Unknown';
        const oilTypeName = data.oilTypeName || 'Unknown';
        
        // Filter out transactions for restricted warehouse users not assigned to this branch
        if (isRestrictedUser) {
          // Skip if this branch is not in user's assigned branches
          if (!userBranchIds.includes(data.branchId)) {
            console.log(`🚫 Filtered out transaction: ${branchName} (branchId: ${data.branchId}, not assigned to warehouse user)`);
            return;
          }
        }
        
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
      
      // Process tank updates and keep only latest per branch+oilType (with user filtering)
      const tankMap = new Map<string, TankUpdateLogRow>();
      tankLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId || 'Unknown';
        const oilTypeName = data.oilTypeName || 'Unknown';
        
        // Filter out tank updates for restricted warehouse users not assigned to this branch
        if (isRestrictedUser) {
          // Skip if this branch is not in user's assigned branches
          if (!userBranchIds.includes(data.branchId)) {
            console.log(`🚫 Filtered out tank update: ${branchName} (branchId: ${data.branchId}, not assigned to warehouse user)`);
            return;
          }
        }
        
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
      
      console.log(`\n✅ Debug fetch complete.`);
      console.log(`📋 Transactions (30d): ${txnResults.length}`);
      console.log(`📋 Tank Updates (30d): ${tankResults.length}`);
      
      setTransactionRows(txnResults);
      setTankUpdateRows(tankResults);
      setUserAssignedBranches(assignedBranchNames);
      
    } catch (error: any) {
      console.error('❌ Debug fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
    
    // Auto-refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchDebugData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []); // Fetch once on mount and setup auto-refresh

  const themeClasses = {
    card: theme === 'night' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: theme === 'night' ? 'text-white' : 'text-gray-900',
    secondaryText: theme === 'night' ? 'text-gray-300' : 'text-gray-600',
    bg: theme === 'night' ? 'bg-gray-900' : 'bg-gray-50'
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      {/* Header matching warehouse dashboard exactly */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <OilDeliveryLogo className="w-10 h-10 sm:w-12 sm:h-12" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">OneDelivery Warehouse</h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Welcome, {user?.displayName || user?.email || 'Ali Alsaeed'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Theme indicators matching warehouse dashboard */}
              <div className="hidden sm:flex items-center gap-1 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Light
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Midday
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                  Night
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Debug
                </div>
              </div>
              
              <Button
                onClick={() => window.location.href = '/warehouse-dashboard'}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
              >
                ← Back
              </Button>
              
              <Button
                onClick={logout}
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
              >
                <LogOutIcon className="h-3 w-3" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - No Tabs, Direct Content */}
      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="font-medium">Error:</span> {error}
            </div>
          </div>
        )}

        {/* User Access Information */}
        {isRestrictedUser && userAssignedBranches.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircleIcon className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Warehouse User - Limited Access</span>
            </div>
            <p className="text-sm text-blue-700">
              You are viewing data for {userAssignedBranches.size} assigned branch{userAssignedBranches.size > 1 ? 'es' : ''}: {Array.from(userAssignedBranches).join(', ')}
            </p>
          </div>
        )}

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
                
                // Filter branches based on user assignments (warehouse users only)
                let filteredBranches = Array.from(branchData.values());
                
                // Apply same filtering logic as warehouse dashboard
                if (isRestrictedUser) {
                  const originalCount = filteredBranches.length;
                  filteredBranches = filteredBranches.filter(branch => 
                    userAssignedBranches.has(branch.branchName)
                  );
                  console.log(`🔒 Warehouse user filter: ${originalCount} → ${filteredBranches.length} branches (showing assigned only)`);
                } else {
                  console.log(`👑 Admin user - showing all ${filteredBranches.length} branches`);
                }
                
                // Sort by last activity
                const sortedBranches = filteredBranches.sort((a, b) => {
                  if (!a.lastActivity) return 1;
                  if (!b.lastActivity) return -1;
                  return b.lastActivity.getTime() - a.lastActivity.getTime();
                });
                
                return sortedBranches.map((branch, branchIndex) => {
                  const daysSinceUpdate = branch.lastActivity 
                    ? Math.floor((Date.now() - branch.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  const oilTypesArray = Array.from(branch.oilTypes.values()).sort((a, b) => a.oilTypeName.localeCompare(b.oilTypeName));
                  
                  // Check if any tank has manual updates within 7 days
                  const hasRecentManualUpdate = oilTypesArray.some(oilType => {
                    if (!oilType.manualUpdate) return false;
                    const manualUpdateDate = new Date(oilType.manualUpdate.updatedAt);
                    const daysSinceManual = Math.floor((Date.now() - manualUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
                    return daysSinceManual < 7;
                  });
                  
                  const isRecentlyUpdated = daysSinceUpdate !== null && daysSinceUpdate < 7;
                  const needsAttention = !hasRecentManualUpdate; // Red if no manual updates in 7 days
                  
                  return (
                    <Card key={branchIndex} className={`h-fit transition-all hover:shadow-lg ${
                      needsAttention 
                        ? 'border-red-300 bg-red-50/30' 
                        : isRecentlyUpdated
                          ? 'border-green-200 bg-green-50/30' 
                          : 'border-gray-200 bg-white hover:bg-gray-50/30'
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              isRecentlyUpdated ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <CardTitle className="text-base font-semibold">
                              {branch.branchName}
                            </CardTitle>
                          </div>
                          {needsAttention ? (
                            <div className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              Needs Update
                            </div>
                          ) : isRecentlyUpdated && (
                            <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              Active
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {daysSinceUpdate !== null ? (
                            daysSinceUpdate === 0 ? 'Updated today' : `Updated ${daysSinceUpdate} days ago`
                          ) : (
                            'No recent activity'
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                            <span className="text-gray-600">{oilTypesArray.length} Oil Types</span>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-3">
                        {oilTypesArray.map((oilType, oilIndex) => (
                          <div key={oilIndex} className="border rounded-lg p-3 bg-white/80">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm text-gray-800">
                                {oilType.oilTypeName}
                              </h4>
                              <span className="text-xs text-gray-500 font-mono">
                                #{oilIndex + 1}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-xs">
                              {/* Manual Update */}
                              <div className={`p-2 rounded border-l-4 ${
                                oilType.manualUpdate 
                                  ? 'bg-blue-50 border-blue-400' 
                                  : 'bg-gray-50 border-gray-300'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-blue-700">Manual Update</span>
                                </div>
                                {oilType.manualUpdate ? (
                                  <div className="text-gray-700">
                                    <div className="font-medium">{oilType.manualUpdate.updatedBy}</div>
                                    <div className="text-gray-500">
                                      {new Date(oilType.manualUpdate.updatedAt).toLocaleDateString()} at{' '}
                                      {new Date(oilType.manualUpdate.updatedAt).toLocaleTimeString()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 italic">No manual updates</div>
                                )}
                              </div>
                              
                              {/* Supply/Loading */}
                              <div className={`p-2 rounded border-l-4 ${
                                oilType.supplyLoading 
                                  ? 'bg-orange-50 border-orange-400' 
                                  : 'bg-gray-50 border-gray-300'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-orange-700">Supply/Loading</span>
                                </div>
                                {oilType.supplyLoading ? (
                                  <div className="text-gray-700">
                                    <div className="font-medium">{oilType.supplyLoading.driverName}</div>
                                    <div className="text-gray-500">
                                      {new Date(oilType.supplyLoading.createdAt).toLocaleDateString()} at{' '}
                                      {new Date(oilType.supplyLoading.createdAt).toLocaleTimeString()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 italic">No supply/loading activity</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                });
              })()}
              
              {transactionRows.length === 0 && tankUpdateRows.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No data found in the last 30 days.
                </div>
              )}
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default MonitoringDebug;
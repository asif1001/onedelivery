import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      
      // Get user data for filtering
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userRole = userData?.role;
      const userBranchIds = userData?.branchIds || [];
      
      branchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = data.name || doc.id;
        branchMap.set(doc.id, branchName);
        
        // If warehouse user with branch assignments, collect assigned branch names
        if (userRole === 'warehouse' && userBranchIds.length > 0 && userBranchIds.includes(doc.id)) {
          assignedBranchNames.add(branchName);
        }
      });
      
      console.log(`📊 Found ${branchMap.size} branches for name mapping`);
      if (userRole === 'warehouse' && userBranchIds.length > 0) {
        console.log(`👤 Warehouse user - showing ${assignedBranchNames.size} assigned branches only`);
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
  }, []); // Fetch once on mount

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'night' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Monitoring Debug - Last 30 Days</h1>
          <p className="text-gray-600 mb-4">
            Two separate tables showing specific fields from transactions and tankUpdateLogs collections (last 30 days only).
          </p>
          
          <div className="flex gap-4 mb-4">
            <Button
              onClick={fetchDebugData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Professional Grid Layout for Branch Activity */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-600 rounded"></div>
              Branch Activity Summary (Last 30 Days)
            </CardTitle>
            <p className="text-sm text-gray-600">
              Professional overview of all branches with latest manual updates and supply/loading activities
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
                
                // If warehouse user with branch assignments, filter branches
                if (userAssignedBranches.size > 0) {
                  filteredBranches = filteredBranches.filter(branch => 
                    userAssignedBranches.has(branch.branchName)
                  );
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

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Query Details:</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Transactions:</strong> Shows oilTypeName, driverName, createdAt, branchName from last 30 days</p>
            <p><strong>TankUpdateLogs:</strong> Shows oilTypeName, branchName (converted from branchId), updatedAt, updatedBy from last 30 days</p>
            <p><strong>Branch Mapping:</strong> branchId is automatically converted to branchName using branches collection</p>
            <p><strong>Time Filter:</strong> Both queries limited to documents from the last 30 days only</p>
            <p><strong>Latest Only Filter:</strong> Shows only the most recent record per branch+oilType combination (e.g., only latest "Janabiya S18 - Mineral Oil")</p>
            <p><strong>Fallback:</strong> Transactions query tries createdAt first, falls back to timestamp if needed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDebug;
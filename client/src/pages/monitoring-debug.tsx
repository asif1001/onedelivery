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
      
      // Get branches for branchId -> branchName conversion
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branchMap = new Map<string, string>();
      branchesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        branchMap.set(doc.id, data.name || doc.id);
      });
      
      console.log(`📊 Found ${branchMap.size} branches for name mapping`);

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

        {/* Hierarchical Branch View */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Branch Activity Summary (Last 30 Days)</CardTitle>
            <p className="text-sm text-gray-600">
              Grouped by branch, showing latest manual updates and supply/loading activities per oil type
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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
                
                // Convert to array and sort by last activity
                const sortedBranches = Array.from(branchData.values()).sort((a, b) => {
                  if (!a.lastActivity) return 1;
                  if (!b.lastActivity) return -1;
                  return b.lastActivity.getTime() - a.lastActivity.getTime();
                });
                
                return sortedBranches.map((branch, branchIndex) => {
                  const daysSinceUpdate = branch.lastActivity 
                    ? Math.floor((Date.now() - branch.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  const isRecentlyUpdated = daysSinceUpdate !== null && daysSinceUpdate < 7;
                  
                  return (
                    <div key={branchIndex} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isRecentlyUpdated ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <h3 className="text-lg font-semibold">
                          {branch.branchName} 
                          {isRecentlyUpdated && (
                            <span className="text-green-600 text-sm font-normal ml-2">(updated)</span>
                          )}
                        </h3>
                        {daysSinceUpdate !== null && (
                          <span className="text-gray-500 text-sm">
                            ({daysSinceUpdate === 0 ? 'today' : `${daysSinceUpdate} days ago`})
                          </span>
                        )}
                      </div>
                      
                      <div className="ml-6 space-y-3">
                        {Array.from(branch.oilTypes.values())
                          .sort((a, b) => a.oilTypeName.localeCompare(b.oilTypeName))
                          .map((oilType, oilIndex) => (
                            <div key={oilIndex} className="border-l-2 border-gray-200 pl-4">
                              <h4 className="font-medium text-gray-800 mb-2">
                                {oilType.oilTypeName} - {oilIndex + 1}
                              </h4>
                              
                              <div className="space-y-1 text-sm">
                                <div className="flex items-start gap-2">
                                  <span className="font-medium text-blue-700 w-20">Manual:</span>
                                  <span className="text-gray-700">
                                    {oilType.manualUpdate ? (
                                      <>
                                        {new Date(oilType.manualUpdate.updatedAt).toLocaleString()} by{' '}
                                        <span className="font-medium">{oilType.manualUpdate.updatedBy}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          (from TankUpdateLogs)
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">No manual updates</span>
                                    )}
                                  </span>
                                </div>
                                
                                <div className="flex items-start gap-2">
                                  <span className="font-medium text-orange-700 w-20">Supply/Loading:</span>
                                  <span className="text-gray-700">
                                    {oilType.supplyLoading ? (
                                      <>
                                        {new Date(oilType.supplyLoading.createdAt).toLocaleString()} by{' '}
                                        <span className="font-medium">{oilType.supplyLoading.driverName}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          (from Transactions Collection)
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">No supply/loading activity</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
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
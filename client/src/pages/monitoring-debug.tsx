import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simple theme detection - will be replaced with proper theme provider later
const useTheme = () => ({ theme: 'light' });

interface DebugTankData {
  branchName: string;
  tankId: string;
  oilTypeName: string;
  levelPercent: string;
  manualUpdatedAt: string;
  manualUpdatedBy: string;
  txnType: string;
  txnTimestamp: string;
  txnDriverName: string;
  debugNotes: string[];
  rawManualData?: any;
  rawSupplyData?: any;
}

const MonitoringDebug: React.FC = () => {
  const [debugData, setDebugData] = useState<DebugTankData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [use30DayFilter, setUse30DayFilter] = useState(false);
  const { theme } = useTheme();

  // Helper function to convert timestamps
  const convertTimestamp = (ts: any): string => {
    if (!ts) return '–';
    try {
      const dt = ts?.toDate ? ts.toDate() : new Date(ts);
      return dt.toLocaleString();
    } catch (e) {
      return '–';
    }
  };

  // Helper function to get sample documents for debugging
  const getSampleDocs = async (branchId: string) => {
    console.log(`\n📋 Getting sample docs for branch: ${branchId}`);
    
    try {
      // Sample tankUpdateLogs doc
      const tankLogsQuery = query(
        collection(db, 'tankUpdateLogs'),
        where('branchId', '==', branchId),
        limit(1)
      );
      const tankLogsSnapshot = await getDocs(tankLogsQuery);
      if (!tankLogsSnapshot.empty) {
        const sampleLog = tankLogsSnapshot.docs[0];
        console.log(`📄 Sample tankUpdateLogs doc ID: ${sampleLog.id}`);
        console.log('📄 Sample tankUpdateLogs fields:', Object.keys(sampleLog.data()));
        console.log('📄 Sample tankUpdateLogs data:', sampleLog.data());
      } else {
        console.log('⚠️ No tankUpdateLogs found for this branch');
      }

      // Sample transactions doc
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('branchId', '==', branchId),
        limit(1)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      if (!transactionsSnapshot.empty) {
        const sampleTxn = transactionsSnapshot.docs[0];
        console.log(`📄 Sample transactions doc ID: ${sampleTxn.id}`);
        console.log('📄 Sample transactions fields:', Object.keys(sampleTxn.data()));
        console.log('📄 Sample transactions data:', sampleTxn.data());
      } else {
        console.log('⚠️ No transactions found for this branch');
      }
    } catch (error) {
      console.error('Error getting sample docs:', error);
    }
  };

  // Query manual updates with fallbacks
  const queryManualUpdates = async (branchId: string, tankId: string, oilTypeId: string) => {
    const debugNotes: string[] = [];
    let result = null;
    
    console.log(`\n🔍 Querying manual updates for tankId: ${tankId}, oilTypeId: ${oilTypeId}`);
    
    // Build date filter if enabled
    const dateFilter = use30DayFilter 
      ? Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000))
      : null;

    try {
      // Primary query: by tankId
      const primaryFilters = [
        where("branchId", "==", branchId),
        where("tankId", "==", tankId),
        where("updateType", "==", "manual")
      ];
      
      if (dateFilter) {
        primaryFilters.push(where("updatedAt", ">=", dateFilter));
      }
      
      const primaryQuery = query(
        collection(db, "tankUpdateLogs"),
        ...primaryFilters,
        orderBy("updatedAt", "desc"),
        limit(1)
      );
      
      console.log(`🔍 Primary manual query: branchId=${branchId}, tankId=${tankId}, updateType=manual`);
      const primarySnapshot = await getDocs(primaryQuery);
      
      if (!primarySnapshot.empty) {
        result = primarySnapshot.docs[0].data();
        debugNotes.push(`✅ Found manual update by tankId: ${tankId}`);
        console.log(`✅ Found manual update by tankId`, result);
      } else {
        debugNotes.push(`❌ No manual update found by tankId: ${tankId}`);
        console.log(`❌ No manual update found by tankId: ${tankId}`);
        
        // Fallback query: by oilTypeId
        const fallbackFilters = [
          where("branchId", "==", branchId),
          where("oilTypeId", "==", oilTypeId),
          where("updateType", "==", "manual")
        ];
        
        if (dateFilter) {
          fallbackFilters.push(where("updatedAt", ">=", dateFilter));
        }
        
        const fallbackQuery = query(
          collection(db, "tankUpdateLogs"),
          ...fallbackFilters,
          orderBy("updatedAt", "desc"),
          limit(1)
        );
        
        console.log(`🔍 Fallback manual query: branchId=${branchId}, oilTypeId=${oilTypeId}, updateType=manual`);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (!fallbackSnapshot.empty) {
          result = fallbackSnapshot.docs[0].data();
          debugNotes.push(`✅ Found manual update by oilTypeId: ${oilTypeId}`);
          console.log(`✅ Found manual update by oilTypeId`, result);
        } else {
          debugNotes.push(`❌ No manual update found by oilTypeId: ${oilTypeId}`);
          console.log(`❌ No manual update found by oilTypeId: ${oilTypeId}`);
        }
      }
    } catch (error: any) {
      console.error('Manual query error:', error);
      debugNotes.push(`❌ Manual query error: ${error.message}`);
      if (error.message.includes('index')) {
        console.log('🔗 Index creation needed for manual updates query');
      }
    }
    
    return { result, debugNotes };
  };

  // Query supply/loading transactions with fallbacks
  const querySupplyTransactions = async (branchId: string, oilTypeId: string) => {
    const debugNotes: string[] = [];
    let result = null;
    
    console.log(`\n🚛 Querying supply/loading for branchId: ${branchId}, oilTypeId: ${oilTypeId}`);
    
    // Build date filter if enabled
    const dateFilter = use30DayFilter 
      ? Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000))
      : null;

    try {
      // Primary query: by oilTypeId with timestamp
      const primaryFilters = [
        where("branchId", "==", branchId),
        where("oilTypeId", "==", oilTypeId),
        where("type", "in", ["supply", "loading"])
      ];
      
      if (dateFilter) {
        primaryFilters.push(where("timestamp", ">=", dateFilter));
      }
      
      const primaryQuery = query(
        collection(db, "transactions"),
        ...primaryFilters,
        orderBy("timestamp", "desc"),
        limit(1)
      );
      
      console.log(`🔍 Primary supply query: branchId=${branchId}, oilTypeId=${oilTypeId}, type in [supply,loading]`);
      const primarySnapshot = await getDocs(primaryQuery);
      
      if (!primarySnapshot.empty) {
        result = primarySnapshot.docs[0].data();
        debugNotes.push(`✅ Found supply/loading by oilTypeId with timestamp`);
        console.log(`✅ Found supply/loading transaction`, result);
      } else {
        debugNotes.push(`❌ No supply/loading found by oilTypeId with timestamp`);
        console.log(`❌ No supply/loading found by oilTypeId with timestamp`);
        
        // Fallback 1: branch only with timestamp
        try {
          const fallback1Filters = [
            where("branchId", "==", branchId),
            where("type", "in", ["supply", "loading"])
          ];
          
          if (dateFilter) {
            fallback1Filters.push(where("timestamp", ">=", dateFilter));
          }
          
          const fallback1Query = query(
            collection(db, "transactions"),
            ...fallback1Filters,
            orderBy("timestamp", "desc"),
            limit(1)
          );
          
          console.log(`🔍 Fallback 1: branchId only with timestamp`);
          const fallback1Snapshot = await getDocs(fallback1Query);
          
          if (!fallback1Snapshot.empty) {
            result = fallback1Snapshot.docs[0].data();
            debugNotes.push(`✅ Found supply/loading by branchId only (timestamp)`);
            console.log(`✅ Found supply/loading by branchId only`, result);
          } else {
            // Fallback 2: try createdAt instead of timestamp
            const fallback2Filters = [
              where("branchId", "==", branchId),
              where("type", "in", ["supply", "loading"])
            ];
            
            if (dateFilter) {
              fallback2Filters.push(where("createdAt", ">=", dateFilter));
            }
            
            const fallback2Query = query(
              collection(db, "transactions"),
              ...fallback2Filters,
              orderBy("createdAt", "desc"),
              limit(1)
            );
            
            console.log(`🔍 Fallback 2: branchId with createdAt`);
            const fallback2Snapshot = await getDocs(fallback2Query);
            
            if (!fallback2Snapshot.empty) {
              result = fallback2Snapshot.docs[0].data();
              debugNotes.push(`✅ Found supply/loading by branchId with createdAt`);
              console.log(`✅ Found supply/loading with createdAt`, result);
            } else {
              debugNotes.push(`❌ No supply/loading found with any fallback`);
              console.log(`❌ No supply/loading found with any fallback`);
            }
          }
        } catch (fallbackError: any) {
          console.error('Fallback query error:', fallbackError);
          debugNotes.push(`❌ Fallback query error: ${fallbackError.message}`);
        }
      }
    } catch (error: any) {
      console.error('Supply query error:', error);
      debugNotes.push(`❌ Supply query error: ${error.message}`);
      if (error.message.includes('index')) {
        console.log('🔗 Index creation needed for supply/loading query');
      }
    }
    
    return { result, debugNotes };
  };

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting enhanced debug data fetch...');
      console.log('📅 Using 30-day filter:', use30DayFilter);
      
      // Get all branches and their tanks
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Found branches:', branches.length);
      
      const debugResults: DebugTankData[] = [];
      
      for (const branch of branches) {
        console.log(`\n🏢 Processing branch: ${branch.name} (${branch.id})`);
        
        // Get sample docs for this branch
        await getSampleDocs(branch.id);
        
        const oilTanks = branch.oilTanks || [];
        console.log(`🛢️ Found ${oilTanks.length} tanks in branch`);
        
        for (let tankIndex = 0; tankIndex < oilTanks.length; tankIndex++) {
          const tank = oilTanks[tankIndex];
          const tankId = `${branch.id}_tank_${tankIndex}`;
          
          console.log(`\n🔍 Processing tank ${tankIndex}: ${tankId}`);
          console.log(`🛢️ Tank details:`, {
            oilTypeName: tank.oilTypeName,
            oilTypeId: tank.oilTypeId,
            currentLevel: tank.currentLevel,
            capacity: tank.capacity
          });
          
          // Query manual updates
          const { result: manualResult, debugNotes: manualNotes } = await queryManualUpdates(
            branch.id, 
            tankId, 
            tank.oilTypeId
          );
          
          // Query supply/loading transactions
          const { result: supplyResult, debugNotes: supplyNotes } = await querySupplyTransactions(
            branch.id, 
            tank.oilTypeId
          );
          
          // Calculate level percentage
          const levelPercent = tank.capacity > 0 
            ? `${Math.round((tank.currentLevel / tank.capacity) * 100)}%`
            : '0%';
          
          // Create debug entry
          const debugEntry: DebugTankData = {
            branchName: branch.name || branch.id,
            tankId: tankId,
            oilTypeName: tank.oilTypeName || 'Unknown',
            levelPercent: levelPercent,
            manualUpdatedAt: manualResult ? convertTimestamp(manualResult.updatedAt) : '–',
            manualUpdatedBy: manualResult?.updatedBy || '–',
            txnType: supplyResult?.type || '–',
            txnTimestamp: supplyResult ? convertTimestamp(supplyResult.timestamp || supplyResult.createdAt) : '–',
            txnDriverName: supplyResult?.driverName || '–',
            debugNotes: [...manualNotes, ...supplyNotes],
            rawManualData: manualResult,
            rawSupplyData: supplyResult
          };
          
          debugResults.push(debugEntry);
        }
      }
      
      console.log(`\n✅ Debug fetch complete. Found ${debugResults.length} tank entries.`);
      setDebugData(debugResults);
      
    } catch (error: any) {
      console.error('❌ Debug fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, [use30DayFilter]); // Refetch when date filter changes

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'night' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🔍 Monitoring Debug Mode</h1>
          <p className="text-gray-600 mb-4">
            Enhanced debugging with fallback queries and detailed console logging
          </p>
          
          <div className="flex gap-4 mb-4">
            <Button
              onClick={fetchDebugData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? '🔄 Loading...' : '🔄 Refresh Data'}
            </Button>
            
            <Button
              onClick={() => setUse30DayFilter(!use30DayFilter)}
              variant={use30DayFilter ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              📅 {use30DayFilter ? 'Using 30-day filter' : 'No date filter'}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Debug Results Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">tankId</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">level%</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">manual.updatedAt</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">manual.updatedBy</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">txn.type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">txn.timestamp</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">txn.driverName</th>
                  </tr>
                </thead>
                <tbody>
                  {debugData.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{row.tankId}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-bold">{row.levelPercent}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{row.manualUpdatedAt}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.manualUpdatedBy}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.txnType}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{row.txnTimestamp}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.txnDriverName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {debugData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No debug data available. Click "Refresh Data" to fetch tank information.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Notes & Raw Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {debugData.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <h3 className="font-semibold mb-2">
                    {row.branchName} - {row.tankId} ({row.oilTypeName})
                  </h3>
                  
                  <div className="mb-2">
                    <strong>Debug Notes:</strong>
                    <ul className="list-disc pl-5 mt-1">
                      {row.debugNotes.map((note, noteIndex) => (
                        <li key={noteIndex} className="text-sm">{note}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {(row.rawManualData || row.rawSupplyData) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium text-blue-600">
                        Show Raw JSON Data
                      </summary>
                      <div className="mt-2 space-y-2">
                        {row.rawManualData && (
                          <div>
                            <strong>Manual Update Data:</strong>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(row.rawManualData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {row.rawSupplyData && (
                          <div>
                            <strong>Supply/Loading Data:</strong>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(row.rawSupplyData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">How to Use This Debug Mode:</h3>
          <ol className="list-decimal pl-5 text-sm text-blue-700 space-y-1">
            <li>Click "No date filter" first to see all available data</li>
            <li>Check console logs for detailed query information and sample documents</li>
            <li>Look for "✅" entries in the debug notes showing successful queries</li>
            <li>Click "Using 30-day filter" to test with date restrictions</li>
            <li>Compare results to verify recent vs. older data filtering</li>
            <li>Expand "Show Raw JSON Data" to see actual Firestore document structure</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDebug;
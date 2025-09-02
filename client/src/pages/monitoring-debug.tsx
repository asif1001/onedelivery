import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simple theme detection
const useTheme = () => ({ theme: 'light' });

interface ManualUpdateData {
  branchName: string;
  branchId: string;
  oilTypeName: string;
  oilTypeId: string;
  lastUpdatedAt: string;
  updatedBy: string;
  docId: string;
}

interface SupplyLoadingData {
  branchName: string;
  branchId: string;
  oilTypeName: string;
  oilTypeId: string;
  lastTxnTime: string;
  updatedByDriverName: string;
  type: string;
  docId: string;
}

const MonitoringDebug: React.FC = () => {
  const [manualUpdates, setManualUpdates] = useState<ManualUpdateData[]>([]);
  const [supplyLoading, setSupplyLoading] = useState<SupplyLoadingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [use30DayFilter, setUse30DayFilter] = useState(false);
  const { theme } = useTheme();

  // Helper function to convert timestamps and calculate days ago
  const formatTimestamp = (ts: any): string => {
    if (!ts) return '–';
    try {
      const dt = ts?.toDate ? ts.toDate() : new Date(ts);
      const daysAgo = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
      const isoString = dt.toISOString();
      return `${isoString} (${daysAgo} days ago)`;
    } catch (e) {
      return '–';
    }
  };

  // Get sample documents for console diagnostics
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
        console.log('📄 Sample tankUpdateLogs available keys:', Object.keys(sampleLog.data()));
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
        console.log('📄 Sample transactions available keys:', Object.keys(sampleTxn.data()));
        console.log('📄 Sample transactions data:', sampleTxn.data());
      } else {
        console.log('⚠️ No transactions found for this branch');
      }
    } catch (error) {
      console.error('Error getting sample docs:', error);
    }
  };

  // Query manual updates for specific branch+oilType
  const queryManualUpdate = async (branchId: string, oilTypeId: string, oilTypeName: string, branchName: string) => {
    console.log(`\n🔍 Querying manual updates for branchId: ${branchId}, oilTypeId: ${oilTypeId}`);
    
    // Build date filter if enabled
    const dateFilter = use30DayFilter 
      ? Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000))
      : null;

    try {
      // Primary query: by oilTypeId
      const primaryFilters = [
        where("branchId", "==", branchId),
        where("oilTypeId", "==", oilTypeId),
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
      
      console.log('🔍 Manual update query constraints:', primaryFilters.map(f => f.toString()));
      const primarySnapshot = await getDocs(primaryQuery);
      
      if (!primarySnapshot.empty) {
        const doc = primarySnapshot.docs[0];
        const data = doc.data();
        console.log(`✅ Found manual update by oilTypeId:`, data);
        
        return {
          branchName,
          branchId,
          oilTypeName,
          oilTypeId,
          lastUpdatedAt: formatTimestamp(data.updatedAt),
          updatedBy: data.updatedBy || '–',
          docId: doc.id
        };
      } else {
        console.log(`❌ No manual update found by oilTypeId, trying tankId fallback...`);
        
        // Fallback: try by tankId
        const tankId = `${branchId}_tank_0`; // Simple fallback tankId
        const fallbackFilters = [
          where("branchId", "==", branchId),
          where("tankId", "==", tankId),
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
        
        console.log('🔍 Manual update fallback query constraints:', fallbackFilters.map(f => f.toString()));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (!fallbackSnapshot.empty) {
          const doc = fallbackSnapshot.docs[0];
          const data = doc.data();
          console.log(`✅ Found manual update by tankId fallback:`, data);
          
          return {
            branchName,
            branchId,
            oilTypeName,
            oilTypeId,
            lastUpdatedAt: formatTimestamp(data.updatedAt),
            updatedBy: data.updatedBy || '–',
            docId: doc.id
          };
        } else {
          console.log(`❌ No manual update found by tankId fallback either`);
        }
      }
    } catch (error: any) {
      console.error('Manual query error:', error);
      if (error.message.includes('index')) {
        console.log('🔗 Index creation needed - check Firebase console for the link');
      }
    }
    
    // Return empty result if no data found
    return {
      branchName,
      branchId,
      oilTypeName,
      oilTypeId,
      lastUpdatedAt: '–',
      updatedBy: '–',
      docId: '–'
    };
  };

  // Query supply/loading transactions for specific branch+oilType
  const querySupplyLoading = async (branchId: string, oilTypeId: string, oilTypeName: string, branchName: string) => {
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
      
      console.log('🔍 Supply/loading query constraints:', primaryFilters.map(f => f.toString()));
      const primarySnapshot = await getDocs(primaryQuery);
      
      if (!primarySnapshot.empty) {
        const doc = primarySnapshot.docs[0];
        const data = doc.data();
        console.log(`✅ Found supply/loading transaction:`, data);
        
        return {
          branchName,
          branchId,
          oilTypeName,
          oilTypeId,
          lastTxnTime: formatTimestamp(data.timestamp),
          updatedByDriverName: data.driverName || '–',
          type: data.type || '–',
          docId: doc.id
        };
      } else {
        console.log(`❌ No supply/loading found by timestamp, trying createdAt fallback...`);
        
        // Fallback: try createdAt instead of timestamp
        const fallbackFilters = [
          where("branchId", "==", branchId),
          where("oilTypeId", "==", oilTypeId),
          where("type", "in", ["supply", "loading"])
        ];
        
        if (dateFilter) {
          fallbackFilters.push(where("createdAt", ">=", dateFilter));
        }
        
        const fallbackQuery = query(
          collection(db, "transactions"),
          ...fallbackFilters,
          orderBy("createdAt", "desc"),
          limit(1)
        );
        
        console.log('🔍 Supply/loading createdAt fallback query constraints:', fallbackFilters.map(f => f.toString()));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (!fallbackSnapshot.empty) {
          const doc = fallbackSnapshot.docs[0];
          const data = doc.data();
          console.log(`✅ Found supply/loading by createdAt fallback:`, data);
          
          return {
            branchName,
            branchId,
            oilTypeName,
            oilTypeId,
            lastTxnTime: formatTimestamp(data.createdAt),
            updatedByDriverName: data.driverName || '–',
            type: data.type || '–',
            docId: doc.id
          };
        } else {
          console.log(`❌ No supply/loading found by createdAt fallback either`);
        }
      }
    } catch (error: any) {
      console.error('Supply/loading query error:', error);
      if (error.message.includes('index')) {
        console.log('🔗 Index creation needed - check Firebase console for the link');
      }
    }
    
    // Return empty result if no data found
    return {
      branchName,
      branchId,
      oilTypeName,
      oilTypeId,
      lastTxnTime: '–',
      updatedByDriverName: '–',
      type: '–',
      docId: '–'
    };
  };

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting debug data fetch...');
      console.log('📅 Using 30-day filter:', use30DayFilter);
      
      // Get all branches and their tanks
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Found branches:', branches.length);
      
      const manualResults: ManualUpdateData[] = [];
      const supplyResults: SupplyLoadingData[] = [];
      
      for (const branch of branches) {
        console.log(`\n🏢 Processing branch: ${branch.name} (${branch.id})`);
        
        // Get sample docs for this branch
        await getSampleDocs(branch.id);
        
        const oilTanks = branch.oilTanks || [];
        console.log(`🛢️ Found ${oilTanks.length} tanks in branch`);
        
        for (let tankIndex = 0; tankIndex < oilTanks.length; tankIndex++) {
          const tank = oilTanks[tankIndex];
          
          console.log(`\n🔍 Processing tank ${tankIndex}:`);
          console.log(`🛢️ Tank details:`, {
            oilTypeName: tank.oilTypeName,
            oilTypeId: tank.oilTypeId,
            currentLevel: tank.currentLevel,
            capacity: tank.capacity
          });
          
          // Query manual updates for this branch+oilType pair
          const manualResult = await queryManualUpdate(
            branch.id,
            tank.oilTypeId,
            tank.oilTypeName,
            branch.name
          );
          manualResults.push(manualResult);
          
          // Query supply/loading for this branch+oilType pair
          const supplyResult = await querySupplyLoading(
            branch.id,
            tank.oilTypeId,
            tank.oilTypeName,
            branch.name
          );
          supplyResults.push(supplyResult);
        }
      }
      
      console.log(`\n✅ Debug fetch complete.`);
      console.log(`📋 Manual updates found: ${manualResults.filter(r => r.lastUpdatedAt !== '–').length}/${manualResults.length}`);
      console.log(`📋 Supply/loading found: ${supplyResults.filter(r => r.lastTxnTime !== '–').length}/${supplyResults.length}`);
      
      setManualUpdates(manualResults);
      setSupplyLoading(supplyResults);
      
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
          <h1 className="text-3xl font-bold mb-2">Monitoring Debug - Separate Collections</h1>
          <p className="text-gray-600 mb-4">
            Query each collection separately to verify data availability and field names.
          </p>
          
          <div className="flex gap-4 mb-4">
            <Button
              onClick={fetchDebugData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
            
            <Button
              onClick={() => setUse30DayFilter(!use30DayFilter)}
              variant={use30DayFilter ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              {use30DayFilter ? 'Using 30-day filter' : 'No date filter'}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Table A - Manual Updates */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Table A - Manual Updates (tankUpdateLogs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">branchId</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeId</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">lastUpdatedAt</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">updatedBy</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">docId</th>
                  </tr>
                </thead>
                <tbody>
                  {manualUpdates.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{row.branchId}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{row.oilTypeId}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs">{row.lastUpdatedAt}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.updatedBy}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">{row.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {manualUpdates.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No manual updates data. Click "Refresh Data" to fetch.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table B - Supply/Loading */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Table B - Supply/Loading (transactions)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">branchId</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeId</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">lastTxnTime</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">updatedBy(driverName)</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">docId</th>
                  </tr>
                </thead>
                <tbody>
                  {supplyLoading.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{row.branchId}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{row.oilTypeId}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs">{row.lastTxnTime}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.updatedByDriverName}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.type}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">{row.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {supplyLoading.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No supply/loading data. Click "Refresh Data" to fetch.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Debug Instructions:</h3>
          <ol className="list-decimal pl-5 text-sm text-blue-700 space-y-1">
            <li>Start with "No date filter" to see all available data</li>
            <li>Check browser console for detailed query constraints and sample documents</li>
            <li>Look for rows with actual data (not "–") to verify queries work</li>
            <li>Toggle "30-day filter" to test date-based filtering</li>
            <li>Non-empty rows indicate successful queries for those branch+oilType pairs</li>
            <li>Console shows sample document structure and available field names</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDebug;
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const useTheme = () => ({ theme: 'light' });

interface TransactionRow {
  branchName: string;
  oilTypeName: string;
  lastTxnTime: string;
  updatedBy: string;
  type: string;
  docId: string;
  rawData?: any;
}

interface ManualUpdateRow {
  branchName: string;
  tankIdOilTypeName: string;
  lastManualTime: string;
  updatedBy: string;
  docId: string;
  rawData?: any;
}

const MonitoringDebug: React.FC = () => {
  const [transactionRows, setTransactionRows] = useState<TransactionRow[]>([]);
  const [manualUpdateRows, setManualUpdateRows] = useState<ManualUpdateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  // Helper to format timestamps
  const formatTimestamp = (ts: any): string => {
    if (!ts) return '-';
    try {
      const dt = ts?.toDate ? ts.toDate() : new Date(ts);
      const daysAgo = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
      const isoString = dt.toISOString();
      return `${isoString} (${daysAgo} days ago)`;
    } catch (e) {
      return '-';
    }
  };

  // Query latest transaction for a specific branch+oilType pair
  const queryLatestTransaction = async (branchId: string, oilTypeId: string, branchName: string, oilTypeName: string) => {
    console.log(`\n🚛 Querying latest transaction for branchId: ${branchId}, oilTypeId: ${oilTypeId}`);
    
    try {
      // Try timestamp first
      const q1 = query(
        collection(db, "transactions"),
        where("branchId", "==", branchId),
        where("oilTypeId", "==", oilTypeId),
        where("type", "in", ["supply", "loading"]),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      
      console.log(`🔍 Trying timestamp query for ${branchName} - ${oilTypeName}`);
      let snap = await getDocs(q1);
      
      // Fallback to createdAt if empty
      if (snap.empty) {
        console.log(`❌ No results with timestamp, trying createdAt for ${branchName} - ${oilTypeName}`);
        const q2 = query(
          collection(db, "transactions"),
          where("branchId", "==", branchId),
          where("oilTypeId", "==", oilTypeId),
          where("type", "in", ["supply", "loading"]),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        snap = await getDocs(q2);
      }
      
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();
        const txnTime = data.timestamp || data.createdAt;
        
        const result: TransactionRow = {
          branchName,
          oilTypeName,
          lastTxnTime: formatTimestamp(txnTime),
          updatedBy: data.driverName || '-',
          type: data.type || '-',
          docId: doc.id,
          rawData: data
        };
        
        console.log(`✅ Found transaction for ${branchName} - ${oilTypeName}:`, result);
        console.log(`📄 Raw transaction data:`, data);
        console.log(`📍 Document ID: ${doc.id}`);
        
        return result;
      } else {
        console.log(`❌ No transactions found for ${branchName} - ${oilTypeName}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Transaction query error for ${branchName} - ${oilTypeName}:`, error);
      if (error.message.includes('index')) {
        console.log('🔗 Index creation needed for transactions query');
      }
      return null;
    }
  };

  // Query latest manual update for a specific branch+tank/oilType pair
  const queryLatestManual = async (branchId: string, branchName: string, tankId?: string, oilTypeId?: string, oilTypeName?: string) => {
    console.log(`\n🔍 Querying latest manual update for branchId: ${branchId}, tankId: ${tankId}, oilTypeId: ${oilTypeId}`);
    
    const since30d = Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000));
    
    const tryField = async (field: string, value: string) => {
      console.log(`🔍 Trying manual update with ${field}: ${value}`);
      try {
        const q = query(
          collection(db, "tankUpdateLogs"),
          where("branchId", "==", branchId),
          where(field, "==", value),
          where("updateType", "in", ["manual", "manual_with_photos"]),
          where("updatedAt", ">=", since30d),
          orderBy("updatedAt", "desc"),
          limit(1)
        );
        const s = await getDocs(q);
        
        if (s.empty) {
          console.log(`❌ No manual updates found with ${field}: ${value}`);
          return null;
        }
        
        const doc = s.docs[0];
        const d = doc.data();
        
        const result: ManualUpdateRow = {
          branchName,
          tankIdOilTypeName: d.tankId || oilTypeName || 'Unknown',
          lastManualTime: formatTimestamp(d.updatedAt),
          updatedBy: d.updatedBy || '-',
          docId: doc.id,
          rawData: d
        };
        
        console.log(`✅ Found manual update with ${field}:`, result);
        console.log(`📄 Raw manual data:`, d);
        console.log(`📍 Document ID: ${doc.id}`);
        
        return result;
      } catch (error: any) {
        console.error(`❌ Manual query error with ${field}:`, error);
        if (error.message.includes('index')) {
          console.log(`🔗 Index creation needed for tankUpdateLogs query with ${field}`);
        }
        return null;
      }
    };
    
    // Try tankId first, then oilTypeId
    return (tankId && await tryField("tankId", tankId)) 
        || (oilTypeId && await tryField("oilTypeId", oilTypeId)) 
        || null;
  };

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting monitoring debug fetch...');
      
      // Get all branches and their tanks to build (branchId, oilTypeId) pairs
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Found ${branches.length} branches`);
      
      const txnResults: TransactionRow[] = [];
      const manualResults: ManualUpdateRow[] = [];
      
      // Collect all unique (branchId, oilTypeId) pairs
      const pairs = new Set<string>();
      
      for (const branch of branches) {
        const oilTanks = branch.oilTanks || [];
        console.log(`\n🏢 Processing branch: ${branch.name} (${branch.id}) with ${oilTanks.length} tanks`);
        
        for (let tankIndex = 0; tankIndex < oilTanks.length; tankIndex++) {
          const tank = oilTanks[tankIndex];
          const tankId = `${branch.id}_tank_${tankIndex}`;
          const pairKey = `${branch.id}|${tank.oilTypeId}`;
          
          console.log(`\n🔍 Processing tank ${tankIndex}: ${tank.oilTypeName}`);
          
          // Query transactions (one per branchId+oilTypeId pair, avoid duplicates)
          if (!pairs.has(pairKey)) {
            pairs.add(pairKey);
            const txnResult = await queryLatestTransaction(
              branch.id,
              tank.oilTypeId,
              branch.name || branch.id,
              tank.oilTypeName || 'Unknown'
            );
            if (txnResult) {
              txnResults.push(txnResult);
            }
          }
          
          // Query manual updates (one per tank/oilType)
          const manualResult = await queryLatestManual(
            branch.id,
            branch.name || branch.id,
            tankId,
            tank.oilTypeId,
            tank.oilTypeName
          );
          if (manualResult) {
            manualResults.push(manualResult);
          }
        }
      }
      
      console.log(`\n✅ Debug fetch complete.`);
      console.log(`📋 Transaction rows: ${txnResults.length}`);
      console.log(`📋 Manual update rows: ${manualResults.length}`);
      
      setTransactionRows(txnResults);
      setManualUpdateRows(manualResults);
      
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
          <h1 className="text-3xl font-bold mb-2">Monitoring Debug - Separate Lists</h1>
          <p className="text-gray-600 mb-4">
            Two separate lists: Latest transactions (no date limit) and Manual updates (last 30 days).
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

        {/* List A - Transactions (Latest) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>List A - Transactions (Latest) - {transactionRows.length} rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">lastTxnTime</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">updatedBy (driverName)</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">type</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">docId</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.lastTxnTime}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.updatedBy}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.type}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {transactionRows.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No transaction data found. Click "Refresh Data" to fetch.
              </div>
            )}
          </CardContent>
        </Card>

        {/* List B - Manual Updates (Last 30 Days) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>List B - Manual Updates (Last 30 Days) - {manualUpdateRows.length} rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">tankId / oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">lastManualTime</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">updatedBy</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">docId</th>
                  </tr>
                </thead>
                <tbody>
                  {manualUpdateRows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.tankIdOilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.lastManualTime}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.updatedBy}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {manualUpdateRows.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No manual updates found in last 30 days. Click "Refresh Data" to fetch.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raw Data Debug Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Raw Data Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Transaction Raw Data */}
              {transactionRows.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Transaction Raw Data (First 3)</h4>
                  {transactionRows.slice(0, 3).map((row, index) => (
                    <details key={index} className="mb-2">
                      <summary className="cursor-pointer font-medium text-blue-600">
                        {row.branchName} - {row.oilTypeName} ({row.docId})
                      </summary>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-2">
                        {JSON.stringify(row.rawData, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
              
              {/* Manual Update Raw Data */}
              {manualUpdateRows.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Manual Update Raw Data (First 3)</h4>
                  {manualUpdateRows.slice(0, 3).map((row, index) => (
                    <details key={index} className="mb-2">
                      <summary className="cursor-pointer font-medium text-blue-600">
                        {row.branchName} - {row.tankIdOilTypeName} ({row.docId})
                      </summary>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mt-2">
                        {JSON.stringify(row.rawData, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Query Summary:</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>List A (Transactions):</strong> Latest supply/loading per (branchId + oilTypeId), no date limit, prefers timestamp over createdAt</p>
            <p><strong>List B (Manual Updates):</strong> Latest manual updates per tank/oilType, last 30 days only, tries tankId then oilTypeId</p>
            <p><strong>Console Logs:</strong> Check browser console for detailed query info, raw data objects, and document IDs</p>
            <p><strong>Index Requirements:</strong> May need composite indexes for efficient queries</p>
            <ul className="list-disc pl-5 mt-1">
              <li>transactions: (branchId, oilTypeId, type) + timestamp desc</li>
              <li>transactions: (branchId, oilTypeId, type) + createdAt desc</li>
              <li>tankUpdateLogs: (branchId, tankId, updateType) + updatedAt desc</li>
              <li>tankUpdateLogs: (branchId, oilTypeId, updateType) + updatedAt desc</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDebug;
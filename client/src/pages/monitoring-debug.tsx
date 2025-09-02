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
      
      const txnResults: TransactionDebugRow[] = [];
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId || 'Unknown';
        
        const row: TransactionDebugRow = {
          oilTypeName: data.oilTypeName || 'Unknown',
          driverName: data.driverName || '-',
          createdAt: formatTimestamp(data.createdAt || data.timestamp),
          branchName: branchName,
          docId: doc.id
        };
        
        txnResults.push(row);
        console.log(`✅ Transaction: ${row.oilTypeName} by ${row.driverName} at ${row.branchName}`);
      });

      // Fetch tankUpdateLogs from last 30 days
      console.log('\n🛢️ Fetching tankUpdateLogs from last 30 days...');
      const tankLogsQuery = query(
        collection(db, 'tankUpdateLogs'),
        where('updatedAt', '>=', since30d),
        orderBy('updatedAt', 'desc'),
        limit(100)
      );
      
      const tankLogsSnapshot = await getDocs(tankLogsQuery);
      const tankResults: TankUpdateLogRow[] = [];
      
      tankLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const branchName = branchMap.get(data.branchId) || data.branchName || data.branchId || 'Unknown';
        
        const row: TankUpdateLogRow = {
          oilTypeName: data.oilTypeName || 'Unknown',
          branchName: branchName,
          updatedAt: formatTimestamp(data.updatedAt),
          updatedBy: data.updatedBy || '-',
          docId: doc.id
        };
        
        tankResults.push(row);
        console.log(`✅ Tank Update: ${row.oilTypeName} by ${row.updatedBy} at ${row.branchName}`);
      });
      
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

        {/* Transactions Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Transactions Collection (Last 30 Days) - {transactionRows.length} rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">driverName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">createdAt</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">docId</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.driverName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.createdAt}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {transactionRows.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No transactions found in the last 30 days.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tank Update Logs Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>TankUpdateLogs Collection (Last 30 Days) - {tankUpdateRows.length} rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">updatedAt</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">updatedBy</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">docId</th>
                  </tr>
                </thead>
                <tbody>
                  {tankUpdateRows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.updatedAt}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.updatedBy}</td>
                      <td className="border border-gray-300 px-4 py-2 text-xs font-mono">{row.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {tankUpdateRows.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No tank updates found in the last 30 days.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Query Details:</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Transactions:</strong> Shows oilTypeName, driverName, createdAt, branchName from last 30 days</p>
            <p><strong>TankUpdateLogs:</strong> Shows oilTypeName, branchName (converted from branchId), updatedAt, updatedBy from last 30 days</p>
            <p><strong>Branch Mapping:</strong> branchId is automatically converted to branchName using branches collection</p>
            <p><strong>Time Filter:</strong> Both queries limited to documents from the last 30 days only</p>
            <p><strong>Fallback:</strong> Transactions query tries createdAt first, falls back to timestamp if needed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDebug;
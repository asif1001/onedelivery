import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const useTheme = () => ({ theme: 'light' });

interface MonitoringRow {
  branchName: string;
  oilTypeName: string;
  txnLastTime: string;
  txnBy: string;
  manualLastTime: string;
  manualBy: string;
  debugInfo: {
    branchId: string;
    oilTypeId: string;
    tankId?: string;
    rawTxnData?: any;
    rawManualData?: any;
    txnDocPath?: string;
    manualDocPath?: string;
  };
}

const MonitoringDebug: React.FC = () => {
  const [monitoringRows, setMonitoringRows] = useState<MonitoringRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  // Get latest supply/loading transaction (no date limit)
  const getLatestTransaction = async (branchId: string, oilTypeId: string) => {
    console.log(`\n🚛 Getting latest transaction for branchId: ${branchId}, oilTypeId: ${oilTypeId}`);
    
    const base = [
      where("branchId", "==", branchId),
      where("oilTypeId", "==", oilTypeId),
      where("type", "in", ["supply", "loading"]),
    ];

    try {
      // Try timestamp first
      let q = query(
        collection(db, "transactions"),
        ...base,
        orderBy("timestamp", "desc"),
        limit(1)
      );
      
      console.log('🔍 Trying transactions query with timestamp orderBy');
      let snap = await getDocs(q);

      // Fallback to createdAt if needed
      if (snap.empty) {
        console.log('❌ No results with timestamp, trying createdAt fallback');
        q = query(
          collection(db, "transactions"),
          ...base,
          orderBy("createdAt", "desc"),
          limit(1)
        );
        snap = await getDocs(q);
      }

      let txnTime = "-";
      let txnBy = "-";
      let rawData = null;
      let docPath = null;

      if (!snap.empty) {
        const doc = snap.docs[0];
        const d = doc.data();
        const dtRaw = d.timestamp ?? d.createdAt;
        const dt = dtRaw?.toDate ? dtRaw.toDate() : new Date(dtRaw);
        txnTime = dt.toISOString();
        txnBy = d.driverName ?? "-";
        rawData = d;
        docPath = `transactions/${doc.id}`;
        
        console.log(`✅ Found transaction: ${txnTime} by ${txnBy}`);
        console.log('📄 Raw transaction data:', rawData);
        console.log('📍 Document path:', docPath);
      } else {
        console.log('❌ No transactions found for this pair');
      }

      return { txnTime, txnBy, rawData, docPath };
    } catch (error: any) {
      console.error('❌ Transaction query error:', error);
      if (error.message.includes('index')) {
        console.log('🔗 Index creation needed for transactions query');
      }
      return { txnTime: "-", txnBy: "-", rawData: null, docPath: null };
    }
  };

  // Get latest manual update (last 30 days only)
  const getLatestManual = async (branchId: string, oilTypeId: string, tankId?: string) => {
    console.log(`\n🔍 Getting latest manual update for branchId: ${branchId}, oilTypeId: ${oilTypeId}, tankId: ${tankId}`);
    
    const since30d = Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000));

    const tryWith = async (field: string, value: string) => {
      console.log(`🔍 Trying manual update query with ${field}: ${value}`);
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
        const snap = await getDocs(q);
        
        if (snap.empty) {
          console.log(`❌ No manual updates found with ${field}: ${value}`);
          return null;
        }
        
        const doc = snap.docs[0];
        const d = doc.data();
        const dt = d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(d.updatedAt);
        const result = { 
          time: dt.toISOString(), 
          by: d.updatedBy ?? "-",
          rawData: d,
          docPath: `tankUpdateLogs/${doc.id}`
        };
        
        console.log(`✅ Found manual update with ${field}: ${result.time} by ${result.by}`);
        console.log('📄 Raw manual data:', result.rawData);
        console.log('📍 Document path:', result.docPath);
        
        return result;
      } catch (error: any) {
        console.error(`❌ Manual query error with ${field}:`, error);
        if (error.message.includes('index')) {
          console.log(`🔗 Index creation needed for tankUpdateLogs query with ${field}`);
        }
        return null;
      }
    };

    // Try tankId first (if available), then oilTypeId
    const manual = (tankId && await tryWith("tankId", tankId))
                || (oilTypeId && await tryWith("oilTypeId", oilTypeId))
                || null;

    const manualTime = manual?.time ?? "-";
    const manualBy = manual?.by ?? "-";
    const rawData = manual?.rawData ?? null;
    const docPath = manual?.docPath ?? null;

    if (!manual) {
      console.log('❌ No manual updates found with any field');
    }

    return { manualTime, manualBy, rawData, docPath };
  };

  const fetchMonitoringData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting monitoring debug fetch...');
      
      // Get all branches and their tanks
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Found ${branches.length} branches`);
      
      const rows: MonitoringRow[] = [];
      
      for (const branch of branches) {
        console.log(`\n🏢 Processing branch: ${branch.name} (${branch.id})`);
        
        const oilTanks = branch.oilTanks || [];
        console.log(`🛢️ Found ${oilTanks.length} tanks in branch`);
        
        for (let tankIndex = 0; tankIndex < oilTanks.length; tankIndex++) {
          const tank = oilTanks[tankIndex];
          const tankId = `${branch.id}_tank_${tankIndex}`;
          
          console.log(`\n🔍 Processing tank ${tankIndex}:`);
          console.log(`🛢️ Tank details:`, {
            oilTypeName: tank.oilTypeName,
            oilTypeId: tank.oilTypeId,
            currentLevel: tank.currentLevel,
            capacity: tank.capacity
          });
          
          // Get latest transaction (no date limit)
          const { txnTime, txnBy, rawData: txnRawData, docPath: txnDocPath } = await getLatestTransaction(
            branch.id,
            tank.oilTypeId
          );
          
          // Get latest manual update (30 days only)
          const { manualTime, manualBy, rawData: manualRawData, docPath: manualDocPath } = await getLatestManual(
            branch.id,
            tank.oilTypeId,
            tankId
          );
          
          const row: MonitoringRow = {
            branchName: branch.name || branch.id,
            oilTypeName: tank.oilTypeName || 'Unknown',
            txnLastTime: txnTime,
            txnBy: txnBy,
            manualLastTime: manualTime,
            manualBy: manualBy,
            debugInfo: {
              branchId: branch.id,
              oilTypeId: tank.oilTypeId,
              tankId: tankId,
              rawTxnData: txnRawData,
              rawManualData: manualRawData,
              txnDocPath: txnDocPath,
              manualDocPath: manualDocPath
            }
          };
          
          rows.push(row);
          
          // Console log the row as requested
          console.log(`\n📊 Row for ${branch.name} - ${tank.oilTypeName}:`);
          console.log(`${row.branchName} | ${row.oilTypeName} | ${row.txnLastTime} | ${row.txnBy} | ${row.manualLastTime} | ${row.manualBy}`);
          console.log('🔍 Debug info:', row.debugInfo);
        }
      }
      
      console.log(`\n✅ Monitoring debug complete. Generated ${rows.length} rows.`);
      console.log(`📋 Rows with transaction data: ${rows.filter(r => r.txnLastTime !== '-').length}`);
      console.log(`📋 Rows with manual data (30d): ${rows.filter(r => r.manualLastTime !== '-').length}`);
      
      setMonitoringRows(rows);
      
    } catch (error: any) {
      console.error('❌ Monitoring debug error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []); // Fetch once on mount

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'night' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Monitoring Debug - Per Branch+OilType Pair</h1>
          <p className="text-gray-600 mb-4">
            One row per (branchId, oilTypeId) pair showing latest transaction and manual update (30d).
          </p>
          
          <div className="flex gap-4 mb-4">
            <Button
              onClick={fetchMonitoringData}
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

        <Card>
          <CardHeader>
            <CardTitle>Monitoring Results ({monitoringRows.length} pairs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">branchName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">oilTypeName</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Txn.lastTime</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Txn.by</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Manual(30d).lastTime</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Manual(30d).by</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringRows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{row.branchName}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.oilTypeName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{row.txnLastTime}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.txnBy}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{row.manualLastTime}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.manualBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {monitoringRows.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No monitoring data available. Click "Refresh Data" to fetch.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Details & Raw Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monitoringRows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <h3 className="font-semibold mb-2">
                    {row.branchName} - {row.oilTypeName}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Branch ID:</strong> {row.debugInfo.branchId}<br/>
                      <strong>Oil Type ID:</strong> {row.debugInfo.oilTypeId}<br/>
                      <strong>Tank ID:</strong> {row.debugInfo.tankId || 'N/A'}
                    </div>
                    <div>
                      <strong>Transaction Doc:</strong> {row.debugInfo.txnDocPath || 'None'}<br/>
                      <strong>Manual Doc:</strong> {row.debugInfo.manualDocPath || 'None'}
                    </div>
                  </div>
                  
                  {(row.debugInfo.rawTxnData || row.debugInfo.rawManualData) && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-medium text-blue-600">
                        Show Raw Data Objects
                      </summary>
                      <div className="mt-2 space-y-2">
                        {row.debugInfo.rawTxnData && (
                          <div>
                            <strong>Transaction Raw Data:</strong>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(row.debugInfo.rawTxnData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {row.debugInfo.rawManualData && (
                          <div>
                            <strong>Manual Update Raw Data:</strong>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(row.debugInfo.rawManualData, null, 2)}
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
          <h3 className="font-semibold text-blue-800 mb-2">Query Summary:</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Transactions:</strong> Latest supply/loading per (branchId + oilTypeId), no date limit, prefer timestamp over createdAt</p>
            <p><strong>Manual Updates:</strong> Latest manual update per pair, last 30 days only, try tankId then oilTypeId</p>
            <p><strong>Console Logs:</strong> Check browser console for detailed query info, raw objects, and document paths</p>
            <p><strong>Index Requirements:</strong> May need composite indexes for (branchId, oilTypeId, type) and (branchId, tankId/oilTypeId, updateType)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDebug;
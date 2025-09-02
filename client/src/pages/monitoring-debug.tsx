import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Simple theme detection - will be replaced with proper theme provider later
const useTheme = () => ({ theme: 'light' });

interface DebugTankData {
  branchId: string;
  branchName: string;
  tankId: string;
  oilTypeId: string;
  oilTypeName: string;
  currentLevelPct: number;
  manual: {
    updatedAt: string | null;
    updatedBy: string | null;
    docId: string | null;
  };
  transaction: {
    type: string | null;
    timestamp: string | null;
    driverName: string | null;
    docId: string | null;
  };
}

const MonitoringDebug: React.FC = () => {
  const [debugData, setDebugData] = useState<DebugTankData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Starting debug data fetch...');
      
      // First, get all branches and their tanks
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Found branches:', branches.length);
      
      const debugResults: DebugTankData[] = [];
      const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30*24*60*60*1000));
      
      for (const branch of branches) {
        const oilTanks = branch.oilTanks || [];
        
        for (let tankIndex = 0; tankIndex < oilTanks.length; tankIndex++) {
          const tank = oilTanks[tankIndex];
          const tankId = `${branch.id}_tank_${tankIndex}`;
          
          console.log(`\n🔍 Processing tank: ${tankId} (${tank.oilTypeName})`);
          
          // Query 1: Manual updates from tankUpdateLogs
          const qManual = query(
            collection(db, "tankUpdateLogs"),
            where("branchId", "==", branch.id),
            where("tankId", "==", tankId),
            where("updatedAt", ">=", thirtyDaysAgo),
            orderBy("updatedAt", "desc"),
            limit(1)
          );
          
          let manualData = {
            updatedAt: null as string | null,
            updatedBy: null as string | null,
            docId: null as string | null
          };
          
          try {
            const manualSnapshot = await getDocs(qManual);
            if (!manualSnapshot.empty) {
              const doc = manualSnapshot.docs[0];
              const data = doc.data();
              manualData = {
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
                updatedBy: data.updatedBy || null,
                docId: `tankUpdateLogs/${doc.id}`
              };
              console.log(`✅ Manual update found:`, manualData);
            } else {
              console.log(`❌ No manual updates found for ${tankId}`);
            }
          } catch (err) {
            console.error(`Error querying manual updates for ${tankId}:`, err);
          }
          
          // Query 2: Supply/Loading from transactions
          const qTxn = query(
            collection(db, "transactions"),
            where("branchId", "==", branch.id),
            where("type", "in", ["supply", "loading"]),
            where("timestamp", ">=", thirtyDaysAgo),
            orderBy("timestamp", "desc"),
            limit(50) // Get more to filter locally by oil type
          );
          
          let transactionData = {
            type: null as string | null,
            timestamp: null as string | null,
            driverName: null as string | null,
            docId: null as string | null
          };
          
          try {
            const txnSnapshot = await getDocs(qTxn);
            if (!txnSnapshot.empty) {
              // Filter by oil type locally since transactions might use oilTypeId or oilTypeName
              const matchingTxns = txnSnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.oilTypeId === tank.oilTypeId || data.oilTypeName === tank.oilTypeName;
              });
              
              if (matchingTxns.length > 0) {
                const doc = matchingTxns[0]; // Most recent
                const data = doc.data();
                transactionData = {
                  type: data.type || null,
                  timestamp: data.timestamp?.toDate?.()?.toISOString() || 
                           data.createdAt?.toDate?.()?.toISOString() || null,
                  driverName: data.driverName || data.driverDisplayName || null,
                  docId: `transactions/${doc.id}`
                };
                console.log(`✅ Transaction found:`, transactionData);
              } else {
                console.log(`❌ No matching transactions found for ${tankId} (${tank.oilTypeName})`);
              }
            } else {
              console.log(`❌ No transactions found for branch ${branch.id}`);
            }
          } catch (err) {
            console.error(`Error querying transactions for ${tankId}:`, err);
          }
          
          // Calculate current level percentage
          const currentLevelPct = tank.capacity > 0 ? 
            Number(((tank.currentLevel / tank.capacity) * 100).toFixed(1)) : 0;
          
          debugResults.push({
            branchId: branch.id,
            branchName: branch.name || 'Unknown Branch',
            tankId,
            oilTypeId: tank.oilTypeId || 'unknown',
            oilTypeName: tank.oilTypeName || 'Unknown Oil',
            currentLevelPct,
            manual: manualData,
            transaction: transactionData
          });
        }
      }
      
      console.log('\n📋 Final debug results:', debugResults);
      setDebugData(debugResults);
      
    } catch (err) {
      console.error('❌ Debug fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    return `${daysDiff}d ago`;
  };

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'night' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Monitoring Debug Mode</h1>
          <Button onClick={fetchDebugData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-600">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Query Results (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading debug data...</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className={`min-w-full border-collapse ${
                    theme === 'night' ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    <thead>
                      <tr className={theme === 'night' ? 'bg-gray-800' : 'bg-gray-100'}>
                        <th className="border p-3 text-left">Branch</th>
                        <th className="border p-3 text-left">Tank ID</th>
                        <th className="border p-3 text-left">Oil Type</th>
                        <th className="border p-3 text-left">Level %</th>
                        <th className="border p-3 text-left">Manual Update</th>
                        <th className="border p-3 text-left">Manual By</th>
                        <th className="border p-3 text-left">Transaction Type</th>
                        <th className="border p-3 text-left">Transaction Time</th>
                        <th className="border p-3 text-left">Driver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugData.map((tank, index) => (
                        <tr key={tank.tankId} className={index % 2 === 0 ? 
                          (theme === 'night' ? 'bg-gray-800/50' : 'bg-gray-50') : ''}>
                          <td className="border p-3">{tank.branchName}</td>
                          <td className="border p-3 font-mono text-sm">{tank.tankId}</td>
                          <td className="border p-3">{tank.oilTypeName}</td>
                          <td className="border p-3">{tank.currentLevelPct}%</td>
                          <td className="border p-3">
                            {tank.manual.updatedAt ? (
                              <div>
                                <div className="font-mono text-xs">{tank.manual.updatedAt}</div>
                                <div className="text-sm text-gray-600">{formatTimeAgo(tank.manual.updatedAt)}</div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="border p-3">{tank.manual.updatedBy || '-'}</td>
                          <td className="border p-3">{tank.transaction.type || '-'}</td>
                          <td className="border p-3">
                            {tank.transaction.timestamp ? (
                              <div>
                                <div className="font-mono text-xs">{tank.transaction.timestamp}</div>
                                <div className="text-sm text-gray-600">{formatTimeAgo(tank.transaction.timestamp)}</div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="border p-3">{tank.transaction.driverName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Raw JSON Data:</h3>
                  <pre className={`p-4 rounded text-xs overflow-x-auto ${
                    theme === 'night' ? 'bg-gray-800 text-green-400' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringDebug;
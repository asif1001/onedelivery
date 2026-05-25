import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function DatabaseConnectionTest() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const testConnection = async () => {
    setResults([]);
    addResult('🔄 Starting database connection test...');

    try {
      // Test 1: Write a test document
      addResult('🔧 Testing write access...');
      await setDoc(doc(db, 'test', 'connection'), {
        message: 'Connection test from onedelveiry',
        timestamp: new Date(),
        testType: 'write'
      });
      addResult('✅ Write test successful');

      // Test 2: Read the test document
      addResult('🔧 Testing read access...');
      const docSnap = await getDoc(doc(db, 'test', 'connection'));
      if (docSnap.exists()) {
        addResult('✅ Read test successful');
        addResult(`📄 Data: ${JSON.stringify(docSnap.data())}`);
      } else {
        addResult('❌ Document not found');
      }

      // Test 3: Check existing collections
      addResult('🔧 Checking branches collection...');
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      addResult(`📊 Branches found: ${branchesSnapshot.size}`);

      addResult('🔧 Checking oilTypes collection...');
      const oilTypesSnapshot = await getDocs(collection(db, 'oilTypes'));
      addResult(`📊 Oil types found: ${oilTypesSnapshot.size}`);

      addResult('🔧 Checking tasks collection...');
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      addResult(`📊 Tasks found: ${tasksSnapshot.size}`);

      if (branchesSnapshot.size === 0) {
        addResult('⚠️ No data found - database is empty');
        addResult('📝 You need to add sample data to collections');
      }

      addResult('🎉 Database connection is working!');

    } catch (error: any) {
      addResult(`❌ Error: ${error.code} - ${error.message}`);
      if (error.code === 'permission-denied') {
        addResult('🔒 Firestore rules are blocking access');
        addResult('💡 Need to deploy updated rules');
      }
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">onedelveiry Database Connection Test</h2>
      <button 
        onClick={testConnection}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        🔄 Test Again
      </button>
      <div className="space-y-2">
        {results.map((result, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded text-sm font-mono">
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}
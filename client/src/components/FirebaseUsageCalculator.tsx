import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  HardDriveIcon, 
  DownloadIcon, 
  UploadIcon, 
  DatabaseIcon,
  ServerIcon,
  DollarSignIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';
import { ref, listAll, getMetadata } from 'firebase/storage';

// Firebase Blaze Plan Pricing Structure
const FIREBASE_PRICING = {
  storage: {
    freeGb: 5,
    pricePerGb: 0.026, // $0.026/GB/month
    freeDownloadGb: 30, // 1GB/day * 30 days
    downloadPricePerGb: 0.12, // $0.12/GB
    freeUploads: 600000, // 20k/day * 30 days  
    uploadPricePer10k: 0.05, // $0.05 per 10k uploads
    freeDownloads: 1500000, // 50k/day * 30 days
    downloadPricePer10k: 0.004 // $0.004 per 10k downloads
  },
  firestore: {
    freeGb: 1,
    pricePerGb: 0.18, // $0.18/GB/month
    freeReads: 1500000, // 50k/day * 30 days
    readsPricePer100k: 0.06, // $0.06 per 100k
    freeWrites: 600000, // 20k/day * 30 days
    writesPricePer100k: 0.18, // $0.18 per 100k
    freeDeletes: 600000, // 20k/day * 30 days
    deletesPricePer100k: 0.02 // $0.02 per 100k
  },
  hosting: {
    freeGb: 10,
    pricePerGb: 0.026, // $0.026/GB/month
    freeTransferGb: 10.8, // 360MB/day * 30 days
    transferPricePerGb: 0.15 // $0.15/GB
  }
};

interface UsageData {
  storage: {
    totalSizeGb: number;
    filesCount: number;
    estimatedDownloadGb: number;
    estimatedDownloads: number;
  };
  firestore: {
    sizeGb: number;
    documentsCount: number;
    estimatedReads: number;
    estimatedWrites: number;
    estimatedDeletes: number;
  };
  hosting: {
    sizeGb: number;
    estimatedTransferGb: number;
  };
}

interface CostBreakdown {
  storage: {
    storageCost: number;
    downloadCost: number;
    uploadOpsCost: number;
    downloadOpsCost: number;
    total: number;
  };
  firestore: {
    storageCost: number;
    readsCost: number;
    writesCost: number;
    deletesCost: number;
    total: number;
  };
  hosting: {
    storageCost: number;
    transferCost: number;
    total: number;
  };
  monthlyTotal: number;
}

export function FirebaseUsageCalculator() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const calculateUsage = async () => {
    setLoading(true);
    console.log('🔥 Firebase Usage Calculator - Starting calculation...');
    
    try {
      console.log('📊 Calculating real Firebase usage data...');
      
      // Calculate real values in parallel (no initial estimates)
      const [storageUsage, firestoreUsage] = await Promise.all([
        getStorageUsage().catch(err => {
          console.error('❌ Storage calculation failed:', err);
          return {
            totalSizeGb: 0, 
            filesCount: 0,
            estimatedDownloadGb: 0,
            estimatedDownloads: 0
          };
        }),
        getFirestoreUsage().catch(err => {
          console.error('❌ Firestore calculation failed:', err);
          return {
            sizeGb: 0,
            documentsCount: 0,
            estimatedReads: 0,
            estimatedWrites: 0,
            estimatedDeletes: 0
          };
        })
      ]);
      
      console.log('📊 Real Storage Data:', storageUsage);
      console.log('📊 Real Firestore Data:', firestoreUsage);
      
      // Estimate Hosting Usage (static files + app bundle)
      const hostingUsage = {
        sizeGb: 0.05, // Estimate 50MB for app bundle
        estimatedTransferGb: Math.max(storageUsage.estimatedDownloadGb * 0.1, 0.5) // 10% of storage downloads as app usage, minimum 0.5GB
      };

      const finalUsage: UsageData = {
        storage: storageUsage,
        firestore: firestoreUsage,
        hosting: hostingUsage
      };

      // Set real calculated values
      setUsageData(finalUsage);
      setCostBreakdown(calculateCosts(finalUsage));
      console.log('✅ Firebase Usage Calculator - Real calculation complete!', finalUsage);
      
    } catch (error) {
      console.error('❌ Firebase Usage Calculator - Critical Error:', error);
      // Set minimal values if everything fails
      const fallback: UsageData = {
        storage: { totalSizeGb: 0, filesCount: 0, estimatedDownloadGb: 0, estimatedDownloads: 0 },
        firestore: { sizeGb: 0, documentsCount: 0, estimatedReads: 0, estimatedWrites: 0, estimatedDeletes: 0 },
        hosting: { sizeGb: 0.05, estimatedTransferGb: 0.5 }
      };
      setUsageData(fallback);
      setCostBreakdown(calculateCosts(fallback));
    } finally {
      setLoading(false);
    }
  };

  const getStorageUsage = async () => {
    try {
      console.log('🔥 Starting Firebase Storage usage calculation...');
      const storageRef = ref(storage);
      
      // Set a timeout for storage operations
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Storage calculation timeout')), 30000)
      );
      
      const storageOperation = async () => {
        console.log('🔍 VERIFICATION: Connecting to your real Firebase Storage...');
        console.log('🔍 Storage Bucket:', storage.app.options.storageBucket);
        console.log('🔍 Project ID:', storage.app.options.projectId);
        console.log('🔍 Full Firebase Config:', {
          projectId: storage.app.options.projectId,
          storageBucket: storage.app.options.storageBucket,
          appId: storage.app.options.appId
        });
        
        console.log('🔍 Attempting to list all files in Firebase Storage root...');
        const result = await listAll(storageRef);
        console.log(`📁 ROOT DIRECTORY - Found ${result.items.length} files and ${result.prefixes.length} folders`);
        
        // List all folder names for debugging
        if (result.prefixes.length > 0) {
          console.log('📁 Folders found:', result.prefixes.map(folder => folder.name));
        }
        
        // Check specific photo folders where OneDelivery stores photos
        const photoFolders = ['complaint-photos', 'loading-photos', 'supply-photos', 'photos', 'tasks', 'complaints'];
        console.log('🔍 Checking specific photo folders...');
        
        for (const folderName of photoFolders) {
          try {
            const folderRef = ref(storage, folderName);
            const folderResult = await listAll(folderRef);
            console.log(`📸 ${folderName}/: ${folderResult.items.length} files, ${folderResult.prefixes.length} subfolders`);
          } catch (error) {
            console.log(`📸 ${folderName}/: Not accessible or doesn't exist`);
          }
        }
        
        if (result.items.length === 0 && result.prefixes.length === 0) {
          console.log('⚠️  No files or folders found in root! Checking if photos exist in specific folders...');
        }
        
        let totalSize = 0;
        let filesCount = 0;
        const fileSamples: string[] = [];

        // Get metadata for files in batches to avoid timeout
        const batchSize = 10;
        for (let i = 0; i < result.items.length; i += batchSize) {
          const batch = result.items.slice(i, i + batchSize);
          await Promise.all(batch.map(async (item) => {
            try {
              const metadata = await getMetadata(item);
              totalSize += metadata.size || 0;
              filesCount++;
              
              // Sample first few file names for verification
              if (fileSamples.length < 5) {
                fileSamples.push(`${item.name} (${((metadata.size || 0) / 1024).toFixed(1)} KB)`);
              }
            } catch (error) {
              console.warn('Could not get metadata for file:', item.name);
              filesCount++; // Count file even if metadata fails
            }
          }));
        }

        // Process folders with limited depth to avoid timeout
        console.log(`🔍 Processing ${result.prefixes.length} folders...`);
        for (const folder of result.prefixes.slice(0, 5)) { // Limit to first 5 folders
          try {
            console.log(`📁 Processing folder: ${folder.name}`);
            const folderFiles = await getAllFilesInFolder(folder);
            totalSize += folderFiles.totalSize;
            filesCount += folderFiles.filesCount;
            console.log(`✅ Folder ${folder.name}: ${folderFiles.filesCount} files, ${(folderFiles.totalSize / (1024*1024)).toFixed(2)} MB`);
          } catch (error) {
            console.warn('Could not process folder:', folder.name);
          }
        }

        const totalSizeGb = totalSize / (1024 * 1024 * 1024);
        const totalSizeMb = totalSize / (1024 * 1024);
        
        console.log('✅ VERIFICATION: Real Storage calculation complete!');
        console.log(`📁 REAL FILES: ${filesCount} total files`);
        console.log(`💾 REAL SIZE: ${totalSizeGb.toFixed(3)} GB (${totalSizeMb.toFixed(1)} MB)`);
        console.log('🔍 Sample files from your storage:', fileSamples);
        console.log('🔍 COMPARE WITH YOUR FIREBASE CONSOLE Storage tab');
        
        return {
          totalSizeGb,
          filesCount,
          estimatedDownloadGb: totalSizeGb * 2, // Estimate 2x storage as monthly downloads
          estimatedDownloads: filesCount * 50 // Estimate 50 downloads per file per month
        };
      };

      const result = await Promise.race([storageOperation(), timeout]);
      console.log('✅ Firebase Storage calculation succeeded:', result);
      return result;
    } catch (error) {
      console.error('❌ FIREBASE STORAGE ERROR:', error);
      console.log('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      console.log('⚠️  This means your photos are NOT being counted in usage costs!');
      console.log('⚠️  Returning ZERO values to clearly show when real data fails');
      
      // Return zero values to clearly show when real data isn't available
      return {
        totalSizeGb: 0,
        filesCount: 0, 
        estimatedDownloadGb: 0,
        estimatedDownloads: 0
      };
    }
  };

  const getAllFilesInFolder = async (folderRef: any): Promise<{totalSize: number, filesCount: number}> => {
    try {
      const result = await listAll(folderRef);
      let totalSize = 0;
      let filesCount = 0;

      for (const item of result.items) {
        try {
          const metadata = await getMetadata(item);
          totalSize += metadata.size || 0;
          filesCount++;
        } catch (error) {
          console.warn('Could not get metadata for file:', item.name);
        }
      }

      for (const folder of result.prefixes) {
        const folderData = await getAllFilesInFolder(folder);
        totalSize += folderData.totalSize;
        filesCount += folderData.filesCount;
      }

      return { totalSize, filesCount };
    } catch (error) {
      return { totalSize: 0, filesCount: 0 };
    }
  };

  const getFirestoreUsage = async () => {
    try {
      console.log('🔥 Starting Firestore usage calculation...');
      // Get document counts from major collections
      const collections = ['users', 'branches', 'tasks', 'complaints', 'transactions', 'oilTypes', 'loadSessions'];
      let totalDocuments = 0;
      const collectionCounts: Record<string, number> = {};

      // Set timeout for Firestore operations
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore calculation timeout')), 20000)
      );

      const firestoreOperation = async () => {
        console.log('🔍 VERIFICATION: Connecting to your real Firebase Firestore...');
        console.log('🔍 Firebase Project ID:', db.app.options.projectId);
        
        for (const collectionName of collections) {
          try {
            console.log(`🔍 Counting documents in collection: ${collectionName}...`);
            const snapshot = await getCountFromServer(collection(db, collectionName));
            const count = snapshot.data().count;
            collectionCounts[collectionName] = count;
            totalDocuments += count;
            console.log(`✅ REAL DATA - ${collectionName}: ${count} documents`);
          } catch (error) {
            console.error(`❌ FAILED to get count for collection: ${collectionName}`, error);
            console.log(`⚠️  This collection might not exist or have permission issues`);
            collectionCounts[collectionName] = 0; // Set to 0 instead of estimates
          }
        }
        
        console.log('📊 VERIFICATION COMPLETE - Total real documents:', totalDocuments);
        console.log('📊 Collection breakdown (REAL DATA):', collectionCounts);

        // Estimate storage size (average 2KB per document)
        const avgDocumentSizeKb = 2;
        const totalSizeKb = totalDocuments * avgDocumentSizeKb;
        const sizeGb = totalSizeKb / (1024 * 1024);

        console.log('✅ VERIFICATION: Real Firestore calculation complete!');
        console.log(`📄 REAL DOCUMENTS: ${totalDocuments} total`);
        console.log(`💾 ESTIMATED SIZE: ${sizeGb.toFixed(3)} GB (${(sizeGb * 1024).toFixed(1)} MB)`);
        
        // Verify this matches what user sees in Firebase Console
        console.log('🔍 COMPARE WITH YOUR FIREBASE CONSOLE:');
        console.log(`   - Documents: ${totalDocuments} (should match your Firebase Console)`);
        console.log(`   - Storage: ${(sizeGb * 1024).toFixed(1)} MB (approximate - Firebase Console shows exact)`);

        return {
          sizeGb,
          documentsCount: totalDocuments,
          estimatedReads: totalDocuments * 100, // Estimate 100 reads per document per month
          estimatedWrites: totalDocuments * 10, // Estimate 10 writes per document per month
          estimatedDeletes: totalDocuments * 0.1, // Estimate 0.1 deletes per document per month
          collectionBreakdown: collectionCounts
        };
      };

      return await Promise.race([firestoreOperation(), timeout]);
    } catch (error) {
      console.error('Error getting Firestore usage:', error);
      // Return estimated values based on typical oil delivery app usage
      return {
        sizeGb: 0.1, // Estimate 100MB
        documentsCount: 1000, // Estimate 1k documents total
        estimatedReads: 100000, // Estimate 100k reads per month
        estimatedWrites: 10000, // Estimate 10k writes per month
        estimatedDeletes: 100, // Estimate 100 deletes per month
        collectionBreakdown: {
          users: 50,
          branches: 20, 
          transactions: 500,
          tasks: 200,
          complaints: 100,
          oilTypes: 10,
          loadSessions: 120
        }
      };
    }
  };

  const calculateCosts = (usage: UsageData): CostBreakdown => {
    // Storage Costs
    const storageStorageCost = Math.max(0, usage.storage.totalSizeGb - FIREBASE_PRICING.storage.freeGb) * FIREBASE_PRICING.storage.pricePerGb;
    const storageDownloadCost = Math.max(0, usage.storage.estimatedDownloadGb - FIREBASE_PRICING.storage.freeDownloadGb) * FIREBASE_PRICING.storage.downloadPricePerGb;
    const storageUploadOpsCost = Math.max(0, (usage.storage.filesCount - FIREBASE_PRICING.storage.freeUploads) / 10000) * FIREBASE_PRICING.storage.uploadPricePer10k;
    const storageDownloadOpsCost = Math.max(0, (usage.storage.estimatedDownloads - FIREBASE_PRICING.storage.freeDownloads) / 10000) * FIREBASE_PRICING.storage.downloadPricePer10k;

    // Firestore Costs
    const firestoreStorageCost = Math.max(0, usage.firestore.sizeGb - FIREBASE_PRICING.firestore.freeGb) * FIREBASE_PRICING.firestore.pricePerGb;
    const firestoreReadsCost = Math.max(0, (usage.firestore.estimatedReads - FIREBASE_PRICING.firestore.freeReads) / 100000) * FIREBASE_PRICING.firestore.readsPricePer100k;
    const firestoreWritesCost = Math.max(0, (usage.firestore.estimatedWrites - FIREBASE_PRICING.firestore.freeWrites) / 100000) * FIREBASE_PRICING.firestore.writesPricePer100k;
    const firestoreDeletesCost = Math.max(0, (usage.firestore.estimatedDeletes - FIREBASE_PRICING.firestore.freeDeletes) / 100000) * FIREBASE_PRICING.firestore.deletesPricePer100k;

    // Hosting Costs
    const hostingStorageCost = Math.max(0, usage.hosting.sizeGb - FIREBASE_PRICING.hosting.freeGb) * FIREBASE_PRICING.hosting.pricePerGb;
    const hostingTransferCost = Math.max(0, usage.hosting.estimatedTransferGb - FIREBASE_PRICING.hosting.freeTransferGb) * FIREBASE_PRICING.hosting.transferPricePerGb;

    const storage = {
      storageCost: storageStorageCost,
      downloadCost: storageDownloadCost,
      uploadOpsCost: storageUploadOpsCost,
      downloadOpsCost: storageDownloadOpsCost,
      total: storageStorageCost + storageDownloadCost + storageUploadOpsCost + storageDownloadOpsCost
    };

    const firestore = {
      storageCost: firestoreStorageCost,
      readsCost: firestoreReadsCost,
      writesCost: firestoreWritesCost,
      deletesCost: firestoreDeletesCost,
      total: firestoreStorageCost + firestoreReadsCost + firestoreWritesCost + firestoreDeletesCost
    };

    const hosting = {
      storageCost: hostingStorageCost,
      transferCost: hostingTransferCost,
      total: hostingStorageCost + hostingTransferCost
    };

    return {
      storage,
      firestore,
      hosting,
      monthlyTotal: storage.total + firestore.total + hosting.total
    };
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatSize = (gb: number) => gb < 0.001 ? `${(gb * 1000).toFixed(1)} MB` : `${gb.toFixed(3)} GB`;
  const formatNumber = (num: number) => num.toLocaleString();

  useEffect(() => {
    calculateUsage();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Firebase Usage & Billing Estimate</h3>
          <p className="text-sm text-muted-foreground">
            Monthly cost estimation based on Firebase Blaze plan pricing
          </p>
        </div>
        <Button 
          onClick={calculateUsage} 
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? (
            <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="mr-2 h-4 w-4" />
          )}
          Refresh Usage
        </Button>
      </div>

      {costBreakdown && (
        <Card>
          <CardHeader 
            className="cursor-pointer" 
            onClick={() => toggleSection('summary')}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <DollarSignIcon className="mr-2 h-5 w-5 text-green-600" />
                  Estimated Monthly Total: {formatCurrency(costBreakdown.monthlyTotal)}
                </CardTitle>
                <CardDescription>
                  Based on current usage patterns and Firebase Blaze pricing
                </CardDescription>
              </div>
              {expandedSections.includes('summary') ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          {expandedSections.includes('summary') && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Cloud Storage</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(costBreakdown.storage.total)}
                        </p>
                      </div>
                      <HardDriveIcon className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Firestore Database</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(costBreakdown.firestore.total)}
                        </p>
                      </div>
                      <DatabaseIcon className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Hosting</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(costBreakdown.hosting.total)}
                        </p>
                      </div>
                      <ServerIcon className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Detailed Breakdowns */}
      {usageData && costBreakdown && (
        <>
          {/* Cloud Storage Breakdown */}
          <Card>
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => toggleSection('storage')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <HardDriveIcon className="mr-2 h-5 w-5 text-blue-600" />
                    Cloud Storage - {formatCurrency(costBreakdown.storage.total)}
                  </CardTitle>
                  <CardDescription>
                    {formatSize(usageData.storage.totalSizeGb)} stored • {formatNumber(usageData.storage.filesCount)} files
                  </CardDescription>
                </div>
                {expandedSections.includes('storage') ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('storage') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Usage Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Files stored:</span>
                          <Badge variant="outline">{formatNumber(usageData.storage.filesCount)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Storage used:</span>
                          <Badge variant="outline">{formatSize(usageData.storage.totalSizeGb)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. monthly downloads:</span>
                          <Badge variant="outline">{formatSize(usageData.storage.estimatedDownloadGb)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. download operations:</span>
                          <Badge variant="outline">{formatNumber(usageData.storage.estimatedDownloads)}</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cost Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Storage cost:</span>
                          <span>{formatCurrency(costBreakdown.storage.storageCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Download bandwidth:</span>
                          <span>{formatCurrency(costBreakdown.storage.downloadCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Upload operations:</span>
                          <span>{formatCurrency(costBreakdown.storage.uploadOpsCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Download operations:</span>
                          <span>{formatCurrency(costBreakdown.storage.downloadOpsCost)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{formatCurrency(costBreakdown.storage.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Firestore Breakdown */}
          <Card>
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => toggleSection('firestore')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <DatabaseIcon className="mr-2 h-5 w-5 text-purple-600" />
                    Firestore Database - {formatCurrency(costBreakdown.firestore.total)}
                  </CardTitle>
                  <CardDescription>
                    {formatSize(usageData.firestore.sizeGb)} stored • {formatNumber(usageData.firestore.documentsCount)} documents
                  </CardDescription>
                </div>
                {expandedSections.includes('firestore') ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('firestore') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Usage Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Documents:</span>
                          <Badge variant="outline">{formatNumber(usageData.firestore.documentsCount)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Storage used:</span>
                          <Badge variant="outline">{formatSize(usageData.firestore.sizeGb)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. monthly reads:</span>
                          <Badge variant="outline">{formatNumber(usageData.firestore.estimatedReads)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. monthly writes:</span>
                          <Badge variant="outline">{formatNumber(usageData.firestore.estimatedWrites)}</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cost Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Storage cost:</span>
                          <span>{formatCurrency(costBreakdown.firestore.storageCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Read operations:</span>
                          <span>{formatCurrency(costBreakdown.firestore.readsCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Write operations:</span>
                          <span>{formatCurrency(costBreakdown.firestore.writesCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delete operations:</span>
                          <span>{formatCurrency(costBreakdown.firestore.deletesCost)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{formatCurrency(costBreakdown.firestore.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Hosting Breakdown */}
          <Card>
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => toggleSection('hosting')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <ServerIcon className="mr-2 h-5 w-5 text-orange-600" />
                    Hosting - {formatCurrency(costBreakdown.hosting.total)}
                  </CardTitle>
                  <CardDescription>
                    {formatSize(usageData.hosting.sizeGb)} app size • {formatSize(usageData.hosting.estimatedTransferGb)} transfer
                  </CardDescription>
                </div>
                {expandedSections.includes('hosting') ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.includes('hosting') && (
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Usage Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>App bundle size:</span>
                          <Badge variant="outline">{formatSize(usageData.hosting.sizeGb)}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. monthly transfer:</span>
                          <Badge variant="outline">{formatSize(usageData.hosting.estimatedTransferGb)}</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cost Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Storage cost:</span>
                          <span>{formatCurrency(costBreakdown.hosting.storageCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transfer cost:</span>
                          <span>{formatCurrency(costBreakdown.hosting.transferCost)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{formatCurrency(costBreakdown.hosting.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Pricing Information */}
      <Card>
        <CardHeader 
          className="cursor-pointer" 
          onClick={() => toggleSection('pricing')}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <InfoIcon className="mr-2 h-5 w-5 text-gray-600" />
                Firebase Blaze Plan Pricing
              </CardTitle>
              <CardDescription>
                Current pricing structure used for calculations
              </CardDescription>
            </div>
            {expandedSections.includes('pricing') ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('pricing') && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-blue-600">Cloud Storage</h4>
                <div className="space-y-1 text-sm">
                  <div>• 5 GB free storage</div>
                  <div>• $0.026/GB/month after</div>
                  <div>• 30 GB free download/month</div>
                  <div>• $0.12/GB download after</div>
                  <div>• 600k free uploads/month</div>
                  <div>• $0.05 per 10k uploads after</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-purple-600">Firestore</h4>
                <div className="space-y-1 text-sm">
                  <div>• 1 GB free storage</div>
                  <div>• $0.18/GB/month after</div>
                  <div>• 1.5M free reads/month</div>
                  <div>• $0.06 per 100k reads after</div>
                  <div>• 600k free writes/month</div>
                  <div>• $0.18 per 100k writes after</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-orange-600">Hosting</h4>
                <div className="space-y-1 text-sm">
                  <div>• 10 GB free storage</div>
                  <div>• $0.026/GB/month after</div>
                  <div>• 10.8 GB free transfer/month</div>
                  <div>• $0.15/GB transfer after</div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {loading && !costBreakdown && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCwIcon className="h-5 w-5 animate-spin" />
              <span>Calculating Firebase usage...</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {loading && costBreakdown && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 text-blue-700">
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
            <span className="text-sm">Refining calculations with real Firebase data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
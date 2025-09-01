import { google } from 'googleapis';
import { Request, Response } from 'express';

interface UsageData {
  storage: {
    storage_gb: number;
    egress_gb: number;
    upload_ops: number;
    download_ops: number;
  };
  firestore: {
    storage_gb: number;
    reads: number;
    writes: number;
    deletes: number;
  };
  hosting: {
    storage_gb: number;
    egress_gb: number;
  };
}

interface CostBreakdown {
  storage: {
    storage_usd: number;
    egress_usd: number;
    ops_usd: number;
    total_usd: number;
  };
  firestore: {
    storage_usd: number;
    reads_usd: number;
    writes_usd: number;
    deletes_usd: number;
    total_usd: number;
  };
  hosting: {
    storage_usd: number;
    egress_usd: number;
    total_usd: number;
  };
  grand_total_usd: number;
}

// Firebase Blaze Plan Pricing
const PRICING = {
  storage: {
    freeGB: 5,
    ratePerGB: 0.026,
    freeDailyEgressGB: 1, // Legacy buckets
    freeMonthlyEgressGB: 100, // Modern buckets
    egressRatePerGB: 0.12,
    freeUploadOpsDaily: 20000,
    freeDownloadOpsDaily: 50000,
    uploadOpsRate: 0.05 / 10000,
    downloadOpsRate: 0.004 / 10000
  },
  firestore: {
    freeGB: 1,
    ratePerGB: 0.18,
    freeReadsDaily: 50000,
    freeWritesDaily: 20000,
    freeDeletesDaily: 20000,
    readsRate: 0.06 / 100000,
    writesRate: 0.18 / 100000,
    deletesRate: 0.02 / 100000
  },
  hosting: {
    freeGB: 10,
    ratePerGB: 0.026,
    freeDailyTransferMB: 360,
    transferRatePerGB: 0.15
  }
};

class FirebaseUsageCalculator {
  private auth: any;
  private monitoring: any;
  private storage: any;
  private projectId: string;

  constructor() {
    this.projectId = '';
  }

  async initialize() {
    try {
      // Parse service account from environment
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
      this.projectId = serviceAccount.project_id;

      if (!this.projectId) {
        throw new Error('Invalid service account: missing project_id');
      }

      // Create auth client
      this.auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/monitoring.read'
        ]
      });

      // Initialize APIs
      this.monitoring = google.monitoring({ version: 'v3', auth: this.auth });
      this.storage = google.storage({ version: 'v1', auth: this.auth });

      console.log(`✅ Firebase Usage Calculator initialized for project: ${this.projectId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Usage Calculator:', error);
      return false;
    }
  }

  async getCloudStorageUsage(): Promise<any> {
    try {
      console.log('🔍 Fetching Cloud Storage usage from Google Cloud Monitoring...');
      
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Get storage bytes
      const storageMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="storage.googleapis.com/storage/total_bytes"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s', // 1 day
          perSeriesAligner: 'ALIGN_MEAN',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      // Get network egress (downloads)
      const egressMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="storage.googleapis.com/network/sent_bytes_count"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s',
          perSeriesAligner: 'ALIGN_RATE',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      // Get API requests
      const requestMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="storage.googleapis.com/api/request_count"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s',
          perSeriesAligner: 'ALIGN_RATE',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      // Process metrics
      const storageGB = this.processStorageBytes(storageMetrics.data.timeSeries || []);
      const egressGB = this.processNetworkBytes(egressMetrics.data.timeSeries || []);
      const { uploads, downloads } = this.processApiRequests(requestMetrics.data.timeSeries || []);

      console.log('✅ Cloud Storage metrics fetched:', { storageGB, egressGB, uploads, downloads });

      return {
        storage_gb: storageGB,
        egress_gb: egressGB,
        upload_ops: uploads,
        download_ops: downloads
      };
    } catch (error) {
      console.error('❌ Failed to fetch Cloud Storage usage:', error);
      return {
        storage_gb: 0,
        egress_gb: 0,
        upload_ops: 0,
        download_ops: 0
      };
    }
  }

  async getFirestoreUsage(): Promise<any> {
    try {
      console.log('🔍 Fetching Firestore usage from Google Cloud Monitoring...');

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get Firestore storage
      const storageMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="firestore.googleapis.com/storage/bytes"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s',
          perSeriesAligner: 'ALIGN_MEAN',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      // Get document operations
      const readsMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="firestore.googleapis.com/document/read_count"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s',
          perSeriesAligner: 'ALIGN_RATE',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      const writesMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="firestore.googleapis.com/document/write_count"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s',
          perSeriesAligner: 'ALIGN_RATE',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      const deletesMetrics = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: 'metric.type="firestore.googleapis.com/document/delete_count"',
        'interval.endTime': endTime.toISOString(),
        'interval.startTime': startTime.toISOString(),
        aggregation: {
          alignmentPeriod: '86400s',
          perSeriesAligner: 'ALIGN_RATE',
          crossSeriesReducer: 'REDUCE_SUM'
        }
      });

      // Process metrics
      const storageGB = this.processStorageBytes(storageMetrics.data.timeSeries || []);
      const reads = this.processOperationCount(readsMetrics.data.timeSeries || []);
      const writes = this.processOperationCount(writesMetrics.data.timeSeries || []);
      const deletes = this.processOperationCount(deletesMetrics.data.timeSeries || []);

      console.log('✅ Firestore metrics fetched:', { storageGB, reads, writes, deletes });

      return {
        storage_gb: storageGB,
        reads,
        writes,
        deletes
      };
    } catch (error) {
      console.error('❌ Failed to fetch Firestore usage:', error);
      return {
        storage_gb: 0,
        reads: 0,
        writes: 0,
        deletes: 0
      };
    }
  }

  async getHostingUsage(): Promise<any> {
    try {
      console.log('🔍 Estimating Firebase Hosting usage...');
      
      // For now, provide estimates since Hosting metrics require special setup
      return {
        storage_gb: 0.05, // Estimate app bundle size
        egress_gb: 1.0    // Estimate monthly traffic
      };
    } catch (error) {
      console.error('❌ Failed to fetch Hosting usage:', error);
      return {
        storage_gb: 0,
        egress_gb: 0
      };
    }
  }

  private processStorageBytes(timeSeries: any[]): number {
    if (!timeSeries.length) return 0;
    
    // Get latest value and convert bytes to GB
    const latestSeries = timeSeries[0];
    if (!latestSeries.points || !latestSeries.points.length) return 0;
    
    const latestPoint = latestSeries.points[0];
    const bytes = parseFloat(latestPoint.value.doubleValue || '0');
    return Math.round((bytes / (1024 * 1024 * 1024)) * 1000) / 1000; // Round to 3 decimals
  }

  private processNetworkBytes(timeSeries: any[]): number {
    if (!timeSeries.length) return 0;
    
    let totalBytes = 0;
    for (const series of timeSeries) {
      if (series.points) {
        for (const point of series.points) {
          totalBytes += parseFloat(point.value.doubleValue || '0');
        }
      }
    }
    
    return Math.round((totalBytes / (1024 * 1024 * 1024)) * 1000) / 1000;
  }

  private processOperationCount(timeSeries: any[]): number {
    if (!timeSeries.length) return 0;
    
    let totalOps = 0;
    for (const series of timeSeries) {
      if (series.points) {
        for (const point of series.points) {
          totalOps += parseFloat(point.value.doubleValue || '0');
        }
      }
    }
    
    return Math.round(totalOps);
  }

  private processApiRequests(timeSeries: any[]): { uploads: number; downloads: number } {
    let uploads = 0;
    let downloads = 0;
    
    for (const series of timeSeries) {
      if (!series.points) continue;
      
      const method = series.metric?.labels?.method || '';
      const totalRequests = series.points.reduce((sum: number, point: any) => {
        return sum + parseFloat(point.value.doubleValue || '0');
      }, 0);
      
      if (method.includes('PUT') || method.includes('POST')) {
        uploads += totalRequests;
      } else if (method.includes('GET')) {
        downloads += totalRequests;
      }
    }
    
    return { uploads: Math.round(uploads), downloads: Math.round(downloads) };
  }

  calculateCosts(usage: UsageData): CostBreakdown {
    const daysInMonth = 30;

    // Storage costs
    const storageCost = Math.max(0, usage.storage.storage_gb - PRICING.storage.freeGB) * PRICING.storage.ratePerGB;
    const egressCost = Math.max(0, usage.storage.egress_gb - (PRICING.storage.freeDailyEgressGB * daysInMonth)) * PRICING.storage.egressRatePerGB;
    const uploadOpsCost = Math.max(0, usage.storage.upload_ops - (PRICING.storage.freeUploadOpsDaily * daysInMonth)) * PRICING.storage.uploadOpsRate;
    const downloadOpsCost = Math.max(0, usage.storage.download_ops - (PRICING.storage.freeDownloadOpsDaily * daysInMonth)) * PRICING.storage.downloadOpsRate;

    // Firestore costs
    const firestoreStorageCost = Math.max(0, usage.firestore.storage_gb - PRICING.firestore.freeGB) * PRICING.firestore.ratePerGB;
    const readsCost = Math.max(0, usage.firestore.reads - (PRICING.firestore.freeReadsDaily * daysInMonth)) * PRICING.firestore.readsRate;
    const writesCost = Math.max(0, usage.firestore.writes - (PRICING.firestore.freeWritesDaily * daysInMonth)) * PRICING.firestore.writesRate;
    const deletesCost = Math.max(0, usage.firestore.deletes - (PRICING.firestore.freeDeletesDaily * daysInMonth)) * PRICING.firestore.deletesRate;

    // Hosting costs
    const hostingStorageCost = Math.max(0, usage.hosting.storage_gb - PRICING.hosting.freeGB) * PRICING.hosting.ratePerGB;
    const hostingTransferCost = Math.max(0, usage.hosting.egress_gb - (PRICING.hosting.freeDailyTransferMB * daysInMonth / 1024)) * PRICING.hosting.transferRatePerGB;

    return {
      storage: {
        storage_usd: Math.round(storageCost * 1000) / 1000,
        egress_usd: Math.round(egressCost * 1000) / 1000,
        ops_usd: Math.round((uploadOpsCost + downloadOpsCost) * 1000) / 1000,
        total_usd: Math.round((storageCost + egressCost + uploadOpsCost + downloadOpsCost) * 1000) / 1000
      },
      firestore: {
        storage_usd: Math.round(firestoreStorageCost * 1000) / 1000,
        reads_usd: Math.round(readsCost * 1000) / 1000,
        writes_usd: Math.round(writesCost * 1000) / 1000,
        deletes_usd: Math.round(deletesCost * 1000) / 1000,
        total_usd: Math.round((firestoreStorageCost + readsCost + writesCost + deletesCost) * 1000) / 1000
      },
      hosting: {
        storage_usd: Math.round(hostingStorageCost * 1000) / 1000,
        egress_usd: Math.round(hostingTransferCost * 1000) / 1000,
        total_usd: Math.round((hostingStorageCost + hostingTransferCost) * 1000) / 1000
      },
      grand_total_usd: Math.round((
        storageCost + egressCost + uploadOpsCost + downloadOpsCost +
        firestoreStorageCost + readsCost + writesCost + deletesCost +
        hostingStorageCost + hostingTransferCost
      ) * 1000) / 1000
    };
  }

  async getUsageAndCosts() {
    try {
      console.log('🔥 Starting real Firebase usage calculation...');

      if (!await this.initialize()) {
        throw new Error('Failed to initialize Firebase Usage Calculator');
      }

      const [storageUsage, firestoreUsage, hostingUsage] = await Promise.all([
        this.getCloudStorageUsage(),
        this.getFirestoreUsage(),
        this.getHostingUsage()
      ]);

      const usage: UsageData = {
        storage: storageUsage,
        firestore: firestoreUsage,
        hosting: hostingUsage
      };

      const costs = this.calculateCosts(usage);

      const result = {
        period: {
          month: new Date().toISOString().slice(0, 7),
          timezone: 'Asia/Bahrain'
        },
        usage,
        costs,
        assumptions: [
          'Storage and Firestore metrics from Google Cloud Monitoring API',
          'Hosting usage estimated (requires additional setup for precise metrics)',
          'Pricing based on Firebase Blaze plan as of 2025'
        ]
      };

      console.log('✅ Real Firebase usage calculation complete:', result);
      return result;

    } catch (error) {
      console.error('❌ Firebase usage calculation failed:', error);
      throw error;
    }
  }
}

// Express route handler
export const getFirebaseUsage = async (req: Request, res: Response) => {
  try {
    const calculator = new FirebaseUsageCalculator();
    const result = await calculator.getUsageAndCosts();
    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Failed to calculate Firebase usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
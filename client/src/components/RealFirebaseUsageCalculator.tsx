import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cloud, Database, Globe, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface FirebaseUsageResult {
  period: {
    month: string;
    timezone: string;
  };
  usage: UsageData;
  costs: CostBreakdown;
  assumptions: string[];
}

export function RealFirebaseUsageCalculator() {
  const [loading, setLoading] = useState(false);
  const [usageData, setUsageData] = useState<FirebaseUsageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    
    try {
      console.log('🔥 Fetching real Firebase usage from Google Cloud APIs...');
      
      const response = await fetch('/api/firebase-usage');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data: FirebaseUsageResult = await response.json();
      setUsageData(data);
      
      console.log('✅ Real Firebase usage data received:', data);
      
    } catch (err) {
      console.error('❌ Failed to fetch Firebase usage:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(3)}`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatGB = (gb: number) => `${gb.toFixed(3)} GB`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Firebase Usage & Billing Calculator
          </CardTitle>
          <CardDescription>
            Real-time cost estimation based on Google Cloud Monitoring APIs and Firebase Blaze plan pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={calculateUsage} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Real Usage Data...
              </>
            ) : (
              'Calculate Real Firebase Costs'
            )}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {usageData && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Collapsible 
            open={expandedSections.includes('summary')} 
            onOpenChange={() => toggleSection('summary')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      Monthly Cost Estimate: {formatCurrency(usageData.costs.grand_total_usd)}
                    </CardTitle>
                    {expandedSections.includes('summary') ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  <CardDescription>
                    Period: {usageData.period.month} ({usageData.period.timezone})
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Cloud className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">Cloud Storage</h3>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(usageData.costs.storage.total_usd)}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Database className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <h3 className="font-medium text-purple-900 dark:text-purple-100">Firestore Database</h3>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(usageData.costs.firestore.total_usd)}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Globe className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h3 className="font-medium text-green-900 dark:text-green-100">Hosting</h3>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(usageData.costs.hosting.total_usd)}</p>
                    </div>
                  </div>

                  {usageData.assumptions.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Data Sources & Assumptions:</h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        {usageData.assumptions.map((assumption, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {assumption}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Cloud Storage Details */}
          <Collapsible 
            open={expandedSections.includes('storage')} 
            onOpenChange={() => toggleSection('storage')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-blue-600" />
                      <CardTitle>Cloud Storage - {formatCurrency(usageData.costs.storage.total_usd)}</CardTitle>
                    </div>
                    {expandedSections.includes('storage') ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  <CardDescription>
                    {formatGB(usageData.usage.storage.storage_gb)} stored • {formatNumber(usageData.usage.storage.upload_ops + usageData.usage.storage.download_ops)} operations
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Storage</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatGB(usageData.usage.storage.storage_gb)}</p>
                      <p className="font-medium text-blue-600">{formatCurrency(usageData.costs.storage.storage_usd)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Download Bandwidth</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatGB(usageData.usage.storage.egress_gb)}</p>
                      <p className="font-medium text-blue-600">{formatCurrency(usageData.costs.storage.egress_usd)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Upload Operations</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(usageData.usage.storage.upload_ops)}</p>
                      <p className="font-medium text-blue-600">{formatCurrency(usageData.costs.storage.ops_usd / 2)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Download Operations</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(usageData.usage.storage.download_ops)}</p>
                      <p className="font-medium text-blue-600">{formatCurrency(usageData.costs.storage.ops_usd / 2)}</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Firestore Details */}
          <Collapsible 
            open={expandedSections.includes('firestore')} 
            onOpenChange={() => toggleSection('firestore')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-purple-600" />
                      <CardTitle>Firestore Database - {formatCurrency(usageData.costs.firestore.total_usd)}</CardTitle>
                    </div>
                    {expandedSections.includes('firestore') ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  <CardDescription>
                    {formatGB(usageData.usage.firestore.storage_gb)} stored • {formatNumber(usageData.usage.firestore.reads + usageData.usage.firestore.writes + usageData.usage.firestore.deletes)} operations
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Storage</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatGB(usageData.usage.firestore.storage_gb)}</p>
                      <p className="font-medium text-purple-600">{formatCurrency(usageData.costs.firestore.storage_usd)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Read Operations</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(usageData.usage.firestore.reads)}</p>
                      <p className="font-medium text-purple-600">{formatCurrency(usageData.costs.firestore.reads_usd)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Write Operations</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(usageData.usage.firestore.writes)}</p>
                      <p className="font-medium text-purple-600">{formatCurrency(usageData.costs.firestore.writes_usd)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Delete Operations</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatNumber(usageData.usage.firestore.deletes)}</p>
                      <p className="font-medium text-purple-600">{formatCurrency(usageData.costs.firestore.deletes_usd)}</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Hosting Details */}
          <Collapsible 
            open={expandedSections.includes('hosting')} 
            onOpenChange={() => toggleSection('hosting')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      <CardTitle>Firebase Hosting - {formatCurrency(usageData.costs.hosting.total_usd)}</CardTitle>
                    </div>
                    {expandedSections.includes('hosting') ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  <CardDescription>
                    {formatGB(usageData.usage.hosting.storage_gb)} stored • {formatGB(usageData.usage.hosting.egress_gb)} transfer
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">App Bundle Size</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatGB(usageData.usage.hosting.storage_gb)}</p>
                      <p className="font-medium text-green-600">{formatCurrency(usageData.costs.hosting.storage_usd)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Data Transfer</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{formatGB(usageData.usage.hosting.egress_gb)}</p>
                      <p className="font-medium text-green-600">{formatCurrency(usageData.costs.hosting.egress_usd)}</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Firebase Blaze Plan Pricing Info */}
          <Collapsible 
            open={expandedSections.includes('pricing')} 
            onOpenChange={() => toggleSection('pricing')}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Firebase Blaze Plan Pricing</CardTitle>
                    {expandedSections.includes('pricing') ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="text-xs space-y-3">
                    <div>
                      <h4 className="font-medium">Cloud Storage</h4>
                      <p>• Storage: 5 GB free, then $0.026/GB/month</p>
                      <p>• Downloads: 1 GB/day free, then $0.12/GB</p>
                      <p>• Operations: 20k uploads, 50k downloads free daily</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Firestore Database</h4>
                      <p>• Storage: 1 GiB free, then $0.18/GB/month</p>
                      <p>• Reads: 50k/day free, then $0.06/100k</p>
                      <p>• Writes: 20k/day free, then $0.18/100k</p>
                      <p>• Deletes: 20k/day free, then $0.02/100k</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Firebase Hosting</h4>
                      <p>• Storage: 10 GB free, then $0.026/GB/month</p>
                      <p>• Transfer: 360 MB/day free, then $0.15/GB</p>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
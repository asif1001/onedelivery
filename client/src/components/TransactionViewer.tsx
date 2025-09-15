import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  DropletIcon,
  EyeIcon,
  DownloadIcon,
  RefreshCwIcon,
  FilterIcon,
  ImageIcon,
  TruckIcon,
  GaugeIcon,
  FileTextIcon,
  XIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { 
  getAllTransactions, 
  getBranches, 
  getOilTypes,
  getAllUsers
} from '@/lib/firebase';

interface Transaction {
  id: string;
  type: string;
  driverUid: string;
  driverName: string;
  branchId?: string;
  branchName?: string;
  oilTypeId?: string;
  oilTypeName?: string;
  deliveryOrderNo?: string;
  deliveryOrderId?: string;
  loadSessionId?: string;
  startMeterReading?: number;
  endMeterReading?: number;
  oilSuppliedLiters?: number;
  totalLoadedLiters?: number;
  loadMeterReading?: number;
  timestamp?: any;
  createdAt?: any;
  status?: string;
  photos?: Record<string, string>;
  actualDeliveryStartTime?: any;
  actualDeliveryEndTime?: any;
  actualDeliveryStartFuel?: number;
  actualDeliveryEndFuel?: number;
  actualDeliveredLiters?: number;
  deliveredLiters?: number;
  loadedLiters?: number;
  quantity?: number;
  reporterName?: string;
  reportedByName?: string;
  editCount?: number;
  lastEditedByName?: string;
  lastEditedBy?: string; // Alias for compatibility
  lastEditedAt?: any;
  editReason?: string;
  inventoryAdjusted?: boolean;
  hasBeenEdited?: boolean;
  editHistory?: any[];
}

interface TransactionFilters {
  startDate: string;
  endDate: string;
  oilTypeId: string;
  branchId: string;
  driverUid: string;
  transactionType: string;
  maxResults: number;
}

interface TransactionViewerProps {
  onClose: () => void;
}

export function TransactionViewer({ onClose }: TransactionViewerProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [oilTypes, setOilTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [filters, setFilters] = useState<TransactionFilters>({
    startDate: '',
    endDate: '',
    oilTypeId: 'all',
    branchId: 'all',
    driverUid: 'all',
    transactionType: 'all',
    maxResults: 20
  });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Apply filters when filters or transactions change
  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [transactionsData, branchesData, oilTypesData, usersData] = await Promise.all([
        getAllTransactions(),
        getBranches(),
        getOilTypes(),
        getAllUsers()
      ]);

      setTransactions(transactionsData || []);
      setBranches(branchesData || []);
      setOilTypes(oilTypesData || []);
      setUsers(usersData || []);
      
      // Set default date range to last 30 days and limit to 20 transactions
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      setFilters(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        maxResults: 20
      }));
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load transaction data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Date range filter
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(
          transaction.timestamp?.toDate?.() || 
          transaction.timestamp || 
          transaction.createdAt?.toDate?.() ||
          transaction.createdAt ||
          transaction.actualDeliveryStartTime || 
          0
        );
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Oil type filter
    if (filters.oilTypeId && filters.oilTypeId !== 'all') {
      filtered = filtered.filter(transaction => transaction.oilTypeId === filters.oilTypeId);
    }

    // Branch filter
    if (filters.branchId && filters.branchId !== 'all') {
      filtered = filtered.filter(transaction => transaction.branchId === filters.branchId);
    }

    // Driver filter
    if (filters.driverUid && filters.driverUid !== 'all') {
      filtered = filtered.filter(transaction => transaction.driverUid === filters.driverUid);
    }

    // Transaction type filter
    if (filters.transactionType && filters.transactionType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filters.transactionType);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(
        a.timestamp?.toDate?.() || a.timestamp || a.createdAt?.toDate?.() || a.createdAt || 0
      );
      const dateB = new Date(
        b.timestamp?.toDate?.() || b.timestamp || b.createdAt?.toDate?.() || b.createdAt || 0
      );
      return dateB.getTime() - dateA.getTime();
    });

    // Limit results
    filtered = filtered.slice(0, filters.maxResults);

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      oilTypeId: 'all',
      branchId: 'all',
      driverUid: 'all',
      transactionType: 'all',
      maxResults: 20
    });
    setSelectedTransactionIds([]);
  };

  const downloadSelectedPhotos = async () => {
    if (selectedTransactionIds.length === 0) {
      toast({
        title: "No Transactions Selected",
        description: "Please select at least one transaction to download photos.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    try {
      const selectedTransactions = filteredTransactions.filter(t => 
        selectedTransactionIds.includes(t.id)
      );

      toast({
        title: "Preparing Download",
        description: "Creating zip file with all photos..."
      });

      const zip = new JSZip();
      let photoCount = 0;
      const photoPromises: Promise<void>[] = [];

      for (const transaction of selectedTransactions) {
        if (transaction.photos && Object.keys(transaction.photos).length > 0) {
          Object.entries(transaction.photos).forEach(([photoType, photoUrl]) => {
            if (photoUrl && photoUrl.trim() !== '') {
              const photoPromise = new Promise<void>(async (resolve) => {
                try {
                  // Use server proxy to handle CORS issues
                  const proxyUrl = `/api/proxy-photo?url=${encodeURIComponent(photoUrl)}`;
                  const response = await fetch(proxyUrl);
                  
                  if (response.ok) {
                    const blob = await response.blob();
                    if (blob.size > 0) {
                      const fileName = `${transaction.type}_${transaction.deliveryOrderNo || transaction.id?.slice(-6)}_${photoType}.jpg`;
                      zip.file(fileName, blob);
                      photoCount++;
                    }
                  } else {
                    console.warn(`Proxy failed for ${photoUrl}: ${response.status} ${response.statusText}`);
                  }
                } catch (error) {
                  console.warn(`Failed to download photo ${photoUrl}:`, error);
                }
                resolve();
              });
              
              photoPromises.push(photoPromise);
            }
          });
        }
      }

      if (photoPromises.length === 0) {
        toast({
          title: "No Photos Available",
          description: "Selected transactions don't have any photos to download.",
          variant: "destructive"
        });
        return;
      }

      // Wait for all photos to be fetched
      await Promise.allSettled(photoPromises);

      if (photoCount === 0) {
        toast({
          title: "No Photos Downloaded",
          description: "Could not download any photos due to access restrictions.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Creating Zip File",
        description: `Compressing ${photoCount} photos...`
      });

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `transactions_photos_${timestamp}_${selectedTransactionIds.length}transactions_${photoCount}photos.zip`;
      
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `Downloaded ${photoCount} photos from ${selectedTransactionIds.length} transactions as ZIP file.`
      });

    } catch (error) {
      console.error('Error creating zip download:', error);
      toast({
        title: "Download Failed",
        description: "Failed to create photo zip file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const selectAllVisibleTransactions = () => {
    const allIds = filteredTransactions.map(t => t.id);
    setSelectedTransactionIds(
      selectedTransactionIds.length === filteredTransactions.length ? [] : allIds
    );
  };

  const viewTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetails(true);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'supply': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'loading': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'supply': return <DropletIcon className="h-4 w-4" />;
      case 'loading': return <TruckIcon className="h-4 w-4" />;
      case 'delivery': return <MapPinIcon className="h-4 w-4" />;
      default: return <FileTextIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCwIcon className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading transactions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Transaction Viewer</h2>
          <p className="text-gray-600 text-sm">View and manage transactions with photo access</p>
        </div>
        <Button variant="outline" onClick={onClose} className="self-end sm:self-auto">
          <XIcon className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filters & Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                max={filters.endDate || undefined}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  if (filters.endDate && newStartDate > filters.endDate) {
                    toast({
                      title: "Invalid Date Range",
                      description: "From date cannot be later than Till date.",
                      variant: "destructive"
                    });
                    return;
                  }
                  setFilters(prev => ({ ...prev, startDate: newStartDate }));
                }}
                className="bg-white border-2 border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Till Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  if (filters.startDate && filters.startDate > newEndDate) {
                    toast({
                      title: "Invalid Date Range", 
                      description: "Till date cannot be earlier than From date.",
                      variant: "destructive"
                    });
                    return;
                  }
                  setFilters(prev => ({ ...prev, endDate: newEndDate }));
                }}
                className="bg-white border-2 border-gray-300"
              />
            </div>

            {/* Oil Type Filter */}
            <div>
              <Label>Oil Type</Label>
              <Select 
                value={filters.oilTypeId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, oilTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Oil Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Oil Types</SelectItem>
                  {oilTypes.map((oilType) => (
                    <SelectItem key={oilType.id} value={oilType.id}>
                      {oilType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter */}
            <div>
              <Label>Branch</Label>
              <Select 
                value={filters.branchId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, branchId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Driver Filter */}
            <div>
              <Label>Driver</Label>
              <Select 
                value={filters.driverUid} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, driverUid: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {users.filter(user => user.role === 'driver').map((driver) => (
                    <SelectItem key={driver.uid} value={driver.uid}>
                      {driver.displayName || driver.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <Label>Type</Label>
              <Select 
                value={filters.transactionType} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="supply">Supply</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Results */}
            <div>
              <Label>Max Results</Label>
              <Select 
                value={filters.maxResults.toString()} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, maxResults: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 transactions</SelectItem>
                  <SelectItem value="20">20 transactions</SelectItem>
                  <SelectItem value="50">50 transactions</SelectItem>
                  <SelectItem value="100">100 transactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button variant="outline" onClick={clearFilters} className="text-sm">
              Clear Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={selectAllVisibleTransactions} 
              className="text-sm"
            >
              {selectedTransactionIds.length === filteredTransactions.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button 
              onClick={downloadSelectedPhotos}
              disabled={selectedTransactionIds.length === 0 || isDownloading}
              className="flex items-center justify-center gap-2 text-sm"
            >
              {isDownloading ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
              ) : (
                <DownloadIcon className="h-4 w-4" />
              )}
              {isDownloading 
                ? "Creating ZIP..." 
                : `Download ZIP (${selectedTransactionIds.length} transactions)`
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredTransactions.length} transactions • {selectedTransactionIds.length} selected
      </div>

      {/* Transaction Cards */}
      <div className="space-y-3">
        <ScrollArea className="h-[500px]">
          {filteredTransactions.map((transaction) => (
            <Card 
              key={transaction.id} 
              className={`mb-3 transition-all duration-200 cursor-pointer hover:shadow-md ${
                selectedTransactionIds.includes(transaction.id) 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedTransactionIds.includes(transaction.id)}
                      onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                      className="mt-1"
                    />

                    {/* Transaction Icon */}
                    <div className={`p-2 rounded-full ${getTransactionTypeColor(transaction.type || '')}`}>
                      {getTransactionIcon(transaction.type || '')}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getTransactionTypeColor(transaction.type || '')} border`}>
                            {transaction.type}
                          </Badge>
                          <span className="text-sm font-medium">
                            {transaction.deliveryOrderNo || `Transaction #${transaction.id?.slice(-6)}`}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(transaction.timestamp || transaction.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-3 w-3 text-gray-400" />
                          <span className="truncate">{transaction.driverName || transaction.reporterName || transaction.reportedByName || 'Unknown Driver'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPinIcon className="h-3 w-3 text-gray-400" />
                          <span className="truncate">{transaction.branchName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DropletIcon className="h-3 w-3 text-gray-400" />
                          <span className="truncate">{transaction.oilTypeName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <GaugeIcon className="h-3 w-3 text-gray-400" />
                          <span className="font-medium">
                            {transaction.oilSuppliedLiters || 
                             transaction.totalLoadedLiters || 
                             transaction.actualDeliveredLiters || 'N/A'}L
                          </span>
                        </div>
                      </div>

                      {/* Photos indicator */}
                      {transaction.photos && Object.keys(transaction.photos).length > 0 && (
                        <div className="mt-2 flex items-center space-x-1">
                          <ImageIcon className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-blue-500">
                            {Object.keys(transaction.photos).length} photo(s) available
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewTransactionDetails(transaction);
                        }}
                        className="h-8 w-8 p-1"
                      >
                        <EyeIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {getTransactionIcon(selectedTransaction?.type || '')}
              <span>Transaction Details</span>
              <Badge className={`${getTransactionTypeColor(selectedTransaction?.type || '')}`}>
                {selectedTransaction?.type}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              View detailed information and photos for this transaction
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Transaction Info</Label>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">ID:</span> {selectedTransaction.id}</div>
                    <div><span className="font-medium">Date:</span> {formatDate(selectedTransaction.timestamp || selectedTransaction.createdAt)}</div>
                    <div><span className="font-medium">Status:</span> {selectedTransaction.status || 'Completed'}</div>
                    {selectedTransaction.deliveryOrderNo && (
                      <div><span className="font-medium">Order No:</span> {selectedTransaction.deliveryOrderNo}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Participants</Label>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Driver:</span> {selectedTransaction.driverName || 'Unknown'}</div>
                    <div><span className="font-medium">Branch:</span> {selectedTransaction.branchName || 'N/A'}</div>
                    <div><span className="font-medium">Oil Type:</span> {selectedTransaction.oilTypeName || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Meter Readings & Quantities */}
              {(selectedTransaction.startMeterReading || selectedTransaction.endMeterReading || selectedTransaction.oilSuppliedLiters) && (
                <div className="space-y-2">
                  <Label className="font-semibold">Measurements</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {selectedTransaction.startMeterReading && (
                      <div><span className="font-medium">Start Meter:</span> {selectedTransaction.startMeterReading}</div>
                    )}
                    {selectedTransaction.endMeterReading && (
                      <div><span className="font-medium">End Meter:</span> {selectedTransaction.endMeterReading}</div>
                    )}
                    {selectedTransaction.oilSuppliedLiters && (
                      <div><span className="font-medium">Oil Supplied:</span> {selectedTransaction.oilSuppliedLiters}L</div>
                    )}
                    {selectedTransaction.totalLoadedLiters && (
                      <div><span className="font-medium">Total Loaded:</span> {selectedTransaction.totalLoadedLiters}L</div>
                    )}
                    {selectedTransaction.actualDeliveredLiters && (
                      <div><span className="font-medium">Delivered:</span> {selectedTransaction.actualDeliveredLiters}L</div>
                    )}
                  </div>
                </div>
              )}

              {/* Edit History */}
              {(selectedTransaction.hasBeenEdited || selectedTransaction.lastEditedBy) && (
                <div className="space-y-2">
                  <Label className="font-semibold">Edit History</Label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          Edited
                        </Badge>
                        {selectedTransaction.editCount && (
                          <span className="text-xs text-gray-600">
                            {selectedTransaction.editCount} time{selectedTransaction.editCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      {selectedTransaction.lastEditedByName && (
                        <div>
                          <span className="font-medium">Last edited by:</span> {selectedTransaction.lastEditedByName}
                        </div>
                      )}
                      
                      {selectedTransaction.lastEditedAt && (
                        <div>
                          <span className="font-medium">Last edit date:</span> {
                            selectedTransaction.lastEditedAt?.toDate 
                              ? selectedTransaction.lastEditedAt.toDate().toLocaleDateString() + ' at ' + selectedTransaction.lastEditedAt.toDate().toLocaleTimeString()
                              : new Date(selectedTransaction.lastEditedAt).toLocaleDateString() + ' at ' + new Date(selectedTransaction.lastEditedAt).toLocaleTimeString()
                          }
                        </div>
                      )}
                      
                      {selectedTransaction.editReason && (
                        <div>
                          <span className="font-medium">Reason for edit:</span> {selectedTransaction.editReason}
                        </div>
                      )}
                      
                      {selectedTransaction.inventoryAdjusted && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <span className="font-medium">✓ Inventory levels were automatically adjusted</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Photos */}
              {selectedTransaction.photos && Object.keys(selectedTransaction.photos).length > 0 && (
                <div className="space-y-2">
                  <Label className="font-semibold">Photos</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(selectedTransaction.photos).map(([photoType, photoUrl], index) => (
                      <div key={index} className="space-y-2">
                        <div className="font-medium text-sm capitalize">
                          {photoType.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="relative group">
                          <img
                            src={photoUrl}
                            alt={photoType}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = photoUrl;
                                link.download = `${selectedTransaction.type}_${selectedTransaction.id}_${photoType}.jpg`;
                                link.click();
                              }}
                            >
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  EditIcon, 
  EyeIcon, 
  SearchIcon, 
  RefreshCwIcon,
  FilterIcon,
  UserIcon,
  MapPinIcon,
  DropletIcon,
  CalendarIcon,
  ClockIcon,
  GaugeIcon,
  TruckIcon,
  AlertTriangleIcon,
  HistoryIcon,
  FileTextIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllTransactions,
  getBranches,
  getOilTypes,
  getAllUsers,
  getTransactionEditHistory
} from '@/lib/firebase';
import { TransactionEditModal } from './TransactionEditModal';

interface Transaction {
  id: string;
  type: string;
  driverUid: string;
  driverName: string;
  branchId?: string;
  branchName?: string;
  oilTypeId?: string;
  oilTypeName?: string;
  startMeterReading?: number;
  endMeterReading?: number;
  oilSuppliedLiters?: number;
  totalLoadedLiters?: number;
  loadMeterReading?: number;
  timestamp?: any;
  createdAt?: any;
  status?: string;
  photos?: Record<string, string>;
  actualDeliveredLiters?: number;
  transactionId?: string;
  deliveryOrderNo?: string;
  editHistory?: any[];
  lastEditedAt?: any;
}

interface EditHistoryItem {
  id: string;
  editedBy: string;
  editedByName: string;
  editedAt: any;
  reason: string;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  inventoryAdjustment?: string;
  manualInventoryAdjustment?: number;
}

export function AdminTransactionManagement() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [oilTypes, setOilTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    branchId: 'all',
    oilTypeId: 'all',
    driverUid: 'all',
    transactionType: 'all',
    dateFrom: '',
    dateTo: '',
    onlyEdited: false
  });

  useEffect(() => {
    loadReferenceLists();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  useEffect(() => {
    // Auto-search when filters change (except on initial load)
    if (filters.searchTerm.trim() || filters.branchId !== 'all' || filters.oilTypeId !== 'all' || 
        filters.driverUid !== 'all' || filters.transactionType !== 'all' || filters.dateFrom || 
        filters.dateTo || filters.onlyEdited) {
      const timeoutId = setTimeout(() => {
        loadTransactions();
      }, 500); // Debounce search
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters]);

  const loadReferenceLists = async () => {
    try {
      const [branchesData, oilTypesData, usersData] = await Promise.all([
        getBranches(),
        getOilTypes(),
        getAllUsers()
      ]);

      setBranches(branchesData || []);
      setOilTypes(oilTypesData || []);
      setUsers(usersData || []);
      
    } catch (error) {
      console.error('Error loading reference data:', error);
      toast({
        title: "Loading Failed",
        description: "Failed to load reference data",
        variant: "destructive"
      });
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      const transactionsData = await getAllTransactions();
      setTransactions(transactionsData || []);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Loading Failed",
        description: "Failed to load transaction data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.driverName?.toLowerCase().includes(term) ||
        t.branchName?.toLowerCase().includes(term) ||
        t.oilTypeName?.toLowerCase().includes(term) ||
        t.transactionId?.toLowerCase().includes(term) ||
        t.deliveryOrderNo?.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        // Also search in partial transaction ID patterns
        (t.transactionId && term.includes(t.transactionId.toLowerCase())) ||
        (t.deliveryOrderNo && term.includes(t.deliveryOrderNo.toLowerCase()))
      );
    }

    // Branch filter
    if (filters.branchId !== 'all') {
      filtered = filtered.filter(t => t.branchId === filters.branchId);
    }

    // Oil type filter
    if (filters.oilTypeId !== 'all') {
      filtered = filtered.filter(t => t.oilTypeId === filters.oilTypeId);
    }

    // Driver filter
    if (filters.driverUid !== 'all') {
      filtered = filtered.filter(t => t.driverUid === filters.driverUid);
    }

    // Transaction type filter
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.type === filters.transactionType);
    }

    // Date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(t => {
        const tDate = new Date(t.timestamp?.toDate?.() || t.timestamp || t.createdAt?.toDate?.() || t.createdAt);
        return tDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        const tDate = new Date(t.timestamp?.toDate?.() || t.timestamp || t.createdAt?.toDate?.() || t.createdAt);
        return tDate <= toDate;
      });
    }

    // Only edited filter
    if (filters.onlyEdited) {
      filtered = filtered.filter(t => t.lastEditedAt);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const aDate = new Date(a.timestamp?.toDate?.() || a.timestamp || a.createdAt?.toDate?.() || a.createdAt);
      const bDate = new Date(b.timestamp?.toDate?.() || b.timestamp || b.createdAt?.toDate?.() || b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });

    setFilteredTransactions(filtered);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleViewDetails = async (transaction: Transaction) => {
    try {
      const history = await getTransactionEditHistory(transaction.id);
      setEditHistory(history as EditHistoryItem[]);
      setSelectedTransaction(transaction);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Error loading edit history:', error);
      setEditHistory([]);
      setSelectedTransaction(transaction);
      setDetailModalOpen(true);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    if (!d || isNaN(d.getTime())) return 'N/A';
    
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'loading': return 'bg-blue-100 text-blue-800';
      case 'supply': return 'bg-green-100 text-green-800';
      case 'delivery': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      branchId: 'all',
      oilTypeId: 'all',
      driverUid: 'all',
      transactionType: 'all',
      dateFrom: '',
      dateTo: '',
      onlyEdited: false
    });
    setTransactions([]);
  };

  const handleSearch = () => {
    if (filters.searchTerm.trim() || filters.branchId !== 'all' || filters.oilTypeId !== 'all' || 
        filters.driverUid !== 'all' || filters.transactionType !== 'all' || filters.dateFrom || 
        filters.dateTo || filters.onlyEdited) {
      loadTransactions();
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-transaction-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Transaction</h1>
          <p className="text-gray-600">Search and edit oil delivery transactions - results update automatically as you type</p>
        </div>
        {loading && (
          <div className="flex items-center text-blue-600">
            <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FilterIcon className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="searchTerm">Search</Label>
              <Input
                id="searchTerm"
                placeholder="Search transactions..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                data-testid="input-search"
              />
            </div>

            <div>
              <Label htmlFor="branchFilter">Branch</Label>
              <Select
                value={filters.branchId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, branchId: value }))}
              >
                <SelectTrigger data-testid="select-branch-filter">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="oilTypeFilter">Oil Type</Label>
              <Select
                value={filters.oilTypeId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, oilTypeId: value }))}
              >
                <SelectTrigger data-testid="select-oil-type-filter">
                  <SelectValue placeholder="All oil types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Oil Types</SelectItem>
                  {oilTypes.map(oilType => (
                    <SelectItem key={oilType.id} value={oilType.id}>
                      {oilType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="typeFilter">Transaction Type</Label>
              <Select
                value={filters.transactionType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value }))}
              >
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="supply">Supply</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                data-testid="input-date-from"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                data-testid="input-date-to"
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                data-testid="button-reset-filters"
              >
                Reset Filters
              </Button>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyEdited}
                  onChange={(e) => setFilters(prev => ({ ...prev, onlyEdited: e.target.checked }))}
                  data-testid="checkbox-only-edited"
                />
                <span>Only edited</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-2">Use the search filters above to find transactions</p>
              <p className="text-sm text-gray-400">Enter search terms or apply filters, then click "Search" to load transactions</p>
            </CardContent>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No transactions found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow" data-testid={`transaction-card-${transaction.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <TruckIcon className="h-5 w-5 text-gray-400" />
                      <Badge className={getTransactionTypeColor(transaction.type)}>
                        {transaction.type}
                      </Badge>
                      <span className="font-medium">
                        {transaction.transactionId || transaction.deliveryOrderNo || `#${transaction.id.slice(-6)}`}
                      </span>
                      {transaction.lastEditedAt && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <EditIcon className="h-3 w-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span>{transaction.driverName || 'Unknown Driver'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span>{transaction.branchName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DropletIcon className="h-4 w-4 text-gray-400" />
                        <span>{transaction.oilTypeName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(transaction.timestamp || transaction.createdAt)}</span>
                      </div>
                    </div>

                    {/* Quantity Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      {transaction.startMeterReading !== undefined && (
                        <div className="flex items-center space-x-2">
                          <GaugeIcon className="h-4 w-4" />
                          <span>Start: {transaction.startMeterReading}L</span>
                        </div>
                      )}
                      {transaction.endMeterReading !== undefined && (
                        <div className="flex items-center space-x-2">
                          <GaugeIcon className="h-4 w-4" />
                          <span>End: {transaction.endMeterReading}L</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <DropletIcon className="h-4 w-4" />
                        <span>
                          Quantity: {
                            transaction.oilSuppliedLiters || 
                            transaction.actualDeliveredLiters || 
                            transaction.totalLoadedLiters || 
                            'N/A'
                          }L
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(transaction)}
                      data-testid={`button-view-details-${transaction.id}`}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditTransaction(transaction)}
                      data-testid={`button-edit-${transaction.id}`}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal */}
      <TransactionEditModal
        transaction={selectedTransaction}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTransaction(null);
        }}
        onTransactionUpdated={() => {
          loadTransactions();
          setEditModalOpen(false);
          setSelectedTransaction(null);
        }}
      />

      {/* Transaction Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="transaction-detail-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <EyeIcon className="h-5 w-5" />
              <span>Transaction Details</span>
              {selectedTransaction && (
                <Badge className={getTransactionTypeColor(selectedTransaction.type)}>
                  {selectedTransaction.type}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              View complete transaction information and edit history
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Transaction ID</Label>
                      <p className="font-medium">{selectedTransaction.transactionId || selectedTransaction.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Type</Label>
                      <p className="font-medium">{selectedTransaction.type}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Driver</Label>
                      <p className="font-medium">{selectedTransaction.driverName}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Date</Label>
                      <p className="font-medium">{formatDate(selectedTransaction.timestamp || selectedTransaction.createdAt)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Branch</Label>
                      <p className="font-medium">{selectedTransaction.branchName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Oil Type</Label>
                      <p className="font-medium">{selectedTransaction.oilTypeName || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Status</Label>
                      <p className="font-medium">{selectedTransaction.status || 'Completed'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedTransaction.startMeterReading !== undefined && (
                      <div>
                        <Label className="text-sm text-gray-500">Start Meter</Label>
                        <p className="font-medium">{selectedTransaction.startMeterReading}L</p>
                      </div>
                    )}
                    {selectedTransaction.endMeterReading !== undefined && (
                      <div>
                        <Label className="text-sm text-gray-500">End Meter</Label>
                        <p className="font-medium">{selectedTransaction.endMeterReading}L</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm text-gray-500">Quantity</Label>
                      <p className="font-medium">
                        {(selectedTransaction.oilSuppliedLiters || 
                         selectedTransaction.actualDeliveredLiters || 
                         selectedTransaction.totalLoadedLiters || 0) > 0 ? 
                         `${selectedTransaction.oilSuppliedLiters || 
                           selectedTransaction.actualDeliveredLiters || 
                           selectedTransaction.totalLoadedLiters}L` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Edit History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <HistoryIcon className="h-5 w-5" />
                    <span>Edit History</span>
                    {editHistory.length > 0 && (
                      <Badge variant="outline">{editHistory.length} edits</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editHistory.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <HistoryIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No edit history found</p>
                      <p className="text-sm">This transaction has not been modified</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editHistory.map((edit, index) => (
                        <div key={edit.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <UserIcon className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{edit.editedByName}</span>
                              <Badge variant="outline">Edit #{editHistory.length - index}</Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <ClockIcon className="h-4 w-4" />
                              <span>{formatDate(edit.editedAt)}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-sm font-medium">Reason:</Label>
                              <p className="text-sm">{edit.reason}</p>
                            </div>

                            {edit.changes && edit.changes.length > 0 && (
                              <div>
                                <Label className="text-sm font-medium">Changes:</Label>
                                <div className="space-y-1">
                                  {edit.changes.map((change, changeIndex) => (
                                    <div key={changeIndex} className="text-sm bg-gray-50 p-2 rounded">
                                      <span className="font-medium">{change.field}:</span>
                                      <span className="text-red-600 mx-2">{change.oldValue}</span>
                                      <span>→</span>
                                      <span className="text-green-600 mx-2">{change.newValue}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {edit.inventoryAdjustment && (
                              <div>
                                <Label className="text-sm font-medium">Inventory Adjustment:</Label>
                                <p className="text-sm capitalize">{edit.inventoryAdjustment}</p>
                                {edit.manualInventoryAdjustment && (
                                  <p className="text-sm">Manual adjustment: {edit.manualInventoryAdjustment}L</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
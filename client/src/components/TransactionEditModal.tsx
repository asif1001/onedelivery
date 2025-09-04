import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangleIcon, 
  SaveIcon, 
  XIcon, 
  ClockIcon,
  UserIcon,
  EditIcon,
  GaugeIcon,
  DropletIcon,
  MapPinIcon,
  PackageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  updateTransaction, 
  getBranches, 
  getOilTypes, 
  getCurrentUser,
  createTransactionEditHistory,
  calculateInventoryImpact
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
}

interface EditData {
  startMeterReading?: number;
  endMeterReading?: number;
  oilSuppliedLiters?: number;
  totalLoadedLiters?: number;
  oilTypeId?: string;
  branchId?: string;
  reason: string;
  adjustInventory: 'automatic' | 'manual' | 'none';
  manualInventoryAdjustment?: number;
}

interface TransactionEditModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated: () => void;
}

export function TransactionEditModal({ 
  transaction, 
  isOpen, 
  onClose, 
  onTransactionUpdated 
}: TransactionEditModalProps) {
  const { toast } = useToast();
  const [editData, setEditData] = useState<EditData>({
    reason: '',
    adjustInventory: 'automatic'
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [oilTypes, setOilTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inventoryImpact, setInventoryImpact] = useState<any>(null);
  const [showInventoryWarning, setShowInventoryWarning] = useState(false);

  useEffect(() => {
    if (transaction && isOpen) {
      loadFormData();
      loadReferenceLists();
    }
  }, [transaction, isOpen]);

  useEffect(() => {
    if (editData.adjustInventory !== 'none' && hasQuantityChanges()) {
      calculateImpact();
    }
  }, [editData]);

  const loadFormData = () => {
    if (!transaction) return;
    
    setEditData({
      startMeterReading: transaction.startMeterReading,
      endMeterReading: transaction.endMeterReading,
      oilSuppliedLiters: transaction.oilSuppliedLiters || transaction.actualDeliveredLiters,
      totalLoadedLiters: transaction.totalLoadedLiters,
      oilTypeId: transaction.oilTypeId,
      branchId: transaction.branchId,
      reason: '',
      adjustInventory: 'automatic'
    });
  };

  const loadReferenceLists = async () => {
    try {
      const [branchesData, oilTypesData] = await Promise.all([
        getBranches(),
        getOilTypes()
      ]);
      setBranches(branchesData || []);
      setOilTypes(oilTypesData || []);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const hasQuantityChanges = () => {
    if (!transaction) return false;
    
    const originalQuantity = transaction.oilSuppliedLiters || transaction.actualDeliveredLiters || transaction.totalLoadedLiters || 0;
    const newQuantity = editData.oilSuppliedLiters || editData.totalLoadedLiters || 0;
    
    return originalQuantity !== newQuantity;
  };

  const calculateImpact = async () => {
    if (!transaction) return;
    
    try {
      const impact = await calculateInventoryImpact({
        transactionId: transaction.id,
        originalQuantity: transaction.oilSuppliedLiters || transaction.totalLoadedLiters || 0,
        newQuantity: editData.oilSuppliedLiters || editData.totalLoadedLiters || 0,
        branchId: editData.branchId || transaction.branchId,
        oilTypeId: editData.oilTypeId || transaction.oilTypeId,
        transactionType: transaction.type
      });
      
      setInventoryImpact(impact);
      setShowInventoryWarning(impact.hasWarnings);
    } catch (error) {
      console.error('Error calculating inventory impact:', error);
    }
  };

  const getChangedFields = () => {
    if (!transaction) return [];
    
    const changes = [];
    
    if (editData.startMeterReading !== transaction.startMeterReading) {
      changes.push({
        field: 'Start Meter Reading',
        oldValue: transaction.startMeterReading || 'N/A',
        newValue: editData.startMeterReading || 'N/A'
      });
    }
    
    if (editData.endMeterReading !== transaction.endMeterReading) {
      changes.push({
        field: 'End Meter Reading',
        oldValue: transaction.endMeterReading || 'N/A',
        newValue: editData.endMeterReading || 'N/A'
      });
    }
    
    const originalQuantity = transaction.oilSuppliedLiters || transaction.totalLoadedLiters;
    const newQuantity = editData.oilSuppliedLiters || editData.totalLoadedLiters;
    if (originalQuantity !== newQuantity) {
      changes.push({
        field: transaction.type === 'loading' ? 'Total Loaded Liters' : 'Oil Supplied Liters',
        oldValue: originalQuantity || 'N/A',
        newValue: newQuantity || 'N/A'
      });
    }
    
    if (editData.oilTypeId !== transaction.oilTypeId) {
      const oldOilType = oilTypes.find(ot => ot.id === transaction.oilTypeId);
      const newOilType = oilTypes.find(ot => ot.id === editData.oilTypeId);
      changes.push({
        field: 'Oil Type',
        oldValue: oldOilType?.name || 'N/A',
        newValue: newOilType?.name || 'N/A'
      });
    }
    
    if (editData.branchId !== transaction.branchId) {
      const oldBranch = branches.find(b => b.id === transaction.branchId);
      const newBranch = branches.find(b => b.id === editData.branchId);
      changes.push({
        field: 'Branch/Location',
        oldValue: oldBranch?.name || 'N/A',
        newValue: newBranch?.name || 'N/A'
      });
    }
    
    return changes;
  };

  const handleSave = async () => {
    if (!transaction) return;
    
    const changes = getChangedFields();
    if (changes.length === 0) {
      toast({
        title: "No Changes",
        description: "No fields have been modified.",
        variant: "destructive"
      });
      return;
    }
    
    if (!editData.reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this edit.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('Unable to identify current user');
      }
      
      // Prepare update data
      const { reason, adjustInventory, manualInventoryAdjustment, ...updateFields } = editData;
      const updateData = {
        ...updateFields,
        id: transaction.id
      };
      
      // Create edit history record
      const editHistoryData = {
        transactionId: transaction.id,
        editedBy: currentUser.uid,
        editedByName: currentUser.displayName || currentUser.email || 'Admin',
        editedAt: new Date(),
        reason: editData.reason,
        changes: changes,
        inventoryAdjustment: editData.adjustInventory,
        manualInventoryAdjustment: editData.manualInventoryAdjustment || null
      };
      
      // Update transaction and create edit history
      await Promise.all([
        updateTransaction(updateData),
        createTransactionEditHistory(editHistoryData)
      ]);
      
      toast({
        title: "Transaction Updated",
        description: `Transaction updated successfully with ${changes.length} changes.`
      });
      
      onTransactionUpdated();
      onClose();
      
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const changes = getChangedFields();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="transaction-edit-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <EditIcon className="h-5 w-5" />
            <span>Edit Transaction</span>
            <Badge variant="outline">
              {transaction.transactionId || transaction.deliveryOrderNo || `ID: ${transaction.id.slice(-6)}`}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Modify transaction details and track changes for audit purposes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Transaction Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Original Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Type</Label>
                  <p className="font-medium">{transaction.type}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Driver</Label>
                  <p className="font-medium">{transaction.driverName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Oil Type</Label>
                  <p className="font-medium">{transaction.oilTypeName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Branch</Label>
                  <p className="font-medium">{transaction.branchName || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meter Readings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <GaugeIcon className="h-4 w-4" />
                  <span>Meter Readings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="startMeterReading">Start Meter Reading</Label>
                  <Input
                    id="startMeterReading"
                    type="number"
                    step="0.01"
                    value={editData.startMeterReading || ''}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      startMeterReading: parseFloat(e.target.value) || undefined
                    }))}
                    data-testid="input-start-meter"
                  />
                </div>
                <div>
                  <Label htmlFor="endMeterReading">End Meter Reading</Label>
                  <Input
                    id="endMeterReading"
                    type="number"
                    step="0.01"
                    value={editData.endMeterReading || ''}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      endMeterReading: parseFloat(e.target.value) || undefined
                    }))}
                    data-testid="input-end-meter"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quantities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <DropletIcon className="h-4 w-4" />
                  <span>Quantities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.type === 'loading' ? (
                  <div>
                    <Label htmlFor="totalLoadedLiters">Total Loaded Liters</Label>
                    <Input
                      id="totalLoadedLiters"
                      type="number"
                      step="0.01"
                      value={editData.totalLoadedLiters || ''}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        totalLoadedLiters: parseFloat(e.target.value) || undefined
                      }))}
                      data-testid="input-loaded-liters"
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="oilSuppliedLiters">Oil Supplied Liters</Label>
                    <Input
                      id="oilSuppliedLiters"
                      type="number"
                      step="0.01"
                      value={editData.oilSuppliedLiters || ''}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        oilSuppliedLiters: parseFloat(e.target.value) || undefined
                      }))}
                      data-testid="input-supplied-liters"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Oil Type & Branch */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <PackageIcon className="h-4 w-4" />
                  <span>Oil Type</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="oilTypeId">Oil Type</Label>
                <Select
                  value={editData.oilTypeId || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, oilTypeId: value }))}
                >
                  <SelectTrigger data-testid="select-oil-type">
                    <SelectValue placeholder="Select oil type" />
                  </SelectTrigger>
                  <SelectContent>
                    {oilTypes.map(oilType => (
                      <SelectItem key={oilType.id} value={oilType.id}>
                        {oilType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4" />
                  <span>Location</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="branchId">Branch/Location</Label>
                <Select
                  value={editData.branchId || ''}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, branchId: value }))}
                >
                  <SelectTrigger data-testid="select-branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Management */}
          {hasQuantityChanges() && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Inventory Adjustment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adjustInventory">Inventory Adjustment Method</Label>
                  <Select
                    value={editData.adjustInventory}
                    onValueChange={(value: 'automatic' | 'manual' | 'none') => 
                      setEditData(prev => ({ ...prev, adjustInventory: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-inventory-adjustment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic Adjustment</SelectItem>
                      <SelectItem value="manual">Manual Adjustment</SelectItem>
                      <SelectItem value="none">No Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editData.adjustInventory === 'manual' && (
                  <div>
                    <Label htmlFor="manualInventoryAdjustment">Manual Adjustment Amount (Liters)</Label>
                    <Input
                      id="manualInventoryAdjustment"
                      type="number"
                      step="0.01"
                      value={editData.manualInventoryAdjustment || ''}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        manualInventoryAdjustment: parseFloat(e.target.value) || undefined
                      }))}
                      data-testid="input-manual-adjustment"
                    />
                  </div>
                )}

                {showInventoryWarning && inventoryImpact && (
                  <Alert>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Inventory Impact Warning:</strong><br />
                      {inventoryImpact.warnings?.map((warning: string, index: number) => (
                        <div key={index}>• {warning}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Changes Summary */}
          {changes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Changes Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {changes.map((change, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{change.field}:</span>
                      <span>
                        <span className="text-red-600">{change.oldValue}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{change.newValue}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reason for Edit */}
          <div>
            <Label htmlFor="reason">Reason for Edit (Required)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you are making these changes..."
              value={editData.reason}
              onChange={(e) => setEditData(prev => ({ ...prev, reason: e.target.value }))}
              className="min-h-[80px]"
              data-testid="textarea-edit-reason"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || changes.length === 0 || !editData.reason.trim()}
              data-testid="button-save-changes"
            >
              {loading ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save Changes ({changes.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
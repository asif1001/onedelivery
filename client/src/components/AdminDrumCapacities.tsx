import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2Icon, EditIcon, PlusIcon, PackageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DrumCapacity {
  id: string;
  name: string;
  value: number;
  active?: boolean;
}

interface AdminDrumCapacitiesProps {
  drumCapacities: DrumCapacity[];
  onAddDrumCapacity: (capacityData: { name: string; value: number }) => void;
  onUpdateDrumCapacity: (id: string, capacityData: { name: string; value: number }) => void;
  onDeleteDrumCapacity: (id: string) => void;
}

export default function AdminDrumCapacities({
  drumCapacities,
  onAddDrumCapacity,
  onUpdateDrumCapacity,
  onDeleteDrumCapacity
}: AdminDrumCapacitiesProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<DrumCapacity | null>(null);
  const [formData, setFormData] = useState({ name: '', value: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddClick = () => {
    setEditingCapacity(null);
    setFormData({ name: '', value: 0 });
    setShowDialog(true);
  };

  const handleEditClick = (capacity: DrumCapacity) => {
    setEditingCapacity(capacity);
    setFormData({ name: capacity.name, value: capacity.value });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.value <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid name and capacity value.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCapacity) {
        await onUpdateDrumCapacity(editingCapacity.id, formData);
        toast({
          title: "Success",
          description: "Drum capacity updated successfully"
        });
      } else {
        await onAddDrumCapacity(formData);
        toast({
          title: "Success",
          description: "New drum capacity added successfully"
        });
      }
      setShowDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save drum capacity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this drum capacity? This action cannot be undone.")) {
      try {
        await onDeleteDrumCapacity(id);
        toast({
          title: "Success",
          description: "Drum capacity deleted successfully"
        });
      } catch (error) {
        toast({
          title: "Error", 
          description: "Failed to delete drum capacity. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const activeDrumCapacities = drumCapacities.filter(capacity => capacity.active !== false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Drum Capacities Management</h3>
          <p className="text-sm text-gray-600">Manage available drum capacities for supply operations</p>
        </div>
        <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Drum Capacity
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeDrumCapacities.map((capacity) => (
          <Card key={capacity.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <PackageIcon className="h-4 w-4 mr-2 text-blue-600" />
                {capacity.name}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClick(capacity)}
                  data-testid={`edit-capacity-${capacity.id}`}
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(capacity.id)}
                  className="text-red-600 hover:text-red-700"
                  data-testid={`delete-capacity-${capacity.id}`}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {capacity.value}L
              </div>
              <Badge variant="outline" className="text-xs">
                Standard drum capacity
              </Badge>
            </CardContent>
          </Card>
        ))}

        {activeDrumCapacities.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PackageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Drum Capacities</h3>
              <p className="text-gray-500 text-center mb-4">
                Get started by adding your first drum capacity for supply operations.
              </p>
              <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add First Drum Capacity
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCapacity ? 'Edit Drum Capacity' : 'Add New Drum Capacity'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Capacity Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Small, Medium, Large"
                data-testid="input-capacity-name"
              />
            </div>
            
            <div>
              <Label htmlFor="value">Capacity (Liters)</Label>
              <Input
                id="value"
                type="number"
                min="1"
                value={formData.value || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                placeholder="e.g., 200, 500, 1000"
                data-testid="input-capacity-value"
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Preview</h4>
              <div className="flex items-center space-x-2">
                <PackageIcon className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{formData.name || 'Capacity Name'}</span>
                <Badge variant="outline">{formData.value || 0}L</Badge>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-save-capacity"
              >
                {isSubmitting ? 'Saving...' : editingCapacity ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
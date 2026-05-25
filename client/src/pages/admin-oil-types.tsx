import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon, EditIcon, TrashIcon, DropletIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OilType {
  id: string;
  name: string;
  color: string;
}

interface InsertOilType {
  name: string;
  color: string;
}

interface AdminOilTypesProps {
  oilTypes: OilType[];
  onAddOilType: (oilType: InsertOilType) => void;
  onUpdateOilType: (id: string, oilType: Partial<OilType>) => void;
  onDeleteOilType: (id: string) => void;
}

const colorOptions = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' }
];

export default function AdminOilTypes({ 
  oilTypes, 
  onAddOilType, 
  onUpdateOilType, 
  onDeleteOilType
}: AdminOilTypesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingOilType, setEditingOilType] = useState<OilType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6'
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3b82f6'
    });
    setEditingOilType(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);

      if (!formData.name) {
        toast({
          title: "Missing Information",
          description: "Please enter an oil type name",
          variant: "destructive"
        });
        return;
      }

      if (editingOilType) {
        onUpdateOilType(editingOilType.id, formData);
        toast({
          title: "Success",
          description: "Oil type updated successfully"
        });
      } else {
        onAddOilType(formData);
        toast({
          title: "Success",
          description: "Oil type added successfully"
        });
      }

      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting oil type:', error);
      toast({
        title: "Error",
        description: "Failed to save oil type",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (oilType: OilType) => {
    setEditingOilType(oilType);
    setFormData({
      name: oilType.name,
      color: oilType.color
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this oil type?')) {
      onDeleteOilType(id);
      toast({
        title: "Success",
        description: "Oil type deleted successfully"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Oil Type Management</h2>
          <p className="text-gray-600">Manage the types of oil products you deliver</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsOpen(true); }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Oil Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOilType ? 'Edit Oil Type' : 'Add New Oil Type'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Oil Type Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Diesel, Petrol, Motor Oil"
                />
              </div>
              
              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`
                        flex items-center justify-center p-3 rounded-lg border-2 transition-all
                        ${formData.color === color.value 
                          ? 'border-gray-800 scale-105' 
                          : 'border-gray-200 hover:border-gray-400'
                        }
                      `}
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-xs text-gray-600">{color.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">Preview</Label>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: formData.color }}
                  >
                    <DropletIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">
                    {formData.name || 'Oil Type Name'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingOilType ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    `${editingOilType ? 'Update' : 'Add'} Oil Type`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {oilTypes?.map((oilType) => (
          <Card key={oilType.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: oilType.color }}
                  >
                    <DropletIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{oilType.name}</CardTitle>
                    <p className="text-sm text-gray-600" style={{ color: oilType.color }}>
                      {oilType.color}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(oilType)}>
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(oilType.id)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Color Code:</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: oilType.color }}
                    />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {oilType.color}
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!oilTypes || oilTypes.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <DropletIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No oil types yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first oil type.</p>
            <Button onClick={() => setIsOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Oil Type
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
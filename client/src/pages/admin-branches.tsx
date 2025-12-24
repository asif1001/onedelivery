import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon, EditIcon, TrashIcon, MapPinIcon, PhoneIcon, SearchIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OilTank {
  capacity: number;
  oilTypeId: string;
  oilTypeName: string;
  currentLevel: number;
  isActive?: boolean;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  contactNo: string;
  isActive?: boolean;
  oilTanks: OilTank[];
}

interface OilType {
  id: string;
  name: string;
  color: string;
}

interface CreateOilTank {
  capacity: number;
  oilTypeId: string;
  oilTypeName: string;
  currentLevel: number;
  isActive?: boolean;
}

interface CreateBranch {
  name: string;
  address: string;
  contactNo: string;
  oilTanks: CreateOilTank[];
}

interface AdminBranchesProps {
  branches: Branch[];
  oilTypes: OilType[];
  onAddBranch: (branch: CreateBranch) => void;
  onUpdateBranch: (id: string, branch: Partial<Branch>) => void;
  onDeleteBranch: (id: string) => void;
  onToggleBranchStatus: (id: string, isActive: boolean) => void;
}

export default function AdminBranches({ 
  branches, 
  oilTypes, 
  onAddBranch, 
  onUpdateBranch, 
  onDeleteBranch,
  onToggleBranchStatus
}: AdminBranchesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter branches based on search term
  const filteredBranches = branches.filter(branch =>
    (branch.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (branch.address?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNo: '',
    oilTanks: [] as CreateOilTank[]
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      contactNo: '',
      oilTanks: []
    });
    setEditingBranch(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);

      if (!formData.name || !formData.address || !formData.contactNo) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      if (editingBranch) {
        onUpdateBranch(editingBranch.id, formData);
        toast({
          title: "Success",
          description: "Branch updated successfully"
        });
      } else {
        onAddBranch(formData);
        toast({
          title: "Success",
          description: "Branch added successfully"
        });
      }

      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting branch:', error);
      toast({
        title: "Error",
        description: "Failed to save branch",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      contactNo: branch.contactNo,
      oilTanks: branch.oilTanks
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      onDeleteBranch(id);
      toast({
        title: "Success",
        description: "Branch deleted successfully"
      });
    }
  };

  const addOilTank = () => {
    setFormData(prev => ({
      ...prev,
      oilTanks: [...prev.oilTanks, {
        capacity: 0,
        oilTypeId: '',
        oilTypeName: '',
        currentLevel: 0
      }]
    }));
  };

  const updateOilTank = (index: number, field: keyof CreateOilTank, value: any) => {
    setFormData(prev => ({
      ...prev,
      oilTanks: prev.oilTanks.map((tank, i) => 
        i === index ? { ...tank, [field]: value } : tank
      )
    }));
  };

  const removeOilTank = (index: number) => {
    setFormData(prev => ({
      ...prev,
      oilTanks: prev.oilTanks.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Branch Management</h2>
          <p className="text-gray-600">Manage your oil delivery branches and tank capacities</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
              data-testid="search-branches"
            />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsOpen(true); }} data-testid="add-branch-btn">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter branch name"
                  />
                </div>
                <div>
                  <Label htmlFor="contactNo">Contact Number</Label>
                  <Input
                    id="contactNo"
                    value={formData.contactNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
                    placeholder="Enter contact number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter branch address"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Oil Tanks</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOilTank}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Tank
                  </Button>
                </div>
                
                {formData.oilTanks.map((tank, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Oil Type</Label>
                        <Select
                          value={tank.oilTypeId}
                          onValueChange={(value) => {
                            const selectedOilType = oilTypes.find(ot => ot.id === value);
                            updateOilTank(index, 'oilTypeId', value);
                            updateOilTank(index, 'oilTypeName', selectedOilType?.name || '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select oil type" />
                          </SelectTrigger>
                          <SelectContent>
                            {oilTypes?.map(oilType => (
                              <SelectItem key={oilType.id} value={oilType.id}>
                                {oilType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Capacity (Liters)</Label>
                        <Input
                          type="number"
                          value={tank.capacity}
                          onChange={(e) => updateOilTank(index, 'capacity', Number(e.target.value))}
                          placeholder="Enter capacity"
                        />
                      </div>
                      <div>
                        <Label>Current Level (Liters)</Label>
                        <Input
                          type="number"
                          value={tank.currentLevel}
                          onChange={(e) => updateOilTank(index, 'currentLevel', Number(e.target.value))}
                          placeholder="Enter current level"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removeOilTank(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
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
                      {editingBranch ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    `${editingBranch ? 'Update' : 'Add'} Branch`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.length === 0 && searchTerm && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No branches found matching "{searchTerm}"
          </div>
        )}
        {filteredBranches?.map((branch) => (
          <Card key={branch.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-3">
              {/* Branch Name - Full Width */}
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPinIcon className="h-5 w-5 text-blue-600" />
                  {branch.name}
                </CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    branch.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {branch.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {/* Branch Details */}
              <div className="space-y-1">
                <p className="text-sm text-gray-600">{branch.address}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <PhoneIcon className="h-4 w-4" />
                  {branch.contactNo}
                </p>
              </div>
              
              {/* Action Buttons - Full Width */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <Button 
                  size="sm" 
                  variant={branch.isActive !== false ? "destructive" : "default"}
                  onClick={() => onToggleBranchStatus(branch.id, branch.isActive === false)}
                  data-testid={`toggle-branch-${branch.id}`}
                >
                  {branch.isActive !== false ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(branch)} data-testid={`edit-branch-${branch.id}`}>
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(branch.id)} data-testid={`delete-branch-${branch.id}`}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Oil Tanks ({branch.oilTanks?.length || 0})</h4>
                {branch.oilTanks && branch.oilTanks.length > 0 ? (
                  <div className="space-y-2">
                    {branch.oilTanks.map((tank, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{tank.oilTypeName}</p>
                          <p className="text-xs text-gray-600">
                            {tank.currentLevel}L / {tank.capacity}L
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ 
                                width: `${Math.min((tank.currentLevel / tank.capacity) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {Math.round((tank.currentLevel / tank.capacity) * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No tanks configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredBranches || filteredBranches.length === 0) && !searchTerm && (
        <Card className="text-center py-12">
          <CardContent>
            <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No branches yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first branch location.</p>
            <Button onClick={() => setIsOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Branch
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
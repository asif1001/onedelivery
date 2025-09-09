import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangleIcon, 
  MessageCircleIcon, 
  UploadIcon, 
  ClockIcon, 
  UserIcon, 
  FileTextIcon,
  ImageIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon,
  MapPinIcon
} from "lucide-react";

interface ComplaintComment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  type: 'comment' | 'status_change' | 'document_upload';
  oldStatus?: string;
  newStatus?: string;
}

interface ComplaintDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: 'equipment' | 'delivery' | 'safety' | 'customer' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  reportedBy: string;
  reporterName: string;
  assignedTo?: string;
  branchId?: string;
  branchName?: string;
  oilTypeId?: string;
  oilTypeName?: string;
  location?: string;
  photos: string[];
  watermarkedPhotos: string[];
  createdAt: Date;
  updatedAt: Date;
  resolution?: string;
  resolvedAt?: Date;
  taskId?: string;
  comments?: ComplaintComment[];
  documents?: ComplaintDocument[];
  lastUpdated?: Date;
  updatedBy?: string;
}

interface EnhancedComplaintModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (complaintId: string, newStatus: string) => Promise<void>;
  onAddComment: (complaintId: string, comment: string) => Promise<void>;
  onUploadDocument: (complaintId: string, files: FileList) => Promise<void>;
  user: any;
  isUpdating?: boolean;
  isAddingComment?: boolean;
  isUploading?: boolean;
  onPhotoClick?: (url: string, label: string) => void;
}

function EnhancedComplaintModal({
  complaint,
  isOpen,
  onClose,
  onStatusUpdate,
  onAddComment,
  onUploadDocument,
  user,
  isUpdating = false,
  isAddingComment = false,
  isUploading = false,
  onPhotoClick
}: EnhancedComplaintModalProps) {
  const [newComment, setNewComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in-progress' | 'resolved' | 'closed'>(complaint?.status || 'open');
  const [hasChanges, setHasChanges] = useState(false);

  if (!complaint) return null;

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setHasChanges(newStatus !== complaint.status || newComment.trim() !== '' || selectedFiles !== null);
  };

  const handleSubmitChanges = async () => {
    try {
      // Update status if changed
      if (selectedStatus !== complaint.status) {
        await onStatusUpdate(complaint.id, selectedStatus as string);
      }
      
      // Add comment if provided
      if (newComment.trim()) {
        await onAddComment(complaint.id, newComment.trim());
        setNewComment('');
      }
      
      // Upload files if selected
      if (selectedFiles && selectedFiles.length > 0) {
        await onUploadDocument(complaint.id, selectedFiles);
        setSelectedFiles(null);
      }
      
      setHasChanges(false);
      
      // Close modal after successful submission
      onClose();
    } catch (error) {
      console.error('Error submitting changes:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await onAddComment(complaint.id, newComment.trim());
    setNewComment('');
  };

  const handleFileUpload = async () => {
    if (!selectedFiles) return;
    await onUploadDocument(complaint.id, selectedFiles);
    setSelectedFiles(null);
  };

  const formatDate = (date: Date | string | null | any) => {
    if (!date) return 'N/A';
    
    let d: Date;
    if (typeof date === 'string') {
      d = new Date(date);
    } else if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firebase Timestamp
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else {
      return 'Invalid Date';
    }
    
    if (!d || isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'open': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageCircleIcon className="h-4 w-4 text-blue-500" />;
      case 'status_change': return <AlertTriangleIcon className="h-4 w-4 text-orange-500" />;
      case 'document_upload': return <FileTextIcon className="h-4 w-4 text-green-500" />;
      default: return <MessageCircleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangleIcon className="h-6 w-6 text-red-500" />
                Complaint #{complaint.id.slice(-8).toUpperCase()}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {complaint.title || 'Untitled Complaint'} • {complaint.category || 'General'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(complaint.status)} variant="secondary">
                {complaint.status.replace('-', ' ').toUpperCase()}
              </Badge>
              {complaint.priority && (
                <Badge variant="outline" className={
                  complaint.priority === 'high' ? 'border-red-500 text-red-700' :
                  complaint.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                  'border-green-500 text-green-700'
                }>
                  {complaint.priority.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Complaint Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Complaint Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complaint Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(complaint.status)}>
                    {complaint.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{complaint.description || 'No description provided'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-700 font-medium">Reported By</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">
                          {complaint.reporterName || 'Unknown Driver'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">ID: {complaint.reportedBy}</p>
                    </div>
                    
                    <div>
                      <Label className="text-gray-700 font-medium">Branch/Location</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900 font-medium">
                          {complaint.branchName || complaint.location || 'Unknown Location'}
                        </p>
                      </div>
                      {complaint.branchId && (
                        <p className="text-xs text-gray-500 ml-6">Branch ID: {complaint.branchId}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-700 font-medium">Created</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900">{formatDate(complaint.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-700 font-medium">Last Updated</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-gray-900">
                          {complaint.lastUpdated ? formatDate(complaint.lastUpdated) : 'Never'}
                        </p>
                      </div>
                      {complaint.updatedBy && (
                        <p className="text-xs text-gray-500 ml-6">by {complaint.updatedBy}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Original Photo(s) */}
                {(complaint.photos && complaint.photos.length > 0) && (
                  <div>
                    <Label className="text-gray-700 font-medium">Complaint Photo Evidence</Label>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {/* Handle photos array */}
                      {complaint.photos && Array.isArray(complaint.photos) && complaint.photos.map((photoUrl: string, index: number) => (
                        <div key={index} className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(photoUrl, `Complaint Photo ${index + 1}`)}>
                          <img 
                            src={photoUrl} 
                            alt={`Complaint evidence ${index + 1}`} 
                            className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                      
                      {/* Handle watermarked photos array */}
                      {complaint.watermarkedPhotos && Array.isArray(complaint.watermarkedPhotos) && complaint.watermarkedPhotos.map((photoUrl: string, index: number) => (
                        <div key={index} className="relative group cursor-pointer"
                             onClick={() => onPhotoClick && onPhotoClick(photoUrl, `Complaint Photo ${index + 1}`)}>
                          <img 
                            src={photoUrl} 
                            alt={`Complaint evidence ${index + 1}`} 
                            className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Click photos to view full size</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircleIcon className="h-5 w-5" />
                  Resolution Tracking & Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {complaint.comments && complaint.comments.length > 0 ? (
                    complaint.comments
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          {getCommentTypeIcon(comment.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.author}</span>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                            {comment.type === 'status_change' && (
                              <div className="mt-1">
                                <Badge className="text-xs bg-orange-100 text-orange-800">
                                  {comment.oldStatus} → {comment.newStatus}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No resolution comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Add Resolution Comment</Label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => {
                        setNewComment(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="Add resolution notes, action taken, or update comments..."
                      rows={3}
                      className="resize-none"
                    />
                    {newComment.trim() && (
                      <p className="text-xs text-blue-600">Comment will be added when you submit</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Actions & Documents */}
          <div className="space-y-4">
            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complaint Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Update Status</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={handleStatusChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Open
                        </div>
                      </SelectItem>
                      <SelectItem value="in-progress">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          In Progress
                        </div>
                      </SelectItem>
                      <SelectItem value="resolved">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Resolved
                        </div>
                      </SelectItem>
                      <SelectItem value="closed">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          Closed
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedStatus !== complaint.status && (
                    <p className="text-xs text-orange-600 mt-1">Status will be updated when you submit</p>
                  )}
                </div>

                <div className="pt-2 text-xs text-gray-600">
                  <p><strong>Open:</strong> New complaint</p>
                  <p><strong>In Progress:</strong> Being investigated</p>
                  <p><strong>Resolved:</strong> Issue fixed</p>
                  <p><strong>Closed:</strong> Completed/archived</p>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  Resolution Documents ({complaint.documents?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {complaint.documents && complaint.documents.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {complaint.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileTextIcon className="h-4 w-4 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {doc.uploadedBy} • {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No resolution documents</p>
                )}

                {/* Upload Documents */}
                <div className="pt-3 border-t">
                  <Label className="text-sm font-medium">Upload Resolution Documents</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => {
                      setSelectedFiles(e.target.files);
                      setHasChanges(true);
                    }}
                    className="mt-1"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  {selectedFiles && selectedFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-blue-600">
                        {selectedFiles.length} file(s) selected - will be uploaded when you submit
                      </p>
                      <div className="mt-1 text-xs text-gray-500">
                        {Array.from(selectedFiles).map((file, index) => (
                          <div key={index}>• {file.name}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-4 mt-6">
          <div className="text-sm text-gray-600">
            {hasChanges ? (
              <span className="text-orange-600 font-medium">
                You have unsaved changes
              </span>
            ) : (
              'No pending changes'
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating || isAddingComment || isUploading}
            >
              Close
            </Button>
            
            <Button
              onClick={handleSubmitChanges}
              disabled={!hasChanges || isUpdating || isAddingComment || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(isUpdating || isAddingComment || isUploading) ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Submit Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedComplaintModal;
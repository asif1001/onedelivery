import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  MapPinIcon,
  DownloadIcon,
  EyeIcon,
  ExternalLinkIcon,
  TrashIcon
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
  onDeleteDocument?: (complaintId: string, documentId: string) => Promise<void>;
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
  onDeleteDocument,
  user,
  isUpdating = false,
  isAddingComment = false,
  isUploading = false,
  onPhotoClick
}: EnhancedComplaintModalProps) {
  const [newComment, setNewComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  // Helper function to validate and convert status
  const getValidStatus = (status: string | undefined): 'open' | 'in-progress' | 'resolved' | 'closed' => {
    const validStatuses: ('open' | 'in-progress' | 'resolved' | 'closed')[] = ['open', 'in-progress', 'resolved', 'closed'];
    return validStatuses.includes(status as any) ? status as 'open' | 'in-progress' | 'resolved' | 'closed' : 'open';
  };
  
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in-progress' | 'resolved' | 'closed'>(getValidStatus(complaint?.status));
  const [hasChanges, setHasChanges] = useState(false);

  // Sync selectedStatus with complaint prop changes
  useEffect(() => {
    if (complaint?.status) {
      setSelectedStatus(getValidStatus(complaint.status));
      setHasChanges(false);
      setNewComment('');
      setSelectedFiles(null);
    }
  }, [complaint?.id, complaint?.status]);

  if (!complaint) return null;

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(getValidStatus(newStatus));
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

  // Document download and view functions
  const handleDownloadDocument = async (doc: ComplaintDocument) => {
    try {
      console.log('Downloading document:', doc.name, doc.url);
      
      // For Firebase Storage URLs, use a more robust approach
      const response = await fetch(doc.url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': '*/*',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Downloaded blob:', blob.type, blob.size);
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.name || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      // Fallback: try direct download with different approach
      try {
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = doc.name || 'download';
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error('Fallback download failed:', fallbackError);
        // Last resort: open in new tab
        window.open(doc.url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleViewDocument = (doc: ComplaintDocument) => {
    try {
      console.log('Viewing document:', doc.name, doc.type, doc.url);
      
      // Open in new tab with proper security attributes
      const newWindow = window.open(doc.url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        console.warn('Popup blocked, trying alternative approach');
        // If popup is blocked, try alternative approach
        const link = document.createElement('a');
        link.href = doc.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      // Fallback to download
      handleDownloadDocument(doc);
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('image')) {
      return <ImageIcon className="h-4 w-4 text-green-500" />;
    } else if (type.includes('pdf')) {
      return <FileTextIcon className="h-4 w-4 text-red-500" />;
    } else {
      return <FileTextIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleDeleteDocument = async (doc: ComplaintDocument) => {
    if (!onDeleteDocument) return;
    
    try {
      await onDeleteDocument(complaint.id, doc.id);
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] overflow-y-auto">
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Complaint Details */}
          <div className="xl:col-span-2 space-y-4">
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

                {/* Complaint Photo Evidence - prioritize watermarked photos */}
                {(() => {
                  // Prioritize watermarked photos over regular photos to avoid duplicates
                  const photosToShow = (complaint.watermarkedPhotos && complaint.watermarkedPhotos.length > 0) 
                    ? complaint.watermarkedPhotos 
                    : complaint.photos || [];
                  
                  return photosToShow && photosToShow.length > 0 && (
                    <div>
                      <Label className="text-gray-700 font-medium">Complaint Photo Evidence</Label>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {photosToShow.map((photoUrl: string, index: number) => (
                          <div key={`photo-${index}`} className="relative group cursor-pointer"
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
                  );
                })()}
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
                  <Label className="text-sm font-medium mb-3 block">Update Status</Label>
                  <RadioGroup
                    value={selectedStatus}
                    onValueChange={handleStatusChange}
                    disabled={isUpdating}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="open" id="status-open" />
                      <Label htmlFor="status-open" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Open</div>
                          <div className="text-xs text-gray-500">New complaint</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="in-progress" id="status-in-progress" />
                      <Label htmlFor="status-in-progress" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">In Progress</div>
                          <div className="text-xs text-gray-500">Being investigated</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="resolved" id="status-resolved" />
                      <Label htmlFor="status-resolved" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Resolved</div>
                          <div className="text-xs text-gray-500">Issue fixed</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="closed" id="status-closed" />
                      <Label htmlFor="status-closed" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Closed</div>
                          <div className="text-xs text-gray-500">Completed/archived</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {selectedStatus !== complaint.status && (
                    <p className="text-xs text-orange-600 mt-2 font-medium">Status will be updated when you submit</p>
                  )}
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
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {complaint.documents.map((doc) => (
                      <div key={doc.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                        <div className="mt-1">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium break-words" title={doc.name}>{doc.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>{doc.uploadedBy}</span>
                            <span>•</span>
                            <span>{formatDate(doc.uploadedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{(doc.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span className="break-all">{doc.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDocument(doc)}
                            className="h-8 w-8 p-0"
                            title={doc.type.includes('image') || doc.type.includes('pdf') ? 'View document' : 'Open document'}
                            data-testid={`button-view-document-${doc.id}`}
                          >
                            <EyeIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-8 w-8 p-0"
                            title="Download document"
                            data-testid={`button-download-document-${doc.id}`}
                          >
                            <DownloadIcon className="h-3 w-3" />
                          </Button>
                          {onDeleteDocument && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteDocument(doc)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete document"
                              data-testid={`button-delete-document-${doc.id}`}
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          )}
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
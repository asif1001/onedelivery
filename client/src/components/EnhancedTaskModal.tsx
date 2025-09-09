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
  FileTextIcon, 
  MessageCircleIcon, 
  UploadIcon, 
  ClockIcon, 
  UserIcon, 
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon,
  DownloadIcon,
  ImageIcon,
  FileIcon,
  EyeIcon,
  TrashIcon
} from "lucide-react";

interface TaskComment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  type: 'comment' | 'status_change' | 'document_upload';
  oldStatus?: string;
  newStatus?: string;
}

interface TaskDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: Date;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  comments?: TaskComment[];
  documents?: TaskDocument[];
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  lastUpdated?: Date;
  updatedBy?: string;
}

interface EnhancedTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (taskId: string, newStatus: string) => Promise<void>;
  onAddComment: (taskId: string, comment: string) => Promise<void>;
  onUploadDocument: (taskId: string, files: FileList) => Promise<void>;
  onDeleteDocument?: (taskId: string, documentId: string) => Promise<void>;
  user: any;
  isUpdating?: boolean;
  isAddingComment?: boolean;
  isUploading?: boolean;
  onPhotoClick?: (url: string, label: string) => void;
}

function EnhancedTaskModal({
  task,
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
}: EnhancedTaskModalProps) {
  const [newComment, setNewComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'in-progress' | 'completed'>(task?.status || 'pending');

  // Sync selectedStatus with task prop changes
  useEffect(() => {
    if (task?.status) {
      setSelectedStatus(task.status as 'pending' | 'in-progress' | 'completed');
      setNewComment('');
      setSelectedFiles(null);
    }
  }, [task?.id, task?.status]);

  if (!task) return null;

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus as 'pending' | 'in-progress' | 'completed');
  };

  const handleSubmitStatusChange = async () => {
    if (selectedStatus !== task.status) {
      await onStatusUpdate(task.id, selectedStatus);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await onAddComment(task.id, newComment.trim());
    setNewComment('');
  };

  const handleFileUpload = async () => {
    if (!selectedFiles) return;
    await onUploadDocument(task.id, selectedFiles);
    setSelectedFiles(null);
  };

  const formatDate = (date: Date | string | any) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageCircleIcon className="h-4 w-4 text-blue-500" />;
      case 'status_change': return <AlertCircleIcon className="h-4 w-4 text-orange-500" />;
      case 'document_upload': return <FileTextIcon className="h-4 w-4 text-green-500" />;
      default: return <MessageCircleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDocument = (doc: TaskDocument) => {
    if (onPhotoClick) {
      onPhotoClick(doc.url, doc.name);
    } else {
      window.open(doc.url, '_blank');
    }
  };

  const handleDownloadDocument = (doc: TaskDocument) => {
    downloadFile(doc.url, doc.name);
  };

  const handleDeleteDocument = async (doc: TaskDocument) => {
    if (!onDeleteDocument) return;
    
    try {
      await onDeleteDocument(task.id, doc.id);
    } catch (error) {
      console.error('Error deleting document:', error);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Task #{new Date(task.createdAt).getFullYear()}-{String(task.id).padStart(5, '0')}
          </DialogTitle>
          <DialogDescription>
            Task details, comments history, and document management
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Task Details */}
          <div className="xl:col-span-2 space-y-4">
            {/* Task Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-700">Assigned To</Label>
                    <p className="text-gray-600">{task.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Due Date</Label>
                    <p className="text-gray-600">{formatDate(task.dueDate)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Created</Label>
                    <p className="text-gray-600">{formatDate(task.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Last Updated</Label>
                    <p className="text-gray-600">{task.lastUpdated ? formatDate(task.lastUpdated) : 'Never'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircleIcon className="h-5 w-5" />
                  Comments & Activity History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments
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
                    <p className="text-gray-500 text-center py-4">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-3">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddComment} 
                      disabled={!newComment.trim() || isAddingComment}
                      size="sm"
                    >
                      {isAddingComment ? (
                        <>
                          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <MessageCircleIcon className="h-4 w-4 mr-2" />
                          Add Comment
                        </>
                      )}
                    </Button>
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
                <CardTitle className="text-lg">Quick Actions</CardTitle>
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
                      <RadioGroupItem value="pending" id="status-pending" />
                      <Label htmlFor="status-pending" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Pending</div>
                          <div className="text-xs text-gray-500">Not started yet</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="in-progress" id="status-in-progress" />
                      <Label htmlFor="status-in-progress" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">In Progress</div>
                          <div className="text-xs text-gray-500">Currently working</div>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <RadioGroupItem value="completed" id="status-completed" />
                      <Label htmlFor="status-completed" className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">Completed</div>
                          <div className="text-xs text-gray-500">Task finished</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {selectedStatus !== task.status && (
                    <div className="mt-3">
                      <Button 
                        onClick={handleSubmitStatusChange}
                        disabled={isUpdating}
                        size="sm"
                        className="w-full"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Status'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileIcon className="h-5 w-5" />
                    Task Attachments ({task.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {task.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          {attachment.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <FileIcon className="h-4 w-4 text-blue-600" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(attachment.url, attachment.name)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  Additional Documents ({task.documents?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.documents && task.documents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {task.documents.map((doc) => (
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
                            <span>{formatFileSize(doc.size)}</span>
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
                  <p className="text-gray-500 text-sm">No additional documents uploaded</p>
                )}

                {/* Upload Documents */}
                <div className="pt-3 border-t">
                  <Label className="text-sm font-medium">Upload Additional Documents</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="mt-1"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  {selectedFiles && selectedFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        {selectedFiles.length} file(s) selected
                      </p>
                      <Button 
                        onClick={handleFileUpload}
                        disabled={isUploading}
                        size="sm"
                        className="mt-2 w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadIcon className="h-4 w-4 mr-2" />
                            Upload Files
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedTaskModal;
// Unified core types for the app. Extend as needed for other shared types.

export interface ComplaintComment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  type: 'comment' | 'status_change' | 'document_upload';
  oldStatus?: string;
  newStatus?: string;
}

export interface ComplaintDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Complaint {
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

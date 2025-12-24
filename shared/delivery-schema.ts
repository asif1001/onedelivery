// Comprehensive delivery management schema for complex oil delivery scenarios

export interface LoadSession {
  id: string;
  loadDriverId: string;
  loadDriverName: string;
  oilTypeId: string;
  oilTypeName: string;
  totalLoadedLiters: number;
  remainingLiters: number;
  loadTimestamp: string;
  loadLocationId?: string;
  loadMeterReading: number;
  loadPhoto: string;
  truckId?: string;
  truckPlateNumber?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  loadSessionId: string; // Links to the load session
  deliveryDriverId: string;
  deliveryDriverName: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  
  // Delivery details
  requestedLiters: number;
  actualDeliveredLiters: number;
  startMeterReading: number;
  endMeterReading: number;
  
  // Photos and evidence
  tankLevelBeforePhoto: string;
  hoseConnectionPhoto: string;
  tankLevelAfterPhoto: string;
  deliveryReceiptPhoto?: string;
  
  // Timestamps
  scheduledDeliveryTime?: string;
  actualDeliveryStartTime: string;
  actualDeliveryEndTime: string;
  
  // Status tracking
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  
  // Additional data
  customerSignature?: string;
  deliveryNotes?: string;
  complaintId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTransaction {
  id: string;
  loadSessionId: string;
  deliveryOrderId: string;
  transactionType: 'delivery' | 'return' | 'transfer';
  
  // Driver info
  loadDriverId: string;
  deliveryDriverId: string;
  
  // Oil details
  oilTypeId: string;
  litersTransferred: number;
  
  // Location details
  fromLocationId?: string; // For transfers
  toLocationId: string; // Branch or depot
  
  // Meter readings
  meterBefore: number;
  meterAfter: number;
  
  // Evidence
  photos: string[];
  
  timestamp: string;
  createdAt: string;
}

export interface DeliveryComplaint {
  id: string;
  loadSessionId?: string;
  deliveryOrderId?: string;
  
  // Reporter info
  reportedByDriverId: string;
  reportedByDriverName: string;
  
  // Complaint details
  complaintType: 'equipment' | 'quality' | 'quantity' | 'customer' | 'safety' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  
  // Location and context
  branchId?: string;
  location: string;
  
  // Evidence
  photos: string[];
  
  // Resolution
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolutionNotes?: string;
  resolvedByAdminId?: string;
  resolvedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Summary interfaces for reporting
export interface LoadSessionSummary {
  loadSession: LoadSession;
  totalDeliveries: number;
  totalDeliveredLiters: number;
  remainingLiters: number;
  deliveries: DeliveryOrder[];
  complaints: DeliveryComplaint[];
}

export interface DriverDayReport {
  driverId: string;
  driverName: string;
  date: string;
  
  // Load sessions (if driver loaded)
  loadSessions: LoadSession[];
  totalLoaded: number;
  
  // Deliveries (if driver delivered)
  deliveries: DeliveryOrder[];
  totalDelivered: number;
  
  // Summary
  branchesServiced: string[];
  complaints: DeliveryComplaint[];
  hoursWorked: number;
}

export interface AdminDashboardData {
  date: string;
  
  // Overall metrics
  totalLoadSessions: number;
  totalLitersLoaded: number;
  totalDeliveries: number;
  totalLitersDelivered: number;
  efficiency: number; // delivered/loaded ratio
  
  // Driver performance
  activeDrivers: number;
  driverReports: DriverDayReport[];
  
  // Branch metrics
  branchDeliveries: {
    branchId: string;
    branchName: string;
    deliveryCount: number;
    totalLiters: number;
  }[];
  
  // Issues
  openComplaints: DeliveryComplaint[];
  pendingDeliveries: DeliveryOrder[];
  
  // Oil type breakdown
  oilTypeMetrics: {
    oilTypeId: string;
    oilTypeName: string;
    totalLoaded: number;
    totalDelivered: number;
    remaining: number;
  }[];
}
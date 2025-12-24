// Simple mock data functions since Firebase Admin SDK requires service account
// The frontend will continue to use Firebase directly
// These endpoints provide the same data structure for the delivery workflow

// Return actual oil types from your Firestore collection 
export const getOilTypes = async (): Promise<any[]> => {
  // Based on your Firestore screenshots, you have "Min Oil" and "Syn Oil"
  return [
    {
      id: "bGTwva2sKFalkYRUSqt", 
      name: "Min Oil",
      color: "#22c55e",
      active: true,
      createdAt: "2025-08-14T15:16:33.000Z"
    },
    {
      id: "BxPJhZEBMTZd4s7DRwj",
      name: "Syn Oil", 
      color: "#3b82f6",
      active: true,
      createdAt: "2025-08-14T15:16:31.000Z"
    }
  ];
};

export const getBranches = async (): Promise<any[]> => {
  // Return branches that match your actual Firestore "branches" collection
  return [
    {
      id: "NYH6ZJe3cCQZtWBzYjB",
      name: "ARAD TSC",
      address: "ARAD TOYOTA SERVICE STATION",
      contactNo: "33239783",
      active: true,
      createdAt: "2025-08-14T15:18:16.000Z",
      oilTanks: [
        {
          capacity: 12000,
          oilTypeId: 0
        }
      ]
    }
  ];
};

// Load sessions management
export const getActiveLoadSessions = async (driverId?: string) => {
  try {
    // Return active load sessions - filter by driver if specified
    const mockSessions = [
      {
        id: 'load_001',
        loadDriverId: 'DhCpjywb0cNi0A66R9YHrR9aut02',
        loadDriverName: 'kannan.n',
        oilTypeId: 'bGTwva2sKFalkYRUSqt',
        oilTypeName: 'Min Oil',
        totalLoadedLiters: 2500,
        remainingLiters: 2500,
        loadTimestamp: new Date().toISOString(),
        loadMeterReading: 150000,
        loadPhoto: 'load_photo_url',
        truckPlateNumber: 'BH-12345',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    return driverId ? mockSessions.filter(s => s.loadDriverId === driverId) : mockSessions;
  } catch (error) {
    console.error('Error fetching load sessions:', error);
    throw error;
  }
};

export const createLoadSession = async (loadData: any) => {
  try {
    const newSession = {
      id: `load_${Date.now()}`,
      ...loadData,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In production: await db.collection('loadSessions').add(newSession);
    console.log('Created load session:', newSession);
    return newSession;
  } catch (error) {
    console.error('Error creating load session:', error);
    throw error;
  }
};

export const getDeliveryOrders = async (loadSessionId?: string) => {
  try {
    // Return delivery orders - filter by load session if specified
    const mockOrders = [
      { 
        id: 'del_001', 
        orderNumber: 'ORD-2025-001',
        loadSessionId: 'load_001',
        branchId: 'NYH6ZJe3cCQZtWBzYjB',
        branchName: 'ARAD TSC',
        requestedLiters: 1000,
        status: 'pending'
      },
      { 
        id: 'del_002', 
        orderNumber: 'ORD-2025-002',
        loadSessionId: 'load_001',
        branchId: 'NYH6ZJe3cCQZtWBzYjB',
        branchName: 'ARAD TSC',
        requestedLiters: 1500,
        status: 'pending'
      }
    ];
    
    return loadSessionId ? mockOrders.filter(o => o.loadSessionId === loadSessionId) : mockOrders;
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    throw error;
  }
};

export const createDeliveryOrder = async (orderData: any) => {
  try {
    const newOrder = {
      id: `del_${Date.now()}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In production: await db.collection('deliveryOrders').add(newOrder);
    console.log('Created delivery order:', newOrder);
    return newOrder;
  } catch (error) {
    console.error('Error creating delivery order:', error);
    throw error;
  }
};

export const updateLoadSessionRemaining = async (loadSessionId: string, deliveredLiters: number) => {
  try {
    // In production: update the remaining liters in Firestore
    console.log(`Updating load session ${loadSessionId}: delivered ${deliveredLiters}L`);
    
    // Mock update
    return {
      loadSessionId,
      deliveredLiters,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating load session:', error);
    throw error;
  }
};
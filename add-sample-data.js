// Sample data script for onedelveiry app
// Run this in Firebase Console or through Firebase Admin SDK

const sampleData = {
  // Branches (Oil Depots)
  branches: [
    {
      id: 'branch-001',
      name: 'Main Depot - Manama',
      address: 'Industrial Area, Manama, Bahrain',
      manager: 'Ahmed Al-Khalifa',
      phone: '+973-1234-5678',
      capacity: 50000,
      currentStock: 35000,
      active: true,
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'branch-002', 
      name: 'North Depot - Muharraq',
      address: 'Muharraq Industrial Zone, Bahrain',
      manager: 'Sara Al-Mahmood',
      phone: '+973-1234-5679',
      capacity: 30000,
      currentStock: 22000,
      active: true,
      createdAt: new Date('2024-02-01')
    },
    {
      id: 'branch-003',
      name: 'South Depot - Riffa',
      address: 'Riffa Industrial District, Bahrain', 
      manager: 'Mohammed Al-Ansari',
      phone: '+973-1234-5680',
      capacity: 40000,
      currentStock: 18000,
      active: true,
      createdAt: new Date('2024-02-10')
    }
  ],

  // Oil Types
  oilTypes: [
    {
      id: 'oil-001',
      name: 'Premium Diesel',
      category: 'Diesel',
      pricePerLiter: 0.450,
      viscosity: '10W-40',
      specifications: 'Euro 5 Standard',
      description: 'High-quality diesel fuel for commercial vehicles',
      active: true,
      color: '#1f2937',
      createdAt: new Date('2024-01-10')
    },
    {
      id: 'oil-002',
      name: 'Super Gasoline 95',
      category: 'Gasoline',
      pricePerLiter: 0.520,
      viscosity: 'N/A',
      specifications: 'Octane 95',
      description: 'High octane gasoline for passenger vehicles',
      active: true,
      color: '#dc2626',
      createdAt: new Date('2024-01-10')
    },
    {
      id: 'oil-003',
      name: 'Industrial Lubricant',
      category: 'Lubricant',
      pricePerLiter: 1.250,
      viscosity: '15W-50',
      specifications: 'API CF-4',
      description: 'Heavy-duty lubricant for industrial equipment',
      active: true,
      color: '#059669',
      createdAt: new Date('2024-01-12')
    },
    {
      id: 'oil-004',
      name: 'Marine Fuel Oil',
      category: 'Marine',
      pricePerLiter: 0.380,
      viscosity: 'Heavy',
      specifications: 'IMO 2020 Compliant',
      description: 'Low sulfur marine fuel for ships',
      active: true,
      color: '#1e40af',
      createdAt: new Date('2024-01-15')
    }
  ],

  // Tasks
  tasks: [
    {
      id: 'task-001',
      title: 'Deliver 5000L Premium Diesel to Al-Fateh Terminal',
      description: 'Urgent delivery required for Al-Fateh Gas Station',
      assignedTo: 'driver-001',
      assignedToName: 'Ali Hassan',
      priority: 'high',
      status: 'pending',
      dueDate: new Date('2024-08-21'),
      deliveryLocation: 'Al-Fateh Gas Station, Manama',
      oilType: 'Premium Diesel',
      quantity: 5000,
      branch: 'Main Depot - Manama',
      customerName: 'Al-Fateh Trading Co.',
      customerPhone: '+973-1111-2222',
      createdAt: new Date('2024-08-20'),
      estimatedDuration: 3,
      notes: 'Customer prefers morning delivery'
    },
    {
      id: 'task-002',
      title: 'Supply 3000L Super Gasoline to City Center',
      description: 'Regular supply delivery to City Center Mall station',
      assignedTo: 'driver-002', 
      assignedToName: 'Omar Al-Zahra',
      priority: 'medium',
      status: 'in-progress',
      dueDate: new Date('2024-08-21'),
      deliveryLocation: 'City Center Mall, Manama',
      oilType: 'Super Gasoline 95',
      quantity: 3000,
      branch: 'North Depot - Muharraq',
      customerName: 'City Center Operations',
      customerPhone: '+973-2222-3333',
      createdAt: new Date('2024-08-19'),
      estimatedDuration: 2,
      notes: 'Access through service entrance'
    },
    {
      id: 'task-003',
      title: 'Industrial Lubricant Delivery to Aluminum Plant',
      description: 'Monthly lubricant supply to ALBA',
      assignedTo: 'driver-003',
      assignedToName: 'Khalid Al-Mannai',
      priority: 'low',
      status: 'completed',
      dueDate: new Date('2024-08-19'),
      deliveryLocation: 'ALBA Plant, Askar',
      oilType: 'Industrial Lubricant',
      quantity: 1500,
      branch: 'South Depot - Riffa',
      customerName: 'Aluminum Bahrain (ALBA)',
      customerPhone: '+973-3333-4444',
      createdAt: new Date('2024-08-18'),
      completedAt: new Date('2024-08-19'),
      estimatedDuration: 4,
      notes: 'Special handling required for industrial site'
    }
  ],

  // Recent Transactions
  transactions: [
    {
      id: 'trans-001',
      driverId: 'driver-001',
      driverName: 'Ali Hassan',
      customerName: 'Al-Fateh Trading Co.',
      oilType: 'Premium Diesel',
      quantity: 4500,
      pricePerLiter: 0.450,
      totalAmount: 2025.00,
      deliveryLocation: 'Al-Fateh Gas Station, Manama',
      status: 'completed',
      transactionDate: new Date('2024-08-19'),
      startMeter: 1250,
      endMeter: 5750,
      branch: 'Main Depot - Manama',
      notes: 'Smooth delivery, customer satisfied'
    },
    {
      id: 'trans-002',
      driverId: 'driver-002',
      driverName: 'Omar Al-Zahra', 
      customerName: 'City Center Operations',
      oilType: 'Super Gasoline 95',
      quantity: 2800,
      pricePerLiter: 0.520,
      totalAmount: 1456.00,
      deliveryLocation: 'City Center Mall, Manama',
      status: 'completed',
      transactionDate: new Date('2024-08-18'),
      startMeter: 890,
      endMeter: 3690,
      branch: 'North Depot - Muharraq',
      notes: 'Delivered during off-peak hours'
    }
  ],

  // Sample Complaints
  complaints: [
    {
      id: 'complaint-001',
      submittedBy: 'driver-001',
      submitterName: 'Ali Hassan',
      title: 'Vehicle maintenance issue',
      description: 'Truck engine making unusual noise during delivery',
      category: 'vehicle',
      priority: 'medium',
      status: 'open',
      location: 'Main Depot - Manama',
      submittedAt: new Date('2024-08-20'),
      photos: [],
      assignedTo: 'admin',
      targetResolutionDate: new Date('2024-08-22')
    },
    {
      id: 'complaint-002',
      submittedBy: 'driver-002',
      submitterName: 'Omar Al-Zahra',
      title: 'Customer payment delay',
      description: 'Customer requesting extended payment terms beyond policy',
      category: 'customer',
      priority: 'low',
      status: 'in-progress',
      location: 'City Center Mall, Manama',
      submittedAt: new Date('2024-08-19'),
      photos: [],
      assignedTo: 'admin',
      targetResolutionDate: new Date('2024-08-25')
    }
  ],

  // Users 
  users: [
    {
      id: 'admin-001',
      uid: 'admin-001',
      email: 'asif1001@gmail.com',
      role: 'admin',
      displayName: 'Asif Ahmed',
      active: true,
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-08-20'),
      permissions: ['all']
    },
    {
      id: 'admin-002',
      uid: 'admin-002', 
      email: 'asif.s@ekkanoo.com.bh',
      role: 'admin',
      displayName: 'Asif Sadiq',
      active: true,
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-08-19'),
      permissions: ['all']
    },
    {
      id: 'driver-001',
      uid: 'driver-001',
      email: 'ali.hassan@onedelveiry.com',
      role: 'driver',
      displayName: 'Ali Hassan',
      active: true,
      phoneNumber: '+973-3612-7890',
      licenseNumber: 'DL-2024-001',
      vehicleAssigned: 'Truck-001',
      createdAt: new Date('2024-01-15'),
      lastLoginAt: new Date('2024-08-20')
    },
    {
      id: 'driver-002',
      uid: 'driver-002',
      email: 'omar.zahra@onedelveiry.com', 
      role: 'driver',
      displayName: 'Omar Al-Zahra',
      active: true,
      phoneNumber: '+973-3612-7891',
      licenseNumber: 'DL-2024-002',
      vehicleAssigned: 'Truck-002',
      createdAt: new Date('2024-02-01'),
      lastLoginAt: new Date('2024-08-19')
    },
    {
      id: 'driver-003',
      uid: 'driver-003',
      email: 'khalid.mannai@onedelveiry.com',
      role: 'driver', 
      displayName: 'Khalid Al-Mannai',
      active: true,
      phoneNumber: '+973-3612-7892',
      licenseNumber: 'DL-2024-003',
      vehicleAssigned: 'Truck-003',
      createdAt: new Date('2024-02-15'),
      lastLoginAt: new Date('2024-08-18')
    }
  ]
};

console.log('Sample data for onedelveiry app:');
console.log('Copy this data to Firebase Console > Firestore Database');
console.log('Create collections: branches, oilTypes, tasks, transactions, complaints, users');
console.log(JSON.stringify(sampleData, null, 2));
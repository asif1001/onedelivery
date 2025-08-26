import type { Express } from "express";
import { createServer, type Server } from "http";
import { deleteUserFromFirebaseAuth } from "./firebaseAdmin";

export function registerRoutes(app: Express): Server {
  
  // Test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!" });
  });

  app.post("/api/test", (req, res) => {
    res.json({ message: "POST API is working!", data: req.body });
  });

  // User creation endpoint - now handles Firebase creation on client-side
  app.post('/api/users/create', async (req, res) => {
    try {
      const { email, password, displayName, role, branchIds, empNo, driverLicenceNo, tankerLicenceNo, licenceExpiryDate } = req.body;

      // Validate required fields
      if (!email || !password || !displayName || !role) {
        return res.status(400).json({
          message: "Missing required fields: email, password, displayName, role"
        });
      }

      // Return user data structure for client-side Firebase creation
      const userResponse = {
        success: true,
        message: 'User data prepared for Firebase creation',
        userData: {
          email,
          password,
          displayName,
          role,
          branchIds: role === 'branch_user' ? branchIds || [] : undefined,
          empNo: empNo || '',
          driverLicenceNo: role === 'driver' ? driverLicenceNo : undefined,
          tankerLicenceNo: role === 'driver' ? tankerLicenceNo : undefined,
          licenceExpiryDate: role === 'driver' && licenceExpiryDate ? licenceExpiryDate : undefined
        }
      };

      console.log(`📋 Prepared user data for Firebase creation: ${displayName} (${email})`);
      console.log(`🔥 Client will handle Firebase Authentication and Firestore creation`);
      
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('User creation preparation error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to prepare user creation',
        error: (error as any).message 
      });
    }
  });

  // Firebase Auth user deletion endpoint
  app.delete('/api/admin/delete-user', async (req, res) => {
    try {
      const { uid, email } = req.body;
      
      if (!uid) {
        return res.status(400).json({ 
          success: false,
          message: 'User UID is required' 
        });
      }

      console.log(`🗑️ Server: Attempting to delete user from Firebase Auth: ${email} (${uid})`);
      
      const authDeleted = await deleteUserFromFirebaseAuth(uid);
      
      if (authDeleted) {
        console.log(`✅ Server: User ${email} deleted from Firebase Auth successfully`);
        res.json({ 
          success: true,
          message: 'User deleted from Firebase Authentication',
          authDeleted: true
        });
      } else {
        console.log(`⚠️ Server: Could not delete ${email} from Firebase Auth (Admin SDK not configured)`);
        res.json({ 
          success: true,
          message: 'Firestore deletion completed. Firebase Auth deletion requires manual action.',
          authDeleted: false,
          manualStep: `Please delete user ${email} from Firebase Console > Authentication manually`
        });
      }
    } catch (error) {
      console.error('Server: Error in delete-user endpoint:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during user deletion',
        error: (error as any).message 
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'OneDelivery API is running'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import { deleteUserFromFirebaseAuth, updateUserEmailInFirebaseAuth } from "./firebaseAdmin";

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

  // Firebase Auth user email update endpoint
  app.patch('/api/admin/update-user-email', async (req, res) => {
    try {
      const { uid, newEmail, oldEmail } = req.body;
      
      if (!uid || !newEmail) {
        return res.status(400).json({ 
          success: false,
          message: 'User UID and new email are required' 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid email format' 
        });
      }

      console.log(`📧 Server: Updating user email from ${oldEmail} to ${newEmail} for UID: ${uid}`);
      
      const authUpdated = await updateUserEmailInFirebaseAuth(uid, newEmail);
      
      if (authUpdated) {
        console.log(`✅ Server: Email updated in Firebase Auth successfully`);
        res.json({ 
          success: true,
          message: 'Email updated in Firebase Authentication',
          authUpdated: true
        });
      } else {
        console.log(`⚠️ Server: Could not update email in Firebase Auth (Admin SDK not configured)`);
        res.json({ 
          success: false,
          message: 'Firebase Auth email update requires Admin SDK configuration',
          authUpdated: false,
          requirement: 'Please configure Firebase Admin SDK environment variables'
        });
      }
    } catch (error) {
      console.error('Server: Error in update-user-email endpoint:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during email update',
        error: (error as any).message 
      });
    }
  });

  // Photo proxy endpoint to handle Firebase Storage CORS issues
  app.get('/api/proxy-photo', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Photo URL is required' });
      }
      
      console.log(`🖼️ Proxying photo: ${url.substring(0, 100)}...`);
      
      // Fetch the image from Firebase Storage
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch photo: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: `Failed to fetch photo: ${response.status} ${response.statusText}` 
        });
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await response.arrayBuffer();
      
      // Set appropriate headers
      res.set({
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
      // Send the image buffer
      res.send(Buffer.from(imageBuffer));
      
    } catch (error) {
      console.error('❌ Photo proxy error:', error);
      res.status(500).json({ error: 'Failed to proxy photo' });
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

  // Proxy for Google Sheets CSV
  app.get('/api/proxy-sheet', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: "URL is required" });
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).send(response.statusText);
      }
      const text = await response.text();
      res.send(text);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ message: "Failed to fetch URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
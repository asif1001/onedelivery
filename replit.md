# OneDelivery - Oil Management System

## Overview

OneDelivery is a comprehensive enterprise oil delivery management system built for professional oil delivery operations. The application serves drivers, administrators, branch managers, and warehouse staff with specialized dashboards and workflows for managing oil deliveries, complaints, and tracking operations.

The system handles the complete oil delivery lifecycle from loading operations at depots to final delivery at customer branches, with comprehensive photo documentation, meter readings, transaction tracking, and advanced analytics throughout the process.

**Current Status**: Production-ready with complete documentation and deployment guides

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)

### ✅ Enhanced Tank Card Display with Real Dates and User Names (Latest - August 28, 2025)
- **Real date display**: Tank cards now show actual dates (e.g., "8/24/2025, 12:00:00 PM") instead of relative times (e.g., "4 days ago")
- **Full user names**: Display complete user names (e.g., "Husain Alsaffar") instead of abbreviated versions (e.g., "Husain")
- **Improved layout**: Separated date/time and user information onto different lines for better readability
- **Enhanced user experience**: Tank status cards provide precise timestamp and attribution information
- **Recovery system integration**: Leverages existing data recovery system to show accurate historical updates

### ✅ Fixed Movement vs Adjustment Timestamp Separation (August 28, 2025)
- **Critical fix completed**: Warehouse adjustments no longer incorrectly show as "Last Movement"  
- **Enhanced movement filtering**: Dashboard only shows movements where `lastMovementByRole === 'driver'`
- **Transaction log analysis**: Added `getTankTransactionLogs` function to query actual driver movements vs manual adjustments
- **Strict classification**: Only LOAD, SUPPLY_LOOSE, SUPPLY_DRUM operations create movement timestamps
- **Data integrity**: Manual adjustments by warehouse/branch/admin users only update adjustment timestamps
- **Dashboard accuracy**: "Last Movement" now correctly shows only actual driver operations

### ✅ GitHub Repository Sync Completed (Latest - August 27, 2025)
- **Successful force push**: All 58 commits (1492 objects, 214.43 MiB) pushed to GitHub
- **Repository URL**: https://github.com/asif1001/onedelivery.git 
- **Authentication setup**: GitHub Personal Access Token configured for secure operations
- **Complete sync**: All photo ZIP fixes and warehouse CSV improvements now on GitHub
- **Ready for deployment**: Repository fully synchronized and deployment-ready

### ✅ Photo ZIP Download & Warehouse CSV Export Fixes (August 27, 2025)
- **Fixed corrupted photo downloads**: Implemented server proxy endpoint to resolve Firebase Storage CORS issues
- **Enhanced warehouse CSV export**: Now downloads ALL transaction logs instead of recent 10 entries
- **Improved Old Level tracking**: Shows actual tank levels before changes with clear difference calculations (+/-)
- **Comprehensive historical data**: Added Tank ID, Notes columns and precise timestamps for complete inventory tracking
- **CORS resolution**: Photo downloads now use `/api/proxy-photo` endpoint to bypass browser restrictions

### ✅ Driver Dashboard Complaint Feature Fix (August 26, 2025)
- **Fixed missing Report Issue button**: Added as 4th main action card in driver dashboard
- **Visual design**: Red color scheme with AlertTriangleIcon for clear problem identification
- **Full functionality**: Button opens complaint creation modal with photo capture
- **Accessibility**: Proper data-testid attributes and responsive design
- **Deployment**: Successfully pushed to GitHub and deployed via automated GitHub Actions

### ✅ Project Structure Cleanup & Documentation
- **Cleaned up project structure**: Removed 50+ outdated documentation files
- **Created comprehensive README.md**: Complete setup, deployment, and usage instructions
- **Added deployment scripts**: Automated Firebase and GitHub deployment scripts
- **Created detailed documentation**: PROJECT_STRUCTURE.md and DEPLOYMENT.md guides
- **Environment configuration**: Proper .env.example with all required variables
- **Production-ready structure**: Organized for enterprise deployment

### ✅ Access Control System Fixed (Latest)
- **Role-based routing**: Clear access control with proper error messages instead of 404 errors
- **User role management**: Admin can assign/change user roles through dashboard
- **Warehouse users confirmed**: Both renga@ekkanoo.com.bh and warehouse@gmail.com have warehouse access
- **Access denied pages**: Professional error messages showing required role and current user role

### ✅ Branch Stock Update Tracking System (Completed)
- **Tank-level monitoring**: Individual tank status tracking across all branches
- **Red highlighting system**: Branches with outdated tanks highlighted in red
- **"Needs Attention" badges**: Clear visual indicators for branches requiring updates
- **Detailed tracking card**: Shows days since last update, who updated, and status breakdown
- **Positioned at bottom**: Branch Stock Update Tracking card moved to warehouse dashboard bottom

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern development
- **Vite** as the build tool for fast development and optimized production builds
- **Wouter** for client-side routing instead of React Router
- **Tailwind CSS** with custom design system for responsive UI
- **shadcn/ui** component library for consistent, accessible UI components
- **React Query (TanStack Query)** for server state management and caching
- **Custom hooks** for authentication, data fetching, and state management

### Authentication & Authorization
- **Firebase Authentication** for user management and secure login
- **Role-based access control** with distinct user types:
  - Admin: Full system access and user management
  - Driver: Delivery workflows and complaint submission
  - Branch User: Branch-specific operations
  - Warehouse: Inventory and loading management
- **Firestore security rules** for data protection based on user roles

### Data Storage
- **Firebase Firestore** as the primary NoSQL database for real-time data
- **Firebase Storage** for photo and document management
- **Drizzle ORM** configuration for potential PostgreSQL migration (currently unused)
- Collections include: users, branches, oilTypes, tasks, complaints, transactions, loadSessions

### Core Business Logic
- **Multi-step delivery workflows** with photo documentation at each stage
- **Load session management** for tracking oil loading from depots
- **Supply workflow** for delivery to customer branches with meter readings
- **Photo watermarking** with branch, timestamp, and transaction details
- **Real-time transaction tracking** across the entire delivery process

### Photo Management
- **Automatic watermarking** with branch name, timestamp, and transaction type
- **Firebase Storage integration** for secure photo uploads
- **Canvas-based image processing** for watermark application
- **Photo compression** to maintain performance while preserving quality

### Reporting & Analytics
- **CSV export functionality** for deliveries, complaints, and transactions
- **Date range filtering** for historical data analysis
- **Photo download and management** tools for compliance
- **Real-time dashboard metrics** for operational oversight

### Mobile Optimization
- **Progressive Web App (PWA)** capabilities with offline support
- **Responsive design** optimized for mobile devices and tablets
- **Camera integration** for photo capture with automatic timestamps
- **Touch-friendly interfaces** for field operations

### Development & Deployment
- **GitHub Pages** deployment with SPA routing support
- **Environment-based configuration** for development and production
- **TypeScript** for compile-time error checking and better developer experience
- **Modular component architecture** for maintainability

## External Dependencies

### Firebase Services
- **Firebase Authentication** for user login and session management
- **Firebase Firestore** for real-time database operations
- **Firebase Storage** for photo and file uploads
- **Firebase Hosting** for web application deployment

### UI & Styling
- **Tailwind CSS** for utility-first styling approach
- **Radix UI** primitives for accessible component foundations
- **shadcn/ui** for pre-built component library
- **Lucide React** for consistent iconography

### Development Tools
- **Vite** for fast development server and optimized builds
- **TypeScript** for static type checking
- **React Query** for server state management
- **Wouter** for lightweight routing

### Utilities
- **date-fns** for date manipulation and formatting
- **JSZip** for bulk photo download functionality
- **Canvas API** for image watermarking operations

### Potential Database Migration
- **Drizzle Kit** configured for PostgreSQL migration (currently inactive)
- **Neon Database** serverless PostgreSQL support ready for future scaling

## Deployment Options

### Firebase Hosting (Recommended)
- **Automated script**: `bash scripts/deploy-firebase.sh`
- **Manual deployment**: `firebase deploy`
- **Custom domain support**: Configure in Firebase Console
- **SSL certificates**: Automatically provided

### GitHub Pages
- **Automated script**: `bash scripts/deploy-github.sh`
- **Static hosting**: Perfect for frontend-only deployment
- **Custom domain**: Add CNAME file to docs folder

### Local Development
- **Development server**: `npm run dev`
- **Production build**: `npm run build`
- **Environment setup**: Copy `.env.example` to `.env`

## Documentation Structure

### Main Documentation
- **README.md**: Complete project overview and setup instructions
- **replit.md**: Project architecture and development context (this file)

### Detailed Guides
- **docs/DEPLOYMENT.md**: Comprehensive deployment instructions for all platforms
- **docs/PROJECT_STRUCTURE.md**: Detailed architecture and file structure documentation
- **docs/API.md**: API documentation (to be created when needed)

### Configuration Files
- **.env.example**: Template for environment variables
- **firebase.json**: Firebase hosting configuration
- **firestore.rules**: Database security rules
- **vite.config.ts**: Build configuration
- **tailwind.config.ts**: Styling configuration
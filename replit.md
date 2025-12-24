# OneDelivery - Oil Management System

## Overview

OneDelivery is a comprehensive enterprise oil delivery management system designed for professional oil delivery operations. It provides specialized dashboards and workflows for drivers, administrators, branch managers, and warehouse staff to manage oil deliveries, complaints, and track operations. The system covers the entire oil delivery lifecycle, from loading at depots to customer delivery, including photo documentation, meter readings, transaction tracking, and analytics. Its vision is to be a production-ready solution enhancing efficiency and transparency in oil management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### September 2, 2025 - Warehouse User Branch Assignment System
- **Fixed Critical Bug**: Warehouse user branch assignments now properly save and persist
- **Branch Assignment Interface**: Extended existing branch user assignment system to include warehouse users
- **Access Control**: Warehouse users restricted to assigned branches only
- **Admin Validation**: Prevents creating warehouse users without branch assignments
- **UI Enhancements**: Shows branch assignment status and warnings for both user types

## System Architecture

### Frontend Architecture
The application is built with **React 18** and **TypeScript**, using **Vite** for fast builds. **Wouter** handles client-side routing, while **Tailwind CSS** with a custom design system and **shadcn/ui** provides a consistent, responsive UI. **React Query (TanStack Query)** manages server state and caching, complemented by custom hooks for core functionalities.

### Authentication & Authorization
**Firebase Authentication** secures user login and management. A robust role-based access control system distinguishes between Admin, Driver, Branch User, and Warehouse roles, with **Firestore security rules** enforcing data protection.

### Data Storage
**Firebase Firestore** serves as the primary NoSQL database for real-time data, and **Firebase Storage** handles photo and document management. While **Drizzle ORM** is configured, it is currently unused, with plans for potential PostgreSQL migration. Key collections include users, branches, oilTypes, tasks, complaints, and transactions.

### Core Business Logic
The system supports multi-step delivery workflows with photo documentation, load session management for depot operations, and supply workflows for customer deliveries including meter readings. Automated photo watermarking includes essential details like branch, timestamp, and transaction information. Real-time transaction tracking is central to the entire delivery process.

### Photo Management
Features include automatic watermarking, secure photo uploads to Firebase Storage, canvas-based image processing for watermarks, and photo compression for optimal performance.

### Reporting & Analytics
The system offers CSV export functionality for deliveries, complaints, and transactions with date range filtering. It also provides tools for photo download and management and real-time dashboard metrics for operational oversight.

### Progressive Web App (PWA) & Mobile Optimization
OneDelivery functions as a PWA, allowing installation as a native-like desktop application on Windows, Mac, and mobile devices. It features comprehensive offline functionality via a **Service Worker** with intelligent caching, smart install prompts, and full Windows desktop integration (Start Menu, taskbar pinning, tiles). The design is responsive, optimized for mobile, with camera integration and touch-friendly interfaces.

### Development & Deployment
The project uses GitHub Pages for deployment, supports environment-based configuration, and leverages TypeScript for compile-time error checking. It follows a modular component architecture for maintainability.

## External Dependencies

### Firebase Services
- **Firebase Authentication**: User login and session management.
- **Firebase Firestore**: Real-time database operations.
- **Firebase Storage**: Photo and file uploads.
- **Firebase Hosting**: Web application deployment.

### UI & Styling
- **Tailwind CSS**: Utility-first styling.
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-built component library.
- **Lucide React**: Iconography.

### Development Tools
- **Vite**: Fast development server and optimized builds.
- **TypeScript**: Static type checking.
- **React Query**: Server state management.
- **Wouter**: Lightweight routing.

### Utilities
- **date-fns**: Date manipulation and formatting.
- **JSZip**: Bulk photo download functionality.
- **Canvas API**: Image watermarking operations.

### Potential Database Migration
- **Drizzle Kit**: Configured for PostgreSQL migration.
- **Neon Database**: Serverless PostgreSQL support for future scaling.
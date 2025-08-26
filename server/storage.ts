import {
  users,
  deliveries,
  complaints,
  oilTypes,
  branches,
  oilTanks,
  type User,
  type UpsertUser,
  type Delivery,
  type InsertDelivery,
  type Complaint,
  type InsertComplaint,
  type OilType,
  type InsertOilType,
  type Branch,
  type InsertBranch,
  type OilTank,
  type InsertOilTank,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Delivery operations
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  updateDelivery(id: string, delivery: Partial<InsertDelivery>): Promise<Delivery>;
  getDelivery(id: string): Promise<Delivery | undefined>;
  getDeliveriesByDriver(driverUid: string): Promise<Delivery[]>;
  getAllDeliveries(): Promise<Delivery[]>;
  
  // Complaint operations
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  getComplaint(id: string): Promise<Complaint | undefined>;
  getComplaintsByDriver(driverUid: string): Promise<Complaint[]>;
  getAllComplaints(): Promise<Complaint[]>;
  updateComplaint(id: string, complaint: Partial<InsertComplaint>): Promise<Complaint>;
  
  // Oil Type operations
  createOilType(oilType: InsertOilType): Promise<OilType>;
  getOilType(id: string): Promise<OilType | undefined>;
  getAllOilTypes(): Promise<OilType[]>;
  updateOilType(id: string, oilType: Partial<InsertOilType>): Promise<OilType>;
  deleteOilType(id: string): Promise<void>;
  
  // Branch operations
  createBranch(branch: InsertBranch): Promise<Branch>;
  getBranch(id: string): Promise<Branch | undefined>;
  getAllBranches(): Promise<Branch[]>;
  updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;
  
  // Oil Tank operations
  createOilTank(oilTank: InsertOilTank): Promise<OilTank>;
  getOilTank(id: string): Promise<OilTank | undefined>;
  getOilTanksByBranch(branchId: string): Promise<OilTank[]>;
  updateOilTank(id: string, oilTank: Partial<InsertOilTank>): Promise<OilTank>;
  deleteOilTank(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Delivery operations
  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const [newDelivery] = await db.insert(deliveries).values(delivery).returning();
    return newDelivery;
  }

  async updateDelivery(id: string, delivery: Partial<InsertDelivery>): Promise<Delivery> {
    const [updatedDelivery] = await db
      .update(deliveries)
      .set({ ...delivery, updatedAt: new Date() })
      .where(eq(deliveries.id, id))
      .returning();
    return updatedDelivery;
  }

  async getDelivery(id: string): Promise<Delivery | undefined> {
    const [delivery] = await db.select().from(deliveries).where(eq(deliveries.id, id));
    return delivery;
  }

  async getDeliveriesByDriver(driverUid: string): Promise<Delivery[]> {
    return db.select().from(deliveries)
      .where(eq(deliveries.driverUid, driverUid))
      .orderBy(desc(deliveries.createdAt));
  }

  async getAllDeliveries(): Promise<Delivery[]> {
    return db.select().from(deliveries).orderBy(desc(deliveries.createdAt));
  }

  // Complaint operations
  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const [newComplaint] = await db.insert(complaints).values(complaint).returning();
    return newComplaint;
  }

  async getComplaint(id: string): Promise<Complaint | undefined> {
    const [complaint] = await db.select().from(complaints).where(eq(complaints.id, id));
    return complaint;
  }

  async getComplaintsByDriver(driverUid: string): Promise<Complaint[]> {
    return db.select().from(complaints)
      .where(eq(complaints.driverUid, driverUid))
      .orderBy(desc(complaints.createdAt));
  }

  async getAllComplaints(): Promise<Complaint[]> {
    return db.select().from(complaints).orderBy(desc(complaints.createdAt));
  }

  async updateComplaint(id: string, complaint: Partial<InsertComplaint>): Promise<Complaint> {
    const [updatedComplaint] = await db
      .update(complaints)
      .set({ ...complaint, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();
    return updatedComplaint;
  }

  // Oil Type operations
  async createOilType(oilType: InsertOilType): Promise<OilType> {
    const [newOilType] = await db.insert(oilTypes).values(oilType).returning();
    return newOilType;
  }

  async getOilType(id: string): Promise<OilType | undefined> {
    const [oilType] = await db.select().from(oilTypes).where(eq(oilTypes.id, id));
    return oilType;
  }

  async getAllOilTypes(): Promise<OilType[]> {
    return db.select().from(oilTypes).where(eq(oilTypes.active, true));
  }

  async updateOilType(id: string, oilType: Partial<InsertOilType>): Promise<OilType> {
    const [updatedOilType] = await db
      .update(oilTypes)
      .set({ ...oilType, updatedAt: new Date() })
      .where(eq(oilTypes.id, id))
      .returning();
    return updatedOilType;
  }

  async deleteOilType(id: string): Promise<void> {
    await db.update(oilTypes).set({ active: false }).where(eq(oilTypes.id, id));
  }

  // Branch operations
  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  async getAllBranches(): Promise<Branch[]> {
    return db.select().from(branches).where(eq(branches.active, true));
  }

  async updateBranch(id: string, branch: Partial<InsertBranch>): Promise<Branch> {
    const [updatedBranch] = await db
      .update(branches)
      .set({ ...branch, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    return updatedBranch;
  }

  async deleteBranch(id: string): Promise<void> {
    await db.update(branches).set({ active: false }).where(eq(branches.id, id));
  }

  // Oil Tank operations
  async createOilTank(oilTank: InsertOilTank): Promise<OilTank> {
    const [newOilTank] = await db.insert(oilTanks).values(oilTank).returning();
    return newOilTank;
  }

  async getOilTank(id: string): Promise<OilTank | undefined> {
    const [oilTank] = await db.select().from(oilTanks).where(eq(oilTanks.id, id));
    return oilTank;
  }

  async getOilTanksByBranch(branchId: string): Promise<OilTank[]> {
    return db.select().from(oilTanks).where(eq(oilTanks.branchId, branchId));
  }

  async updateOilTank(id: string, oilTank: Partial<InsertOilTank>): Promise<OilTank> {
    const [updatedOilTank] = await db
      .update(oilTanks)
      .set({ ...oilTank, updatedAt: new Date() })
      .where(eq(oilTanks.id, id))
      .returning();
    return updatedOilTank;
  }

  async deleteOilTank(id: string): Promise<void> {
    await db.delete(oilTanks).where(eq(oilTanks.id, id));
  }
}

export const storage = new DatabaseStorage();
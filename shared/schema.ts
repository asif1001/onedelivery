import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // Role: admin, driver, branch_user, business, user
  branchIds: text("branch_ids").array(), // For branch users - can be assigned to multiple branches
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type AppUser = typeof users.$inferSelect;

// Oil Types table
export const oilTypes = pgTable("oil_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  color: varchar("color"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertOilType = typeof oilTypes.$inferInsert;
export type OilType = typeof oilTypes.$inferSelect;

// Branches table
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address").notNull(),
  contactNo: varchar("contact_no").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertBranch = typeof branches.$inferInsert;
export type Branch = typeof branches.$inferSelect;

// Oil Tanks table
export const oilTanks = pgTable("oil_tanks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").notNull(),
  capacity: integer("capacity").notNull(), // in liters
  oilTypeId: varchar("oil_type_id").notNull(),
  currentLevel: integer("current_level").notNull().default(0), // in liters
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertOilTank = typeof oilTanks.$inferInsert;
export type OilTank = typeof oilTanks.$inferSelect;

// Deliveries table
export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverUid: varchar("driver_uid").notNull(),
  driverName: varchar("driver_name").notNull(),
  status: varchar("status", { enum: ["loading", "unloading", "completed", "draft"] }).notNull().default("draft"),
  
  // Loading phase
  oilTypeId: varchar("oil_type_id"),
  loadedOilLiters: integer("loaded_oil_liters"),
  meterReadingPhoto: varchar("meter_reading_photo"),
  loadingTimestamp: timestamp("loading_timestamp"),
  
  // Unloading phase
  branchId: varchar("branch_id"),
  deliveryOrderNo: varchar("delivery_order_no"),
  startMeterReading: integer("start_meter_reading"),
  tankLevelPhoto: varchar("tank_level_photo"),
  hoseConnectionPhoto: varchar("hose_connection_photo"),
  unloadingTimestamp: timestamp("unloading_timestamp"),
  
  // Finish phase
  endMeterReading: integer("end_meter_reading"),
  oilSuppliedLiters: integer("oil_supplied_liters"),
  finalTankLevelPhoto: varchar("final_tank_level_photo"),
  completedTimestamp: timestamp("completed_timestamp"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertDelivery = typeof deliveries.$inferInsert;
export type Delivery = typeof deliveries.$inferSelect;

// Counters table for sequential numbering
export const counters = pgTable("counters", {
  id: varchar("id").primaryKey(),
  value: integer("value").notNull().default(0),
});

export type Counter = typeof counters.$inferSelect;

// Complaints table
export const complaints = pgTable("complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  complaintNumber: integer("complaint_number").notNull(), // Sequential number
  driverUid: varchar("driver_uid").notNull(),
  driverName: varchar("driver_name").notNull(),
  branchId: varchar("branch_id"),
  branchName: varchar("branch_name"),
  oilTankId: varchar("oil_tank_id"),
  description: text("description").notNull(),
  photo: varchar("photo"),
  status: varchar("status", { enum: ["open", "in_progress", "closed"] }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  adminNotes: text("admin_notes"),
});

export type InsertComplaint = typeof complaints.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskNumber: integer("task_number").notNull(), // Sequential number
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).notNull().default("pending"),
  assignedTo: varchar("assigned_to"),
  assignedToName: varchar("assigned_to_name"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").notNull(),
  createdByName: varchar("created_by_name").notNull(),
});

export type InsertTask = typeof tasks.$inferInsert;
export type Task = typeof tasks.$inferSelect;

// Oil Level Updates table - for branch users to track tank levels
export const oilLevelUpdates = pgTable("oil_level_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  branchId: varchar("branch_id").notNull(),
  oilTankId: varchar("oil_tank_id").notNull(),
  previousLevel: integer("previous_level").notNull(),
  newLevel: integer("new_level").notNull(),
  tankLevelPhoto: varchar("tank_level_photo"), // Photo of current tank level
  systemPhoto: varchar("system_photo"), // Photo of system/equipment
  updatedBy: varchar("updated_by").notNull(), // User ID who made the update
  updatedByName: varchar("updated_by_name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertOilLevelUpdate = typeof oilLevelUpdates.$inferInsert;
export type OilLevelUpdate = typeof oilLevelUpdates.$inferSelect;

// Zod schemas for validation
export const insertDeliverySchema = createInsertSchema(deliveries);
export const insertComplaintSchema = createInsertSchema(complaints);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertOilTypeSchema = createInsertSchema(oilTypes);
export const insertBranchSchema = createInsertSchema(branches);
export const insertOilTankSchema = createInsertSchema(oilTanks);
export const insertOilLevelUpdateSchema = createInsertSchema(oilLevelUpdates);

export type CreateDeliverySchema = z.infer<typeof insertDeliverySchema>;
export type CreateComplaintSchema = z.infer<typeof insertComplaintSchema>;
export type CreateTaskSchema = z.infer<typeof insertTaskSchema>;
export type CreateOilTypeSchema = z.infer<typeof insertOilTypeSchema>;
export type CreateBranchSchema = z.infer<typeof insertBranchSchema>;
export type CreateOilTankSchema = z.infer<typeof insertOilTankSchema>;
export type CreateOilLevelUpdateSchema = z.infer<typeof insertOilLevelUpdateSchema>;
import Dexie, { Table } from 'dexie';

// Define interfaces for our data structures, mirroring Supabase tables
// These should ideally be generated from your Supabase schema or shared types

export interface Crop {
  id: string; // UUID
  name: string;
  type?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  // Add a flag for sync status
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number; // Timestamp for local changes
  is_deleted?: number; // 0 for false, 1 for true
  deleted_at?: string; // ISOString
}

export interface SeedBatch {
  id: string; // UUID
  crop_id: string; // Foreign key to Crop
  batch_code: string;
  supplier?: string;
  purchase_date?: string; // ISOString (Date)
  initial_quantity?: number;
  quantity_unit?: string;
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface InputInventory {
  id: string; // UUID
  name: string;
  type?: string;
  supplier?: string;
  purchase_date?: string; // ISOString (Date)
  initial_quantity?: number;
  current_quantity?: number;
  quantity_unit?: string;
  cost_per_unit?: number;
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface PlantingLog {
  id: string; // UUID
  seed_batch_id?: string; // Foreign key to SeedBatch
  planting_date: string; // ISOString (Date)
  location_description?: string;
  quantity_planted?: number;
  quantity_unit?: string;
  expected_harvest_date?: string; // ISOString (Date)
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface CultivationLog {
  id: string; // UUID
  planting_log_id: string; // Foreign key to PlantingLog
  activity_date: string; // ISOString (Date)
  activity_type: string;
  input_inventory_id?: string; // Foreign key to InputInventory
  input_quantity_used?: number;
  input_quantity_unit?: string;
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface HarvestLog {
  id: string; // UUID
  planting_log_id: string; // Foreign key to PlantingLog
  harvest_date: string; // ISOString (Date)
  quantity_harvested: number;
  quantity_unit: string;
  quality_grade?: string;
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface Customer {
  id: string; // UUID
  name: string;
  contact_info?: string;
  address?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface Sale {
  id: string; // UUID
  customer_id?: string; // Foreign key to Customer
  sale_date: string; // ISOString (Date)
  total_amount?: number; // This will be calculated
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface SaleItem {
  id: string; // UUID
  sale_id: string; // Foreign key to Sale
  harvest_log_id?: string; // Foreign key to HarvestLog
  // crop_id?: string; // Alternative if not from specific harvest
  // product_description?: string;
  quantity_sold: number;
  price_per_unit: number;
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

export interface Invoice {
  id: string; // UUID
  sale_id: string; // Foreign key to Sale (UNIQUE)
  invoice_number: string;
  invoice_date: string; // ISOString (Date)
  pdf_url?: string; // URL to PDF in Supabase Storage or path to local blob
  status?: string;
  notes?: string;
  created_at?: string; // ISOString
  updated_at?: string; // ISOString
  _synced?: number; // 0 for false, 1 for true
  _last_modified?: number;
  is_deleted?: number;
  deleted_at?: string;
}

// Define a 'meta' table for storing sync timestamps or other metadata
export interface SyncMeta {
  id: string; // e.g., 'lastSyncTimestamp_crops'
  value: any;
}


class HurvesthubDB extends Dexie {
  // Declare tables
  crops!: Table<Crop, string>; // Primary key is string (UUID)
  seedBatches!: Table<SeedBatch, string>;
  inputInventory!: Table<InputInventory, string>;
  plantingLogs!: Table<PlantingLog, string>;
  cultivationLogs!: Table<CultivationLog, string>;
  harvestLogs!: Table<HarvestLog, string>;
  customers!: Table<Customer, string>;
  sales!: Table<Sale, string>;
  saleItems!: Table<SaleItem, string>;
  invoices!: Table<Invoice, string>;
  syncMeta!: Table<SyncMeta, string>;


  constructor() {
    super('HurvesthubDB');
    // Increment version number due to schema change (adding is_deleted)
    this.version(2).stores({
      crops: 'id, name, type, _last_modified, _synced, is_deleted',
      seedBatches: 'id, crop_id, batch_code, _last_modified, _synced, is_deleted',
      inputInventory: 'id, name, type, _last_modified, _synced, is_deleted',
      plantingLogs: 'id, seed_batch_id, planting_date, _last_modified, _synced, is_deleted',
      cultivationLogs: 'id, planting_log_id, activity_date, _last_modified, _synced, is_deleted',
      harvestLogs: 'id, planting_log_id, harvest_date, _last_modified, _synced, is_deleted',
      customers: 'id, name, _last_modified, _synced, is_deleted',
      sales: 'id, customer_id, sale_date, _last_modified, _synced, is_deleted',
      saleItems: 'id, sale_id, harvest_log_id, _last_modified, _synced, is_deleted',
      invoices: 'id, sale_id, invoice_number, _last_modified, _synced, is_deleted',
      syncMeta: 'id',
    }).upgrade(async tx => {
      console.log("Upgrading HurvesthubDB to version 2, adding and defaulting is_deleted fields.");
      // Set is_deleted = 0 for all existing records in all tables that now have this field.
      const tablesToUpgrade = [
        tx.table("crops"),
        tx.table("seedBatches"),
        tx.table("inputInventory"),
        tx.table("plantingLogs"),
        tx.table("cultivationLogs"),
        tx.table("harvestLogs"),
        tx.table("customers"),
        tx.table("sales"),
        tx.table("saleItems"),
        tx.table("invoices")
      ];
      for (const table of tablesToUpgrade) {
        await table.toCollection().modify(record => {
          if (record.is_deleted === undefined) {
            record.is_deleted = 0;
          }
        });
      }
      console.log("Finished upgrading HurvesthubDB to version 2.");
    });
    
    // Original version 1 schema (kept for reference or if needing to rollback/understand history)
    // this.version(1).stores({
    //   crops: 'id, name, type, _last_modified, _synced',
    //   seedBatches: 'id, crop_id, batch_code, _last_modified, _synced',
    //   inputInventory: 'id, name, type, _last_modified, _synced',
    //   plantingLogs: 'id, seed_batch_id, planting_date, _last_modified, _synced',
    //   cultivationLogs: 'id, planting_log_id, activity_date, _last_modified, _synced',
    //   harvestLogs: 'id, planting_log_id, harvest_date, _last_modified, _synced',
    //   customers: 'id, name, _last_modified, _synced',
    //   sales: 'id, customer_id, sale_date, _last_modified, _synced',
    //   saleItems: 'id, sale_id, harvest_log_id, _last_modified, _synced',
    //   invoices: 'id, sale_id, invoice_number, _last_modified, _synced',
    //   syncMeta: 'id',
    // });
  }

  // Utility to mark records for sync
  async markForSync<T extends { id: string; _last_modified?: number; _synced?: number; is_deleted?: number; deleted_at?: string; }>(
    table: Table<T, string>,
    id: string,
    deleted: boolean = false
  ) {
    if (deleted) {
      return table.update(id, {
        _synced: 0,
        _last_modified: Date.now(),
        is_deleted: 1,
        deleted_at: new Date().toISOString()
      } as any); // Changed from Partial<T> to any
    }
    return table.update(id, { _synced: 0, _last_modified: Date.now() } as any); // Changed from Partial<T> to any
  }

  // Example: Add a crop and mark it for sync
  async addCropAndMark(crop: Omit<Crop, 'id' | '_synced' | '_last_modified' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newCrop: Crop = {
      ...crop,
      id,
      created_at: now,
      updated_at: now,
      _synced: 0,
      _last_modified: Date.now(),
      is_deleted: 0, // Default to not deleted
    };
    await this.crops.add(newCrop);
    return id;
  }
}

export const db = new HurvesthubDB();

// Basic sync status (can be expanded into a hook or service)
export async function getSyncStatus() {
    const unsyncedCounts = {
        crops: await db.crops.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        seedBatches: await db.seedBatches.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        inputInventory: await db.inputInventory.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        plantingLogs: await db.plantingLogs.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        cultivationLogs: await db.cultivationLogs.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        harvestLogs: await db.harvestLogs.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        customers: await db.customers.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        sales: await db.sales.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        saleItems: await db.saleItems.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
        invoices: await db.invoices.where('_synced').equals(0).and(item => item.is_deleted !== 1).count(),
    };
    const totalUnsynced = Object.values(unsyncedCounts).reduce((sum, count) => sum + count, 0);
    return { unsyncedCounts, totalUnsynced };
}
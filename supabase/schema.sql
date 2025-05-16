-- Enable RLS
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create Crop table
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- e.g., Tomato, Carrot, Spinach
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to crops" ON crops FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage crops" ON crops FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage crops" ON crops FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Create SeedBatch table
CREATE TABLE seed_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES crops(id) ON DELETE CASCADE,
  batch_code TEXT UNIQUE NOT NULL, -- For traceability
  supplier TEXT,
  purchase_date DATE,
  initial_quantity NUMERIC, -- e.g., number of seeds or weight
  quantity_unit TEXT, -- e.g., 'seeds', 'grams', 'kg'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE seed_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to seed_batches" ON seed_batches FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage seed_batches" ON seed_batches FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage seed_batches" ON seed_batches FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create InputInventory table (for fertilizers, pesticides, etc.)
CREATE TABLE input_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., Organic Fertilizer X, Neem Oil
  type TEXT, -- e.g., Fertilizer, Pesticide, Soil Amendment
  supplier TEXT,
  purchase_date DATE,
  initial_quantity NUMERIC,
  current_quantity NUMERIC,
  quantity_unit TEXT, -- e.g., 'kg', 'L', 'bags'
  cost_per_unit NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE input_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to input_inventory" ON input_inventory FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage input_inventory" ON input_inventory FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage input_inventory" ON input_inventory FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create PlantingLog table
CREATE TABLE planting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_batch_id UUID REFERENCES seed_batches(id) ON DELETE SET NULL,
  planting_date DATE NOT NULL,
  location_description TEXT, -- e.g., "Field A, Row 5", "Greenhouse 2"
  quantity_planted NUMERIC,
  quantity_unit TEXT, -- e.g., 'seeds', 'seedlings'
  expected_harvest_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE planting_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to planting_logs" ON planting_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage planting_logs" ON planting_logs FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage planting_logs" ON planting_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create CultivationLog table
CREATE TABLE cultivation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_log_id UUID REFERENCES planting_logs(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL, -- e.g., Weeding, Watering, Pest Control, Fertilizing
  input_inventory_id UUID REFERENCES input_inventory(id) ON DELETE SET NULL, -- Optional: if an input was used
  input_quantity_used NUMERIC, -- Optional
  input_quantity_unit TEXT, -- Optional
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE cultivation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to cultivation_logs" ON cultivation_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage cultivation_logs" ON cultivation_logs FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage cultivation_logs" ON cultivation_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create HarvestLog table
CREATE TABLE harvest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_log_id UUID REFERENCES planting_logs(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  quantity_harvested NUMERIC NOT NULL,
  quantity_unit TEXT NOT NULL, -- e.g., 'kg', 'pieces', 'bunches'
  quality_grade TEXT, -- Optional: e.g., Grade A, Grade B
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE harvest_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to harvest_logs" ON harvest_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage harvest_logs" ON harvest_logs FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage harvest_logs" ON harvest_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create Customer table (optional for sales)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT, -- e.g., phone, email (optional as per PRD)
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage customers" ON customers FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage customers" ON customers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Create Sale table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- Optional customer
  sale_date DATE NOT NULL,
  total_amount NUMERIC, -- Was: GENERATED ALWAYS AS (...) STORED. This will now be calculated by the app or a view.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to sales" ON sales FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage sales" ON sales FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage sales" ON sales FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create SaleItem table (line items for a sale)
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  -- Linking directly to harvest_log or crop can be an option.
  -- For simplicity and traceability to a specific harvest:
  harvest_log_id UUID REFERENCES harvest_logs(id) ON DELETE SET NULL,
  -- Alternatively, if selling from general stock not tied to a specific harvest:
  -- crop_id UUID REFERENCES crops(id),
  -- product_description TEXT, -- If not directly linking to harvest/crop
  quantity_sold NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  -- total_price is calculated in the sales table or on the fly
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false, -- Usually sale items are deleted with the sale, but for completeness
  deleted_at TIMESTAMPTZ
);
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to sale_items" ON sale_items FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage sale_items" ON sale_items FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage sale_items" ON sale_items FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Create Invoice table
-- PRD: "Invoices are immutable once generated. No email or online distribution included."
-- PRD: "Invoice is auto-generated (PDF) with: K.K. Biofresh branding, Customer & sale details, Product list with prices and totals"
-- Storing PDF URL assumes PDF generation happens elsewhere and URL is stored.
-- For a fully integrated solution, PDF generation logic would be part of the app.
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID UNIQUE REFERENCES sales(id) ON DELETE CASCADE, -- Each sale has one invoice
  invoice_number TEXT UNIQUE NOT NULL, -- Auto-generated or manually assigned format
  invoice_date DATE NOT NULL,
  -- pdf_content BYTEA, -- Option to store PDF blob directly in DB
  pdf_url TEXT, -- Option to store URL to a generated PDF (e.g., in Supabase Storage)
  status TEXT DEFAULT 'generated', -- e.g., generated, (paid - though PRD implies no payment tracking)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false, -- Invoices are immutable, but for sync consistency
  deleted_at TIMESTAMPTZ
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to invoices" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow anon users to manage invoices" ON invoices FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow authenticated users to manage invoices" ON invoices FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Functions to update `updated_at` columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with an updated_at column
DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public')
  LOOP
    EXECUTE format('CREATE TRIGGER set_timestamp
                    BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();', t_name);
  END LOOP;
END;
$$;

-- Note: FinancialReport is an aggregated view, will be handled by queries/views later.
-- For offline sync, these tables will be replicated in IndexedDB.
-- RLS policies are basic for now (public read, auth write).
-- Since PRD states "single-user use by the farm owner and does not require authentication",
-- the RLS policies might be simplified or auth might be handled by a single, pre-defined user/role if Supabase is used.
-- However, the PRD also mentions "Supabase RLS for sync" under security.
-- For a true single-user desktop app without auth, RLS might be set to allow all for a specific API key if that's how Supabase is configured.
-- Given "auth.role() = 'authenticated'", it implies some form of authentication will be set up, even if it's a single fixed user.
-- For a truly unauthenticated single-user app that syncs, the RLS would need to be very permissive or use a service_role key for writes,
-- which is generally not recommended for client-side operations.
-- The current RLS assumes a logged-in user context. If no login, these need adjustment.
-- The PRD says "No authentication or login system" (line 162) but also "Supabase RLS for sync" (line 146).
-- This is a contradiction. Assuming for now that a single, non-interactive "user" will be used for RLS.
-- If it's truly no auth, then policies would be `USING (true)` for all actions, which is insecure for a public Supabase instance.
-- Let's assume a single 'user' context for RLS for now, as it's safer.
-- The client would need to authenticate as this single user.

-- Example of a view for Financial Reports (can be expanded)
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
    s.sale_date,
    SUM(si.quantity_sold * si.price_per_unit) as total_revenue
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.sale_date
ORDER BY s.sale_date DESC;

CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT
    DATE_TRUNC('month', s.sale_date) as sale_month,
    SUM(si.quantity_sold * si.price_per_unit) as total_revenue
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
GROUP BY sale_month
ORDER BY sale_month DESC;

-- To track costs, we'd need to associate costs with planting/cultivation/inputs.
-- For example, cost from input_inventory used in cultivation_logs.
-- This PRD is simplified, so detailed cost tracking might be out of scope for v1 beyond input purchase costs.
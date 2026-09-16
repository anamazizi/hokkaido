-- Supabase Schema for Hokkaido Cheese Tart Order & Accounting System
-- Generated: 2026-09-16

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    delivery_fee NUMERIC(10,2) DEFAULT 0.00,
    product_type TEXT NOT NULL CHECK (product_type IN ('solo_sweet', 'family_box', 'mega_craving')),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    cogs NUMERIC(10,2) NOT NULL,
    net_profit NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'preparing', 'ready_pickup', 'delivering', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone_number ON orders(phone_number);

-- Table: accounting_ledger
CREATE TABLE IF NOT EXISTS accounting_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    gross_sales NUMERIC(10,2) NOT NULL,
    cogs NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL,
    net_profit NUMERIC(10,2) NOT NULL,
    exported BOOLEAN DEFAULT FALSE,
    exported_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for accounting_ledger
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_order_id ON accounting_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_transaction_date ON accounting_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_accounting_ledger_exported ON accounting_ledger(exported);

-- Trigger to automatically update updated_at timestamp on orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to insert into accounting_ledger when an order is completed
-- This trigger will fire when status changes to 'completed'
CREATE OR REPLACE FUNCTION insert_into_accounting_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO accounting_ledger (order_id, gross_sales, cogs, delivery_fee, net_profit)
        VALUES (NEW.id, NEW.total_price, NEW.cogs, NEW.delivery_fee, NEW.net_profit);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER order_completed_trigger AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION insert_into_accounting_ledger();

-- Comments
COMMENT ON TABLE orders IS 'Stores customer orders for Hokkaido Cheese Tart';
COMMENT ON TABLE accounting_ledger IS 'Accounting ledger for completed orders, ready for LHDN consolidated e-Invoice export';

-- Row Level Security (RLS) Policies
-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Enable RLS on accounting_ledger table
ALTER TABLE accounting_ledger ENABLE ROW LEVEL SECURITY;

-- Policies for orders table
-- Allow anonymous users to INSERT new orders (public customers)
CREATE POLICY "Allow anonymous insert orders" ON orders
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated users to SELECT orders (managers/admins)
CREATE POLICY "Allow authenticated select orders" ON orders
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to UPDATE orders
CREATE POLICY "Allow authenticated update orders" ON orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to DELETE orders (soft delete preferred, but allow for management)
CREATE POLICY "Allow authenticated delete orders" ON orders
    FOR DELETE TO authenticated
    USING (true);

-- Policies for accounting_ledger table
-- Only authenticated users can SELECT (managers/admins)
CREATE POLICY "Allow authenticated select accounting_ledger" ON accounting_ledger
    FOR SELECT TO authenticated
    USING (true);

-- Only authenticated users can INSERT (via trigger)
CREATE POLICY "Allow authenticated insert accounting_ledger" ON accounting_ledger
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Only authenticated users can UPDATE
CREATE POLICY "Allow authenticated update accounting_ledger" ON accounting_ledger
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Only authenticated users can DELETE
CREATE POLICY "Allow authenticated delete accounting_ledger" ON accounting_ledger
    FOR DELETE TO authenticated
    USING (true);
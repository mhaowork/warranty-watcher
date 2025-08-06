-- PostgreSQL Schema for Warranty Watcher (SaaS Mode)
-- Compatible with existing SQLite schema but adds multi-tenancy support

-- Create devices table with user_id for multi-tenancy
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL, -- Multi-tenancy: isolates data by user
  serial_number TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT,
  hostname TEXT,
  client_id TEXT,
  client_name TEXT,
  device_class TEXT,
  source_platform TEXT,
  source_device_id TEXT,
  
  warranty_start_date DATE,
  warranty_end_date DATE,
  warranty_fetched_at INTEGER,
  warranty_written_back_at INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique serial numbers per user (multi-tenant constraint)
  UNIQUE(user_id, serial_number)
);

-- Create subscriptions table for proper subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- One subscription per user
  plan TEXT NOT NULL CHECK (plan IN ('pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(user_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_platform ON devices(user_id, source_platform);
CREATE INDEX IF NOT EXISTS idx_devices_warranty_fetched ON devices(user_id, warranty_fetched_at);
CREATE INDEX IF NOT EXISTS idx_devices_client_name ON devices(user_id, client_name);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable Row Level Security for additional security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see devices they own
-- Note: This policy assumes you're using Supabase auth or similar that sets the authenticated user ID in the database context
CREATE POLICY devices_user_isolation ON devices
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Users can only see their own subscription
CREATE POLICY subscriptions_user_isolation ON subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_devices_updated_at 
  BEFORE UPDATE ON devices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_devices_warranty_status ON devices(user_id, warranty_fetched_at) 
  WHERE warranty_fetched_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_devices_by_client ON devices(user_id, client_name, updated_at);

-- Comments for documentation
COMMENT ON TABLE devices IS 'Device inventory with warranty information (multi-tenant)';
COMMENT ON COLUMN devices.user_id IS 'User/MSP who owns this device data (for multi-tenancy)';
COMMENT ON COLUMN devices.serial_number IS 'Device serial number (unique per user)';
COMMENT ON COLUMN devices.client_id IS 'Client identifier in source platform';
COMMENT ON COLUMN devices.client_name IS 'Human-readable client name';
COMMENT ON COLUMN devices.warranty_fetched_at IS 'Unix timestamp when warranty was last fetched';
COMMENT ON COLUMN devices.warranty_written_back_at IS 'Unix timestamp when warranty was written back to source platform';

COMMENT ON TABLE subscriptions IS 'User subscriptions and billing information';
COMMENT ON COLUMN subscriptions.user_id IS 'User who owns this subscription';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';

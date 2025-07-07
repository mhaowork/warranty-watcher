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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(user_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_platform ON devices(user_id, source_platform);
CREATE INDEX IF NOT EXISTS idx_devices_warranty_fetched ON devices(user_id, warranty_fetched_at);
CREATE INDEX IF NOT EXISTS idx_devices_client_name ON devices(user_id, client_name);

-- Enable Row Level Security for additional security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see devices they own
-- Note: This policy assumes you're using Supabase auth or similar that sets the authenticated user ID in the database context
CREATE POLICY devices_user_isolation ON devices
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

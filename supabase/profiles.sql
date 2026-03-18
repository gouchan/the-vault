-- Rosary: Profiles
-- Run this in Supabase SQL editor after setup.sql

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,

  -- Social links
  website TEXT,
  twitter TEXT,
  instagram TEXT,
  linkedin TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index
CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);

-- Future: link blocks to a profile owner
-- ALTER TABLE blocks ADD COLUMN profile_id UUID REFERENCES profiles(id);

-- Seed a default personal profile
INSERT INTO profiles (username, display_name, bio)
VALUES ('me', 'My Vault', 'Personal research, ideas, and connections.')
ON CONFLICT (username) DO NOTHING;

-- Migration: Auth tables and RLS for expense-tracker
-- Run this after init.sql on an existing database, or use init.sql which includes these changes.
-- Rollback: Drop policies, disable RLS, then drop tables in reverse order (user_roles, role_permissions, profiles, permissions, roles).

-- =============================================
-- Auth & RBAC tables
-- =============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Roles (extensible RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Permissions (resource + action)
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resource, action)
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_expenses" ON expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "master_read_all_expenses" ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'master'
    )
  );

CREATE POLICY "user_insert_own_expenses" ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_expenses" ON expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_delete_own_expenses" ON expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_bills" ON bills
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "master_read_all_bills" ON bills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'master'
    )
  );

CREATE POLICY "user_insert_own_bills" ON bills
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_bills" ON bills
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_delete_own_bills" ON bills
  FOR DELETE
  USING (auth.uid() = user_id);

-- Bill instances
ALTER TABLE bill_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_bill_instances" ON bill_instances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "master_read_all_bill_instances" ON bill_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'master'
    )
  );

CREATE POLICY "user_insert_own_bill_instances" ON bill_instances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_bill_instances" ON bill_instances
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_delete_own_bill_instances" ON bill_instances
  FOR DELETE
  USING (auth.uid() = user_id);

-- Profiles: users can read/update own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "user_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "user_insert_own_profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

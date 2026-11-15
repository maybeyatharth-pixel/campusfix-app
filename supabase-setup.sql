-- ==============================================================================
-- CampusFix: Supabase Database Schema, Row Level Security (RLS) & Auth Triggers
-- Institution: JECRC University, Jaipur (Rajasthan)
-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. PROFILES TABLE (Stores user roles: 'student' or 'admin')
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')) DEFAULT 'student',
  name TEXT,
  roll_no TEXT,
  branch TEXT,
  hostel_or_day TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. COMPLAINTS TABLE (Linked to auth.users via user_id)
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Electrical', 'Water', 'Internet', 'Cleanliness', 'Safety', 'Food')),
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  priority_reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Rejected')) DEFAULT 'Pending',
  student_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_phone TEXT,
  student_email TEXT NOT NULL,
  photo_url TEXT,
  assigned_to TEXT DEFAULT 'Unassigned (Triage Queue)',
  department TEXT DEFAULT 'JECRC Campus Facilities',
  admin_remark TEXT,
  estimated_resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 3. TIMELINE EVENTS TABLE (Status history & admin remarks)
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id BIGSERIAL PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  actor_role TEXT NOT NULL DEFAULT 'Campus Admin',
  actor_name TEXT NOT NULL DEFAULT 'JECRC Estate Office',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on timeline_events
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper Function: Check if the authenticated user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- Complaints Policies:
-- STUDENTS: Can ONLY see, insert, and update their own reports
DROP POLICY IF EXISTS "Students can only see their own reports" ON public.complaints;
CREATE POLICY "Students can only see their own reports"
  ON public.complaints FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Students can insert their own reports" ON public.complaints;
CREATE POLICY "Students can insert their own reports"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update their own reports" ON public.complaints;
CREATE POLICY "Students can update their own reports"
  ON public.complaints FOR UPDATE
  USING (auth.uid() = user_id);

-- ADMINS: Have full access to view, triage, and update all complaints
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.complaints;
CREATE POLICY "Admins can manage all reports"
  ON public.complaints FOR ALL
  USING (public.is_admin());

-- Timeline Events Policies:
DROP POLICY IF EXISTS "Users can view timeline for permitted complaints" ON public.timeline_events;
CREATE POLICY "Users can view timeline for permitted complaints"
  ON public.timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = timeline_events.complaint_id
      AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins can insert timeline events" ON public.timeline_events;
CREATE POLICY "Admins can insert timeline events"
  ON public.timeline_events FOR INSERT
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 5. BACKEND ENFORCEMENT OF UNIVERSITY EMAIL DOMAIN
-- Enforces that any student signup MUST have the @jecrcu.edu.in domain.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.enforce_university_domain()
RETURNS TRIGGER AS $$
DECLARE
  allowed_domain TEXT := 'jecrcu.edu.in';
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Admins can use their admin email; students MUST use the official domain
  IF (user_role != 'admin') AND (NEW.email NOT LIKE '%@' || allowed_domain) THEN
    RAISE EXCEPTION 'Access Denied: Student registration is restricted to official university emails (@%).', allowed_domain;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_university_domain ON auth.users;
CREATE TRIGGER tr_enforce_university_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_university_domain();

-- Auto-create profile record when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, roll_no, branch, hostel_or_day, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'roll_no', 'JU/' || to_char(NOW(), 'YYYY') || '/STU/' || floor(random() * 900 + 100)::text),
    COALESCE(NEW.raw_user_meta_data->>'branch', 'Engineering & Technology'),
    COALESCE(NEW.raw_user_meta_data->>'hostel_or_day', 'Boys Hostel BH-2'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '+91 98290 12345')
  )
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_handle_new_user ON auth.users;
CREATE TRIGGER tr_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. ADMIN ACCOUNT SETUP (Role-Based Access Control)
-- To grant administrator privileges to an account:
-- 1. Create the user in Supabase Dashboard -> Authentication -> Users -> "Add User"
-- 2. Run the SQL query below with that user's email:
--
-- UPDATE public.profiles SET role = 'admin' WHERE email = '<ADMIN_EMAIL>';
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb WHERE email = '<ADMIN_EMAIL>';
-- ==============================================================================

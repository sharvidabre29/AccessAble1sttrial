
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('organization', 'volunteer', 'individual', 'donor');

-- Create individual type enum
CREATE TYPE public.individual_type AS ENUM ('normal', 'differently_abled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role app_role NOT NULL,
  avatar_url TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Organization fields
  organization_name TEXT,
  registration_id TEXT,
  verification_doc_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  -- Volunteer fields
  skills TEXT,
  availability TEXT,
  id_doc_url TEXT,
  -- Individual fields
  individual_type individual_type DEFAULT 'normal',
  accessibility_needs TEXT,
  -- Donor fields
  preferred_donation_type TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service requests table
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  location TEXT,
  skills_needed TEXT,
  funding_goal NUMERIC DEFAULT 0,
  funding_raised NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view requests"
  ON public.service_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Creator can insert requests"
  ON public.service_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update own requests"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Volunteer assignments
CREATE TABLE public.volunteer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, volunteer_id)
);

ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers can view own assignments"
  ON public.volunteer_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = volunteer_id);

CREATE POLICY "Request creators can view assignments"
  ON public.volunteer_assignments FOR SELECT
  TO authenticated
  USING (request_id IN (SELECT id FROM public.service_requests WHERE created_by = auth.uid()));

CREATE POLICY "Volunteers can insert assignments"
  ON public.volunteer_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "Volunteers can update own assignments"
  ON public.volunteer_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = volunteer_id);

-- Donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donors can view own donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (auth.uid() = donor_id);

CREATE POLICY "Donors can insert donations"
  ON public.donations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = donor_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'individual')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'individual')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  name text,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('founder', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  csv_file_path text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create templates table
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create contacts table
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  last_template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  last_sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contacted_at timestamp with time zone,
  responded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create emails table
CREATE TABLE public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  responded boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view their own team"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their team"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for folders
CREATE POLICY "Users can view folders in their team"
  ON public.folders FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create folders in their team"
  ON public.folders FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders in their team"
  ON public.folders FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete folders in their team"
  ON public.folders FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their team"
  ON public.templates FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their team"
  ON public.templates FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their team"
  ON public.templates FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their team"
  ON public.templates FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts in their team"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts in their team"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their team"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their team"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for emails
CREATE POLICY "Users can view emails in their team"
  ON public.emails FOR SELECT
  TO authenticated
  USING (
    folder_id IN (
      SELECT id FROM public.folders WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create emails in their team"
  ON public.emails FOR INSERT
  TO authenticated
  WITH CHECK (
    folder_id IN (
      SELECT id FROM public.folders WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update emails in their team"
  ON public.emails FOR UPDATE
  TO authenticated
  USING (
    folder_id IN (
      SELECT id FROM public.folders WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create analytics view for template performance
CREATE VIEW public.template_performance AS
SELECT
  t.id AS template_id,
  t.name AS template_name,
  t.team_id,
  COUNT(e.id) AS total_sent,
  SUM(CASE WHEN e.responded THEN 1 ELSE 0 END) AS responded_count,
  ROUND(100.0 * SUM(CASE WHEN e.responded THEN 1 ELSE 0 END) / NULLIF(COUNT(e.id), 0), 2) AS response_rate
FROM templates t
LEFT JOIN emails e ON e.template_id = t.id
GROUP BY t.id, t.name, t.team_id;
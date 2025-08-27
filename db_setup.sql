-- Create the projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_name TEXT NOT NULL,
  project_location TEXT NOT NULL,
  total_project_piles INTEGER NOT NULL,
  tracker_system TEXT NOT NULL,
  geotech_company TEXT NOT NULL,
  role TEXT NOT NULL
);

-- Create the user_projects table to associate users with projects
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_owner BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, project_id)
);

-- Create the piles table
CREATE TABLE IF NOT EXISTS piles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pile_number TEXT NOT NULL,
  pile_location TEXT,
  pile_type TEXT,
  pile_status TEXT DEFAULT 'pending',
  installation_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(project_id, pile_number)
);

-- Create the pile_activities table
CREATE TABLE IF NOT EXISTS pile_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pile_id UUID NOT NULL REFERENCES piles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Create RLS policies
-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE piles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pile_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Users can view projects they are part of" 
  ON projects 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = projects.id 
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Project owners can update their projects" 
  ON projects 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = projects.id 
    AND user_projects.user_id = auth.uid() 
    AND user_projects.is_owner = TRUE
  ));

CREATE POLICY "Authenticated users can create projects" 
  ON projects 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for user_projects
CREATE POLICY "Users can view their project associations" 
  ON user_projects 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Project owners can insert new user associations" 
  ON user_projects 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = NEW.project_id 
    AND user_projects.user_id = auth.uid() 
    AND user_projects.is_owner = TRUE
  ) OR NEW.user_id = auth.uid());

-- Create policies for piles
CREATE POLICY "Users can view piles in their projects" 
  ON piles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = piles.project_id 
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert piles in their projects" 
  ON piles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = NEW.project_id 
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update piles in their projects" 
  ON piles 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = piles.project_id 
    AND user_projects.user_id = auth.uid()
  ));

-- Create policies for pile_activities
CREATE POLICY "Users can view pile activities in their projects" 
  ON pile_activities 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM piles 
    JOIN user_projects ON piles.project_id = user_projects.project_id 
    WHERE pile_activities.pile_id = piles.id 
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pile activities in their projects" 
  ON pile_activities 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM piles 
    JOIN user_projects ON piles.project_id = user_projects.project_id 
    WHERE NEW.pile_id = piles.id 
    AND user_projects.user_id = auth.uid()
  ));

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamps
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_projects_updated_at
BEFORE UPDATE ON user_projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_piles_updated_at
BEFORE UPDATE ON piles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pile_activities_updated_at
BEFORE UPDATE ON pile_activities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at(); 
-- Create project_invitations table to track pending invitations
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  UNIQUE(email, project_id, status)
);

-- Create index for faster lookups
CREATE INDEX idx_project_invitations_token ON project_invitations(token);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);
CREATE INDEX idx_project_invitations_status ON project_invitations(status);
CREATE INDEX idx_project_invitations_expires_at ON project_invitations(expires_at);

-- Enable RLS
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_invitations
CREATE POLICY "Users can view invitations they sent" 
  ON project_invitations 
  FOR SELECT 
  USING (invited_by = auth.uid());

CREATE POLICY "Users can view invitations for their projects" 
  ON project_invitations 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = project_invitations.project_id 
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create invitations for their projects" 
  ON project_invitations 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = project_invitations.project_id 
    AND user_projects.user_id = auth.uid() 
    AND (user_projects.is_owner = TRUE OR user_projects.role = 'Admin')
  ));

CREATE POLICY "Users can update invitations they sent" 
  ON project_invitations 
  FOR UPDATE 
  USING (invited_by = auth.uid());

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations() RETURNS void AS $$
BEGIN
  UPDATE project_invitations 
  SET status = 'expired', 
      updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_project_invitation(
  invitation_token TEXT,
  user_id_param UUID
) RETURNS TABLE (
  success BOOLEAN,
  project_id UUID,
  role TEXT,
  message TEXT
) AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO inv_record 
  FROM project_invitations 
  WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, NULL::TEXT, 'Invalid or expired invitation'::TEXT;
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE project_invitations 
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = user_id_param,
      updated_at = NOW()
  WHERE id = inv_record.id;
  
  -- Add user to project
  INSERT INTO user_projects (user_id, project_id, role, is_owner)
  VALUES (user_id_param, inv_record.project_id, inv_record.role, FALSE)
  ON CONFLICT (user_id, project_id) DO UPDATE
  SET role = EXCLUDED.role,
      updated_at = NOW();
  
  RETURN QUERY SELECT TRUE::BOOLEAN, inv_record.project_id, inv_record.role, 'Invitation accepted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create a function to send invitation emails using Supabase Auth
-- This uses Supabase's built-in email system

-- First, create a function that sends an email when an invitation is created
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  inviter_email TEXT;
BEGIN
  -- Get project name
  SELECT p.project_name INTO project_name
  FROM projects p
  WHERE p.id = NEW.project_id;
  
  -- Get inviter's email
  SELECT au.email INTO inviter_email
  FROM auth.users au
  WHERE au.id = NEW.invited_by;

  -- Insert a record into auth.users with a special metadata flag
  -- This will trigger Supabase to send a magic link email
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    jsonb_build_object(
      'email', NEW.email,
      'email_verified', false,
      'invitation_token', NEW.token,
      'project_id', NEW.project_id,
      'project_name', project_name,
      'invited_by', inviter_email,
      'role', NEW.role
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically send emails when invitations are created
CREATE TRIGGER send_invitation_email_trigger
  AFTER INSERT ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION send_invitation_email();
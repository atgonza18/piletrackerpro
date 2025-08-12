# Project Invitation System Setup

The project invitation system allows users to invite others to join their projects via email. When invited users sign up, they're automatically added to the project.

## Database Setup

1. Run the invitation system migration in your Supabase SQL editor:
   ```sql
   -- Run the contents of db_migration_invitations.sql
   ```

## Email Setup (Optional but Recommended)

### Option 1: Using Supabase Edge Functions with Resend

1. **Sign up for Resend** (https://resend.com)
   - Get your API key from the Resend dashboard
   - Add your domain and verify it (or use their testing domain)

2. **Deploy the Edge Function**:
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Set the Resend API key secret
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   
   # Deploy the function
   supabase functions deploy send-invitation-email
   ```

3. **Update your domain in the Edge Function** (optional):
   - Edit `supabase/functions/send-invitation-email/index.ts`
   - Change the `from` email address to use your verified domain

### Option 2: Manual Invitation Links

If you don't set up email sending, the system will:
1. Create the invitation in the database
2. Copy the invitation link to your clipboard
3. You can manually send this link to the invited user

## How It Works

### Inviting Users (Project Admin)
1. Go to Settings → Team Management
2. Click "Invite User"
3. Enter the email address and select a role
4. The system will either:
   - Send an email with the invitation link (if email is configured)
   - Copy the invitation link to clipboard for manual sending

### Accepting Invitations (New Users)
1. User clicks the invitation link
2. They're redirected to the signup page with pre-filled email
3. After completing signup, they're automatically added to the project
4. They skip the project setup step and go directly to the dashboard

### Invitation Features
- **7-day expiration**: Invitations expire after 7 days
- **Unique tokens**: Each invitation has a secure, unique token
- **Role assignment**: Users are assigned the role specified in the invitation
- **Duplicate prevention**: Can't send multiple pending invitations to the same email for the same project
- **Automatic project assignment**: Users don't need to manually join the project

## Security Notes

- Invitation tokens are cryptographically secure random strings
- Invitations can only be created by project admins or owners
- Expired invitations cannot be used
- Each invitation can only be used once
- The invitation system uses Row Level Security (RLS) policies

## Troubleshooting

### Emails not sending
- Check that your Resend API key is correctly set: `supabase secrets list`
- Verify your domain is configured in Resend
- Check Edge Function logs: `supabase functions logs send-invitation-email`

### Invitation links not working
- Ensure the database migration has been run
- Check that the invitation hasn't expired (7 days)
- Verify the user hasn't already signed up with that email

### Users not being added to projects
- Check that the `accept_project_invitation` function exists in your database
- Verify RLS policies are correctly set up
- Check Supabase logs for any errors during signup
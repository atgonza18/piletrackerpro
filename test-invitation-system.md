# Testing the Invitation System

## Test Steps

### 1. Access the Application
- Open browser to: http://localhost:3010
- Log in with your existing account

### 2. Test Invitation Creation
1. Navigate to **Settings** page
2. Click on **Team Management** tab
3. Click **"Invite User"** button
4. Enter test email: `testinvite@example.com`
5. Select role: `Admin` or `Rep`
6. Click **"Send Invitation"**

### Expected Results:
- ✅ Success message appears
- ✅ Invitation link is copied to clipboard
- ✅ Database record created in `project_invitations` table

### 3. Verify Database Record
Run this query in Supabase SQL Editor:
```sql
SELECT * FROM project_invitations ORDER BY created_at DESC LIMIT 5;
```

You should see:
- email: testinvite@example.com
- status: pending
- token: 64-character hex string
- expires_at: 7 days from now

### 4. Test Invitation Link
1. Copy the invitation link from clipboard
2. Open new incognito/private browser window
3. Paste the invitation link

### Expected Results:
- ✅ Redirected to registration page
- ✅ "register" tab is active
- ✅ Email field pre-filled with `testinvite@example.com`
- ✅ Email field is read-only
- ✅ Blue invitation banner shows project name
- ✅ Account type selection is hidden

### 5. Test Invalid Invitation
Try accessing with invalid token:
http://localhost:3010/auth?invitation=invalid123

### Expected Results:
- ✅ Error message: "Invalid or expired invitation link"
- ✅ Normal registration form shown

## Console Commands for Testing

### Check if table exists:
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'project_invitations'
);
```

### View all invitations:
```sql
SELECT 
  id,
  email,
  project_id,
  role,
  status,
  token,
  expires_at,
  created_at
FROM project_invitations
ORDER BY created_at DESC;
```

### Manually expire an invitation (for testing):
```sql
UPDATE project_invitations 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE email = 'testinvite@example.com' 
AND status = 'pending';
```

### Clean up test invitations:
```sql
DELETE FROM project_invitations 
WHERE email = 'testinvite@example.com';
```
-- Enable Row Level Security on the projects table
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

-- Create a policy for inserting new projects (for authenticated users)
CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create a policy for reading projects (for project owners/members)
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT project_id FROM user_projects WHERE user_id = auth.uid()
        )
    );

-- Create a policy for updating projects (for project owners/members)
CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT project_id FROM user_projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        id IN (
            SELECT project_id FROM user_projects WHERE user_id = auth.uid()
        )
    );

-- Create a policy for deleting projects (for project owners only)
CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE
    TO authenticated
    USING (
        id IN (
            SELECT project_id FROM user_projects WHERE user_id = auth.uid() AND is_owner = true
        )
    );

-- Enable Row Level Security on the user_projects table
ALTER TABLE IF EXISTS user_projects ENABLE ROW LEVEL SECURITY;

-- Create a policy for inserting user_projects (for authenticated users)
CREATE POLICY "Users can insert their own associations" ON user_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Create a policy for reading user_projects (for authenticated users)
CREATE POLICY "Users can view their own associations" ON user_projects
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Create a policy for updating user_projects (for authenticated users)
CREATE POLICY "Users can update their own associations" ON user_projects
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create a policy for deleting user_projects (for authenticated users)
CREATE POLICY "Users can delete their own associations" ON user_projects
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()); 
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify super admin status
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: superAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!superAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // List all projects (service role bypasses RLS)
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 400 });
    }

    // Get user counts for each project
    const projectIds = projects?.map(p => p.id) || [];
    const { data: userCounts } = await supabaseAdmin
      .from('user_projects')
      .select('project_id')
      .in('project_id', projectIds);

    // Count users per project
    const userCountMap: Record<string, number> = {};
    (userCounts || []).forEach(uc => {
      userCountMap[uc.project_id] = (userCountMap[uc.project_id] || 0) + 1;
    });

    const projectsWithUserCounts = (projects || []).map(p => ({
      ...p,
      user_count: userCountMap[p.id] || 0
    }));

    return NextResponse.json({
      projects: projectsWithUserCounts
    });

  } catch (error) {
    console.error('Error in list-projects API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

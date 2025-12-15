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

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');

    // List all users using admin API
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }

    // Get user_projects data for each user
    const userIds = usersData.users.map(u => u.id);
    const { data: userProjects } = await supabaseAdmin
      .from('user_projects')
      .select('user_id, project_id, role, is_owner, projects(id, project_name)')
      .in('user_id', userIds);

    // Get super admin status for each user
    const { data: superAdmins } = await supabaseAdmin
      .from('super_admins')
      .select('user_id')
      .in('user_id', userIds);

    const superAdminIds = new Set((superAdmins || []).map(sa => sa.user_id));

    // Map projects to users
    const usersWithProjects = usersData.users.map(u => ({
      id: u.id,
      email: u.email,
      first_name: u.user_metadata?.first_name || '',
      last_name: u.user_metadata?.last_name || '',
      account_type: u.user_metadata?.account_type || 'epc',
      created_at: u.created_at,
      email_confirmed: !!u.email_confirmed_at,
      is_super_admin: superAdminIds.has(u.id),
      projects: (userProjects || [])
        .filter(up => up.user_id === u.id)
        .map(up => ({
          project_id: up.project_id,
          project_name: (up.projects as { id: string; project_name: string })?.project_name || 'Unknown',
          role: up.role,
          is_owner: up.is_owner
        }))
    }));

    return NextResponse.json({
      users: usersWithProjects,
      total: usersData.users.length
    });

  } catch (error) {
    console.error('Error in list-users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

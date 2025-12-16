import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'Missing required field: project_id' }, { status: 400 });
    }

    // Get project info for logging
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('project_name')
      .eq('id', project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete related data in order (due to foreign key constraints)

    // 1. Delete pile_activities for this project's piles
    const { error: activitiesError } = await supabaseAdmin
      .from('pile_activities')
      .delete()
      .eq('project_id', project_id);

    if (activitiesError) {
      console.error('Error deleting pile activities:', activitiesError);
    }

    // 2. Delete piles
    const { error: pilesError } = await supabaseAdmin
      .from('piles')
      .delete()
      .eq('project_id', project_id);

    if (pilesError) {
      console.error('Error deleting piles:', pilesError);
    }

    // 3. Delete preliminary_production
    const { error: prelimError } = await supabaseAdmin
      .from('preliminary_production')
      .delete()
      .eq('project_id', project_id);

    if (prelimError) {
      console.error('Error deleting preliminary production:', prelimError);
    }

    // 4. Delete pile_lookup
    const { error: lookupError } = await supabaseAdmin
      .from('pile_lookup')
      .delete()
      .eq('project_id', project_id);

    if (lookupError) {
      console.error('Error deleting pile lookup:', lookupError);
    }

    // 5. Delete project_invitations
    const { error: invitationsError } = await supabaseAdmin
      .from('project_invitations')
      .delete()
      .eq('project_id', project_id);

    if (invitationsError) {
      console.error('Error deleting project invitations:', invitationsError);
    }

    // 6. Delete user_projects (assignments)
    const { error: assignmentsError } = await supabaseAdmin
      .from('user_projects')
      .delete()
      .eq('project_id', project_id);

    if (assignmentsError) {
      console.error('Error deleting user assignments:', assignmentsError);
    }

    // 7. Finally, delete the project itself
    const { error: projectError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', project_id);

    if (projectError) {
      console.error('Error deleting project:', projectError);
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Project "${project.project_name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error in delete-project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { user_id, project_id, role, is_owner } = body;

    if (!user_id || !project_id || !role) {
      return NextResponse.json({ error: 'Missing required fields: user_id, project_id, role' }, { status: 400 });
    }

    // Check if assignment already exists
    const { data: existing } = await supabaseAdmin
      .from('user_projects')
      .select('id')
      .eq('user_id', user_id)
      .eq('project_id', project_id)
      .single();

    if (existing) {
      // Update existing assignment
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_projects')
        .update({ role, is_owner: is_owner || false })
        .eq('user_id', user_id)
        .eq('project_id', project_id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, assignment: updated, updated: true });
    }

    // Create new assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('user_projects')
      .insert({
        user_id,
        project_id,
        role,
        is_owner: is_owner || false
      })
      .select()
      .single();

    if (assignError) {
      console.error('Error assigning user to project:', assignError);
      return NextResponse.json({ error: assignError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error in assign-user-to-project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

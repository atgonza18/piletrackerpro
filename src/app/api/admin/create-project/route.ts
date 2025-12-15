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
    const {
      project_name,
      project_location,
      total_project_piles,
      tracker_system,
      geotech_company,
      role,
      embedment_tolerance
    } = body;

    // Validate required fields
    if (!project_name || !project_location) {
      return NextResponse.json({ error: 'Project name and location are required' }, { status: 400 });
    }

    // Create project using service role (bypasses RLS)
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        project_name,
        name: project_name, // For backward compatibility
        project_location,
        total_project_piles: total_project_piles ? parseInt(total_project_piles) : 0,
        tracker_system: tracker_system || 'software',
        geotech_company: geotech_company || '',
        role: role || 'project_manager',
        embedment_tolerance: embedment_tolerance ? parseFloat(embedment_tolerance) : 1
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('Error in create-project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

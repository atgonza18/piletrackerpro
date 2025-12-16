import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Check if service key is configured
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Get project ID and pagination params from query
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '1000');
    const countOnly = searchParams.get('countOnly') === 'true';

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the user's JWT and get their ID
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is super admin
    const { data: superAdmin, error: saError } = await supabaseAdmin
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!superAdmin || saError) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // If only count is requested
    if (countOnly) {
      const { count } = await supabaseAdmin
        .from('piles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      return NextResponse.json({ count: count || 0 });
    }

    // Fetch piles with pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data: piles, error: pilesError, count } = await supabaseAdmin
      .from('piles')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .range(from, to);

    if (pilesError) {
      console.error('[Admin Piles API] Error fetching piles:', pilesError);
      return NextResponse.json({ error: 'Error fetching piles' }, { status: 500 });
    }

    return NextResponse.json({
      piles: piles || [],
      count: count || 0,
      page,
      pageSize
    });

  } catch (error) {
    console.error('[Admin Piles API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

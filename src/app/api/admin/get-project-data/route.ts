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

    // Get project ID from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

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

    console.log('[Admin API] Fetching project data for projectId:', projectId);

    // Fetch project data
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('[Admin API] Project not found:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    console.log('[Admin API] Found project:', project.project_name, '(ID:', project.id, ')');

    // Fetch pile count
    const { count: totalPiles } = await supabaseAdmin
      .from('piles')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    console.log('[Admin API] Total piles for project:', totalPiles);

    // Fetch all piles for statistics
    const { data: piles, error: pilesError } = await supabaseAdmin
      .from('piles')
      .select('embedment, design_embedment, block, pile_type, start_date, created_at')
      .eq('project_id', projectId);

    if (pilesError) {
      console.error('[Admin API] Error fetching piles:', pilesError);
      return NextResponse.json({ error: 'Error fetching pile data' }, { status: 500 });
    }

    console.log('[Admin API] Fetched', piles?.length || 0, 'piles for statistics');

    // Calculate statistics
    const tolerance = project.embedment_tolerance || 1;
    let accepted = 0;
    let refusals = 0;
    let pending = 0;

    (piles || []).forEach((pile: any) => {
      if (!pile.embedment || !pile.design_embedment) {
        pending++;
      } else {
        const emb = parseFloat(pile.embedment);
        const design = parseFloat(pile.design_embedment);

        if (!isNaN(emb) && !isNaN(design)) {
          if (emb >= design) {
            accepted++;
          } else if (emb < (design - tolerance)) {
            refusals++;
          } else {
            accepted++; // Within tolerance
          }
        } else {
          pending++;
        }
      }
    });

    // Calculate block data
    const blockMap = new Map<string, number>();
    (piles || []).forEach((pile: any) => {
      const block = pile.block || 'Unknown';
      blockMap.set(block, (blockMap.get(block) || 0) + 1);
    });

    const blockData = Array.from(blockMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate timeline data
    const weeklyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();

    (piles || []).forEach((pile: any) => {
      const dateStr = pile.start_date || pile.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      }
    });

    const weeklyTimelineData = Array.from(weeklyMap.entries())
      .map(([name, piles]) => ({ name, piles }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-12);

    const monthlyTimelineData = Array.from(monthlyMap.entries())
      .map(([name, piles]) => ({ name, piles }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-12);

    return NextResponse.json({
      project,
      statistics: {
        totalPiles: totalPiles || 0,
        accepted,
        refusals,
        pending,
        completionPercent: project.total_project_piles > 0
          ? Math.round(((totalPiles || 0) / project.total_project_piles) * 100)
          : 0
      },
      blockData,
      weeklyTimelineData,
      monthlyTimelineData
    });

  } catch (error) {
    console.error('Error fetching project data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

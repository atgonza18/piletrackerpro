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
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing required field: user_id' }, { status: 400 });
    }

    // Prevent self-revocation
    if (user_id === user.id) {
      return NextResponse.json({ error: 'Cannot revoke your own super admin privileges' }, { status: 400 });
    }

    // Revoke super admin
    const { error: revokeError } = await supabaseAdmin
      .from('super_admins')
      .delete()
      .eq('user_id', user_id);

    if (revokeError) {
      console.error('Error revoking super admin:', revokeError);
      return NextResponse.json({ error: revokeError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin privileges revoked'
    });

  } catch (error) {
    console.error('Error in revoke-super-admin API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

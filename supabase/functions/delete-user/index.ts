import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify calling user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check calling user's role
    const { data: callerRole, error: callerRoleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (callerRoleError || !['root', 'admin'].includes(callerRole?.role)) {
      return new Response(
        JSON.stringify({ error: 'Only root or admin users can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id: targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (targetUserId === callingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir a si mesmo' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target user's role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: targetRole, error: targetRoleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .single();

    if (targetRoleError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Root users cannot be deleted
    if (targetRole.role === 'root') {
      return new Response(
        JSON.stringify({ error: 'Não é possível excluir um usuário root' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin cannot delete another admin
    if (callerRole.role === 'admin' && targetRole.role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin não pode excluir outro admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete user via Auth Admin API (cascades handle related data)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User deleted successfully:', targetUserId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

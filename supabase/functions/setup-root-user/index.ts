import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const matricula = 'root.0000'
    const email = `${matricula}@gincana.local`
    const password = 'privacidade1'

    // Check if user with this email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Root user already exists',
          user_id: existingUser.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create new user with admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Root Admin', matricula }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const userId = newUser.user.id

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: 'Root Admin',
        matricula: matricula
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    // Update user role to root
    const { error: roleError } = await supabase
      .from('user_roles')
      .update({ role: 'root' })
      .eq('user_id', userId)

    if (roleError) {
      console.error('Error updating role:', roleError)
    }

    console.log('Root user created successfully:', { userId, email, matricula })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Root user created successfully',
        user_id: userId,
        login: { matricula, password }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

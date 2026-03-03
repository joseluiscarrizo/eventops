import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface CreateUserRequest {
  email: string
  name: string
  phone?: string
  role: "ADMIN_LEVEL_1" | "ADMIN_LEVEL_2" | "USER"
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { email, name, phone, role } = await req.json() as CreateUserRequest

    // Create auth user
    const array = new Uint8Array(18);
    crypto.getRandomValues(array);
    const tempPassword = btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '').slice(0, 16);
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Create user profile with role
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authUser.user?.id,
        email,
        name,
        phone,
        role,
        status: "active"
      })
      .select()
      .single()

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ user: userProfile }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})

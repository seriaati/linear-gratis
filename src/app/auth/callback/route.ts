import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // If signups are disabled, reject users who just created their account
      if (process.env.DISABLE_SIGNUPS === 'true') {
        const createdAt = new Date(data.user.created_at).getTime()
        const isNewUser = Date.now() - createdAt < 10_000

        if (isNewUser) {
          // Sign out the newly created user and redirect with an error
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=signups_disabled`)
        }
      }

      // Successful auth - redirect to the intended destination
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Only allow same-origin relative paths in `next`. Anything that starts with
  // `//` (protocol-relative) or a full URL would let an attacker turn the
  // callback into an open redirect after a successful login.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // If signups are disabled, reject users who just created their account
      if (process.env.DISABLE_SIGNUPS === 'true') {
        const createdAt = new Date(data.user.created_at).getTime()
        const isNewUser = Date.now() - createdAt < 10_000

        if (isNewUser) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=signups_disabled`)
        }
      }

      // Always redirect to the request's own origin. Do not trust
      // X-Forwarded-Host because it can be set by an attacker via a permissive
      // intermediary and turned into a post-auth open redirect.
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

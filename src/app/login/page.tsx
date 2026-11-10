import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  const signupsDisabled = process.env.DISABLE_SIGNUPS === 'true'

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm signupsDisabled={signupsDisabled} />
    </Suspense>
  )
}

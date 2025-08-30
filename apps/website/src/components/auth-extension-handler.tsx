'use client'

// ** import core packages
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ** import third-party packages
import { useUser, useClerk } from '@clerk/nextjs'

export function AuthExtensionHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, user } = useUser()
  const { openSignIn } = useClerk()

  useEffect(() => {
    const authParam = searchParams.get('auth')
    
    if (authParam === 'extension') {
      if (isSignedIn && user) {
        // User is already signed in, redirect to open extension
        router.replace('/?open-extension=true')
      } else {
        // User is not signed in, open the sign-in modal
        openSignIn({
          redirectUrl: '/?open-extension=true',
          afterSignInUrl: '/?open-extension=true'
        })
      }
    }
  }, [searchParams, isSignedIn, user, router, openSignIn])

  return null
}
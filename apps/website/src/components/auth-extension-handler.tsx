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
  const { openSignIn, signOut } = useClerk()

  useEffect(() => {
    const authParam = searchParams.get('auth')
    const signoutParam = searchParams.get('signout')
    
    // Handle sign-out request from extension
    if (signoutParam === 'extension' && isSignedIn) {
      console.log('SmartFill: Website received sign-out request from extension')
      // Clear the URL parameter first
      router.replace('/')
      
      // Sign out the user from the website
      signOut({
        redirectUrl: '/'
      }).then(() => {
        console.log('SmartFill: Website sign-out completed')
      }).catch((error) => {
        console.error('SmartFill: Website sign-out failed:', error)
      })
      
      return
    }
    
    // Handle auth request from extension
    if (authParam === 'extension') {
      if (isSignedIn && user) {
        // User is already signed in, redirect to open extension
        router.replace('/?open-extension=true')
      } else if (isSignedIn === false) {
        // User is explicitly not signed in, open the sign-in modal
        openSignIn({
          redirectUrl: '/?open-extension=true',
          afterSignInUrl: '/?open-extension=true'
        })
      }
      // If isSignedIn is undefined (loading), do nothing and wait
    }
  }, [searchParams, isSignedIn, user, router, openSignIn, signOut])

  return null
}
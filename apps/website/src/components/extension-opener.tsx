// ** import core packages
'use client'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ** import third party
import { useUser } from '@clerk/nextjs'

// ** import config
import { EXTENSION_CONFIG } from '@/config'

export function ExtensionOpener() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, user } = useUser()

  useEffect(() => {
    const openExtension = searchParams.get('open-extension')
    
    if (openExtension === 'true' && isSignedIn && user) {
      // Clear the URL parameter
      router.replace('/')
      
      // Try to trigger the extension to open
      // We'll use a custom event and postMessage to communicate with the extension
      try {
        // Method 1: Custom event
        window.dispatchEvent(new CustomEvent('smartfill-open-extension', {
          detail: { 
            userId: user.id,
            userEmail: user.primaryEmailAddress?.emailAddress,
            userName: user.fullName || user.firstName || 'User'
          }
        }))

        // Method 2: PostMessage to extension content script
        window.postMessage({
          type: 'SMARTFILL_OPEN_EXTENSION',
          source: 'website',
          data: {
            userId: user.id,
            userEmail: user.primaryEmailAddress?.emailAddress,
            userName: user.fullName || user.firstName || 'User'
          }
        }, '*')


        // Method 3: Try to interact with extension directly if available
        if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
          // Try to send message to extension
          (window as any).chrome.runtime.sendMessage(EXTENSION_CONFIG.EXTENSION_ID, {
            action: 'OPEN_POPUP',
            userId: user.id,
            userEmail: user.primaryEmailAddress?.emailAddress,
            userName: user.fullName || user.firstName || 'User'
          }).catch(() => {
            // Extension not available, that's okay
          })

          // Also set auth sync signal in storage for the extension to find
          if ((window as any).chrome?.storage) {
            (window as any).chrome.storage.local.set({
              smartfill_auth_sync: {
                userId: user.id,
                userEmail: user.primaryEmailAddress?.emailAddress,
                userName: user.fullName || user.firstName || 'User',
                timestamp: Date.now()
              }
            }).catch(() => {
              // Storage not available, that's okay
            })
          }
        }

        console.log('SmartFill: Triggered extension opening for user:', user.id)
      } catch (error) {
        console.log('SmartFill: Could not trigger extension opening:', error)
      }
    }
  }, [searchParams, isSignedIn, user, router])

  return null
}
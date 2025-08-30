// ** import core packages
import { createClerkClient } from '@clerk/backend'

// ** import config
import { env } from './env'

// Clerk JWT public key for verification
export const CLERK_PEM_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy2oDFWWw6bNPv5j1ZL2H
FEwmy/QrpTVLsPKd97wYILl2BApv0eIeoty2hyopnE6cBlI9P+CA8AV2WQc4rvgQ
0wZW03V4VuGTXH5lZRPz8Hc/P15d2E1LlJ1jM2ZdVzIuAuHNmEKuMh47tIaTVVEp
yDVv4rIVje7CbUqSG+oc6hIJPsZxiq1mw/M/u+vj2kJpwILak0xdzKp0aANOzqfq
sUdLh4gfYyqvgYPQ5dNBAnkyFo7gZDCWNhIMbRuuy8UC2KxUfeSjjMbiqyUPRQVS
qdCoTldvGOKITun6KYzKkLuOrkaaQH8ohzqIldJAJ7HSeZ1XT7KMM40Ln+OFOFm3
JwIDAQAB
-----END PUBLIC KEY-----`

export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
})

export * from '@clerk/backend'
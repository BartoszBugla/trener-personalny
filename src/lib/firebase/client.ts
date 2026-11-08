import { getApps, initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  inMemoryPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import type { Auth, UserCredential } from 'firebase/auth'

import { firebaseConfig } from './config'

/*
 * Firebase client SDK – browser only, loaded lazily from the login page.
 * It's used just to sign in and obtain an ID token: the server turns that into
 * an httpOnly session cookie, so the SDK keeps no state (in-memory persistence,
 * signed out right after).
 */

let authPromise: Promise<Auth> | undefined

function firebaseAuth(): Promise<Auth> {
  authPromise ??= (async () => {
    const app = getApps()[0] ?? initializeApp(firebaseConfig)
    const auth = getAuth(app)
    await setPersistence(auth, inMemoryPersistence)
    return auth
  })()
  return authPromise
}

async function toIdToken(
  auth: Auth,
  credential: UserCredential,
): Promise<string> {
  const idToken = await credential.user.getIdToken()
  await signOut(auth)
  return idToken
}

/** Google account picker in a popup; resolves to a fresh ID token. */
export async function signInWithGoogle(): Promise<string> {
  const auth = await firebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return toIdToken(auth, await signInWithPopup(auth, provider))
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<string> {
  const auth = await firebaseAuth()
  return toIdToken(
    auth,
    await signInWithEmailAndPassword(auth, email, password),
  )
}

/** Sends Firebase's "reset your password" email (also verifies the address). */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = await firebaseAuth()
  await sendPasswordResetEmail(auth, email)
}

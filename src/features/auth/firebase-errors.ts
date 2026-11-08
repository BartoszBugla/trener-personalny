/** Firebase Auth error codes -> i18n keys (`auth.errors.*`). */
const FIREBASE_ERROR_KEYS = {
  'auth/invalid-credential': 'auth.errors.invalidCredential',
  'auth/wrong-password': 'auth.errors.invalidCredential',
  'auth/invalid-login-credentials': 'auth.errors.invalidCredential',
  'auth/user-not-found': 'auth.errors.userNotFound',
  'auth/invalid-email': 'auth.errors.invalidEmail',
  'auth/missing-password': 'auth.errors.missingPassword',
  'auth/user-disabled': 'auth.errors.userDisabled',
  'auth/too-many-requests': 'auth.errors.tooManyRequests',
  'auth/network-request-failed': 'auth.errors.network',
  'auth/popup-blocked': 'auth.errors.popupBlocked',
  'auth/unauthorized-domain': 'auth.errors.unauthorizedDomain',
  'auth/operation-not-allowed': 'auth.errors.providerDisabled',
  'auth/invalid-api-key': 'auth.errors.misconfigured',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    'auth.errors.misconfigured',
} as const

export type FirebaseErrorKey =
  (typeof FIREBASE_ERROR_KEYS)[keyof typeof FIREBASE_ERROR_KEYS]

/** User closed the popup themselves – nothing to report. */
const SILENT_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

function codeOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined
}

export function firebaseErrorKey(error: unknown): FirebaseErrorKey | undefined {
  const code = codeOf(error)
  return code && code in FIREBASE_ERROR_KEYS
    ? FIREBASE_ERROR_KEYS[code as keyof typeof FIREBASE_ERROR_KEYS]
    : undefined
}

export function isSilentFirebaseError(error: unknown): boolean {
  const code = codeOf(error)
  return code !== undefined && SILENT_CODES.has(code)
}

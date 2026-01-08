'use client';

/**
 * Login View
 * 
 * This view is now deprecated as Clerk handles authentication.
 * Users are redirected to Clerk's hosted sign-in page.
 * This component exists only for backwards compatibility.
 */

import { RedirectToSignIn } from '@clerk/clerk-react';

export default function Login() {
  // Redirect to Clerk's hosted sign-in page
  return <RedirectToSignIn />;
}

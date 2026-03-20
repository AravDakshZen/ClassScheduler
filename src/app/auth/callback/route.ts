import { createClient } from '../../../lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/timetable-view';

  // Handle PKCE code exchange (OAuth, magic link, email confirmation, password recovery)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password recovery flow — redirect to reset password page
      if (type === 'recovery' || next === '/reset-password') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      // Email confirmation flow — redirect to login with success state
      if (type === 'signup' || type === 'email_change') {
        return NextResponse.redirect(`${origin}/sign-up-login-screen?confirmed=1`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    // If code exchange failed, redirect to sign-in
    return NextResponse.redirect(`${origin}/sign-up-login-screen?error=auth_error`);
  }

  // Handle token_hash flow (email OTP / recovery links without PKCE)
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      if (type === 'signup' || type === 'email_change') {
        return NextResponse.redirect(`${origin}/sign-up-login-screen?confirmed=1`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-up-login-screen`);
}

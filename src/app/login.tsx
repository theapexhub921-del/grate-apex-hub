
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Href, router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text, TextInput } from '@/components/ui/text';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { LogoMark } from '@/components/logo-mark';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Interactive } from '@/components/ui/interactive';
import { elevation, Radius, ThemeColors, Type } from '@/constants/theme';
import { needsOnboarding, useOnboardingState } from '@/data/onboarding';
import { setDisplayName } from '@/data/user';
import { useTheme } from '@/hooks/use-theme';
import { friendlyGoogleError, signInWithGoogle, takeOAuthPending } from '@/lib/google-auth';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword as fbUpdatePassword,
} from 'firebase/auth';
import { registerWithEmail, resolveSignInEmail } from '@/lib/accounts';
import { auth } from '@/lib/firebase';
import { cleanUsername, parseLoginIdentifier, validateUsername } from '@/lib/login-identifier';


const HOME_HREF = '/' as Href;

const EXPIRED_LINK_MESSAGE =
  'This password reset link is invalid or has expired. Please request a new one below.';

// Details Supabase adds to the address when the user opens a reset link
// (e.g. "#access_token=...&type=recovery", or "#error_code=otp_expired").
// Supabase removes them shortly after the page opens, so read them once,
// as soon as this file loads.
const linkParams = readLinkParams();

// Back from Google? (Also read once, at load.) A failed or cancelled Google
// sign-in returns here with an error in the address: explain it as a Google
// problem — not as an expired email link.
const oauthReturn = readOAuthReturn();

function readOAuthReturn(): { error: string | null } | null {
  if (!takeOAuthPending()) return null;
  const failure = linkParams.get('error_description') ?? linkParams.get('error');
  return { error: failure ? friendlyGoogleError(failure) : null };
}

type Mode = 'signIn' | 'signUp' | 'checkEmail' | 'reset' | 'newPassword';

const MIN_PASSWORD = 8;
const ONBOARDING_HREF = '/onboarding' as Href;
const PENDING_GOOGLE_CONSENT_KEY = 'grateapex_pending_google_legal_consent';
const LEGAL_VERSION = '2026-10-05';

// Email/password sign-in using Supabase.
// Hidden from the tab bar; open it at /login.
//
// Modes:
//   signIn      — normal Sign In form (+ Continue with Google)
//   signUp      — create an account (+ Continue with Google)
//   checkEmail  — sign-up sent a confirmation link
//   reset       — "Forgot password?": email a reset link
//   newPassword — opened from the reset link: choose a new password
export default function LoginScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 960;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(oauthReturn?.error ?? null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<Mode>('signIn');
  const [resetSent, setResetSent] = useState(false);

  // "Create account" form.
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState('');
  const [maybeExisting, setMaybeExisting] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [googleLoading, setGoogleLoading] = useState(false);
  const onboarding = useOnboardingState();

  // "Set New Password" form.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '' && !loading;
  const canSendReset = email.trim() !== '' && !loading;
  const canSignUp = username.trim() !== '' && email.trim() !== '' && password !== '' && signUpConfirm !== '' && acceptedTerms && !loading;
  const canUpdatePassword =
    newPassword !== '' && confirmPassword !== '' && !loading;

  // Detect when the user arrives from a password-reset email.
  useEffect(() => {
    let active = true;

    // (No Supabase listener: the router handles password recovery links.)

    // Back from Google: a successful return carries the session in the
    // address (Supabase picks it up by itself); an error is already shown.
    if (oauthReturn) {
      if (oauthReturn.error) {
        // Google errors arrive as query parameters, which the router keeps
        // in its own state (and writes back to the address bar as it
        // starts up). Clear them once it has settled, so a refresh shows a
        // clean sign-in page instead of an "expired link" message.
        const timer = setTimeout(() => {
          router.setParams({ error: undefined, error_code: undefined, error_description: undefined });
          clearLinkFromAddress();
        }, 0);
        return () => {
          clearTimeout(timer);
          active = false;
        };
      }
      void recordPendingGoogleConsent();
      return () => {
        active = false;
      };
    }

    // (No Supabase reset link handling: the router updates the mode via the
    // PASSWORD_RECOVERY event, which we no longer listen to.)

    return () => {
      active = false;
    };
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetSent(false);
    setPasswordUpdated(false);
    setResendState('idle');
  }

  async function sendResetEmail() {
    if (!canSendReset) return;
    setLoading(true);
    setError(null);
    setResetSent(false);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      console.warn('Reset email error:', err);
      setError(friendlyError(err?.message, err?.code));
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword() {
    if (!canUpdatePassword) return;

    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (auth.currentUser) {
        await fbUpdatePassword(auth.currentUser, newPassword);
        setPasswordUpdated(true);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError('No active session. Please request a new password reset link.');
      }
    } catch (err: any) {
      console.warn('Update password error:', err);
      setError(friendlyError(err?.message, err?.code));
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    // An email, or a username from the original app (see login-identifier.ts).
    const identifier = parseLoginIdentifier(email);
    try {
      await signInWithEmailAndPassword(auth, await resolveSignInEmail(identifier), password);
      setPassword('');
      router.replace(HOME_HREF);
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      setError(
        identifier.kind === 'username' && isWrongUsernameOrPassword(err?.code)
          ? 'Incorrect username or password. Please try again.'
          : friendlyError(err?.message, err?.code)
      );
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    if (!canSignUp) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    if (password !== signUpConfirm) {
      setError('The two passwords do not match.');
      return;
    }

    const usernameProblem = validateUsername(cleanUsername(username));
    if (usernameProblem) {
      setError(usernameProblem);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Username reserved and profile created together (lib/accounts.ts);
      // nothing is left half-made if either fails.
      await registerWithEmail({ email, password, username, displayName: fullName });
      setPassword('');
      setSignUpConfirm('');
      router.replace(HOME_HREF);
    } catch (err: any) {
      console.warn('Sign-up error:', err);
      setError(friendlyError(err?.message, err?.code));
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!signedUpEmail || resendState === 'sending') return;
    setResendState('sending');
    setError(null);
    try {
      // Email resending is handled by the backend later.
      setResendState('sent');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setResendState('idle');
    }
  }

  async function continueWithGoogle() {
    if (googleLoading || loading) return;
    if (mode === 'signUp' && !acceptedTerms) {
      setError('Please read and accept the Terms of Service and Privacy Policy before creating your account.');
      return;
    }
    if (mode === 'signUp') {
      await AsyncStorage.setItem(PENDING_GOOGLE_CONSENT_KEY, JSON.stringify({ at: new Date().toISOString(), version: LEGAL_VERSION }));
    }
    setGoogleLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    // Web: the page is leaving for Google — keep the spinner (and reset it
    // if the browser later restores this page from its back/forward cache).
    if (result.status === 'redirecting') {
      if (typeof window !== 'undefined') {
        window.addEventListener('pageshow', (event) => {
          if (event.persisted) setGoogleLoading(false);
        }, { once: true });
      }
      return;
    }
    setGoogleLoading(false);
    if (result.status === 'cancelled') setError('Google sign-in was cancelled.');
    else if (result.status === 'error') setError(result.message);
    // 'signed-in' (phones): the auth guard takes the learner onwards.
  }

  const title =
    mode === 'newPassword'
      ? 'Set New Password'
      : mode === 'reset'
        ? 'Reset Password'
        : mode === 'signUp'
          ? 'Create your account'
          : mode === 'checkEmail'
            ? 'Check your email'
            : 'Sign In';
  const subtitle =
    mode === 'newPassword'
      ? passwordUpdated
        ? 'All done.'
        : 'Choose a new password for your account.'
      : mode === 'reset'
        ? 'Enter your email and we’ll send you a reset link.'
        : mode === 'signUp'
          ? 'Learn alongside a supportive community. One step at a time — you’ve got this.'
          : mode === 'checkEmail'
            ? 'One more step to activate your account.'
            : 'Welcome back to GrAte Apex Hub. Keep going — you’ve got this.';

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, isWide && styles.containerWide]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          {isWide ? (
            <BrandPanel styles={styles} colors={colors} />
          ) : (
            // Phones: identity first, then straight to the form.
            <View style={styles.mobileBrand}>
              <LogoMark height={52} />
              <Text style={styles.brandName}>GrAte Apex Hub</Text>
            </View>
          )}

          <View style={[styles.formPanel, isWide && styles.formPanelWide]}>
            <View style={[styles.card, elevation(colors, 3)]}>
              <Text style={styles.eyebrow}>
                {mode === 'signIn'
                  ? 'WELCOME BACK'
                  : mode === 'signUp'
                    ? 'NEW TO GrAte Apex Hub'
                    : mode === 'checkEmail'
                      ? 'ALMOST THERE'
                      : mode === 'reset'
                        ? 'ACCOUNT RECOVERY'
                        : 'NEW PASSWORD'}
              </Text>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              {mode === 'newPassword' ? (
                passwordUpdated ? (
                  <>
                    <View style={styles.success}>
                      <Icon name="check" size={18} color={colors.successText} strokeWidth={2.6} />
                      <Text style={styles.successText}>
                        Your password has been changed. You can now sign in with your new password.
                      </Text>
                    </View>
                    <Button label="Return to Sign In" size="lg" fullWidth onPress={() => switchMode('signIn')} />
                  </>
                ) : (
                  <>
                    <Field label="New password" styles={styles}>
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New password"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        accessibilityLabel="New password"
                      />
                      {/* One button shows/hides both password boxes. */}
                      <RevealButton shown={showNewPassword} onToggle={() => setShowNewPassword((shown) => !shown)} plural styles={styles} colors={colors} />
                    </Field>

                    <Field label="Confirm new password" styles={styles}>
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onSubmitEditing={updatePassword}
                        placeholder="Type it again"
                        placeholderTextColor={colors.textTertiary}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="go"
                        accessibilityLabel="Confirm new password"
                      />
                    </Field>

                    {error ? <ErrorLine message={error} styles={styles} colors={colors} /> : null}

                    <Button label="Update Password" size="lg" fullWidth loading={loading} disabled={!canUpdatePassword} onPress={updatePassword} style={styles.submit} />
                  </>
                )
              ) : mode === 'signUp' ? (
                <>
                  <Field label="Username" icon="profile" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="e.g. kofi_a"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      textContentType="username"
                      maxLength={20}
                      returnKeyType="next"
                      accessibilityLabel="Username"
                    />
                  </Field>
                  <Text style={styles.hintText}>Shown to other students. 3–20 lowercase letters, numbers or underscores.</Text>

                  <Field label="Your name (optional)" icon="profile" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="e.g. Amara"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="words"
                      autoComplete="name"
                      textContentType="name"
                      maxLength={30}
                      returnKeyType="next"
                      accessibilityLabel="Your name"
                    />
                  </Field>

                  <Field label="Email" icon="mail" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      accessibilityLabel="Email"
                    />
                  </Field>

                  <Field label="Password" icon="key" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={`At least ${MIN_PASSWORD} characters`}
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="next"
                      accessibilityLabel="Password"
                    />
                    <RevealButton shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} plural styles={styles} colors={colors} />
                  </Field>

                  <Field label="Confirm password" styles={styles}>
                    <TextInput
                      style={styles.input}
                      value={signUpConfirm}
                      onChangeText={setSignUpConfirm}
                      onSubmitEditing={signUp}
                      placeholder="Type it again"
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      accessibilityLabel="Confirm password"
                    />
                  </Field>

                  {password !== '' && password.length < MIN_PASSWORD ? (
                    <Text style={styles.hintText}>Use at least {MIN_PASSWORD} characters.</Text>
                  ) : null}

                  <Pressable
                    onPress={() => setAcceptedTerms((accepted) => !accepted)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    accessibilityLabel="I have read and agree to the Terms of Service and Privacy Policy"
                    style={styles.consentRow}
                  >
                    <View style={[styles.consentBox, acceptedTerms && styles.consentBoxChecked]}>
                      {acceptedTerms ? <Icon name="check" size={13} color={colors.onPrimary} strokeWidth={3} /> : null}
                    </View>
                    <Text style={styles.consentCopy}>
                      I agree to the{' '}
                      <Text style={styles.consentLink} onPress={() => router.push('/terms' as Href)}>Terms of Service</Text>
                      {' '}and have read the{' '}
                      <Text style={styles.consentLink} onPress={() => router.push('/privacy' as Href)}>Privacy Policy</Text>.
                    </Text>
                  </Pressable>

                  {error ? <ErrorLine message={error} styles={styles} colors={colors} /> : null}

                  <Button label="Create account" size="lg" fullWidth loading={loading} disabled={!canSignUp} onPress={signUp} style={styles.submit} />

                  <OrDivider styles={styles} />
                  <GoogleButton loading={googleLoading} disabled={loading} onPress={() => void continueWithGoogle()} styles={styles} />

                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Already have an account?</Text>
                    <Interactive onPress={() => switchMode('signIn')} accessibilityLabel="Sign in instead" style={styles.switchLink}>
                      <Text style={styles.linkText}>Sign in</Text>
                    </Interactive>
                  </View>
                </>
              ) : mode === 'checkEmail' ? (
                <>
                  <View style={styles.success}>
                    <Icon name="mail" size={18} color={colors.successText} />
                    <Text style={styles.successText}>
                      We sent a confirmation link to <Text style={styles.strong}>{signedUpEmail}</Text>. Open it to activate your account —
                      it brings you straight back here.
                    </Text>
                  </View>
                  {maybeExisting ? (
                    <Text style={styles.hintText}>If this email already has a GrAte Apex Hub account, just sign in instead.</Text>
                  ) : null}
                  {error ? <ErrorLine message={error} styles={styles} colors={colors} /> : null}
                  <Button label="Back to Sign In" size="lg" fullWidth onPress={() => switchMode('signIn')} style={styles.submit} />
                  <Button
                    label={resendState === 'sent' ? 'Link sent again' : 'Resend the link'}
                    variant="ghost"
                    loading={resendState === 'sending'}
                    disabled={resendState === 'sent'}
                    onPress={() => void resendConfirmation()}
                    style={styles.secondaryAction}
                  />
                </>
              ) : mode === 'reset' ? (
                <>
                  <Field label="Email" icon="mail" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setResetSent(false);
                      }}
                      onSubmitEditing={sendResetEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      accessibilityLabel="Email"
                    />
                  </Field>

                  {resetSent ? (
                    <View style={styles.success}>
                      <Icon name="mail" size={18} color={colors.successText} />
                      <Text style={styles.successText}>Check your email for a link to reset your password.</Text>
                    </View>
                  ) : null}

                  {error ? <ErrorLine message={error} styles={styles} colors={colors} /> : null}

                  <Button
                    label={resetSent ? 'Send Again' : 'Send Reset Link'}
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={!canSendReset}
                    onPress={sendResetEmail}
                    style={styles.submit}
                  />
                  <Button
                    label="Back to Sign In"
                    variant="ghost"
                    icon={<Icon name="chevronLeft" size={16} color={colors.text} />}
                    onPress={() => switchMode('signIn')}
                    style={styles.secondaryAction}
                  />
                </>
              ) : (
                <>
                  <Field label="Username or email" icon="profile" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Your username or you@example.com"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      keyboardType="email-address"
                      textContentType="username"
                      returnKeyType="next"
                      accessibilityLabel="Username or email"
                    />
                  </Field>

                  <Field label="Password" icon="key" styles={styles} colors={colors}>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      onSubmitEditing={signIn}
                      placeholder="Password"
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      returnKeyType="go"
                      accessibilityLabel="Password"
                    />
                    <RevealButton shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} styles={styles} colors={colors} />
                  </Field>

                  <Interactive onPress={() => switchMode('reset')} accessibilityLabel="Forgot password?" style={styles.forgot}>
                    <Text style={styles.linkText}>Forgot password?</Text>
                  </Interactive>

                  {error ? <ErrorLine message={error} styles={styles} colors={colors} /> : null}

                  <Button label="Sign In" size="lg" fullWidth loading={loading} disabled={!canSubmit} onPress={signIn} style={styles.submit} />

                  <OrDivider styles={styles} />
                  <GoogleButton loading={googleLoading} disabled={loading} onPress={() => void continueWithGoogle()} styles={styles} />

                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>New to GrAte Apex Hub?</Text>
                    <Interactive onPress={() => switchMode('signUp')} accessibilityLabel="Create an account" style={styles.switchLink}>
                      <Text style={styles.linkText}>Create an account</Text>
                    </Interactive>
                  </View>
                </>
              )}
            </View>
            <View style={styles.legalRow}>
              <Interactive onPress={() => router.push('/privacy' as Href)} accessibilityLabel="Privacy Policy" style={styles.switchLink}>
                <Text style={styles.legalText}>Privacy Policy</Text>
              </Interactive>
              <Text style={styles.legalText}>·</Text>
              <Interactive onPress={() => router.push('/terms' as Href)} accessibilityLabel="Terms of Service" style={styles.switchLink}>
                <Text style={styles.legalText}>Terms of Service</Text>
              </Interactive>
            </View>
            {!isWide ? <Text style={styles.mobileMotto}>Learn together. You’ve got this.</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// A username that doesn't exist, or a wrong password, gives the same message
// either way, so the sign-in form never reveals which usernames are taken.
function isWrongUsernameOrPassword(code?: string | null) {
  return (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email'
  );
}

async function recordPendingGoogleConsent() {
  try {
    const saved = await AsyncStorage.getItem(PENDING_GOOGLE_CONSENT_KEY);
    if (!saved) return;
    const consent = JSON.parse(saved) as { at?: string; version?: string };
    if (!consent.at || consent.version !== LEGAL_VERSION) return;
    // User data is saved by the new Firebase backend later.
    await AsyncStorage.removeItem(PENDING_GOOGLE_CONSENT_KEY);
  } catch (problem) {
    console.warn('Could not save account legal consent:', problem);
  }
}

type LoginStyles = ReturnType<typeof createStyles>;

// Desktop: the brand side of the split screen, on the shared atmosphere.
function BrandPanel({ styles, colors }: { styles: LoginStyles; colors: ThemeColors }) {
  const points: { icon: IconName; title: string; text: string }[] = [
    { icon: 'learn', title: 'Every course in your class', text: 'Lessons section by section, practice in four question types and spaced review that brings concepts back before you forget.' },
    { icon: 'social', title: 'A community of students', text: 'Stories and posts, profiles, followers, study groups and messages with your classmates.' },
    { icon: 'challenge', title: 'Compete and level up', text: 'Timed Apex Challenges, leagues, achievements, XP and themes you unlock as you grow.' },
  ];
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brandHeader}>
        <LogoMark height={68} />
        <Text style={styles.brandName}>GrAte Apex Hub</Text>
      </View>
      <View style={styles.brandStatement}>
        <View style={styles.brandAccent} />
        <Text style={styles.brandMotto}>Learn together. You’ve got this.</Text>
        <Text style={styles.brandSubjects}>LEARN · CONNECT · RISE TOGETHER</Text>
      </View>
      <View style={styles.points}>
        {points.map((point) => (
          <View key={point.title} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon name={point.icon} size={18} color={colors.accentText} />
            </View>
            <View style={styles.pointText}>
              <Text style={styles.pointTitle}>{point.title}</Text>
              <Text style={styles.pointBody}>{point.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// A labelled input shell: optional leading icon, and room for a trailing control.
function Field({
  label,
  icon,
  styles,
  colors,
  children,
}: {
  label: string;
  icon?: IconName;
  styles: LoginStyles;
  colors?: ThemeColors;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        {icon && colors ? <Icon name={icon} size={18} color={colors.textTertiary} style={styles.inputIcon} /> : null}
        {children}
      </View>
    </View>
  );
}

function RevealButton({
  shown,
  onToggle,
  plural,
  styles,
  colors,
}: {
  shown: boolean;
  onToggle: () => void;
  plural?: boolean;
  styles: LoginStyles;
  colors: ThemeColors;
}) {
  return (
    <Interactive
      onPress={onToggle}
      accessibilityLabel={shown ? (plural ? 'Hide passwords' : 'Hide password') : plural ? 'Show passwords' : 'Show password'}
      style={({ hovered }) => [styles.reveal, hovered && styles.revealHover]}
    >
      <Icon name={shown ? 'eyeOff' : 'eye'} size={18} color={colors.textSecondary} />
      <Text style={styles.revealText}>{shown ? 'Hide' : 'Show'}</Text>
    </Interactive>
  );
}

// "Continue with Google": the standard white button with Google's mark.
function GoogleButton({
  loading,
  disabled,
  onPress,
  styles,
}: {
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  styles: LoginStyles;
}) {
  return (
    <Interactive
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel="Continue with Google"
      style={({ hovered, pressed }) => [styles.google, hovered && styles.googleHover, pressed && styles.googlePressed]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#1F1F1F" />
      ) : (
        <Svg width={18} height={18} viewBox="0 0 48 48" aria-hidden>
          <SvgPath fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
          <SvgPath fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <SvgPath fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <SvgPath fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
        </Svg>
      )}
      <Text style={styles.googleText}>{loading ? 'Opening Google…' : 'Continue with Google'}</Text>
    </Interactive>
  );
}

function OrDivider({ styles }: { styles: LoginStyles }) {
  return (
    <View style={styles.or} aria-hidden>
      <View style={styles.orLine} />
      <Text style={styles.orText}>or</Text>
      <View style={styles.orLine} />
    </View>
  );
}

// Sign-up errors in plain language.
function friendlySignUpError(signUpError: { code?: string | null; message: string }) {
  const text = signUpError.message.toLowerCase();
  if (text.includes('already registered') || text.includes('already exists')) {
    return 'An account with this email already exists. Sign in instead, or reset your password.';
  }
  if (text.includes('password')) return signUpError.message;
  if (text.includes('signups not allowed') || text.includes('signup is disabled')) {
    return 'New accounts are currently closed. Please try again later.';
  }
  if (text.includes('rate limit')) {
    return 'Too many attempts — please wait a few minutes and try again.';
  }
  if (text.includes('invalid') && text.includes('email')) return 'Please enter a valid email address.';
  return `Could not create your account: ${signUpError.message}`;
}

function ErrorLine({ message, styles, colors }: { message: string; styles: LoginStyles; colors: ThemeColors }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Icon name="warning" size={17} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// Reads the details after "?" and "#" in the page address (web only).
function readLinkParams() {
  if (typeof window === 'undefined') return new URLSearchParams();

  const query = window.location.search.replace(/^\?/, '');
  const hash = window.location.hash.replace(/^#/, '');
  return new URLSearchParams(`${query}&${hash}`);
}

// Removes a used/failed reset link's details from the address bar, so
// refreshing the page doesn't show the same error again.
function clearLinkFromAddress() {
  if (typeof window === 'undefined') return;

  window.history.replaceState(window.history.state, '', window.location.pathname);
}

// Turns technical errors into plain language.
function friendlyUpdateError(updateError: { code?: string | null; message: string }) {
  const code = updateError.code ?? '';
  const text = updateError.message.toLowerCase();

  // No reset session: the link expired, was already used, or the page
  // was opened without one.
  if (code === 'session_not_found' || text.includes('session missing')) {
    return EXPIRED_LINK_MESSAGE.replace(' below', ' from the Sign In page');
  }
  if (code === 'same_password') {
    return 'Your new password must be different from your old password.';
  }
  if (code === 'weak_password') {
    return `That password is too weak. ${updateError.message}`;
  }
  return `Could not update your password: ${updateError.message}`;
}

// Turns authentication error messages into plain language.
function friendlyError(message?: string | null, code?: string | null) {
  const text = (message || '').toLowerCase();
  const c = code || '';

  if (
    c === 'auth/invalid-credential' ||
    c === 'auth/wrong-password' ||
    c === 'auth/user-not-found' ||
    text.includes('invalid credential') ||
    text.includes('invalid login credentials') ||
    text.includes('wrong-password') ||
    text.includes('user-not-found')
  ) {
    return 'Incorrect email or password. Please try again or reset your password.';
  }
  if (c === 'auth/email-already-in-use' || text.includes('email already')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (c === 'auth/invalid-email' || text.includes('invalid email') || text.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (c === 'auth/weak-password' || text.includes('weak password') || text.includes('weak-password')) {
    return 'Password is too weak. Please use at least 8 characters.';
  }
  if (c === 'auth/too-many-requests' || text.includes('too many') || text.includes('rate limit')) {
    return 'Too many attempts — please wait a few minutes and try again.';
  }
  if (c === 'auth/network-request-failed' || text.includes('network')) {
    return 'Network error. Please check your internet connection.';
  }
  return message || 'Authentication failed. Please try again.';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Transparent: the shell's atmosphere (auth mood) is the background.
    screen: { flex: 1, backgroundColor: 'transparent' },
    scrollView: { flex: 1 },
    container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 60 },
    containerWide: { paddingHorizontal: 48, paddingVertical: 48 },
    layout: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 22 },
    layoutWide: { maxWidth: 1240, flexDirection: 'row', alignItems: 'center', gap: 64 },

    // Brand (desktop)
    brandPanel: { flex: 1.1, minWidth: 0, gap: 36, justifyContent: 'center' },
    brandHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, alignSelf: 'flex-start' },
    brandName: { fontSize: 26, fontWeight: '800', letterSpacing: 1.4, color: colors.logoLetters },
    brandStatement: { gap: 12 },
    brandAccent: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.accent },
    brandMotto: { ...Type.display, fontSize: 46, lineHeight: 52, color: colors.text, maxWidth: 520 },
    brandSubjects: { ...Type.overline, letterSpacing: 2.2, color: colors.textTertiary },
    points: { gap: 18, maxWidth: 460 },
    point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    pointIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSubtle,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    pointText: { flex: 1, minWidth: 0 },
    pointTitle: { ...Type.headline, color: colors.text },
    pointBody: { fontSize: 13.5, lineHeight: 20, color: colors.textSecondary, marginTop: 2 },

    // Brand (phones)
    mobileBrand: { alignItems: 'flex-start', gap: 10, marginBottom: 4, paddingLeft: 8 },
    mobileMotto: { ...Type.overline, letterSpacing: 1.6, color: colors.textTertiary, textAlign: 'center', marginTop: 18 },

    // Form
    formPanel: { width: '100%' },
    formPanelWide: { width: 440, flexShrink: 0 },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.xl,
      padding: 28,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    eyebrow: { ...Type.overline, color: colors.accentText, marginBottom: 8 },
    title: { ...Type.title1, color: colors.text },
    subtitle: { ...Type.callout, color: colors.textSecondary, marginTop: 4, marginBottom: 22 },
    field: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
    inputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSunken,
      paddingHorizontal: 12,
      gap: 8,
    },
    inputIcon: { marginRight: 2 },
    input: { flex: 1, minWidth: 0, fontSize: 15, color: colors.text, paddingVertical: 12 },
    reveal: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
    revealHover: { backgroundColor: colors.surfaceMuted },
    revealText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    forgot: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 2, marginTop: -4, marginBottom: 8, borderRadius: 6 },
    linkText: { fontSize: 13.5, fontWeight: '700', color: colors.primaryText },
    submit: { marginTop: 8 },
    secondaryAction: { marginTop: 8, alignSelf: 'center' },
    error: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.errorSubtle,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      marginBottom: 8,
    },
    errorText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: colors.text },
    success: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.successSubtle,
      borderWidth: 1,
      borderColor: colors.successBorder,
      marginBottom: 12,
    },
    successText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: colors.text },
    strong: { fontWeight: '800' },
    hintText: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: -4, marginBottom: 10 },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, marginTop: 2 },
    consentBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    consentBoxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    consentCopy: { flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },
    consentLink: { color: colors.primaryText, fontWeight: '700', textDecorationLine: 'underline' },
    or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
    orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    orText: { fontSize: 12, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
    google: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DADCE0',
      paddingHorizontal: 16,
    },
    googleHover: { backgroundColor: '#F7F8FA' },
    googlePressed: { transform: [{ scale: 0.98 }] },
    googleText: { fontSize: 15, fontWeight: '700', color: '#1F1F1F' },
    switchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 },
    switchText: { fontSize: 13.5, color: colors.textSecondary },
    legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 },
    legalText: { fontSize: 12.5, color: colors.textTertiary, textDecorationLine: 'underline' },
    switchLink: { borderRadius: 6, paddingHorizontal: 2, paddingVertical: 2 },
  });
}

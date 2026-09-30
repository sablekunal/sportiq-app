import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

/**
 * Normalizes input phone number to standard E.164 format (e.g., +919876543210).
 */
export function formatToE164(phone: string, countryCode: string = '+91'): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    // Already has leading +, strip spaces/dashes
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  const cleanCountry = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  const countryDigits = cleanCountry.replace(/\D/g, '');

  // If already starts with country digits (e.g., 919876543210), prepend +
  if (digitsOnly.length > 10 && digitsOnly.startsWith(countryDigits)) {
    return `+${digitsOnly}`;
  }

  // Local 10-digit number
  return `${cleanCountry}${digitsOnly}`;
}

/**
 * Validates a phone number according to E.164 standard.
 */
export function validatePhoneNumber(
  phone: string,
  countryCode: string = '+91'
): { valid: boolean; error?: string; formatted?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Please enter a valid mobile number.' };
  }

  const formatted = formatToE164(phone, countryCode);

  // General E.164 pattern: + followed by 8 to 15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(formatted)) {
    return { valid: false, error: 'Invalid international phone number format.' };
  }

  // Specific check for India (+91)
  if (formatted.startsWith('+91')) {
    const nationalNumber = formatted.slice(3);
    if (nationalNumber.length !== 10) {
      return { valid: false, error: 'Indian mobile numbers must be exactly 10 digits.' };
    }
    if (!/^[6-9]/.test(nationalNumber)) {
      return { valid: false, error: 'Indian mobile numbers must begin with 6, 7, 8, or 9.' };
    }
  }

  return { valid: true, formatted };
}

/**
 * Masks phone number for display (e.g., +91 ••••••3210).
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  const clean = phoneNumber.trim();
  if (clean.length <= 6) return clean;
  const start = clean.slice(0, 3);
  const end = clean.slice(-4);
  const maskedMiddle = '•'.repeat(Math.max(4, clean.length - 7));
  return `${start} ${maskedMiddle} ${end}`;
}

/**
 * Maps raw Firebase authentication error codes to concise, friendly user messages.
 */
export function mapAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/operation-not-allowed':
      if (error.message && error.message.toLowerCase().includes('region')) {
        return 'SMS region policy error: Firebase blocked this region. Go to Firebase Console > Authentication > Settings > SMS Regions policy and enable India (+91).';
      }
      return 'Phone authentication is not enabled in Firebase Console. Go to Authentication > Sign-in method > Phone and ensure the "Enable" switch is toggled ON, then click Save.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized. Add your domain/localhost under Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/invalid-app-credential':
      return 'Firebase app verification failed. Please check Phone sign-in configuration in the Firebase Console.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP. Please check the code and try again.';
    case 'auth/code-expired':
      return 'The OTP has expired. Please click Resend OTP to request a fresh code.';
    case 'auth/invalid-phone-number':
      return 'Invalid mobile number. Please check the digits and try again.';
    case 'auth/missing-verification-code':
      return 'Please enter the 6-digit OTP code.';
    case 'auth/too-many-requests':
      return 'Too many attempts. For security reasons, please wait a minute before trying again.';
    case 'auth/captcha-check-failed':
      return 'Security verification failed. Please refresh the page and try again.';
    case 'auth/quota-exceeded':
      return 'SMS message quota exceeded for today. Please contact support.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact the administrator.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      if (error.message && !error.message.includes('auth/')) {
        return error.message;
      }
      return code ? `Authentication failed (${code}). Please check your Firebase Console settings.` : 'Authentication failed. Please try again.';
  }
}

/**
 * Initializes the Firebase RecaptchaVerifier singleton, cleaning up previous instances if necessary.
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  // If an instance exists, clear it first to avoid duplicate widget errors
  clearRecaptcha();

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  recaptchaVerifierInstance = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // Invisible reCAPTCHA automatically solved
    },
    'expired-callback': () => {
      clearRecaptcha();
    },
  });

  return recaptchaVerifierInstance;
}

/**
 * Clears and resets the active RecaptchaVerifier instance.
 */
export function clearRecaptcha(): void {
  if (recaptchaVerifierInstance) {
    try {
      recaptchaVerifierInstance.clear();
    } catch {
      // Ignore cleanup error if already detached
    }
    recaptchaVerifierInstance = null;
  }
  const container = document.getElementById('recaptcha-container');
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * Sends phone OTP via Firebase Authentication.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

/**
 * Fetches user profile from Firestore users/{uid}.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userDocRef);
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as UserProfile;
}

/**
 * Creates or initializes user profile in Firestore users/{uid}.
 */
export async function createUserProfile(
  user: FirebaseUser,
  displayName: string,
  organization: string
): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: user.uid,
    phoneNumber: user.phoneNumber || '',
    displayName: displayName.trim(),
    organization: organization.trim(),
    role: 'ORGANIZER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, profile);
  return profile;
}

/**
 * Signs out the current user session from Firebase Authentication.
 */
export async function signOutUser(): Promise<void> {
  clearRecaptcha();
  await firebaseSignOut(auth);
}

import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';

export type AuthStep = 'PHONE' | 'OTP' | 'PROFILE' | 'AUTHENTICATED';

export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  authStep: AuthStep;
  error: string | null;
  phoneNumberInput: string;
  confirmationPhoneNumber: string | null;
  otpCountdown: number;
}

export interface AuthContextType extends AuthState {
  sendOtp: (phone: string, countryCode?: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  resendOtp: () => Promise<boolean>;
  saveProfile: (displayName: string, organization: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetOtpFlow: () => void;
  clearError: () => void;
}

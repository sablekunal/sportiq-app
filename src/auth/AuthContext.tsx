import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { AuthContextType, AuthStep } from './types';
import {
  validatePhoneNumber,
  setupRecaptcha,
  clearRecaptcha,
  sendPhoneOtp,
  getUserProfile,
  createUserProfile,
  signOutUser,
  mapAuthError,
} from './authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<AuthStep>('PHONE');
  const [error, setError] = useState<string | null>(null);
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>('');
  const [confirmationPhoneNumber, setConfirmationPhoneNumber] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const countdownTimerRef = useRef<any>(null);

  const startCountdown = (seconds: number = 30) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setOtpCountdown(seconds);
    countdownTimerRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      clearRecaptcha();
    };
  }, []);

  // Subscribe to Firebase Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          setIsAuthenticated(true);

          // Check if profile exists in Firestore users/{uid}
          const userProfile = await getUserProfile(firebaseUser.uid);
          if (userProfile) {
            setProfile(userProfile);
            setIsProfileComplete(true);
            setAuthStep('AUTHENTICATED');
          } else {
            // New user without profile
            setProfile(null);
            setIsProfileComplete(false);
            setAuthStep('PROFILE');
          }
        } else {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          setIsProfileComplete(false);
          setAuthStep('PHONE');
        }
      } catch (err: any) {
        console.error('Error resolving user profile:', err);
        setError(mapAuthError(err));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const sendOtp = async (phone: string, countryCode: string = '+91'): Promise<boolean> => {
    setError(null);
    const { valid, error: validationError, formatted } = validatePhoneNumber(phone, countryCode);
    if (!valid || !formatted) {
      setError(validationError || 'Invalid phone number format.');
      return false;
    }

    try {
      setPhoneNumberInput(phone);
      // Ensure recaptcha container is prepared
      const verifier = setupRecaptcha('recaptcha-container');
      const confirmationResult = await sendPhoneOtp(formatted, verifier);
      confirmationResultRef.current = confirmationResult;
      setConfirmationPhoneNumber(formatted);
      setAuthStep('OTP');
      startCountdown(30);
      return true;
    } catch (err: any) {
      clearRecaptcha();
      setError(mapAuthError(err));
      return false;
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    setError(null);
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter a valid 6-digit numeric OTP.');
      return false;
    }

    if (!confirmationResultRef.current) {
      setError('Verification session expired. Please request a new OTP.');
      setAuthStep('PHONE');
      return false;
    }

    try {
      await confirmationResultRef.current.confirm(trimmedCode);
      // onAuthStateChanged will handle profile lookup and transition to AUTHENTICATED or PROFILE
      return true;
    } catch (err: any) {
      setError(mapAuthError(err));
      return false;
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (otpCountdown > 0 || !confirmationPhoneNumber) {
      return false;
    }
    setError(null);
    try {
      const verifier = setupRecaptcha('recaptcha-container');
      const confirmationResult = await sendPhoneOtp(confirmationPhoneNumber, verifier);
      confirmationResultRef.current = confirmationResult;
      startCountdown(30);
      return true;
    } catch (err: any) {
      clearRecaptcha();
      setError(mapAuthError(err));
      return false;
    }
  };

  const saveProfile = async (displayName: string, organization: string): Promise<void> => {
    if (!user) {
      throw new Error('No authenticated user found.');
    }
    if (!displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setError(null);
    try {
      const newProfile = await createUserProfile(user, displayName, organization);
      setProfile(newProfile);
      setIsProfileComplete(true);
      setAuthStep('AUTHENTICATED');
    } catch (err: any) {
      setError(mapAuthError(err));
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    setError(null);
    try {
      confirmationResultRef.current = null;
      setConfirmationPhoneNumber(null);
      setPhoneNumberInput('');
      setAuthStep('PHONE');
      await signOutUser();
    } catch (err: any) {
      setError(mapAuthError(err));
    }
  };

  const resetOtpFlow = () => {
    confirmationResultRef.current = null;
    clearRecaptcha();
    setError(null);
    setAuthStep('PHONE');
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAuthenticated,
    isProfileComplete,
    authStep,
    error,
    phoneNumberInput,
    confirmationPhoneNumber,
    otpCountdown,
    sendOtp,
    verifyOtp,
    resendOtp,
    saveProfile,
    signOut,
    resetOtpFlow,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { maskPhoneNumber } from '../../auth/authService';
import { useTournament } from '../../context/TournamentContext';
import {
  Shield,
  Smartphone,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Building,
  UserCheck,
  Sparkles,
  Globe,
  CheckCircle2,
} from 'lucide-react';

import { soundEffects } from '../../engines/audioEngine';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'US / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

export const OrganizerAuthPage: React.FC = () => {
  const {
    authStep,
    error,
    clearError,
    sendOtp,
    verifyOtp,
    resendOtp,
    saveProfile,
    resetOtpFlow,
    confirmationPhoneNumber,
    otpCountdown,
    user,
  } = useAuth();

  const { setViewMode } = useTournament();

  // Step 1: Phone State
  const [selectedCountry, setSelectedCountry] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Step 2: OTP State (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Profile State
  const [displayName, setDisplayName] = useState('');
  const [organization, setOrganization] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (authStep === 'OTP' && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [authStep]);

  // Handle Phone Submit
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSendingOtp(true);
    try {
      const success = await sendOtp(phoneNumber, selectedCountry);
      if (success) {
        soundEffects.playWhistle();
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle individual OTP digit change
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric character
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto advance to next input if not at the end
    if (index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste into OTP inputs
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);

    // Focus appropriate box
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Handle OTP Submit
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) return;

    clearError();
    setIsVerifyingOtp(true);
    try {
      const success = await verifyOtp(fullCode);
      if (success) {
        soundEffects.playCelebration();
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Profile Submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    clearError();
    setIsSavingProfile(true);
    try {
      await saveProfile(displayName, organization);
      soundEffects.playCelebration();
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-sport-midnight flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8 selection:bg-sport-orange selection:text-white relative overflow-hidden pb-safe pt-safe">
      {/* Background Ambience Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Persistent Invisible reCAPTCHA Container */}
      <div id="recaptcha-container"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-glow-orange mb-3">
            <img src="/assests/logo-small.png" alt="SportIQ" className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sport<span className="text-sport-orange">IQ</span>
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-sport-orange border border-slate-700">
              ORGANIZER PORTAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Smarter Tournaments. Better Sports.</p>
        </div>

        {/* Card Container */}
        <div className="bg-sport-navy border border-slate-800 py-6 sm:py-8 px-4 xs:px-6 shadow-2xl rounded-2xl sm:rounded-3xl sm:px-10 relative backdrop-blur-xl">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
              <button
                type="button"
                onClick={clearError}
                className="text-red-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: ENTER MOBILE NUMBER */}
          {authStep === 'PHONE' && (
            <div>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-sport-orange flex items-center justify-center mx-auto mb-2.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Organizer Login</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your mobile number to receive a secure one-time passcode (OTP).
                </p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700 focus-within:border-sport-orange focus-within:ring-1 focus-within:ring-sport-orange transition overflow-hidden">
                    {/* Country Code Select */}
                    <div className="relative border-r border-slate-700 bg-slate-800/60 px-2.5 xs:px-3 py-2.5 flex items-center shrink-0">
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-4 appearance-none"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-1 text-slate-400 text-[10px]">▼</span>
                    </div>

                    {/* Number Input */}
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={15}
                      required
                      autoFocus
                      className="w-full bg-transparent px-3 py-2.5 text-xs xs:text-sm font-semibold text-white placeholder-slate-500 outline-none tracking-wider min-w-0"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Default: India (+91). Standard SMS verification applies.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp || !phoneNumber.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-[0.99]"
                >
                  {isSendingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: VERIFY OTP */}
          {authStep === 'OTP' && (
            <div>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-sport-orange flex items-center justify-center mx-auto mb-2.5">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Verify Your Number</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter the 6-digit OTP sent to{' '}
                  <span className="font-bold text-sport-orange">
                    {maskPhoneNumber(confirmationPhoneNumber || phoneNumber)}
                  </span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {/* 6 Individual Digit Inputs */}
                <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-9 h-11 xs:w-10 xs:h-12 sm:w-11 sm:h-13 text-center text-base xs:text-lg sm:text-xl font-black bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-sport-orange focus:ring-1 focus:ring-sport-orange outline-none transition shrink-0"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-[0.99]"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Verify & Proceed</span>
                    </>
                  )}
                </button>

                {/* Resend and Change Number Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={resetOtpFlow}
                    className="flex items-center gap-1 hover:text-white transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Number</span>
                  </button>

                  <button
                    type="button"
                    disabled={otpCountdown > 0}
                    onClick={() => resendOtp()}
                    className={`font-semibold cursor-pointer transition ${
                      otpCountdown > 0
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-sport-orange hover:underline'
                    }`}
                  >
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SETUP PROFILE (New User) */}
          {authStep === 'PROFILE' && (
            <div>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-sport-orange flex items-center justify-center mx-auto mb-2.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Complete Profile</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Welcome to SportIQ! Set up your organizer profile to start managing tournaments.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {/* Verified Phone Pill */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                  <span className="text-slate-400">Verified Mobile:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {user?.phoneNumber || confirmationPhoneNumber}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Full Name <span className="text-sport-orange">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Kunal Sable"
                    required
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sport-orange focus:ring-1 focus:ring-sport-orange outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Organization / College / Sports Club
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Throwball Federation of Karnataka"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sport-orange focus:ring-1 focus:ring-sport-orange outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile || !displayName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-[0.99] mt-2"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch Organizer Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Spectator Switch Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => setViewMode('public')}
              className="text-xs text-slate-400 hover:text-sport-orange transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Spectator / Public Viewer Mode (No Login)</span>
            </button>
          </div>
        </div>

        {/* Security Assurance Badge */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] mt-6">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected with Firebase Authentication & Firestore Security Rules</span>
        </div>
      </div>
    </div>
  );
};

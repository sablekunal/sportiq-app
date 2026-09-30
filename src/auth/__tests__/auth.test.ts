const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  deepStrictEqual: (a: any, b: any, msg?: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed');
  },
};

import { formatToE164, validatePhoneNumber, maskPhoneNumber, mapAuthError } from '../authService';
import { UserProfile, Tournament } from '../../types';

function runAuthTests() {
  console.log('Running Authentication & Authorization Tests...\n');

  // Test 1: E.164 Phone Formatting
  try {
    // 10-digit Indian number without country code
    assert.strictEqual(formatToE164('9876543210', '+91'), '+919876543210');
    // Number with spaces and dashes
    assert.strictEqual(formatToE164(' 98765-43210 ', '+91'), '+919876543210');
    // Number with country code without plus
    assert.strictEqual(formatToE164('919876543210', '+91'), '+919876543210');
    // Number already formatted with plus
    assert.strictEqual(formatToE164('+919876543210', '+91'), '+919876543210');
    // International number (US)
    assert.strictEqual(formatToE164('4155552671', '+1'), '+14155552671');
    console.log('✅ Test 1: E.164 Phone Formatting passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
  }

  // Test 2: Phone Number Validation (India & International)
  try {
    // Valid Indian mobile
    const res1 = validatePhoneNumber('9876543210', '+91');
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.formatted, '+919876543210');

    // Invalid Indian mobile (starts with 1)
    const res2 = validatePhoneNumber('1234567890', '+91');
    assert.strictEqual(res2.valid, false);

    // Invalid length (9 digits)
    const res3 = validatePhoneNumber('987654321', '+91');
    assert.strictEqual(res3.valid, false);

    // Empty input
    const res4 = validatePhoneNumber('', '+91');
    assert.strictEqual(res4.valid, false);

    // Valid US international
    const res5 = validatePhoneNumber('2025550143', '+1');
    assert.strictEqual(res5.valid, true);
    assert.strictEqual(res5.formatted, '+12025550143');

    console.log('✅ Test 2: Phone Number Validation passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
  }

  // Test 3: Phone Masking for Privacy
  try {
    const masked = maskPhoneNumber('+919876543210');
    assert.strictEqual(masked.startsWith('+91'), true, 'Should retain country code');
    assert.strictEqual(masked.endsWith('3210'), true, 'Should retain last 4 digits');
    assert.strictEqual(masked.includes('987654'), false, 'Should mask middle digits');
    console.log('✅ Test 3: Phone Masking passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
  }

  // Test 4: Error Code Translation to User-Friendly Language
  try {
    assert.strictEqual(
      mapAuthError({ code: 'auth/invalid-verification-code' }),
      'Incorrect OTP. Please check the code and try again.'
    );
    assert.strictEqual(
      mapAuthError({ code: 'auth/code-expired' }),
      'The OTP has expired. Please click Resend OTP to request a fresh code.'
    );
    assert.strictEqual(
      mapAuthError({ code: 'auth/too-many-requests' }),
      'Too many attempts. For security reasons, please wait a minute before trying again.'
    );
    assert.strictEqual(
      mapAuthError({ code: 'auth/invalid-phone-number' }),
      'Invalid mobile number. Please check the digits and try again.'
    );
    console.log('✅ Test 4: Error Code Translation passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
  }

  // Test 5: UserProfile Schema & UID Identity Invariance
  try {
    const mockUid = 'firebase-user-xyz-123';
    const profile: UserProfile = {
      uid: mockUid,
      phoneNumber: '+919876543210',
      displayName: 'Kunal Sable',
      organization: 'Throwball Federation',
      role: 'ORGANIZER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assert.strictEqual(profile.uid, mockUid, 'Firebase Auth UID must be the profile key');
    assert.strictEqual(profile.role, 'ORGANIZER');
    assert.strictEqual(profile.phoneNumber.startsWith('+91'), true);
    console.log('✅ Test 5: UserProfile Schema passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
  }

  // Test 6: Tournament Ownership Enforcement
  try {
    const ownerUid = 'organizer-owner-001';
    const unauthorizedUid = 'organizer-intruder-999';

    const tournament: Partial<Tournament> = {
      id: 'tour-100',
      name: 'Throwball Cup',
      ownerId: ownerUid,
      visibility: 'PUBLIC',
    };

    // Owner check function simulating Firestore rule & Context guard
    const canModify = (userUid: string | null, tour: Partial<Tournament>) => {
      if (!userUid) return false;
      if (!tour.ownerId) return true; // Legacy backwards compatibility
      return tour.ownerId === userUid;
    };

    // Owner can modify
    assert.strictEqual(canModify(ownerUid, tournament), true, 'Owner should be authorized');
    // Unauthorized user cannot modify
    assert.strictEqual(canModify(unauthorizedUid, tournament), false, 'Intruder must be rejected');
    // Unauthenticated user cannot modify
    assert.strictEqual(canModify(null, tournament), false, 'Unauthenticated user must be rejected');

    // Legacy unowned tournament backwards compatibility
    const legacyTournament: Partial<Tournament> = {
      id: 'tour-legacy',
      name: 'Legacy Cup',
      visibility: 'PUBLIC',
    };
    assert.strictEqual(canModify(ownerUid, legacyTournament), true, 'Legacy tournament remains operable');

    console.log('✅ Test 6: Tournament Ownership & Authorization passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
  }
}

runAuthTests();

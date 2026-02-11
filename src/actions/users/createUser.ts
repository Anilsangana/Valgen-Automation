import { Page } from 'playwright';
import { automationEvents } from '../../core/browser';
import { AdministrationPage } from '../../pages/administrationPage';
import { login } from '../../core/login';
import {
  UserFormData,
  fillUserCreationForm,
  navigateToUserCreateForm
} from './userFormFill';
import {
  completeUserSignup,
  logoutAndNavigateToSignup
} from './userSignup';
import { activateUser } from './userActivation';
import {
  verifyUserLogin,
  logoutAfterVerification
} from './userVerification';
import {
  DuplicateStrategy,
  checkForDuplicateOrSuccess,
  handleDuplicatePopup,
  retryWithModifiedCredentials
} from './duplicateHandling';
import {
  submitUserCreationForm,
  handleSuccessPopup
} from './popupHandlers';

export type CreateUserOptions = {
  duplicateStrategy?: DuplicateStrategy;
};

export interface UserCreationResult {
  email: string;
  username?: string;
  status: string;
  reason?: string;
  error?: string;
  loginVerified?: boolean;
  loginError?: string;
  createdAs?: string;
  original?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Main function to create users with complete workflow:
 * 1. Fill admin form
 * 2. Handle duplicates
 * 3. Complete signup
 * 4. Admin activation
 * 5. Verify login
 */
export async function createUsers(
  page: Page,
  baseUrl: string,
  adminUsername: string,
  adminPassword: string,
  users: Array<UserFormData>,
  options: CreateUserOptions = {}
): Promise<UserCreationResult[]> {
  const results: UserCreationResult[] = [];
  const admin = new AdministrationPage(page);
  const strategy = options.duplicateStrategy ?? 'skip';

  for (const u of users) {
    try {
      automationEvents.emit('log', `Processing user: ${u.Email}`);

      // ===================== NAVIGATION =====================
      await admin.navigateToUserCreate();
      const frame = await navigateToUserCreateForm(page);

      // ===================== FORM FILLING =====================
      await fillUserCreationForm(page, frame, u);

      // ===================== SUBMIT =====================
      await submitUserCreationForm(page, frame, u.Email);

      // ===================== POPUP DETECTION =====================
      const popupResult = await checkForDuplicateOrSuccess(page, frame, u.Email);

      // ===================== HANDLE DUPLICATE =====================
      if (popupResult.isDuplicate) {
        const duplicateResult = await handleDuplicateUser(
          page,
          frame,
          baseUrl,
          adminUsername,
          adminPassword,
          admin,
          u,
          strategy,
          popupResult.message || ''
        );

        results.push(duplicateResult);

        if (strategy === 'stop' || duplicateResult.status === 'skipped') {
          if (strategy === 'stop') break;
          continue;
        }
        continue;
      }

      // ===================== HANDLE SUCCESS =====================
      if (popupResult.isSuccess) {
        await handleSuccessPopup(page, frame, u.Email);

        const successResult = await handleSuccessfulUserCreation(
          page,
          baseUrl,
          adminUsername,
          adminPassword,
          admin,
          u
        );

        results.push(successResult);
        continue;
      }

      // ===================== NO POPUP DETECTED =====================
      automationEvents.emit('error', `No popup detected for user: ${u.Email}`);
      results.push({
        email: u.Email,
        status: 'error',
        message: popupResult.message || 'No success or duplicate popup detected'
      });

    } catch (err) {
      automationEvents.emit('error', `createUsers error for ${u.Email}: ${String(err)}`);
      results.push({
        email: u.Email,
        status: 'error',
        message: String(err)
      });
    }
  }

  return results;
}

/**
 * Handle duplicate user scenario based on strategy
 */
async function handleDuplicateUser(
  page: Page,
  frame: any,
  baseUrl: string,
  adminUsername: string,
  adminPassword: string,
  admin: AdministrationPage,
  user: UserFormData,
  strategy: DuplicateStrategy,
  errorMessage: string
): Promise<UserCreationResult> {
  automationEvents.emit('error', `Duplicate user detected: ${errorMessage}`);
  await handleDuplicatePopup(frame);

  if (strategy === 'stop') {
    return {
      email: user.Email,
      status: 'failed',
      reason: errorMessage
    };
  }

  if (strategy === 'append') {
    const { newUser, newEmail } = await retryWithModifiedCredentials(page, frame, user);

    // Complete the full workflow for the modified user
    await logoutAndNavigateToSignup(page, newUser);

    const modifiedUser = { ...user, UserName: newUser, Email: newEmail };
    const signupResult = await completeUserSignup(page, modifiedUser);

    if (!signupResult.success) {
      return {
        email: user.Email,
        username: newUser,
        status: 'signup-failed',
        error: signupResult.message
      };
    }

    // Admin login and activate
    const adminLoginResult = await login(page, baseUrl, adminUsername, adminPassword);
    if (!adminLoginResult.success) {
      return {
        email: user.Email,
        username: newUser,
        status: 'signup-complete-but-admin-login-failed',
        error: adminLoginResult.message
      };
    }

    const activationResult = await activateUser(page, admin, newUser);
    if (!activationResult.success) {
      return {
        email: user.Email,
        username: newUser,
        status: 'activation-failed',
        error: activationResult.message
      };
    }

    return {
      email: newEmail,
      original: user.Email,
      createdAs: newEmail,
      username: newUser,
      status: 'created-appended'
    };
  }

  // Default: skip
  return {
    email: user.Email,
    status: 'skipped',
    reason: errorMessage
  };
}

/**
 * Handle successful user creation - complete signup, activation, and verification
 */
async function handleSuccessfulUserCreation(
  page: Page,
  baseUrl: string,
  adminUsername: string,
  adminPassword: string,
  admin: AdministrationPage,
  user: UserFormData
): Promise<UserCreationResult> {
  // ===================== LOGOUT AND START SIGNUP =====================
  await logoutAndNavigateToSignup(page, user.UserName);

  // ===================== COMPLETE SIGNUP PROCESS =====================
  const signupResult = await completeUserSignup(page, user);

  if (!signupResult.success) {
    return {
      email: user.Email,
      username: user.UserName,
      status: 'signup-failed',
      error: signupResult.message
    };
  }

  // ===================== ADMIN LOGIN TO APPROVE USER =====================
  automationEvents.emit('log', `Starting admin login to approve user: ${user.UserName}`);
  const adminLoginResult = await login(page, baseUrl, adminUsername, adminPassword);

  if (!adminLoginResult.success) {
    automationEvents.emit('error', `Admin login failed for approving user ${user.UserName}: ${adminLoginResult.message}`);
    return {
      email: user.Email,
      username: user.UserName,
      status: 'signup-complete-but-admin-login-failed',
      error: adminLoginResult.message
    };
  }

  automationEvents.emit('log', `✓ Admin logged in successfully, proceeding to approve user: ${user.UserName}`);
  await page.waitForLoadState('networkidle');

  // ===================== USER ACTIVATION PROCESS =====================
  const activationResult = await activateUser(page, admin, user.UserName);

  if (!activationResult.success) {
    return {
      email: user.Email,
      username: user.UserName,
      status: 'activation-failed',
      error: activationResult.message
    };
  }

  // ===================== VERIFY NEW USER LOGIN =====================
  const verificationResult = await verifyUserLogin(page, baseUrl, user.UserName, user.Password);

  if (verificationResult.loginVerified) {
    // User successfully logged in, now logout
    await logoutAfterVerification(page);
    return {
      email: user.Email,
      username: user.UserName,
      status: 'created-activated-and-verified',
      loginVerified: true,
      timestamp: new Date().toISOString()
    };
  } else {
    // Login failed - user is already on login page, no need to logout
    automationEvents.emit('log', `User ${user.UserName} login verification failed, user is already logged out`);
    return {
      email: user.Email,
      username: user.UserName,
      status: 'activated-but-login-failed',
      loginVerified: false,
      loginError: verificationResult.message
    };
  }
}
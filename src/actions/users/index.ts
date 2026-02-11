// Main user management exports
export { createUsers } from './createUser';
export type { CreateUserOptions, UserCreationResult } from './createUser';

// User form operations
export { fillUserCreationForm, navigateToUserCreateForm } from './userFormFill';
export type { UserFormData } from './userFormFill';

// User signup
export { completeUserSignup, logoutAndNavigateToSignup } from './userSignup';

// User activation
export { activateUser } from './userActivation';

// User deactivation (NEW)
export { deactivateUser } from './userDeactivation';
export { deactivateUsers } from './deactivateUsers';
export type { DeactivateUsersOptions, DeactivateUserResult } from './deactivateUsers';

// User verification
export { verifyUserLogin, logoutAfterVerification } from './userVerification';

// Duplicate handling
export {
    checkForDuplicateOrSuccess,
    handleDuplicatePopup,
    generateModifiedUser,
    retryWithModifiedCredentials
} from './duplicateHandling';
export type { DuplicateStrategy, DuplicateCheckResult } from './duplicateHandling';

// Popup handlers
export { submitUserCreationForm, handleSuccessPopup } from './popupHandlers';

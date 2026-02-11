# User Management Module

This module handles complete user lifecycle management including creation, activation, deactivation, and verification.

## 📁 File Structure

```
src/actions/users/
├── index.ts                  # Central export file for all user functions
├── createUser.ts            # Main orchestration for user creation workflow
├── userFormFill.ts          # Admin panel user form filling
├── userSignup.ts            # User signup process (steps 1 & 2)
├── userActivation.ts        # Admin user activation/approval
├── userDeactivation.ts      # User deactivation (single user)
├── deactivateUsers.ts       # Batch user deactivation
├── userVerification.ts      # Verify user can login after creation
├── duplicateHandling.ts     # Handle duplicate user scenarios
└── popupHandlers.ts         # Form submission and popup handling
```

## 🚀 Quick Start

### Creating Users

```typescript
import { createUsers } from './actions/users';
import { Page } from 'playwright';

const users = [
  {
    FirstName: 'John',
    LastName: 'Doe',
    UserName: 'johndoe',
    Email: 'john.doe@example.com',
    Password: 'SecurePass123!',
    Role: 'User',
    Department: 'Engineering',
    Comments: 'Test user'
  }
];

const results = await createUsers(
  page,
  baseUrl,
  'admin',
  'adminPassword',
  users,
  { duplicateStrategy: 'skip' } // or 'append' or 'stop'
);
```

### Deactivating a Single User

```typescript
import { deactivateUser } from './actions/users';
import { AdministrationPage } from './pages/administrationPage';

const admin = new AdministrationPage(page);
const result = await deactivateUser(page, admin, 'johndoe');

if (result.success) {
  console.log('User deactivated successfully');
}
```

### Deactivating Multiple Users

```typescript
import { deactivateUsers } from './actions/users';

const usernames = ['johndoe', 'janedoe', 'testuser'];

const results = await deactivateUsers(
  page,
  baseUrl,
  'admin',
  'adminPassword',
  usernames,
  { continueOnError: true } // Continue even if one fails
);

// Check results
results.forEach(result => {
  console.log(`${result.username}: ${result.status}`);
});
```

## 📋 Module Details

### 1. **createUser.ts** - Main Orchestration
- **Function**: `createUsers()`
- **Purpose**: Orchestrates the complete user creation workflow
- **Workflow**:
  1. Navigate to user creation form
  2. Fill user details
  3. Submit form
  4. Handle duplicate/success popup
  5. Complete signup process
  6. Admin activates user
  7. Verify user can login
- **Options**:
  - `duplicateStrategy`: `'skip'` | `'append'` | `'stop'`
    - `skip`: Skip duplicate users (default)
    - `append`: Append timestamp to username/email and retry
    - `stop`: Stop entire process on first duplicate

### 2. **userFormFill.ts** - Form Filling
- **Functions**:
  - `fillUserCreationForm()`: Fill the admin user creation form
  - `navigateToUserCreateForm()`: Navigate to form and return frame locator
- **Purpose**: Abstract all form field interactions
- **Locators Used**: All original locators preserved (`#ddlRole`, `#txtFirstName`, etc.)

### 3. **userSignup.ts** - Signup Process
- **Functions**:
  - `completeUserSignup()`: Complete both steps of signup
  - `logoutAndNavigateToSignup()`: Logout and go to signup page
- **Purpose**: Handle the user's self-registration process
- **Steps**:
  - Step 1: Username and password
  - Step 2: Personal details (phone, address, re-enter password)

### 4. **userActivation.ts** - Activation
- **Function**: `activateUser()`
- **Purpose**: Admin approves/activates newly signed-up users
- **Process**:
  1. Navigate to User Management
  2. Click "Activate User" tab
  3. Find user in table
  4. Check activation checkbox
  5. Submit and confirm

### 5. **userDeactivation.ts** - Single Deactivation ⭐ NEW
- **Function**: `deactivateUser()`
- **Purpose**: Deactivate a single user account
- **Process**:
  1. Navigate to User Management
  2. Click "Deactivate User" tab
  3. Find user in table
  4. Check deactivation checkbox
  5. Submit and confirm
- **Locators Used**: Same pattern as activation (preserved from original)

### 6. **deactivateUsers.ts** - Batch Deactivation ⭐ NEW
- **Function**: `deactivateUsers()`
- **Purpose**: Deactivate multiple users in one operation
- **Options**:
  - `continueOnError`: Continue processing if one user fails (default: `true`)
- **Features**:
  - Automatic admin login
  - Error handling per user
  - Summary statistics

### 7. **userVerification.ts** - Login Verification
- **Functions**:
  - `verifyUserLogin()`: Verify user can login
  - `logoutAfterVerification()`: Clean logout after verification
- **Purpose**: Ensure newly created user can successfully login

### 8. **duplicateHandling.ts** - Duplicate Management
- **Functions**:
  - `checkForDuplicateOrSuccess()`: Detect popup type
  - `handleDuplicatePopup()`: Click OK on duplicate popup
  - `generateModifiedUser()`: Generate username/email with timestamp
  - `retryWithModifiedCredentials()`: Retry with modified credentials
- **Purpose**: Handle duplicate user scenarios intelligently

### 9. **popupHandlers.ts** - Popup Interactions
- **Functions**:
  - `submitUserCreationForm()`: Submit the form
  - `handleSuccessPopup()`: Handle success confirmation
- **Purpose**: Centralize popup/modal interactions

## 🔧 All Locators Preserved

**No locators or waits were changed** during refactoring. All original selectors are preserved:

### Form Fields
- `#ddlRole` - Role dropdown
- `#ddlDepartment` - Department dropdown
- `#txtFirstName` - First name
- `#txtLastName` - Last name
- `#txtUserName` - Username
- `#txtEmail` - Email
- `#txtREEmail` - Re-enter email
- `#txtPwd` - Password
- `#txtRPwd` - Re-enter password
- `#txtComments` - Comments

### Popups
- `#val1_lblErrorAlert` - Duplicate error popup
- `#val1_lblCM` - Success message
- `#val1_btnerrorok` - Duplicate OK button
- `#btnMessageOk` - Success OK button

### Activation/Deactivation
- `#lblActivateUser` - Activate tab
- `#lblDeactivateUser` - Deactivate tab
- `#grvADS` - User table
- `#btnAdsSubmit` - Submit button

### Waits
All `waitForTimeout`, `waitForLoadState`, and `waitForPostback` calls are preserved.

## 📊 Return Types

### UserCreationResult
```typescript
{
  email: string;
  username?: string;
  status: 'created-activated-and-verified' 
        | 'activated-but-login-failed' 
        | 'signup-complete-but-admin-login-failed'
        | 'signup-failed'
        | 'activation-failed'
        | 'created-appended'
        | 'skipped'
        | 'failed'
        | 'error';
  reason?: string;
  error?: string;
  loginVerified?: boolean;
  loginError?: string;
  createdAs?: string;  // For appended users
  original?: string;   // Original email for appended users
  message?: string;
}
```

### DeactivateUserResult
```typescript
{
  username: string;
  status: 'deactivated' | 'failed' | 'error';
  message?: string;
}
```

## 🎯 Benefits of This Refactoring

1. **Modularity**: Each file has a single, clear responsibility
2. **Reusability**: Functions can be used independently
3. **Maintainability**: Easy to locate and fix bugs
4. **Testability**: Smaller functions are easier to unit test
5. **Readability**: Clear function names and structure
6. **Extensibility**: Easy to add new features (e.g., deactivation)
7. **Type Safety**: Proper TypeScript interfaces throughout

## 🔄 Migration Guide

### Before (Old Code)
```typescript
import { createUsers } from './actions/users/createUser';
```

### After (New Code)
```typescript
// Still works the same way!
import { createUsers } from './actions/users';

// But now you can also use individual functions:
import { 
  activateUser, 
  deactivateUser, 
  completeUserSignup 
} from './actions/users';
```

## ⚠️ Important Notes

1. **No Breaking Changes**: The main `createUsers()` function signature remains the same
2. **All Original Behavior Preserved**: Same locators, waits, and logic flow
3. **New Feature Added**: User deactivation functionality is now available
4. **Backward Compatible**: Existing code using `createUsers()` will work without changes

## 📝 Example: Complete User Lifecycle

```typescript
import { 
  createUsers, 
  deactivateUser 
} from './actions/users';
import { AdministrationPage } from './pages/administrationPage';

// 1. Create user
const results = await createUsers(page, baseUrl, 'admin', 'pass', [{
  FirstName: 'John',
  LastName: 'Doe',
  UserName: 'johndoe',
  Email: 'john@example.com',
  Password: 'Pass123!',
  Role: 'User'
}]);

// 2. Use the account
// ... user performs tasks ...

// 3. Deactivate when done
const admin = new AdministrationPage(page);
await deactivateUser(page, admin, 'johndoe');
```

## 🧪 Testing Individual Components

Each module can now be tested independently:

```typescript
// Test form filling only
import { fillUserCreationForm } from './actions/users';

// Test signup only
import { completeUserSignup } from './actions/users';

// Test activation only
import { activateUser } from './actions/users';
```

## 📞 Support

For issues or questions about this refactored structure, refer to:
- Individual file JSDoc comments
- Type definitions in each module
- This README

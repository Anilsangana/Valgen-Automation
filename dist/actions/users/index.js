"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSuccessPopup = exports.submitUserCreationForm = exports.retryWithModifiedCredentials = exports.generateModifiedUser = exports.handleDuplicatePopup = exports.checkForDuplicateOrSuccess = exports.logoutAfterVerification = exports.verifyUserLogin = exports.deactivateUsers = exports.deactivateUser = exports.activateUser = exports.logoutAndNavigateToSignup = exports.completeUserSignup = exports.navigateToUserCreateForm = exports.fillUserCreationForm = exports.createUsers = void 0;
// Main user management exports
var createUser_1 = require("./createUser");
Object.defineProperty(exports, "createUsers", { enumerable: true, get: function () { return createUser_1.createUsers; } });
// User form operations
var userFormFill_1 = require("./userFormFill");
Object.defineProperty(exports, "fillUserCreationForm", { enumerable: true, get: function () { return userFormFill_1.fillUserCreationForm; } });
Object.defineProperty(exports, "navigateToUserCreateForm", { enumerable: true, get: function () { return userFormFill_1.navigateToUserCreateForm; } });
// User signup
var userSignup_1 = require("./userSignup");
Object.defineProperty(exports, "completeUserSignup", { enumerable: true, get: function () { return userSignup_1.completeUserSignup; } });
Object.defineProperty(exports, "logoutAndNavigateToSignup", { enumerable: true, get: function () { return userSignup_1.logoutAndNavigateToSignup; } });
// User activation
var userActivation_1 = require("./userActivation");
Object.defineProperty(exports, "activateUser", { enumerable: true, get: function () { return userActivation_1.activateUser; } });
// User deactivation (NEW)
var userDeactivation_1 = require("./userDeactivation");
Object.defineProperty(exports, "deactivateUser", { enumerable: true, get: function () { return userDeactivation_1.deactivateUser; } });
var deactivateUsers_1 = require("./deactivateUsers");
Object.defineProperty(exports, "deactivateUsers", { enumerable: true, get: function () { return deactivateUsers_1.deactivateUsers; } });
// User verification
var userVerification_1 = require("./userVerification");
Object.defineProperty(exports, "verifyUserLogin", { enumerable: true, get: function () { return userVerification_1.verifyUserLogin; } });
Object.defineProperty(exports, "logoutAfterVerification", { enumerable: true, get: function () { return userVerification_1.logoutAfterVerification; } });
// Duplicate handling
var duplicateHandling_1 = require("./duplicateHandling");
Object.defineProperty(exports, "checkForDuplicateOrSuccess", { enumerable: true, get: function () { return duplicateHandling_1.checkForDuplicateOrSuccess; } });
Object.defineProperty(exports, "handleDuplicatePopup", { enumerable: true, get: function () { return duplicateHandling_1.handleDuplicatePopup; } });
Object.defineProperty(exports, "generateModifiedUser", { enumerable: true, get: function () { return duplicateHandling_1.generateModifiedUser; } });
Object.defineProperty(exports, "retryWithModifiedCredentials", { enumerable: true, get: function () { return duplicateHandling_1.retryWithModifiedCredentials; } });
// Popup handlers
var popupHandlers_1 = require("./popupHandlers");
Object.defineProperty(exports, "submitUserCreationForm", { enumerable: true, get: function () { return popupHandlers_1.submitUserCreationForm; } });
Object.defineProperty(exports, "handleSuccessPopup", { enumerable: true, get: function () { return popupHandlers_1.handleSuccessPopup; } });

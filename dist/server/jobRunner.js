"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreateRoles = runCreateRoles;
exports.runCreateUsers = runCreateUsers;
exports.runAll = runAll;
exports.runUnifiedFlow = runUnifiedFlow;
exports.runDeactivateUsers = runDeactivateUsers;
exports.runCreateDepartments = runCreateDepartments;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const browser_1 = require("../core/browser");
const login_1 = require("../core/login");
const csvReader_1 = require("../utils/csvReader");
const createRole_1 = require("../actions/roles/createRole");
const createUser_1 = require("../actions/users/createUser");
const deactivateUsers_1 = require("../actions/users/deactivateUsers");
const assignRole_1 = require("../actions/assignRole");
const createDepartment_1 = require("../actions/createDepartment");
// ===================== CREATE ROLES =====================
async function runCreateRoles(baseUrl, username, password, roleName, duplicateStrategy = 'skip', permissions) {
    // Backend validation
    if (!baseUrl || !username || !password || !roleName) {
        throw new Error('Missing required fields: baseUrl, username, password, roleName');
    }
    if (roleName.length < 2 || roleName.length > 100) {
        throw new Error('Role name must be between 2 and 100 characters');
    }
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    browser_1.automationEvents.emit('log', 'Starting Create Roles job');
    try {
        browser_1.automationEvents.emit('log', `Processing role creation for: ${roleName}`);
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed - Please verify credentials and Base URL');
        browser_1.automationEvents.emit('log', `Generating role data for role name: ${roleName}`);
        // Generate role data dynamically
        const roles = [{
                roleName: roleName,
                Description: `${roleName} role created by automation`,
                Comments: `Auto-generated role: ${roleName}`
            }];
        browser_1.automationEvents.emit('log', `Creating role: ${roleName}`);
        const result = await (0, createRole_1.createRole)(page, roles, {
            duplicateStrategy
        });
        // Check if any roles were actually created or if all were skipped
        const hasCreated = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        const hasSkipped = result.some((r) => r.status === 'skipped');
        if (hasCreated) {
            browser_1.automationEvents.emit('log', 'Role creation completed successfully');
        }
        else if (hasSkipped) {
            browser_1.automationEvents.emit('log', 'Role creation completed - all roles were skipped (duplicates)');
        }
        else {
            browser_1.automationEvents.emit('log', 'Role creation completed - no roles were created');
        }
        return result;
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Error during role creation: ${String(err)}`);
        throw err;
    }
    finally {
        await browser.close();
    }
}
// ===================== CREATE USERS =====================
async function runCreateUsers(baseUrl, username, password, users) {
    // Backend validation
    if (!baseUrl || !username || !password || !users) {
        throw new Error('Missing required fields: baseUrl, username, password, users');
    }
    if (!Array.isArray(users) || users.length === 0) {
        throw new Error('Users must be a non-empty array');
    }
    // Validate each user
    for (const user of users) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!user.Email || !emailRegex.test(user.Email)) {
            throw new Error(`Invalid email format: ${user.Email}`);
        }
        if (!user.FirstName || !user.LastName || !user.UserName || !user.Password) {
            throw new Error('Missing required user fields: FirstName, LastName, UserName, or Password');
        }
    }
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    browser_1.automationEvents.emit('log', 'Starting Create Users job');
    try {
        browser_1.automationEvents.emit('log', `Attempting to login with username: ${username}`);
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed - Please verify credentials and Base URL');
        browser_1.automationEvents.emit('log', `Processing ${users.length} user(s) for creation`);
        const result = await (0, createUser_1.createUsers)(page, baseUrl, username, password, users, {});
        browser_1.automationEvents.emit('log', 'createUsers function completed, result length: ' + result.length);
        return result;
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Error during user creation: ${String(err)}`);
        throw err;
    }
    finally {
        await browser.close();
    }
}
// ===================== RUN ALL (OPTIONAL) =====================
async function runAll(baseUrl, username, password, dataDir) {
    const results = {};
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    try {
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed');
        const rolesPath = path_1.default.join(dataDir, 'roles.csv');
        if (fs_1.default.existsSync(rolesPath)) {
            const roles = await (0, csvReader_1.parseCsvFile)(rolesPath);
            results.roles = await (0, createRole_1.createRole)(page, roles);
        }
        const usersPath = path_1.default.join(dataDir, 'users.csv');
        if (fs_1.default.existsSync(usersPath)) {
            const users = await (0, csvReader_1.parseCsvFile)(usersPath);
            results.users = await (0, createUser_1.createUsers)(page, baseUrl, username, password, users);
        }
        const assignPath = path_1.default.join(dataDir, 'assignments.csv');
        if (fs_1.default.existsSync(assignPath)) {
            const assignments = await (0, csvReader_1.parseCsvFile)(assignPath);
            results.assignments = await (0, assignRole_1.assignRole)(page, assignments);
        }
        return results;
    }
    finally {
        await browser.close();
    }
}
// ===================== COMPLETE SETUP FLOW (Role → Dept → User → Deactivate) =====================
async function runUnifiedFlow(baseUrl, username, password, roleName, departmentName, userEmail) {
    // Backend validation
    if (!baseUrl || !username || !password || !roleName || !departmentName || !userEmail) {
        throw new Error('Missing required fields for unified flow');
    }
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    browser_1.automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    browser_1.automationEvents.emit('log', 'Starting Complete Setup Flow (Role → Dept → User → Deactivate)');
    browser_1.automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
        // ===================== LOGIN =====================
        browser_1.automationEvents.emit('log', `Logging in with admin username: ${username}`);
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed - Please verify credentials and Base URL');
        // ===================== CREATE ROLE =====================
        browser_1.automationEvents.emit('log', `Step 1/4: Creating Role: ${roleName}`);
        const roleResult = await (0, createRole_1.createRole)(page, [{ roleName }], { duplicateStrategy: 'skip', configurePermissions: true });
        const roleCreated = roleResult.some((r) => r.status === 'created' || r.status === 'created-appended');
        const actualRoleName = roleResult[0]?.createdAs || roleName;
        if (!roleCreated && roleResult[0]?.status !== 'skipped') {
            throw new Error(`Role creation failed: ${roleResult[0]?.message || 'Unknown error'}`);
        }
        browser_1.automationEvents.emit('log', `✓ Role ready: ${actualRoleName} (${roleResult[0]?.status})`);
        // Wait before next step (allow role propagation)
        await page.waitForTimeout(2000);
        // Re-login for department creation
        browser_1.automationEvents.emit('log', 'Re-authenticating for Department creation...');
        const relogin1 = await (0, login_1.login)(page, baseUrl, username, password);
        if (!relogin1.success)
            throw new Error('Re-login failed before department creation');
        // ===================== CREATE DEPARTMENT =====================
        browser_1.automationEvents.emit('log', `Step 2/4: Creating Department: ${departmentName}`);
        const deptResult = await (0, createDepartment_1.createDepartment)(page, [{ name: departmentName, description: `Department for ${actualRoleName}` }], { duplicateStrategy: 'skip' });
        const deptCreated = deptResult.some((d) => d.status === 'created' || d.status === 'created-appended');
        const actualDeptName = deptResult[0]?.createdAs || departmentName;
        if (!deptCreated && deptResult[0]?.status !== 'skipped') {
            throw new Error(`Department creation failed: ${deptResult[0]?.message || 'Unknown error'}`);
        }
        browser_1.automationEvents.emit('log', `✓ Department ready: ${actualDeptName} (${deptResult[0]?.status})`);
        // Wait before next step
        await page.waitForTimeout(2000);
        // Re-login for user creation
        browser_1.automationEvents.emit('log', 'Re-authenticating for User creation...');
        const relogin2 = await (0, login_1.login)(page, baseUrl, username, password);
        if (!relogin2.success)
            throw new Error('Re-login failed before user creation');
        // ===================== CREATE USER =====================
        browser_1.automationEvents.emit('log', `Step 3/4: Creating User: ${userEmail}`);
        const userResult = await (0, createUser_1.createUsers)(page, baseUrl, username, password, [{
                Email: userEmail,
                FirstName: userEmail.split('@')[0],
                LastName: 'Auto',
                UserName: userEmail.split('@')[0],
                Password: 'Welcome@123',
                Role: actualRoleName,
                Department: actualDeptName,
                Comments: `User created via Complete Setup Flow`
            }], {});
        // Check if user was successfully created and verified
        const userCreated = userResult.some((u) => u.status === 'created-activated-and-verified' ||
            u.status === 'created' ||
            u.status === 'created-appended' ||
            u.status === 'activated-but-login-failed' // User was created and activated, login verification failed but user exists
        );
        if (!userCreated) {
            throw new Error(`User creation failed: ${userResult[0]?.message || userResult[0]?.status || 'Unknown error'}`);
        }
        const createdUsername = userResult[0]?.username || userEmail.split('@')[0];
        browser_1.automationEvents.emit('log', `✓ User created: ${userEmail} (${userResult[0]?.status})`);
        // Wait before deactivation
        await page.waitForTimeout(2000);
        // Re-login for user deactivation
        browser_1.automationEvents.emit('log', 'Re-authenticating for User deactivation...');
        const relogin3 = await (0, login_1.login)(page, baseUrl, username, password);
        if (!relogin3.success)
            throw new Error('Re-login failed before user deactivation');
        // ===================== DEACTIVATE USER =====================
        browser_1.automationEvents.emit('log', `Step 4/4: Deactivating User: ${createdUsername}`);
        const deactivationResult = await (0, deactivateUsers_1.deactivateUsers)(page, baseUrl, username, password, [createdUsername], { continueOnError: false });
        const userDeactivated = deactivationResult.some((d) => d.status === 'deactivated');
        if (!userDeactivated) {
            browser_1.automationEvents.emit('error', `User deactivation failed but continuing: ${deactivationResult[0]?.message || 'Unknown error'}`);
        }
        else {
            browser_1.automationEvents.emit('log', `✓ User deactivated: ${createdUsername} (${deactivationResult[0]?.status})`);
        }
        // ===================== SUCCESS =====================
        browser_1.automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        browser_1.automationEvents.emit('log', '✅ Complete Setup Flow finished successfully!');
        browser_1.automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return {
            role: roleResult,
            department: deptResult,
            user: userResult,
            deactivation: deactivationResult
        };
    }
    catch (err) {
        browser_1.automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        browser_1.automationEvents.emit('error', `❌ Complete Setup Flow failed: ${String(err)}`);
        browser_1.automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw err;
    }
    finally {
        await browser.close();
    }
}
// ===================== DEACTIVATE USERS =====================
async function runDeactivateUsers(baseUrl, username, password, usernames) {
    // Backend validation
    if (!baseUrl || !username || !password || !usernames) {
        throw new Error('Missing required fields: baseUrl, username, password, usernames');
    }
    if (!Array.isArray(usernames) || usernames.length === 0) {
        throw new Error('Usernames must be a non-empty array');
    }
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    browser_1.automationEvents.emit('log', 'Starting User Deactivation job');
    try {
        browser_1.automationEvents.emit('log', `Attempting to login with username: ${username}`);
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed - Please verify credentials and Base URL');
        browser_1.automationEvents.emit('log', `Processing ${usernames.length} user(s) for deactivation`);
        const result = await (0, deactivateUsers_1.deactivateUsers)(page, baseUrl, username, password, usernames, { continueOnError: true });
        browser_1.automationEvents.emit('log', 'User deactivation completed, result length: ' + result.length);
        return result;
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Error during user deactivation: ${String(err)}`);
        throw err;
    }
    finally {
        await browser.close();
    }
}
// ===================== CREATE DEPARTMENTS =====================
async function runCreateDepartments(baseUrl, username, password, departments) {
    // Backend validation
    if (!baseUrl || !username || !password || !departments) {
        throw new Error('Missing required fields: baseUrl, username, password, departments');
    }
    if (!Array.isArray(departments) || departments.length === 0) {
        throw new Error('Departments must be a non-empty array');
    }
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    browser_1.automationEvents.emit('log', 'Starting Create Departments job');
    try {
        browser_1.automationEvents.emit('log', `Attempting to login with username: ${username}`);
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed - Please verify credentials and Base URL');
        browser_1.automationEvents.emit('log', `Processing ${departments.length} department(s) for creation`);
        const result = await (0, createDepartment_1.createDepartment)(page, departments, { duplicateStrategy: 'skip' });
        browser_1.automationEvents.emit('log', 'Department creation completed, result length: ' + result.length);
        return result;
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Error during department creation: ${String(err)}`);
        throw err;
    }
    finally {
        await browser.close();
    }
}

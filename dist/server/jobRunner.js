"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreateRoles = runCreateRoles;
exports.runCreateUsers = runCreateUsers;
exports.runAll = runAll;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const browser_1 = require("../core/browser");
const login_1 = require("../core/login");
const csvReader_1 = require("../utils/csvReader");
const createRole_1 = require("../actions/roles/createRole");
const createUser_1 = require("../actions/users/createUser");
const assignRole_1 = require("../actions/assignRole");
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
async function runCreateUsers(baseUrl, username, password, email) {
    // Backend validation
    if (!baseUrl || !username || !password || !email) {
        throw new Error('Missing required fields: baseUrl, username, password, email');
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format. Expected format: user@domain.com');
    }
    if (email.length > 100) {
        throw new Error('Email must not exceed 100 characters');
    }
    const { browser, context } = await (0, browser_1.launchBrowser)({ headless: false });
    const page = await (0, browser_1.newPage)(context);
    browser_1.automationEvents.emit('log', 'Starting Create Users job');
    try {
        browser_1.automationEvents.emit('log', `Attempting to login with username: ${username}`);
        const loginResult = await (0, login_1.login)(page, baseUrl, username, password);
        if (!loginResult.success)
            throw new Error('Login failed - Please verify credentials and Base URL');
        browser_1.automationEvents.emit('log', `Generating user data for email: ${email}`);
        // Generate user data dynamically from email
        const [localPart] = email.split('@');
        if (!localPart) {
            throw new Error('Invalid email format - cannot extract user information');
        }
        const nameParts = localPart.split('.');
        const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Auto';
        const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'User';
        const userName = localPart.replace(/\./g, '');
        const generatedPassword = 'Password@123';
        const role = 'Validation Engineer';
        const department = 'Quality';
        const comments = `Created by ValGenesis bot for ${email}`;
        if (!userName || userName.length === 0) {
            throw new Error('Unable to generate username from email');
        }
        const users = [{
                FirstName: firstName,
                LastName: lastName,
                UserName: userName,
                Email: email,
                Password: generatedPassword,
                Role: role,
                Department: department,
                Comments: comments
            }];
        browser_1.automationEvents.emit('log', `Creating user: ${firstName} ${lastName} (${email})`);
        browser_1.automationEvents.emit('log', 'Calling createUsers function...');
        const result = await (0, createUser_1.createUsers)(page, users, {});
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
            results.users = await (0, createUser_1.createUsers)(page, users);
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

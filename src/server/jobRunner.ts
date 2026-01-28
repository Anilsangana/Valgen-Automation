import path from 'path';

import fs from 'fs';

import { launchBrowser, newPage, automationEvents } from '../core/browser';

import { login } from '../core/login';

import { parseCsvFile } from '../utils/csvReader';

import { createRole } from '../actions/roles/createRole';

import { createUsers } from '../actions/users/createUser';

import { assignRole } from '../actions/assignRole';



// ===================== CREATE ROLES =====================

export async function runCreateRoles(

  baseUrl: string,

  username: string,

  password: string,

  roleName: string,

  duplicateStrategy: 'skip' | 'append' | 'stop' = 'skip',

  permissions?: Array<{ category: string; permission: string; label: string }>

) {

  // Backend validation

  if (!baseUrl || !username || !password || !roleName) {

    throw new Error('Missing required fields: baseUrl, username, password, roleName');

  }

  if (roleName.length < 2 || roleName.length > 100) {

    throw new Error('Role name must be between 2 and 100 characters');

  }



  const { browser, context } = await launchBrowser({ headless: false });

  const page = await newPage(context);



  automationEvents.emit('log', 'Starting Create Roles job');



  try {

    automationEvents.emit('log', `Processing role creation for: ${roleName}`);

    const loginResult = await login(page, baseUrl, username, password);

    if (!loginResult.success) throw new Error('Login failed - Please verify credentials and Base URL');



    automationEvents.emit('log', `Generating role data for role name: ${roleName}`);



    // Generate role data dynamically

    const roles = [{

      roleName: roleName,

      Description: `${roleName} role created by automation`,

      Comments: `Auto-generated role: ${roleName}`

    }];



    automationEvents.emit('log', `Creating role: ${roleName}`);

    const result = await createRole(page, roles, {

      duplicateStrategy

    });

    

    // Check if any roles were actually created or if all were skipped

    const hasCreated = result.some((r: any) => r.status === 'created' || r.status === 'created-appended');

    const hasSkipped = result.some((r: any) => r.status === 'skipped');

    

    if (hasCreated) {

      automationEvents.emit('log', 'Role creation completed successfully');

    } else if (hasSkipped) {

      automationEvents.emit('log', 'Role creation completed - all roles were skipped (duplicates)');

    } else {

      automationEvents.emit('log', 'Role creation completed - no roles were created');

    }

    

    return result;

  } catch (err) {

    automationEvents.emit('error', `Error during role creation: ${String(err)}`);

    throw err;

  } finally {

    await browser.close();

  }

}



// ===================== CREATE USERS =====================

export async function runCreateUsers(

  baseUrl: string,

  username: string,

  password: string,

  email: string

) {

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



  const { browser, context } = await launchBrowser({ headless: false });

  const page = await newPage(context);



  automationEvents.emit('log', 'Starting Create Users job');



  try {

    automationEvents.emit('log', `Attempting to login with username: ${username}`);

    const loginResult = await login(page, baseUrl, username, password);

    if (!loginResult.success) throw new Error('Login failed - Please verify credentials and Base URL');



    automationEvents.emit('log', `Generating user data for email: ${email}`);



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



    automationEvents.emit('log', `Creating user: ${firstName} ${lastName} (${email})`);

    automationEvents.emit('log', 'Calling createUsers function...');

    const result = await createUsers(page, users, {});

    automationEvents.emit('log', 'createUsers function completed, result length: ' + result.length);

    return result;

  } catch (err) {

    automationEvents.emit('error', `Error during user creation: ${String(err)}`);

    throw err;

  } finally {

    await browser.close();

  }

}



// ===================== RUN ALL (OPTIONAL) =====================

export async function runAll(

  baseUrl: string,

  username: string,

  password: string,

  dataDir: string

) {

  const results: any = {};



  const { browser, context } = await launchBrowser({ headless: false });

  const page = await newPage(context);



  try {

    const loginResult = await login(page, baseUrl, username, password);

    if (!loginResult.success) throw new Error('Login failed');



    const rolesPath = path.join(dataDir, 'roles.csv');

    if (fs.existsSync(rolesPath)) {

      const roles = await parseCsvFile(rolesPath);

      results.roles = await createRole(page, roles as any[]);

    }



    const usersPath = path.join(dataDir, 'users.csv');

    if (fs.existsSync(usersPath)) {

      const users = await parseCsvFile(usersPath);

      results.users = await createUsers(page, users as any[]);

    }



    const assignPath = path.join(dataDir, 'assignments.csv');

    if (fs.existsSync(assignPath)) {

      const assignments = await parseCsvFile(assignPath);

      results.assignments = await assignRole(page, assignments as any[]);

    }



    return results;

  } finally {

    await browser.close();

  }

}


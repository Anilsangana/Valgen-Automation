import path from 'path';



import fs from 'fs';



import { launchBrowser, newPage, automationEvents } from '../core/browser';



import { login } from '../core/login';



import { parseCsvFile } from '../utils/csvReader';



import { createRole } from '../actions/roles/createRole';



import { createUsers } from '../actions/users/createUser';

import { deactivateUsers } from '../actions/users/deactivateUsers';



import { assignRole } from '../actions/assignRole';

import { createDepartment } from '../actions/createDepartment';







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



  users: Array<{

    FirstName: string;

    LastName: string;

    UserName: string;

    Email: string;

    Password: string;

    Role?: string;

    Department?: string;

    Comments?: string;

  }>



) {



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







  const { browser, context } = await launchBrowser({ headless: false });



  const page = await newPage(context);







  automationEvents.emit('log', 'Starting Create Users job');







  try {



    automationEvents.emit('log', `Attempting to login with username: ${username}`);



    const loginResult = await login(page, baseUrl, username, password);



    if (!loginResult.success) throw new Error('Login failed - Please verify credentials and Base URL');







    automationEvents.emit('log', `Processing ${users.length} user(s) for creation`);



    const result = await createUsers(page, baseUrl, username, password, users, {});



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



      results.users = await createUsers(page, baseUrl, username, password, users as any[]);



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



// ===================== COMPLETE SETUP FLOW (Role → Dept → User → Deactivate) =====================

export async function runUnifiedFlow(
  baseUrl: string,
  username: string,
  password: string,
  roleName: string,
  departmentName: string,
  userEmail: string
) {
  // Backend validation
  if (!baseUrl || !username || !password || !roleName || !departmentName || !userEmail) {
    throw new Error('Missing required fields for unified flow');
  }

  const { browser, context } = await launchBrowser({ headless: false });
  const page = await newPage(context);

  automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  automationEvents.emit('log', 'Starting Complete Setup Flow (Role → Dept → User → Deactivate)');
  automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // ===================== LOGIN =====================
    automationEvents.emit('log', `Logging in with admin username: ${username}`);
    const loginResult = await login(page, baseUrl, username, password);

    if (!loginResult.success) throw new Error('Login failed - Please verify credentials and Base URL');

    // ===================== CREATE ROLE =====================
    automationEvents.emit('log', `Step 1/4: Creating Role: ${roleName}`);
    const roleResult = await createRole(
      page,
      [{ roleName }],
      { duplicateStrategy: 'skip', configurePermissions: true }
    );

    const roleCreated = roleResult.some((r: any) => r.status === 'created' || r.status === 'created-appended');
    const actualRoleName = roleResult[0]?.createdAs || roleName;

    if (!roleCreated && roleResult[0]?.status !== 'skipped') {
      throw new Error(`Role creation failed: ${roleResult[0]?.message || 'Unknown error'}`);
    }

    automationEvents.emit('log', `✓ Role ready: ${actualRoleName} (${roleResult[0]?.status})`);

    // Wait before next step (allow role propagation)
    await page.waitForTimeout(2000);

    // Re-login for department creation
    automationEvents.emit('log', 'Re-authenticating for Department creation...');
    const relogin1 = await login(page, baseUrl, username, password);
    if (!relogin1.success) throw new Error('Re-login failed before department creation');

    // ===================== CREATE DEPARTMENT =====================
    automationEvents.emit('log', `Step 2/4: Creating Department: ${departmentName}`);
    const deptResult = await createDepartment(
      page,
      [{ name: departmentName, description: `Department for ${actualRoleName}` }],
      { duplicateStrategy: 'skip' }
    );

    const deptCreated = deptResult.some((d: any) => d.status === 'created' || d.status === 'created-appended');
    const actualDeptName = deptResult[0]?.createdAs || departmentName;

    if (!deptCreated && deptResult[0]?.status !== 'skipped') {
      throw new Error(`Department creation failed: ${deptResult[0]?.message || 'Unknown error'}`);
    }

    automationEvents.emit('log', `✓ Department ready: ${actualDeptName} (${deptResult[0]?.status})`);

    // Wait before next step
    await page.waitForTimeout(2000);

    // Re-login for user creation
    automationEvents.emit('log', 'Re-authenticating for User creation...');
    const relogin2 = await login(page, baseUrl, username, password);
    if (!relogin2.success) throw new Error('Re-login failed before user creation');

    // ===================== CREATE USER =====================
    automationEvents.emit('log', `Step 3/4: Creating User: ${userEmail}`);
    const userResult = await createUsers(
      page,
      baseUrl,
      username,
      password,
      [{
        Email: userEmail,
        FirstName: userEmail.split('@')[0],
        LastName: 'Auto',
        UserName: userEmail.split('@')[0],
        Password: 'Welcome@123',
        Role: actualRoleName,
        Department: actualDeptName,
        Comments: `User created via Complete Setup Flow`
      }],
      {}
    );

    // Check if user was successfully created and verified
    const userCreated = userResult.some((u: any) =>
      u.status === 'created-activated-and-verified' ||
      u.status === 'created' ||
      u.status === 'created-appended' ||
      u.status === 'activated-but-login-failed' // User was created and activated, login verification failed but user exists
    );

    if (!userCreated) {
      throw new Error(`User creation failed: ${userResult[0]?.message || userResult[0]?.status || 'Unknown error'}`);
    }

    const createdUsername = userResult[0]?.username || userEmail.split('@')[0];
    automationEvents.emit('log', `✓ User created: ${userEmail} (${userResult[0]?.status})`);

    // Wait before deactivation
    await page.waitForTimeout(2000);

    // Re-login for user deactivation
    automationEvents.emit('log', 'Re-authenticating for User deactivation...');
    const relogin3 = await login(page, baseUrl, username, password);
    if (!relogin3.success) throw new Error('Re-login failed before user deactivation');

    // ===================== DEACTIVATE USER =====================
    automationEvents.emit('log', `Step 4/4: Deactivating User: ${createdUsername}`);
    const deactivationResult = await deactivateUsers(
      page,
      baseUrl,
      username,
      password,
      [createdUsername],
      { continueOnError: false }
    );

    const userDeactivated = deactivationResult.some((d: any) => d.status === 'deactivated');

    if (!userDeactivated) {
      automationEvents.emit('error', `User deactivation failed but continuing: ${deactivationResult[0]?.message || 'Unknown error'}`);
    } else {
      automationEvents.emit('log', `✓ User deactivated: ${createdUsername} (${deactivationResult[0]?.status})`);
    }

    // ===================== SUCCESS =====================
    automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    automationEvents.emit('log', '✅ Complete Setup Flow finished successfully!');
    automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      role: roleResult,
      department: deptResult,
      user: userResult,
      deactivation: deactivationResult
    };

  } catch (err) {
    automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    automationEvents.emit('error', `❌ Complete Setup Flow failed: ${String(err)}`);
    automationEvents.emit('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw err;
  } finally {
    await browser.close();
  }
}

// ===================== DEACTIVATE USERS =====================
export async function runDeactivateUsers(
  baseUrl: string,
  username: string,
  password: string,
  usernames: string[]
) {
  // Backend validation
  if (!baseUrl || !username || !password || !usernames) {
    throw new Error('Missing required fields: baseUrl, username, password, usernames');
  }

  if (!Array.isArray(usernames) || usernames.length === 0) {
    throw new Error('Usernames must be a non-empty array');
  }

  const { browser, context } = await launchBrowser({ headless: false });
  const page = await newPage(context);

  automationEvents.emit('log', 'Starting User Deactivation job');

  try {
    automationEvents.emit('log', `Attempting to login with username: ${username}`);
    const loginResult = await login(page, baseUrl, username, password);

    if (!loginResult.success) throw new Error('Login failed - Please verify credentials and Base URL');

    automationEvents.emit('log', `Processing ${usernames.length} user(s) for deactivation`);
    const result = await deactivateUsers(page, baseUrl, username, password, usernames, { continueOnError: true });

    automationEvents.emit('log', 'User deactivation completed, result length: ' + result.length);

    return result;
  } catch (err) {
    automationEvents.emit('error', `Error during user deactivation: ${String(err)}`);
    throw err;
  } finally {
    await browser.close();
  }
}

// ===================== CREATE DEPARTMENTS =====================
export async function runCreateDepartments(
  baseUrl: string,
  username: string,
  password: string,
  departments: Array<{ name: string; description?: string }>
) {
  // Backend validation
  if (!baseUrl || !username || !password || !departments) {
    throw new Error('Missing required fields: baseUrl, username, password, departments');
  }

  if (!Array.isArray(departments) || departments.length === 0) {
    throw new Error('Departments must be a non-empty array');
  }

  const { browser, context } = await launchBrowser({ headless: false });
  const page = await newPage(context);

  automationEvents.emit('log', 'Starting Create Departments job');

  try {
    automationEvents.emit('log', `Attempting to login with username: ${username}`);
    const loginResult = await login(page, baseUrl, username, password);

    if (!loginResult.success) throw new Error('Login failed - Please verify credentials and Base URL');

    automationEvents.emit('log', `Processing ${departments.length} department(s) for creation`);
    const result = await createDepartment(page, departments, { duplicateStrategy: 'skip' });

    automationEvents.emit('log', 'Department creation completed, result length: ' + result.length);

    return result;
  } catch (err) {
    automationEvents.emit('error', `Error during department creation: ${String(err)}`);
    throw err;
  } finally {
    await browser.close();
  }
}




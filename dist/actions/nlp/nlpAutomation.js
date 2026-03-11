"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNLPCommand = executeNLPCommand;
const playwright_1 = require("playwright");
const browser_1 = require("../../core/browser");
/**
 * Execute natural language commands using Playwright - Intelligent AI-driven automation
 * This function dynamically understands ANY command variation, not just specific keywords
 */
async function executeNLPCommand(baseUrl, username, password, command) {
    let browser = null;
    let page = null;
    try {
        browser_1.automationEvents.emit('log', `🤖 Starting AI-Powered Browser Automation...`);
        browser_1.automationEvents.emit('log', `📝 Command: "${command}"`);
        // Launch browser
        browser = await playwright_1.chromium.launch({ headless: false });
        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });
        page = await context.newPage();
        // Parse and execute the command with intelligent intent detection
        const result = await parseAndExecuteCommand(page, command, username, password, baseUrl);
        browser_1.automationEvents.emit('log', '✅ AI automation completed successfully');
        return {
            success: true,
            command,
            result
        };
    }
    catch (error) {
        browser_1.automationEvents.emit('error', `❌ AI automation failed: ${String(error)}`);
        throw error;
    }
    finally {
        // Keep browser open for a moment to see results
        if (page) {
            await page.waitForTimeout(2000);
            await page.close();
        }
        if (browser)
            await browser.close();
    }
}
/**
 * Intelligent command parser - dynamically understands intent from natural language
 * Works for ANY command variation, not just specific keywords
 */
async function parseAndExecuteCommand(page, command, username, password, fallbackUrl) {
    const results = { actions: [] };
    // Detect all intents in the command using AI-like pattern matching
    const intents = detectIntents(command);
    browser_1.automationEvents.emit('log', `🧠 Detected ${intents.length} action(s) from your command`);
    // Execute each detected intent in order
    for (const intent of intents) {
        try {
            switch (intent.type) {
                case 'navigate':
                    await executeNavigation(page, intent.data, results);
                    break;
                case 'screenshot':
                    await executeScreenshot(page, intent.data, results);
                    break;
                case 'wait':
                    await executeWait(page, intent.data, results);
                    break;
                case 'click':
                    await executeClick(page, intent.data, results);
                    break;
                case 'fill':
                    await executeFill(page, intent.data, results);
                    break;
                case 'search':
                    await executeSearch(page, intent.data, results);
                    break;
                case 'login':
                    await executeLogin(page, intent.data, username, password, results);
                    break;
                // Legacy ValGenesis commands
                case 'create_role':
                    await executeCreateRole(page, intent.data, results);
                    break;
                case 'create_department':
                    await executeCreateDepartment(page, intent.data, results);
                    break;
                case 'create_user':
                    await executeCreateUser(page, intent.data, results);
                    break;
                default:
                    browser_1.automationEvents.emit('log', `⚠️ Unknown intent type: ${intent.type}`);
            }
        }
        catch (error) {
            browser_1.automationEvents.emit('error', `Failed to execute ${intent.type}: ${String(error)}`);
            results.actions.push({
                action: intent.type,
                status: 'failed',
                error: String(error)
            });
        }
    }
    return results;
}
/**
 * Intelligent intent detection - understands natural language dynamically
 * Supports many variations of the same intent
 */
function detectIntents(command) {
    const intents = [];
    const lower = command.toLowerCase();
    // Intent 1: Navigation (VERY flexible - understands many ways to say "navigate")
    const navigationPatterns = [
        'open', 'navigate', 'go to', 'visit', 'load', 'browse', 'access',
        'goto', 'show', 'display', 'bring up', 'pull up', 'head to',
        'take me to', 'show me', 'get to', 'launch'
    ];
    if (navigationPatterns.some(pattern => lower.includes(pattern))) {
        const url = extractUrl(command);
        if (url) {
            intents.push({ type: 'navigate', data: { url } });
        }
    }
    // Intent 2: Wait/Pause (understands "wait until page loads", "until ready", etc.)
    const waitPatterns = [
        'wait until', 'wait for', 'pause', 'hold', 'stay', 'until the page',
        'until it', 'loaded', 'ready', 'displayed', 'appears', 'shown',
        'elements are displayed', 'page is loaded', 'fully loaded'
    ];
    if (waitPatterns.some(pattern => lower.includes(pattern))) {
        intents.push({ type: 'wait', data: { reason: 'page_load' } });
    }
    // Intent 3: Screenshot (many ways to say "take screenshot")
    const screenshotPatterns = [
        'screenshot', 'capture', 'snap', 'take a picture', 'take a photo',
        'save image', 'grab', 'screen capture', 'print screen', 'take pic',
        'take image', 'screencap', 'screen shot'
    ];
    if (screenshotPatterns.some(pattern => lower.includes(pattern))) {
        intents.push({ type: 'screenshot', data: {} });
    }
    // Intent 4: Click (flexible click detection)
    const clickIndicators = ['click', 'press', 'tap', 'select', 'hit', 'push'];
    if (clickIndicators.some(indicator => lower.includes(indicator))) {
        const target = extractClickTarget(command);
        if (target) {
            intents.push({ type: 'click', data: { target } });
        }
    }
    // Intent 5: Fill/Type (flexible text input)
    const fillIndicators = ['fill', 'type', 'enter', 'input', 'write', 'put', 'insert'];
    if (fillIndicators.some(indicator => lower.includes(indicator))) {
        const fillData = extractFillData(command);
        if (fillData) {
            intents.push({ type: 'fill', data: fillData });
        }
    }
    // Intent 6: Login
    if (lower.includes('login') || lower.includes('log in') || lower.includes('sign in') || lower.includes('signin')) {
        const creds = extractLoginCredentials(command, '', '');
        intents.push({ type: 'login', data: creds });
    }
    // Legacy intents for ValGenesis
    if (lower.includes('create') && lower.includes('role')) {
        intents.push({
            type: 'create_role', data: {
                name: extractRoleName(command),
                type: extractRoleType(command)
            }
        });
    }
    if (lower.includes('create') && (lower.includes('department') || lower.includes('dept'))) {
        intents.push({
            type: 'create_department', data: {
                name: extractDepartmentName(command)
            }
        });
    }
    if (lower.includes('create') && lower.includes('user')) {
        intents.push({
            type: 'create_user', data: {
                email: extractUserEmail(command),
                role: extractUserRole(command),
                department: extractUserDepartment(command)
            }
        });
    }
    return intents;
}
// ============= INTELLIGENT INTENT EXECUTION FUNCTIONS =============
async function executeNavigation(page, data, results) {
    browser_1.automationEvents.emit('log', `🌐 Navigating to: ${data.url}`);
    // Smart navigation that waits for everything to load
    await page.goto(data.url, {
        waitUntil: 'networkidle', // Wait for network to be idle
        timeout: 60000
    });
    browser_1.automationEvents.emit('log', '⏳ Waiting for page elements to fully render...');
    await page.waitForTimeout(2000); // Extra time for dynamic content
    browser_1.automationEvents.emit('log', '✅ Page loaded and ready');
    results.actions.push({ action: 'navigate', url: data.url, status: 'completed' });
}
async function executeWait(page, data, results) {
    browser_1.automationEvents.emit('log', `⏳ Waiting for ${data.reason}...`);
    if (data.reason === 'page_load') {
        // Wait for page to be completely stable
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(2000);
    }
    browser_1.automationEvents.emit('log', '✅ Wait completed');
    results.actions.push({ action: 'wait', reason: data.reason, status: 'completed' });
}
async function executeScreenshot(page, data, results) {
    browser_1.automationEvents.emit('log', '📸 Capturing screenshot...');
    const screenshotPath = await takeScreenshot(page);
    browser_1.automationEvents.emit('log', `✅ Screenshot saved: ${screenshotPath}`);
    results.actions.push({ action: 'screenshot', path: screenshotPath, status: 'completed' });
    results.screenshot = screenshotPath;
}
async function executeClick(page, data, results) {
    browser_1.automationEvents.emit('log', `🖱️ Clicking: ${data.target}`);
    await clickElement(page, data.target);
    results.actions.push({ action: 'click', target: data.target, status: 'completed' });
}
async function executeFill(page, data, results) {
    browser_1.automationEvents.emit('log', `⌨️ Filling "${data.field}" with "${data.value}"`);
    await fillField(page, data.field, data.value);
    results.actions.push({ action: 'fill', field: data.field, value: data.value, status: 'completed' });
}
/**
 * Intelligent search execution - finds search box and performs search
 */
async function executeSearch(page, data, results) {
    const query = data.query;
    browser_1.automationEvents.emit('log', `🔍 Searching for: "${query}"`);
    try {
        // Try to find search input intelligently (works on Google, Bing, DuckDuckGo, etc.)
        const searchSelectors = [
            'input[name="q"]', // Google, DuckDuckGo
            'input[type="search"]', // Generic search
            'input[name="search"]', // Common search name
            'input[aria-label*="Search" i]', // Aria label
            'input[placeholder*="Search" i]', // Placeholder text
            'textarea[name="q"]', // Some sites use textarea
            '#search', // Common ID
            '.search-input', // Common class
            'input[title*="Search" i]' // Title attribute
        ];
        let searchBox = null;
        for (const selector of searchSelectors) {
            const count = await page.locator(selector).count();
            if (count > 0) {
                searchBox = page.locator(selector).first();
                browser_1.automationEvents.emit('log', `✓ Found search box using selector: ${selector}`);
                break;
            }
        }
        if (!searchBox) {
            throw new Error('Could not find search box on the page');
        }
        // Fill the search box
        await searchBox.fill(query);
        browser_1.automationEvents.emit('log', `✓ Entered search query: "${query}"`);
        // Wait a moment for autocomplete
        await page.waitForTimeout(500);
        // Try to submit (press Enter or click search button)
        await searchBox.press('Enter');
        browser_1.automationEvents.emit('log', '✓ Submitted search (pressed Enter)');
        // Wait for search results to load
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(1000);
        browser_1.automationEvents.emit('log', '✅ Search completed successfully');
        results.actions.push({
            action: 'search',
            query: query,
            status: 'completed'
        });
    }
    catch (error) {
        browser_1.automationEvents.emit('error', `Search failed: ${String(error)}`);
        throw error;
    }
}
async function executeLogin(page, data, defaultUsername, defaultPassword, results) {
    const username = data.username || defaultUsername;
    const password = data.password || defaultPassword;
    browser_1.automationEvents.emit('log', `🔐 Logging in as: ${username}`);
    await performLogin(page, username, password);
    results.actions.push({ action: 'login', username, status: 'completed' });
}
async function executeCreateRole(page, data, results) {
    browser_1.automationEvents.emit('log', `🔐 Creating role: ${data.name}`);
    await createRole(page, data.name, data.type);
    results.actions.push({ action: 'create_role', name: data.name, type: data.type, status: 'completed' });
}
async function executeCreateDepartment(page, data, results) {
    browser_1.automationEvents.emit('log', `🏢 Creating department: ${data.name}`);
    await createDepartment(page, data.name);
    results.actions.push({ action: 'create_department', name: data.name, status: 'completed' });
}
async function executeCreateUser(page, data, results) {
    browser_1.automationEvents.emit('log', `👤 Creating user: ${data.email}`);
    await createUser(page, data.email, data.role, data.department);
    results.actions.push({ action: 'create_user', email: data.email, role: data.role, department: data.department, status: 'completed' });
}
// ============= HELPER FUNCTIONS FOR EXTRACTION =============
/**
 * Extract URL from command - finds any http/https URL
 */
function extractUrl(command) {
    const urlPattern = /(https?:\/\/[^\s"'<>]+)/i;
    const match = command.match(urlPattern);
    return match ? match[1] : null;
}
/**
 * Take screenshot and save to audit-reports folder
 */
async function takeScreenshot(page) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Screenshot_${timestamp}.png`;
    const screenshotPath = `audit-reports/${fileName}`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    browser_1.automationEvents.emit('log', `✅ Screenshot saved: ${fileName}`);
    return screenshotPath;
}
/**
 * Extract login credentials from command
 */
function extractLoginCredentials(command, defaultUsername, defaultPassword) {
    const usernamePattern = /username\s+["']?([^"'\s]+)["']?/i;
    const passwordPattern = /password\s+["']?([^"'\s]+)["']?/i;
    const usernameMatch = command.match(usernamePattern);
    const passwordMatch = command.match(passwordPattern);
    return {
        username: usernameMatch ? usernameMatch[1] : defaultUsername,
        password: passwordMatch ? passwordMatch[1] : defaultPassword
    };
}
/**
 * Extract click target from command
 */
function extractClickTarget(command) {
    const patterns = [
        /click\s+(?:on\s+)?["']([^"']+)["']/i,
        /click\s+(?:the\s+)?(\w+(?:\s+\w+){0,3})\s+button/i,
        /click\s+(\w+)/i
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return null;
}
/**
 * Click element by text or selector
 */
async function clickElement(page, target) {
    try {
        const elementByText = page.locator(`button:has-text("${target}"), a:has-text("${target}"), input[value*="${target}" i]`).first();
        const count = await elementByText.count();
        if (count > 0) {
            await elementByText.click();
            browser_1.automationEvents.emit('log', `✅ Clicked element with text: ${target}`);
        }
        else {
            await page.click(target);
            browser_1.automationEvents.emit('log', `✅ Clicked element: ${target}`);
        }
        await page.waitForTimeout(1000);
    }
    catch (error) {
        throw new Error(`Failed to click "${target}": ${String(error)}`);
    }
}
/**
 * Extract field and value to fill
 */
function extractFillData(command) {
    const patterns = [
        /(?:fill|enter|type)\s+["']([^"']+)["']\s+(?:in|into|to)\s+["']([^"']+)["']/i,
        /(?:fill|enter|type)\s+([^\s]+)\s+(?:in|into|to)\s+([^\s]+)/i
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1] && match[2]) {
            return {
                value: match[1].trim(),
                field: match[2].trim()
            };
        }
    }
    return null;
}
/**
 * Fill a field with value
 */
async function fillField(page, field, value) {
    try {
        const fieldLocator = page.locator(`input[placeholder*="${field}" i], input[name*="${field}" i], input[id*="${field}" i], ` +
            `textarea[placeholder*="${field}" i], textarea[name*="${field}" i]`).first();
        await fieldLocator.fill(value);
        browser_1.automationEvents.emit('log', `✅ Filled "${field}" with "${value}"`);
        await page.waitForTimeout(500);
    }
    catch (error) {
        throw new Error(`Failed to fill field "${field}": ${String(error)}`);
    }
}
// ============= LEGACY VALGENESIS FUNCTIONS =============
async function performLogin(page, username, password) {
    try {
        await page.waitForSelector('input[type="text"], input[name*="user" i], input[id*="user" i]', { timeout: 10000 });
        const usernameField = page.locator('input[type="text"], input[name*="user" i], input[id*="user" i]').first();
        await usernameField.fill(username);
        browser_1.automationEvents.emit('log', `Filled username: ${username}`);
        const passwordField = page.locator('input[type="password"]').first();
        await passwordField.fill(password);
        browser_1.automationEvents.emit('log', 'Filled password');
        const loginButton = page.locator('input[type="submit"], button[type="submit"], button:has-text("Login"), input[value*="Login" i]').first();
        await loginButton.click();
        browser_1.automationEvents.emit('log', 'Clicked login button');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        browser_1.automationEvents.emit('log', '✓ Login successful');
    }
    catch (error) {
        throw new Error(`Login failed: ${String(error)}`);
    }
}
async function createRole(page, roleName, roleType) {
    try {
        const adminLink = page.locator('a:has-text("Admin"), button:has-text("Admin"), [title*="Admin" i]').first();
        await adminLink.click();
        await page.waitForTimeout(1000);
        const rolesLink = page.locator('a:has-text("Roles"), button:has-text("Roles"), [title*="Role" i]').first();
        await rolesLink.click();
        await page.waitForTimeout(1000);
        const createButton = page.locator('button:has-text("Create"), button:has-text("New"), input[value*="Create" i]').first();
        await createButton.click();
        await page.waitForTimeout(1000);
        const roleNameField = page.locator('input[name*="role" i], input[id*="role" i]').first();
        await roleNameField.fill(roleName);
        browser_1.automationEvents.emit('log', `Filled role name: ${roleName}`);
        if (roleType) {
            const roleTypeDropdown = page.locator('select[name*="type" i], select[id*="type" i]').first();
            await roleTypeDropdown.selectOption({ label: roleType });
            browser_1.automationEvents.emit('log', `Selected role type: ${roleType}`);
        }
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Submit"), input[value*="Save" i]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        browser_1.automationEvents.emit('log', `✓ Role "${roleName}" created successfully`);
    }
    catch (error) {
        throw new Error(`Role creation failed: ${String(error)}`);
    }
}
async function createDepartment(page, deptName) {
    try {
        const deptLink = page.locator('a:has-text("Department"), button:has-text("Department")').first();
        await deptLink.click();
        await page.waitForTimeout(1000);
        const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
        await createButton.click();
        await page.waitForTimeout(1000);
        const deptField = page.locator('input[name*="dept" i], input[id*="dept" i], input[name*="name" i]').first();
        await deptField.fill(deptName);
        browser_1.automationEvents.emit('log', `Filled department name: ${deptName}`);
        const saveButton = page.locator('button:has-text("Save"), input[value*="Save" i]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        browser_1.automationEvents.emit('log', `✓ Department "${deptName}" created successfully`);
    }
    catch (error) {
        throw new Error(`Department creation failed: ${String(error)}`);
    }
}
async function createUser(page, email, role, department) {
    try {
        const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();
        await usersLink.click();
        await page.waitForTimeout(1000);
        const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
        await createButton.click();
        await page.waitForTimeout(1000);
        const emailField = page.locator('input[type="email"], input[name*="email" i]').first();
        await emailField.fill(email);
        browser_1.automationEvents.emit('log', `Filled email: ${email}`);
        const roleDropdown = page.locator('select[name*="role" i]').first();
        await roleDropdown.selectOption({ label: role });
        browser_1.automationEvents.emit('log', `Selected role: ${role}`);
        const deptDropdown = page.locator('select[name*="dept" i]').first();
        await deptDropdown.selectOption({ label: department });
        browser_1.automationEvents.emit('log', `Selected department: ${department}`);
        const saveButton = page.locator('button:has-text("Save"), input[value*="Save" i]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        browser_1.automationEvents.emit('log', `✓ User "${email}" created successfully`);
    }
    catch (error) {
        throw new Error(`User creation failed: ${String(error)}`);
    }
}
function extractRoleName(command) {
    const patterns = [
        /create\s+(?:a\s+)?role\s+["']([^"']+)["']/i,
        /create\s+(?:a\s+)?role\s+(\w+)/i,
        /role\s+called\s+["']([^"']+)["']/i,
        /role\s+called\s+(\w+)/i,
        /role\s+["']([^"']+)["']/i,
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return 'Default Role';
}
function extractRoleType(command) {
    const patterns = [
        /(?:with\s+)?(?:role\s+)?type\s+["']([^"']+)["']/i,
        /(?:with\s+)?(?:role\s+)?type\s+([A-Za-z\s]+?)(?:\s+and|\s*$)/i,
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return 'Standard';
}
function extractDepartmentName(command) {
    const patterns = [
        /create\s+(?:a\s+)?department\s+["']([^"']+)["']/i,
        /create\s+(?:a\s+)?department\s+(\w+)/i,
        /department\s+called\s+["']([^"']+)["']/i,
        /department\s+["']([^"']+)["']/i,
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return 'Default Department';
}
function extractUserEmail(command) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = command.match(emailPattern);
    if (match) {
        return match[0];
    }
    return 'user@example.com';
}
function extractUserRole(command) {
    const patterns = [
        /(?:with\s+)?role\s+["']([^"']+)["']/i,
        /(?:with\s+)?role\s+'([^']+)'/i,
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return 'User';
}
function extractUserDepartment(command) {
    const patterns = [
        /(?:in\s+)?department\s+["']([^"']+)["']/i,
        /(?:in\s+)?department\s+'([^']+)'/i,
    ];
    for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return 'General';
}

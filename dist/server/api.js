"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
const jobRunner_1 = require("./jobRunner");
const browser_1 = require("../core/browser");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', '..', 'src', 'ui')));
// Simple SSE endpoint for streaming logs to the UI
app.get('/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const onLog = (msg) => res.write(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
    const onError = (msg) => res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
    browser_1.automationEvents.on('log', onLog);
    browser_1.automationEvents.on('error', onError);
    req.on('close', () => {
        browser_1.automationEvents.off('log', onLog);
        browser_1.automationEvents.off('error', onError);
    });
});
app.post('/run/createUsers', async (req, res) => {
    const { baseUrl, username, password, users } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !users) {
        browser_1.automationEvents.emit('error', 'Missing required fields: baseUrl, username, password, or users');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(users) || users.length === 0) {
        browser_1.automationEvents.emit('error', 'Users must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Users must be a non-empty array' });
    }
    // Validate each user
    for (const user of users) {
        if (!user.Email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.Email)) {
            browser_1.automationEvents.emit('error', `Invalid email format: ${user.Email}`);
            return res.status(400).json({ success: false, message: `Invalid email format: ${user.Email}` });
        }
        if (!user.FirstName || !user.LastName || !user.UserName || !user.Password) {
            browser_1.automationEvents.emit('error', 'Missing required user fields: FirstName, LastName, UserName, or Password');
            return res.status(400).json({ success: false, message: 'Missing required user fields' });
        }
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing user creation request...');
        const result = await (0, jobRunner_1.runCreateUsers)(baseUrl, username, password, users);
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        res.json({ success: hasSuccess, result });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `User creation failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
app.post('/run/createRoles', async (req, res) => {
    const { baseUrl, username, password, roleName, duplicateStrategy } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !roleName) {
        browser_1.automationEvents.emit('error', 'Missing required fields: baseUrl, username, password, or roleName');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing role creation request...');
        const result = await (0, jobRunner_1.runCreateRoles)(baseUrl, username, password, roleName, duplicateStrategy);
        res.json({ success: true, result });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Role creation failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
app.post('/run/all', async (req, res) => {
    const { baseUrl, username, password, dataDir } = req.body;
    try {
        const result = await (0, jobRunner_1.runAll)(baseUrl, username, password, dataDir);
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});
app.post('/run/unified', async (req, res) => {
    const { baseUrl, username, password, roleName, departmentName, userEmail } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !roleName || !departmentName || !userEmail) {
        browser_1.automationEvents.emit('error', 'Missing required fields for unified flow');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing unified flow request...');
        const result = await (0, jobRunner_1.runUnifiedFlow)(baseUrl, username, password, roleName, departmentName, userEmail);
        res.json({ success: true, result });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Unified flow failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
app.post('/run/deactivateUsers', async (req, res) => {
    const { baseUrl, username, password, usernames } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !usernames) {
        browser_1.automationEvents.emit('error', 'Missing required fields for user deactivation');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(usernames) || usernames.length === 0) {
        browser_1.automationEvents.emit('error', 'Usernames must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Usernames must be a non-empty array' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing user deactivation request...');
        const result = await (0, jobRunner_1.runDeactivateUsers)(baseUrl, username, password, usernames);
        const hasSuccess = result.some((r) => r.status === 'deactivated');
        res.json({ success: hasSuccess, result });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `User deactivation failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
app.post('/run/createDepartments', async (req, res) => {
    const { baseUrl, username, password, departments } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !departments) {
        browser_1.automationEvents.emit('error', 'Missing required fields for department creation');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(departments) || departments.length === 0) {
        browser_1.automationEvents.emit('error', 'Departments must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Departments must be a non-empty array' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing department creation request...');
        const result = await (0, jobRunner_1.runCreateDepartments)(baseUrl, username, password, departments);
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        res.json({ success: hasSuccess, result });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Department creation failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

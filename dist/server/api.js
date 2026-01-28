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
    const { baseUrl, username, password, email } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !email) {
        browser_1.automationEvents.emit('error', 'Missing required fields: baseUrl, username, password, or email');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        browser_1.automationEvents.emit('error', 'Invalid email format provided');
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing user creation request...');
        const result = await (0, jobRunner_1.runCreateUsers)(baseUrl, username, password, email);
        const hasSuccess = result.some((r) => r.status === 'created');
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
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

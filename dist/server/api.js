"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
const jobRunner_1 = require("./jobRunner");
const browser_1 = require("../core/browser");
const pdfGenerator_1 = require("../utils/pdfGenerator");
const nlpAutomation_1 = require("../actions/nlp/nlpAutomation");
const ollamaAutomation_1 = require("../actions/ai/ollamaAutomation");
const ollamaMcpAgent_1 = require("../actions/ai/ollamaMcpAgent");
// ── Prevent unhandled promise rejections from crashing the server ──────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    // Do NOT exit — keep the server running
});
process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
    // Do NOT exit — keep the server running
});
// ── Prevent EventEmitter 'error' events from crashing the process ──────────
browser_1.automationEvents.on('error', (msg) => {
    console.error('[Automation Event Error]:', msg);
});
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
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended' || r.status === 'created-activated-and-verified');
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'User Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { user: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: hasSuccess,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `User creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'User Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { user: [{ username: users[0]?.UserName || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
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
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'Role Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { role: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: true,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Role creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'Role Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { role: [{ role: roleName, status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
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
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'User Deactivation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { deactivation: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({ success: hasSuccess, result, pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `User deactivation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'User Deactivation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { deactivation: [{ username: usernames[0] || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
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
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'Department Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { department: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: hasSuccess,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Department creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'Department Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { department: [{ department: departments[0]?.name || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
    }
});
app.post('/run/createCategories', async (req, res) => {
    const { baseUrl, username, password, categories, duplicateStrategy } = req.body;
    // Server-side validation
    if (!baseUrl || !username || !password || !categories) {
        browser_1.automationEvents.emit('error', 'Missing required fields for category creation');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(categories) || categories.length === 0) {
        browser_1.automationEvents.emit('error', 'Categories must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Categories must be a non-empty array' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing category creation request...');
        const result = await (0, jobRunner_1.runCreateCategories)(baseUrl, username, password, categories, duplicateStrategy);
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'Category Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { category: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: hasSuccess,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Category creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'Category Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { category: [{ category: categories[0]?.name || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
    }
});
// ===================== NATURAL LANGUAGE AUTOMATION ENDPOINT =====================
app.post('/run/createGroups', async (req, res) => {
    const { baseUrl, username, password, groups, duplicateStrategy } = req.body;
    if (!baseUrl || !username || !password || !groups) {
        browser_1.automationEvents.emit('error', 'Missing required fields for group creation');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(groups) || groups.length === 0) {
        browser_1.automationEvents.emit('error', 'Groups must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Groups must be a non-empty array' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing group creation request...');
        const result = await (0, jobRunner_1.runCreateGroups)(baseUrl, username, password, groups, duplicateStrategy);
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'Group Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { group: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: hasSuccess,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Group creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'Group Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { group: [{ group: groups[0]?.name || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
    }
});
// ===================== CREATE SUB CATEGORIES =====================
app.post('/run/createSubCategories', async (req, res) => {
    const { baseUrl, username, password, subCategories, duplicateStrategy } = req.body;
    if (!baseUrl || !username || !password || !subCategories) {
        browser_1.automationEvents.emit('error', 'Missing required fields for sub category creation');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(subCategories) || subCategories.length === 0) {
        browser_1.automationEvents.emit('error', 'Sub Categories must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Sub Categories must be a non-empty array' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing sub category creation request...');
        const result = await (0, jobRunner_1.runCreateSubCategories)(baseUrl, username, password, subCategories, duplicateStrategy);
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'Sub Category Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { subCategory: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: hasSuccess,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Sub Category creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'Sub Category Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { subCategory: [{ subCategory: subCategories[0]?.subCategoryName || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
    }
});
// ===================== CREATE FUNCTIONAL ROLES =====================
app.post('/run/createFunctionalRoles', async (req, res) => {
    const { baseUrl, username, password, functionalRoles, duplicateStrategy } = req.body;
    if (!baseUrl || !username || !password || !functionalRoles) {
        browser_1.automationEvents.emit('error', 'Missing required fields for functional role creation');
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!Array.isArray(functionalRoles) || functionalRoles.length === 0) {
        browser_1.automationEvents.emit('error', 'FunctionalRoles must be a non-empty array');
        return res.status(400).json({ success: false, message: 'Functional Roles must be a non-empty array' });
    }
    try {
        browser_1.automationEvents.emit('log', 'Processing functional role creation request...');
        const result = await (0, jobRunner_1.runCreateFunctionalRoles)(baseUrl, username, password, functionalRoles, duplicateStrategy);
        const hasSuccess = result.some((r) => r.status === 'created' || r.status === 'created-appended');
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'Functional Role Creation',
            timestamp,
            adminUser: username,
            baseUrl,
            results: { functionalRole: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: hasSuccess,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `Functional Role creation failed: ${String(err)}`);
        try {
            const timestamp = new Date().toISOString();
            const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
                operation: 'Functional Role Creation',
                timestamp,
                adminUser: username,
                baseUrl,
                results: { functionalRole: [{ functionalRole: functionalRoles[0]?.name || 'N/A', status: 'error', message: String(err) }] }
            });
            const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
            res.status(500).json({ success: false, message: String(err), pdfFileName: fileName, pdfDownloadUrl: `/download-audit/${fileName}` });
        }
        catch {
            res.status(500).json({ success: false, message: String(err) });
        }
    }
});
// ===================== NATURAL LANGUAGE AUTOMATION ENDPOINT =====================
app.post('/run/nlp-automation', async (req, res) => {
    const { baseUrl, username, password, command } = req.body;
    // Only command is required for standalone AI automation
    if (!command) {
        browser_1.automationEvents.emit('error', 'Command is required for AI automation');
        return res.status(400).json({ success: false, message: 'Command is required' });
    }
    try {
        browser_1.automationEvents.emit('log', '🤖 Processing AI automation request...');
        // Use provided credentials or empty strings (AI will work without them)
        const result = await (0, nlpAutomation_1.executeNLPCommand)(baseUrl || '', username || '', password || '', command);
        // Generate PDF audit trail
        const timestamp = new Date().toISOString();
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation: 'AI Browser Automation',
            timestamp,
            adminUser: username || 'AI User',
            baseUrl: baseUrl || 'Command-driven',
            results: { nlp: result }
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: result.success,
            result,
            pdfFileName: fileName,
            pdfDownloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `AI automation failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
// ===================== PDF AUDIT TRAIL ENDPOINTS =====================
/**
 * Generate PDF audit trail from operation results
 */
app.post('/generate-audit-pdf', async (req, res) => {
    try {
        const { operation, adminUser, baseUrl, results } = req.body;
        if (!operation || !adminUser || !baseUrl || !results) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: operation, adminUser, baseUrl, results'
            });
        }
        const timestamp = new Date().toISOString();
        browser_1.automationEvents.emit('log', `Generating PDF audit report for: ${operation}`);
        const pdfPath = await (0, pdfGenerator_1.generateAuditPDF)({
            operation,
            timestamp,
            adminUser,
            baseUrl,
            results
        });
        const fileName = pdfPath.split(/[/\\]/).pop() || 'audit-report.pdf';
        browser_1.automationEvents.emit('log', `✓ PDF audit report generated: ${fileName}`);
        res.json({
            success: true,
            message: 'PDF audit report generated successfully',
            fileName,
            downloadUrl: `/download-audit/${fileName}`
        });
    }
    catch (err) {
        browser_1.automationEvents.emit('error', `PDF generation failed: ${String(err)}`);
        res.status(500).json({ success: false, message: String(err) });
    }
});
/**
 * Download audit PDF
 */
app.get('/download-audit/:fileName', (req, res) => {
    try {
        const { fileName } = req.params;
        const filePath = path_1.default.join(process.cwd(), 'audit-reports', fileName);
        if (!require('fs').existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        res.download(filePath, fileName, (err) => {
            if (err) {
                browser_1.automationEvents.emit('error', `PDF download failed: ${String(err)}`);
                res.status(500).json({ success: false, message: String(err) });
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});
/**
 * Get list of all audit reports
 */
app.get('/audit-reports', (req, res) => {
    try {
        const reports = (0, pdfGenerator_1.getAuditReports)();
        res.json({ success: true, reports });
    }
    catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});
// ===================== OLLAMA AI CHAT ENDPOINTS =====================
/**
 * Main Ollama AI Chat endpoint — understands natural language and drives browser
 */
app.post('/run/ollama-chat', async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }
    // Safety timeout to prevent continuous loading in UI
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI response timed out (300s). Please try again.')), 300000);
    });
    try {
        browser_1.automationEvents.emit('log', `💬 Ollama Chat: "${message}"`);
        const engine = (0, ollamaAutomation_1.getOrCreateEngine)(''); // API Key not needed for local Ollama
        // Race the processing against a 90s timeout
        const result = await Promise.race([
            engine.sendMessage(message),
            timeoutPromise
        ]);
        res.json(result);
    }
    catch (err) {
        const errMsg = String(err);
        console.error('[Ollama API] Error:', errMsg);
        browser_1.automationEvents.emit('error', `Ollama chat failed: ${errMsg}`);
        res.status(500).json({
            success: false,
            reply: `❌ Request Error: ${errMsg}`,
            message: errMsg
        });
    }
});
/**
 * Close the browser session
 */
app.post('/run/ollama-close', async (_req, res) => {
    try {
        await (0, ollamaAutomation_1.closeEngine)();
        res.json({ success: true, message: 'Browser session closed.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});
/**
 * Ollama status — check if configured
 */
app.get('/run/ollama-status', (_req, res) => {
    res.json({
        configured: true,
        model: 'qwen2.5:7b',
        setupUrl: 'http://localhost:11434'
    });
});
// ===================== MCP AGENT ENDPOINTS =====================
/**
 * Main Playwright MCP integration endpoint
 */
app.post('/run/mcp-agent', async (req, res) => {
    const { message, geminiApiKey } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI response timed out (300s). Please try again.')), 300000);
    });
    try {
        browser_1.automationEvents.emit('log', `💬 MCP Agent Request: "${message}"`);
        const engine = (0, ollamaMcpAgent_1.getOrCreateMcpEngine)();
        const result = await Promise.race([
            engine.runTask(message, geminiApiKey),
            timeoutPromise
        ]);
        res.json(result);
    }
    catch (err) {
        const errMsg = String(err);
        console.error('[MCP API] Error:', errMsg);
        browser_1.automationEvents.emit('error', `MCP agent failed: ${errMsg}`);
        res.status(500).json({
            success: false,
            reply: `❌ Request Error: ${errMsg}`,
            message: errMsg
        });
    }
});
/**
 * Close the MCP browser session
 */
app.post('/run/mcp-close', async (_req, res) => {
    try {
        await (0, ollamaMcpAgent_1.closeMcpEngine)();
        res.json({ success: true, message: 'MCP Browser session closed.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: String(err) });
    }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    // ── Silent background warm-up ────────────────────────────────────────────
    // Start the MCP agent + browser in the background so the first user message
    // doesn't have to wait for the cold-start (npx @playwright/mcp takes ~15s).
    setTimeout(() => {
        const engine = (0, ollamaMcpAgent_1.getOrCreateMcpEngine)();
        engine.startAgent().then(() => {
            console.log('[Warm-up] ✅ MCP browser agent is ready and warm.');
        }).catch((err) => {
            console.warn('[Warm-up] ⚠️ Background warm-up failed (will retry on first request):', String(err));
        });
    }, 1000); // 1s delay so the server is fully up first
});

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNLPCommand = executeNLPCommand;
exports.transcribeVoice = transcribeVoice;
const playwright_1 = require("playwright");
const browser_1 = require("../../core/browser");
const createCategory_1 = require("../createCategory");
const createSubCategory_1 = require("../createSubCategory");
const createFunctionalRole_1 = require("../createFunctionalRole");
const createDepartment_1 = require("../createDepartment");
const createGroup_1 = require("../createGroup");
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
/**
 * Execute natural language commands using Playwright & Groq/Ollama
 * Upgraded to use established framework procedures for maximum robustness.
 */
async function executeNLPCommand(baseUrl, username, password, command) {
    let browser = null;
    let page = null;
    try {
        browser_1.automationEvents.emit('log', `🤖 Starting Framework-Aware AI Automation...`);
        browser_1.automationEvents.emit('log', `📝 User Command: "${command}"`);
        browser = await playwright_1.chromium.launch({ headless: false });
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        page = await context.newPage();
        const result = await parseAndExecuteSmartCommand(page, command, username, password, baseUrl);
        browser_1.automationEvents.emit('log', '✅ AI automation sequence completed');
        return { success: true, command, result };
    }
    catch (error) {
        browser_1.automationEvents.emit('error', `❌ AI automation failed: ${String(error)}`);
        throw error;
    }
    finally {
        if (page) {
            await page.waitForTimeout(3000);
            await page.close();
        }
        if (browser)
            await browser.close();
    }
}
/**
 * Transcribe voice using Groq Whisper
 */
async function transcribeVoice(audioBase64) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        throw new Error("GROQ_API_KEY is missing. AI transcription requires an API key.");
    }
    const groq = new groq_sdk_1.default({ apiKey: groqKey });
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, `voice_${Date.now()}.webm`);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(tmpPath, audioBuffer);
    try {
        browser_1.automationEvents.emit('log', '🔊 Transcribing voice using Groq Whisper...');
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tmpPath),
            model: "whisper-large-v3",
            prompt: "Transcribe ValGenesis automation commands like 'Login' or 'Create Category'.",
            language: "en",
            response_format: "json",
        });
        return transcription.text;
    }
    finally {
        if (fs.existsSync(tmpPath))
            fs.unlinkSync(tmpPath);
    }
}
const SYSTEM_PROMPT = `You are a ValGenesis Automation Expert.
MISSION: Transcribe the intent into a JSON plan using PROCEDURES below.
SUMMARY: In your JSON response, include a "summary" field (2-3 sentences) describing exactly what you are doing from a validation perspective.
PROCEDURES (Prefer these for maximum speed):
  - create_category(categories: Array<{name, prefix, description}>)
  - create_sub_category(subCategories: Array<{category, name, prefix, description}>)
  - create_functional_role(roles: Array<{name, prefix, description}>)
  - create_department(departments: Array<{name, description}>)
  - create_group(groups: Array<{name, groupType, description, allUsers: boolean}>)
LOGIN/NAVIGATE: Always login first if not at dashboard.
UNIQUENESS: For any name/prefix, USE the current timestamp + random 3 digits (e.g., 'Auditor_1741582231492').
  - CRITICAL: Never copy the example value exactly. Generate a NEW value for every run.
- CRITICAL: NO JAVASCRIPT EXPRESSIONS. Do NOT use "+" or "Date()" in JSON. Provide final literal strings ONLY.
- If no procedure exists, use raw actions: "click", "fill", "hover", "wait", "screenshot".
- VALGENESIS LOCATOR LIBRARY (ONLY for raw actions):
  - System Link: "role=link[name=' System']"
  - Create Tab: "span:has-text('Create')"
  - Ok Button (Popup): "role=link[name='ok']" or "role=button[name='Ok']"
- Wrap the response in raw JSON ONLY. No markdown. No text.`;
async function takeAuditScreenshot(page, caption) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Evidence_${timestamp}.png`;
    const reportsDir = path.join(process.cwd(), 'audit-reports', 'evidence');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    const filePath = path.join(reportsDir, fileName);
    const relativePath = `audit-reports/evidence/${fileName}`;
    await page.screenshot({ path: filePath, fullPage: true });
    return {
        path: relativePath,
        caption,
        timestamp: new Date().toISOString()
    };
}
async function parseAndExecuteSmartCommand(page, command, username, password, baseUrl) {
    const results = { actions: [], screenshots: [], summary: '' };
    const currentTime = new Date().toISOString();
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${command}\n\nContext:\nbaseUrl: ${baseUrl}\nusername: ${username}\npassword: ${password}\nCurrent Time: ${currentTime}`;
    browser_1.automationEvents.emit('log', '🧠 Analyzing command using framework domain knowledge...');
    let jsonStr;
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            jsonStr = await callGroqAPI(fullPrompt, groqKey);
        }
        else {
            jsonStr = await callOllamaAPI(fullPrompt);
        }
    }
    catch (e) {
        throw new Error(`AI fail: ${e}`);
    }
    let plan;
    try {
        let clean = jsonStr.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim();
        if (!clean.startsWith('{')) {
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch)
                clean = jsonMatch[0];
        }
        if (clean.includes('" +') || clean.includes("Date(")) {
            browser_1.automationEvents.emit('log', '⚠️ AI returned JS expressions instead of static JSON. Attempting recovery...');
            try {
                const recoveryFn = new Function(`return (${clean})`);
                plan = recoveryFn();
            }
            catch (evalErr) {
                browser_1.automationEvents.emit('log', `❌ Recovery failed: ${evalErr}`);
                plan = JSON.parse(clean);
            }
        }
        else {
            plan = JSON.parse(clean);
        }
    }
    catch (e) {
        throw new Error(`Invalid JSON from AI: ${jsonStr}`);
    }
    results.summary = plan.summary || "Automated execution using enterprise framework procedures.";
    for (const act of plan.actions) {
        try {
            if (act.action === 'navigate') {
                const url = act.url || baseUrl;
                browser_1.automationEvents.emit('log', `🌐 Navigating to: ${url}`);
                await page.goto(url, { waitUntil: 'load' });
                results.actions.push({ action: 'navigate', url, status: 'completed' });
            }
            else if (act.action === 'login') {
                const u = act.username || username;
                const p = act.password || password;
                browser_1.automationEvents.emit('log', `🔐 Logging in as: ${u}`);
                await page.locator('#txtUserName').fill(u);
                await page.locator('#txtPassword').fill(p);
                await page.locator('#btnSubmit').click();
                await page.waitForTimeout(5000);
                const okBtn = page.getByRole('link', { name: 'ok' });
                if (await okBtn.count() > 0 && await okBtn.first().isVisible())
                    await okBtn.first().click();
                results.actions.push({ action: 'login', username: u, status: 'completed' });
                results.screenshots.push(await takeAuditScreenshot(page, "Post-Login Dashboard State (Base Evidence)"));
            }
            else if (act.action === 'call_procedure') {
                browser_1.automationEvents.emit('log', `⚡ Calling Framework Procedure: ${act.procedure}`);
                let procResult;
                switch (act.procedure) {
                    case 'create_category':
                        procResult = await (0, createCategory_1.createCategory)(page, act.args.categories);
                        break;
                    case 'create_sub_category':
                        procResult = await (0, createSubCategory_1.createSubCategory)(page, act.args.subCategories);
                        break;
                    case 'create_functional_role':
                        procResult = await (0, createFunctionalRole_1.createFunctionalRole)(page, act.args.roles);
                        break;
                    case 'create_department':
                        procResult = await (0, createDepartment_1.createDepartment)(page, act.args.departments);
                        break;
                    case 'create_group':
                        procResult = await (0, createGroup_1.createGroup)(page, act.args.groups);
                        break;
                    default:
                        throw new Error(`Unknown procedure: ${act.procedure}`);
                }
                let overallStatus = 'completed';
                if (Array.isArray(procResult)) {
                    const hasFailure = procResult.some(r => r.status === 'error' || r.status === 'failed');
                    const hasSkip = procResult.some(r => r.status === 'skipped');
                    if (hasFailure)
                        overallStatus = 'sub-item-failed';
                    else if (hasSkip)
                        overallStatus = 'warning (duplicate/skipped)';
                }
                results.actions.push({ action: act.procedure, status: overallStatus, detail: procResult });
                results.screenshots.push(await takeAuditScreenshot(page, `Evidence after procedure: ${act.procedure}`));
            }
            else if (act.action === 'click') {
                await page.locator(act.selector).first().click({ force: true });
                results.actions.push({ action: 'click', selector: act.selector, status: 'completed' });
            }
            else if (act.action === 'fill') {
                await page.locator(act.selector).first().fill(act.value);
                results.actions.push({ action: 'fill', selector: act.selector, value: act.value, status: 'completed' });
            }
            else if (act.action === 'wait') {
                await page.waitForTimeout(act.timeout || 2000);
                results.actions.push({ action: 'wait', status: 'completed' });
            }
            else if (act.action === 'screenshot') {
                const ss = await takeAuditScreenshot(page, act.caption || "Manual Screenshot");
                results.screenshots.push(ss);
                results.actions.push({ action: 'screenshot', path: ss.path, status: 'completed' });
            }
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `Action failed: ${act.action} - ${err}`);
            results.actions.push({ action: act.action, status: 'failed', error: String(err) });
        }
    }
    return results;
}
async function callGroqAPI(prompt, apiKey) {
    const groq = new groq_sdk_1.default({ apiKey });
    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        response_format: { type: "json_object" }
    });
    return completion.choices[0]?.message?.content || "";
}
async function callOllamaAPI(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: "qwen2.5:7b",
            prompt: prompt,
            stream: false,
            format: "json"
        });
        const req = http.request({
            hostname: 'localhost',
            port: 11434,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.response);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

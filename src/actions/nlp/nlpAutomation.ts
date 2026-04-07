import { chromium, Browser, Page } from 'playwright';
import { automationEvents } from '../../core/browser';
import { waitForOverlayGone, waitForPostback } from '../../core/navigation';
import { createCategory } from '../createCategory';
import { createSubCategory } from '../createSubCategory';
import { createFunctionalRole } from '../createFunctionalRole';
import { createDepartment } from '../createDepartment';
import { createGroup } from '../createGroup';
import { createWorkflow } from '../createWorkflow';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Groq from 'groq-sdk';

/**
 * Execute natural language commands using Playwright & Groq/Ollama
 * Upgraded to use established framework procedures for maximum robustness.
 */
export async function executeNLPCommand(
    baseUrl: string,
    username: string,
    password: string,
    command: string
): Promise<any> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        automationEvents.emit('log', `🤖 Starting Framework-Aware AI Automation...`);
        automationEvents.emit('log', `📝 User Command: "${command}"`);

        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        page = await context.newPage();

        const result = await parseAndExecuteSmartCommand(page, command, username, password, baseUrl);

        automationEvents.emit('log', '✅ AI automation sequence completed');
        return { success: true, command, result };
    } catch (error) {
        automationEvents.emit('error', `❌ AI automation failed: ${String(error)}`);
        throw error;
    } finally {
        if (page) {
            await page.waitForTimeout(3000);
            await page.close();
        }
        if (browser) await browser.close();
    }
}

/**
 * Transcribe voice using Groq Whisper
 */
export async function transcribeVoice(audioBase64: string): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        throw new Error("GROQ_API_KEY is missing. AI transcription requires an API key.");
    }

    const groq = new Groq({ apiKey: groqKey });
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, `voice_${Date.now()}.webm`);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(tmpPath, audioBuffer);

    try {
        automationEvents.emit('log', '🔊 Transcribing voice using Groq Whisper...');
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tmpPath) as any,
            model: "whisper-large-v3",
            prompt: "Transcribe ValGenesis automation commands like 'Login' or 'Create Category'.",
            language: "en",
            response_format: "json",
        });
        return transcription.text;
    } finally {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
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
  - create_workflow(workflows: Array<{name, description?, applicableTo?: ["Authoring"|"Exception"|"Execution"|"Project"|"Scheduler"|"System Manager"|"Assessment"], reviewRequired?: boolean, reviewGroups?: string[], reviewSteps?: [{functionalRole?, periodDays?, frequencyDays?, serialParallel?:"Serial"|"Parallel"}], approvalGroups?: string[], approvalSteps?: [{functionalRole?, periodDays?, frequencyDays?, serialParallel?:"Serial"|"Parallel"}]}>)
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

async function takeAuditScreenshot(page: Page, caption: string): Promise<{ path: string; caption: string; timestamp: string }> {
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

async function parseAndExecuteSmartCommand(page: Page, command: string, username: string, password: string, baseUrl: string) {
    const results: any = { actions: [], screenshots: [], summary: '' };
    const currentTime = new Date().toISOString();
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser request: ${command}\n\nContext:\nbaseUrl: ${baseUrl}\nusername: ${username}\npassword: ${password}\nCurrent Time: ${currentTime}`;

    automationEvents.emit('log', '🧠 Analyzing command using framework domain knowledge...');
    let jsonStr: string;
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            jsonStr = await callGroqAPI(fullPrompt, groqKey);
        } else {
            jsonStr = await callOllamaAPI(fullPrompt);
        }
    } catch (e) {
        throw new Error(`AI fail: ${e}`);
    }

    let plan;
    try {
        let clean = jsonStr.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/\s*```\s*$/im, '').trim();
        if (!clean.startsWith('{')) {
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) clean = jsonMatch[0];
        }
        
        if (clean.includes('" +') || clean.includes("Date(")) {
            automationEvents.emit('log', '⚠️ AI returned JS expressions instead of static JSON. Attempting recovery...');
            try {
                const recoveryFn = new Function(`return (${clean})`);
                plan = recoveryFn();
            } catch (evalErr) {
                automationEvents.emit('log', `❌ Recovery failed: ${evalErr}`);
                plan = JSON.parse(clean); 
            }
        } else {
            plan = JSON.parse(clean);
        }
    } catch (e) {
        throw new Error(`Invalid JSON from AI: ${jsonStr}`);
    }

    results.summary = plan.summary || "Automated execution using enterprise framework procedures.";

    for (const act of plan.actions) {
        try {
            if (act.action === 'navigate') {
                const url = act.url || baseUrl;
                automationEvents.emit('log', `🌐 Navigating to: ${url}`);
                await page.goto(url, { waitUntil: 'load' });
                results.actions.push({ action: 'navigate', url, status: 'completed' });
            }
            else if (act.action === 'login') {
                const u = act.username || username;
                const p = act.password || password;
                automationEvents.emit('log', `🔐 Logging in as: ${u}`);
                await page.locator('#txtUserName').fill(u);
                await page.locator('#txtPassword').fill(p);
                await page.locator('#btnSubmit').click();
                await page.waitForTimeout(5000);
                const okBtn = page.getByRole('link', { name: 'ok' });
                if (await okBtn.count() > 0 && await okBtn.first().isVisible()) await okBtn.first().click();
                
                results.actions.push({ action: 'login', username: u, status: 'completed' });
                results.screenshots.push(await takeAuditScreenshot(page, "Post-Login Dashboard State (Base Evidence)"));
            }
            else if (act.action === 'call_procedure') {
                automationEvents.emit('log', `⚡ Calling Framework Procedure: ${act.procedure}`);
                let procResult;
                switch (act.procedure) {
                    case 'create_category':
                        procResult = await createCategory(page, act.args.categories);
                        break;
                    case 'create_sub_category':
                        procResult = await createSubCategory(page, act.args.subCategories);
                        break;
                    case 'create_functional_role':
                        procResult = await createFunctionalRole(page, act.args.roles);
                        break;
                    case 'create_department':
                        procResult = await createDepartment(page, act.args.departments);
                        break;
                    case 'create_group':
                        procResult = await createGroup(page, act.args.groups);
                        break;
                    case 'create_workflow':
                        procResult = await createWorkflow(page, act.args.workflows);
                        break;
                    default:
                        throw new Error(`Unknown procedure: ${act.procedure}`);
                }
                
                let overallStatus = 'completed';
                if (Array.isArray(procResult)) {
                    const hasFailure = procResult.some(r => r.status === 'error' || r.status === 'failed');
                    const hasSkip = procResult.some(r => r.status === 'skipped');
                    if (hasFailure) overallStatus = 'sub-item-failed';
                    else if (hasSkip) overallStatus = 'warning (duplicate/skipped)';
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
        } catch (err) {
            automationEvents.emit('error', `Action failed: ${act.action} - ${err}`);
            results.actions.push({ action: act.action, status: 'failed', error: String(err) });
        }
    }

    return results;
}

async function callGroqAPI(prompt: string, apiKey: string): Promise<string> {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        response_format: { type: "json_object" }
    });
    return completion.choices[0]?.message?.content || "";
}

async function callOllamaAPI(prompt: string): Promise<string> {
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
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

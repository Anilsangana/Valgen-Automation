import * as https from 'https';
import { chromium, Browser, Page } from 'playwright';
import { automationEvents } from '../../core/browser';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface GeminiResult {
    success: boolean;
    reply: string;
    actionsPerformed: string[];
    screenshot?: string; // base64
    error?: string;
}

// ─── Playwright Action Interface ───────────────────────────────────────────────

interface PlaywrightAction {
    action: 'navigate' | 'click' | 'fill' | 'screenshot' | 'wait' | 'scroll' | 'press' | 'select' | 'hover' | 'getText' | 'done';
    url?: string;
    selector?: string;
    text?: string;
    value?: string;
    key?: string;
    description: string;
}

// ─── System Prompt for Ollama ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert browser automation assistant for the ValGenesis automation system. 
Your job is to help users automate browser tasks using Playwright.

When a user asks you to do something in the browser, respond with a JSON object (and ONLY JSON, no markdown, no extra text) in this exact format:

{
  "reply": "A friendly human-readable description of what you are about to do",
  "actions": [
    {
      "action": "navigate",
      "url": "https://example.com",
      "description": "Navigate to example.com"
    },
    {
      "action": "click",
      "selector": "button:has-text('Login')",
      "description": "Click the Login button"
    },
    {
      "action": "fill",
      "selector": "#txtUserName",
      "value": "admin",
      "description": "Fill in username"
    },
    {
      "action": "fill",
      "selector": "#txtPassword",
      "value": "password",
      "description": "Fill in password"
    },
    {
      "action": "click",
      "selector": "#btnSubmit",
      "description": "Click the Login button"
    },
    {
      "action": "screenshot",
      "description": "Take a screenshot"
    },
    {
      "action": "done",
      "description": "All done!"
    }
  ]
}

Available actions:
- navigate: { action, url, description }
- click: { action, selector (Playwright CSS/text selector), description }
- fill: { action, selector, value, description }
- screenshot: { action, description }
- wait: { action, text (wait for text to appear), description }
- scroll: { action, description }
- press: { action, key (e.g. "Enter", "Tab"), description }
- select: { action, selector, value, description }
- hover: { action, selector, description }
- getText: { action, selector, description }
- done: { action, description }

IMPORTANT RULES:
1. ALWAYS respond with valid JSON only. No markdown code blocks. No explanation outside JSON.
2. Use text-based selectors when possible: button:has-text('Submit'), [placeholder='Email']
3. For ValGenesis app: base URL is typically http://localhost:4200 or whatever the user specifies
4. If the user asks a general question (not a browser task), still return JSON with actions: [{ action: "done", description: "..." }] and put your answer in "reply"
5. Be smart about selectors — use aria-label, placeholder, role, and text content
6. Always end with a "done" action

If the user is asking a CONVERSATIONAL question (not browser automation), respond:
{
  "reply": "Your answer here",
  "actions": [{ "action": "done", "description": "No browser action needed" }]
}`;

// ─── Ollama Automation Engine ──────────────────────────────────────────────────

export class OllamaAutomationEngine {
    private apiKey: string;
    private browser: Browser | null = null;
    private page: Page | null = null;
    private chatHistory: ChatMessage[] = [];

    constructor(apiKey: string) {
        this.apiKey = apiKey; // API Key is not typically needed for Ollama, kept for interface compliance
    }

    // ── Call Ollama REST API directly via Node.js http ───────────────────────
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async callOllamaAPI(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

            const body = JSON.stringify({
                model: 'qwen2.5:7b', // Update to your preferred Ollama model
                prompt: prompt,
                stream: false,
                options: { temperature: 0.2, num_predict: 2048 }
            });

            const http = require('http'); // Used for local Ollama default port

            const options: any = {
                hostname: 'localhost',
                port: 11434,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };

            const req = http.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: Buffer) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            done(() => reject(new Error(`Ollama API error: ${parsed.error}`)));
                            return;
                        }
                        const text = parsed?.response;
                        if (!text) {
                            done(() => reject(new Error(`No text in Ollama response. Raw: ${data.substring(0, 300)}`)));
                            return;
                        }
                        done(() => resolve(text.trim()));
                    } catch (e) {
                        done(() => reject(new Error(`Failed to parse Ollama response: ${data.substring(0, 300)}`)));
                    }
                });
                res.on('error', (e: Error) => done(() => reject(new Error(`Response error: ${e.message}`))));
            });

            req.on('error', (e: Error) => done(() => reject(new Error(`HTTP request failed: ${e.message}`))));
            req.setTimeout(300000, () => { req.destroy(); done(() => reject(new Error('Request timeout (300s)'))); });
            req.write(body);
            req.end();
        });
    }

    // ── Start browser session ──────────────────────────────────────────────────

    async startBrowser(): Promise<void> {
        if (!this.browser) {
            automationEvents.emit('log', '🌐 Starting browser session...');
            try {
                this.browser = await chromium.launch({
                    headless: false,
                    channel: 'chrome',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const context = await this.browser.newContext({
                    viewport: { width: 1280, height: 800 }
                });
                this.page = await context.newPage();
                automationEvents.emit('log', '✅ Browser session started!');
            } catch (err) {
                automationEvents.emit('error', `❌ Browser launch failed: ${String(err)}`);
                throw err;
            }
        }
    }

    // ── Close browser session ──────────────────────────────────────────────────

    async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            automationEvents.emit('log', '🔒 Browser session closed.');
        }
    }

    // ── Send message to Ollama ─────────────────────────────────────────────────

    async sendMessage(userMessage: string): Promise<GeminiResult> {
        automationEvents.emit('log', `💬 User: "${userMessage}"`);
        automationEvents.emit('log', '🤖 Ollama is thinking...');

        const actionsPerformed: string[] = [];
        let screenshotBase64: string | undefined;

        try {
            // Build conversation history context
            const historyContext = this.chatHistory
                .slice(-6) // Keep last 6 messages for context
                .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                .join('\n');

            // Build the full prompt with system instructions
            const fullPrompt = historyContext
                ? `${SYSTEM_PROMPT}\n\nPrevious conversation:\n${historyContext}\n\nNew request: ${userMessage}`
                : `${SYSTEM_PROMPT}\n\nUser request: ${userMessage}`;

            // Call Ollama REST API directly
            automationEvents.emit('log', '📡 Sending request to Ollama API...');
            const responseText = await this.callOllamaAPI(fullPrompt);

            automationEvents.emit('log', `🔍 Ollama response (first 200 chars): ${responseText.substring(0, 200)}`);
            automationEvents.emit('log', '🤖 Ollama responded, parsing actions...');

            // Parse JSON response — try multiple extraction strategies
            let parsed: { reply: string; actions: PlaywrightAction[] };
            try {
                // Strategy 1: Strip markdown code fences
                let clean = responseText
                    .replace(/^```json\s*/im, '')
                    .replace(/^```\s*/im, '')
                    .replace(/\s*```\s*$/im, '')
                    .trim();

                // Strategy 2: Extract JSON object if wrapped in extra text
                if (!clean.startsWith('{')) {
                    const jsonMatch = clean.match(/\{[\s\S]*\}/);
                    if (jsonMatch) clean = jsonMatch[0];
                }

                parsed = JSON.parse(clean);
            } catch (jsonErr) {
                // Fallback: extract any text that looks like a reply
                const simpleReply = responseText.split('{')[0].trim() || responseText.substring(0, 200);
                automationEvents.emit('log', `⚠️ Could not parse JSON. Using raw response as reply.`);
                parsed = {
                    reply: simpleReply || 'I processed your request but could not format the actions properly.',
                    actions: [{ action: 'done', description: 'Conversational response' }]
                };
            }

            automationEvents.emit('log', `📋 Plan: ${parsed.reply}`);

            // Execute actions
            const needsBrowser = parsed.actions.some(a => a.action !== 'done');
            if (needsBrowser && !this.browser) {
                await this.startBrowser();
            }

            for (const action of parsed.actions) {
                if (action.action === 'done') {
                    actionsPerformed.push(`✅ ${action.description}`);
                    break;
                }

                automationEvents.emit('log', `⚡ Executing: ${action.description}`);

                try {
                    screenshotBase64 = await this.executeAction(action);
                    actionsPerformed.push(`✅ ${action.description}`);
                } catch (actionErr) {
                    const errMsg = `❌ Failed: ${action.description} — ${String(actionErr)}`;
                    automationEvents.emit('error', errMsg);
                    actionsPerformed.push(errMsg);
                }
            }

            // Save to chat history
            this.chatHistory.push({ role: 'user', content: userMessage, timestamp: new Date().toISOString() });
            this.chatHistory.push({ role: 'assistant', content: parsed.reply, timestamp: new Date().toISOString() });

            return {
                success: true,
                reply: parsed.reply,
                actionsPerformed,
                screenshot: screenshotBase64
            };

        } catch (err) {
            const errStr = String(err);
            const msg = `❌ Ollama error: ${errStr}`;
            automationEvents.emit('error', msg);
            console.error('[OllamaAutomation] Error:', err);

            // Build a user-friendly but informative error message
            let friendlyMsg = errStr;
            if (errStr.includes('ECONNREFUSED')) {
                friendlyMsg = '⚠️ Connection refused. Make sure Ollama is running locally on port 11434.';
            } else if (errStr.includes('network') || errStr.includes('ENOTFOUND')) {
                friendlyMsg = '⚠️ Network error. Check your connection to Ollama and try again.';
            }

            return {
                success: false,
                reply: `❌ Error: ${friendlyMsg}`,
                actionsPerformed,
                error: errStr
            };
        }
    }

    // ── Execute a single Playwright action ────────────────────────────────────

    private async executeAction(action: PlaywrightAction): Promise<string | undefined> {
        if (!this.page) throw new Error('Browser not started');
        const page = this.page;

        switch (action.action) {
            case 'navigate': {
                if (!action.url) throw new Error('URL required for navigate');
                automationEvents.emit('log', `🌐 Navigating to: ${action.url}`);
                await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(1000);
                break;
            }

            case 'click': {
                if (!action.selector) throw new Error('Selector required for click');
                automationEvents.emit('log', `🖱️ Clicking: ${action.selector}`);
                await page.locator(action.selector).first().click({ timeout: 15000 });
                await page.waitForTimeout(500);
                break;
            }

            case 'fill': {
                if (!action.selector || action.value === undefined) throw new Error('Selector + value required for fill');
                automationEvents.emit('log', `⌨️ Filling "${action.value}" into: ${action.selector}`);
                await page.locator(action.selector).first().fill(action.value, { timeout: 15000 });
                await page.waitForTimeout(300);
                break;
            }

            case 'screenshot': {
                automationEvents.emit('log', '📸 Taking screenshot...');
                const screenshotBuf = await page.screenshot({ fullPage: true });
                const base64 = screenshotBuf.toString('base64');
                automationEvents.emit('log', '✅ Screenshot captured!');
                return base64;
            }

            case 'wait': {
                if (action.text) {
                    automationEvents.emit('log', `⏳ Waiting for text: "${action.text}"...`);
                    await page.waitForSelector(`text="${action.text}"`, { timeout: 15000 });
                } else {
                    automationEvents.emit('log', '⏳ Waiting 2 seconds...');
                    await page.waitForTimeout(2000);
                }
                break;
            }

            case 'scroll': {
                automationEvents.emit('log', '📜 Scrolling page...');
                await page.evaluate(() => window.scrollBy(0, 500));
                await page.waitForTimeout(500);
                break;
            }

            case 'press': {
                automationEvents.emit('log', `⌨️ Pressing key: ${action.key}`);
                await page.keyboard.press(action.key || 'Enter');
                await page.waitForTimeout(500);
                break;
            }

            case 'select': {
                if (!action.selector || !action.value) throw new Error('Selector + value required for select');
                automationEvents.emit('log', `📋 Selecting "${action.value}" from: ${action.selector}`);
                await page.locator(action.selector).first().selectOption(action.value);
                break;
            }

            case 'hover': {
                if (!action.selector) throw new Error('Selector required for hover');
                automationEvents.emit('log', `🖱️ Hovering over: ${action.selector}`);
                await page.locator(action.selector).first().hover({ timeout: 10000 });
                break;
            }

            case 'getText': {
                if (!action.selector) throw new Error('Selector required for getText');
                const text = await page.locator(action.selector).first().innerText();
                automationEvents.emit('log', `📝 Text found: "${text}"`);
                break;
            }

            default:
                automationEvents.emit('log', `⚠️ Unknown action: ${(action as any).action}`);
        }

        return undefined;
    }

    // ── Chat history management ────────────────────────────────────────────────

    getChatHistory(): ChatMessage[] {
        return this.chatHistory;
    }

    clearHistory(): void {
        this.chatHistory = [];
        automationEvents.emit('log', '🧹 Chat history cleared.');
    }
}

// ─── Singleton session management (one browser per server) ────────────────────

let activeEngine: OllamaAutomationEngine | null = null;

export function getOrCreateEngine(apiKey: string): OllamaAutomationEngine {
    if (!activeEngine) {
        activeEngine = new OllamaAutomationEngine(apiKey);
    }
    return activeEngine;
}

export async function closeEngine(): Promise<void> {
    if (activeEngine) {
        await activeEngine.closeBrowser();
        activeEngine = null;
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightAgent = void 0;
const test_1 = require("@playwright/test");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const generative_ai_1 = require("@google/generative-ai");
const browser_1 = require("../../core/browser");
// ── System Prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an autonomous browser automation agent controlling a real Chromium browser.

TOOLS AVAILABLE:
- navigate(url)       → opens URL, returns page info (inputs/buttons/links with refs)
- get_page_info()     → refreshes page info after a page change
- click(ref)          → clicks element by ref (b1, l3) OR by its visible text/label
- fill(ref, value)    → types into input by ref (i1, i2, etc.)
- wait(seconds)       → waits 1-15 seconds
- finish(message)     → call when the task is fully done

RULES:
1. navigate() automatically returns page info — no need to call get_page_info() right after.
2. Use the refs (i1, b2, l3) from page info for fill() and click(). Refs reset after every navigate().
3. For SSO/enterprise sites that redirect through a loading screen:
   - If page info shows no inputs/buttons (only a progress bar or blank page) → wait(3) → get_page_info()
   - Repeat up to 3 times until the actual login form appears.
4. After clicking submit/login → get_page_info() to see the new page.
5. After clicking a navigation menu → get_page_info() to see what appeared.
6. ALWAYS call finish() when done — describe what you accomplished and what the final page shows.
7. If a ref click fails → try click() with the visible button text instead.`;
// ── Tool Definitions for Groq ──────────────────────────────────────────────────
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'navigate',
            description: 'Navigate to a URL. Returns page info with all interactive elements (inputs, buttons, links).',
            parameters: {
                type: 'object',
                properties: { url: { type: 'string', description: 'Full URL to navigate to' } },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_page_info',
            description: 'Get current page info: URL, title, inputs (i1...), buttons (b1...), links (l1...). Call after page changes.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'click',
            description: 'Click an element by its ref from page_info (e.g. "b1", "l2") OR by its visible label/text.',
            parameters: {
                type: 'object',
                properties: {
                    ref: { type: 'string', description: 'Element ref (b1, l2) from page_info, or visible text of the button/link' }
                },
                required: ['ref']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'fill',
            description: 'Type a value into an input field using its ref from page_info (i1, i2, etc.).',
            parameters: {
                type: 'object',
                properties: {
                    ref: { type: 'string', description: 'Input ref (i1, i2) from page_info' },
                    value: { type: 'string', description: 'Text to type into the field' }
                },
                required: ['ref', 'value']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'wait',
            description: 'Wait for the specified number of seconds (e.g. for a page to load or redirect to complete).',
            parameters: {
                type: 'object',
                properties: {
                    seconds: { type: 'number', description: 'Number of seconds to wait (1-15)' }
                },
                required: ['seconds']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'finish',
            description: 'Call when the entire task is complete. Provide a clear summary of what was done.',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Summary of completed actions and current page state' }
                },
                required: ['message']
            }
        }
    }
];
// ── PlaywrightAgent ────────────────────────────────────────────────────────────
class PlaywrightAgent {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.elementMap = new Map();
        this.groqClient = null;
        this.geminiClient = null;
        const groqKey = process.env.GROQ_API_KEY?.trim();
        const geminiKey = process.env.GEMINI_API_KEY?.trim();
        if (groqKey) {
            this.groqClient = new groq_sdk_1.default({ apiKey: groqKey });
            console.log('[Smart IMS AI] ⚡ Direct Playwright + Groq llama-3.3-70b');
        }
        else if (geminiKey) {
            this.geminiClient = new generative_ai_1.GoogleGenerativeAI(geminiKey);
            console.log('[Smart IMS AI] ✨ Direct Playwright + Gemini 2.0 Flash');
        }
        else {
            console.log('[Smart IMS AI] ⚠️ No AI key — add GROQ_API_KEY to .env (free at console.groq.com)');
        }
    }
    // ── Browser lifecycle ──────────────────────────────────────────────────────
    async start() {
        if (this.browser)
            return;
        browser_1.automationEvents.emit('log', '🚀 Launching Chromium...');
        this.browser = await test_1.chromium.launch({ headless: false, slowMo: 0 });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        this.page = await this.context.newPage();
        browser_1.automationEvents.emit('log', '✅ Browser ready');
    }
    async close() {
        if (this.browser) {
            await this.browser.close().catch(() => { });
            this.browser = null;
            this.context = null;
            this.page = null;
            this.elementMap.clear();
            browser_1.automationEvents.emit('log', '🔒 Browser session closed.');
        }
    }
    get isRunning() { return !!this.browser; }
    // ── Fast page info extractor (< 100ms vs 50-80s for accessibility tree) ──
    async getPageInfo() {
        if (!this.page)
            return JSON.stringify({ error: 'Browser not started' });
        this.elementMap.clear();
        try {
            const data = await this.page.evaluate(() => {
                const isVisible = (el) => {
                    const r = el.getBoundingClientRect();
                    const s = window.getComputedStyle(el);
                    return r.width > 0 && r.height > 0
                        && s.display !== 'none'
                        && s.visibility !== 'hidden'
                        && s.opacity !== '0';
                };
                const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select')).filter(isVisible).slice(0, 20).map((el, i) => {
                    const id = el.id ? `#${el.id}` : null;
                    const name = el.name ? `[name="${el.name}"]` : null;
                    const label = (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()) ||
                        el.closest('label')?.textContent?.trim() ||
                        el.getAttribute('aria-label') ||
                        el.placeholder || el.name || el.type || '';
                    return {
                        ref: `i${i + 1}`,
                        type: el.type || el.tagName.toLowerCase(),
                        label: label.substring(0, 60).trim(),
                        placeholder: el.placeholder?.substring(0, 40) || '',
                        _sel: id || name || null
                    };
                });
                const buttons = Array.from(document.querySelectorAll('button, input[type=submit], input[type=button], [role=button]')).filter(isVisible).slice(0, 20).map((el, i) => {
                    const text = (el.textContent?.trim() ||
                        el.value ||
                        el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').substring(0, 80);
                    const id = el.id ? `#${el.id}` : null;
                    return { ref: `b${i + 1}`, text: text || `button-${i + 1}`, _sel: id };
                });
                const links = Array.from(document.querySelectorAll('a[href]'))
                    .filter(isVisible)
                    .filter(el => el.textContent?.trim())
                    .slice(0, 15)
                    .map((el, i) => ({
                    ref: `l${i + 1}`,
                    text: el.textContent.trim().replace(/\s+/g, ' ').substring(0, 60),
                    href: el.href
                }));
                const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
                    .filter(isVisible)
                    .map(el => el.textContent?.trim().replace(/\s+/g, ' ').substring(0, 80) || '')
                    .filter(Boolean).slice(0, 4);
                const alerts = Array.from(document.querySelectorAll('[role=alert],.error,.alert,.notification,.toast'))
                    .filter(isVisible)
                    .map(el => el.textContent?.trim().replace(/\s+/g, ' ').substring(0, 200) || '')
                    .filter(Boolean).slice(0, 3);
                return { inputs, buttons, links, headings, alerts };
            });
            // Build element map
            for (const inp of data.inputs) {
                const { _sel, ...rest } = inp;
                this.elementMap.set(inp.ref, {
                    selector: _sel || `input[placeholder="${inp.placeholder}"]`,
                    label: inp.label,
                    kind: 'input'
                });
            }
            for (const btn of data.buttons) {
                const { _sel, ...rest } = btn;
                this.elementMap.set(btn.ref, {
                    selector: _sel || `button`,
                    label: btn.text,
                    kind: 'button'
                });
            }
            for (const lnk of data.links) {
                this.elementMap.set(lnk.ref, {
                    selector: `a`,
                    label: lnk.text,
                    kind: 'link'
                });
            }
            const clean = {
                url: this.page.url(),
                title: await this.page.title(),
                inputs: data.inputs.map(({ _sel, ...r }) => r),
                buttons: data.buttons.map(({ _sel, ...r }) => r),
                links: data.links,
                headings: data.headings,
                alerts: data.alerts.length ? data.alerts : undefined
            };
            return JSON.stringify(clean, null, 2);
        }
        catch (err) {
            return JSON.stringify({ url: this.page.url(), error: String(err) });
        }
    }
    // ── Tool executor ─────────────────────────────────────────────────────────
    async executeTool(name, args) {
        const page = this.page;
        switch (name) {
            case 'navigate': {
                const url = String(args.url);
                browser_1.automationEvents.emit('log', `🌐 navigate(${url})`);
                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                }
                catch {
                    // domcontentloaded might timeout on slow enterprise redirects — still get info
                }
                await page.waitForTimeout(1500);
                return await this.getPageInfo();
            }
            case 'get_page_info': {
                browser_1.automationEvents.emit('log', '📋 get_page_info()');
                return await this.getPageInfo();
            }
            case 'click': {
                const ref = String(args.ref || '');
                const elem = this.elementMap.get(ref);
                browser_1.automationEvents.emit('log', `🖱️ click(${ref}${elem ? ` → "${elem.label}"` : ''})`);
                const strategies = [];
                if (elem) {
                    // Strategy 1: stored selector
                    strategies.push(async () => {
                        await page.locator(elem.selector).first().click({ timeout: 8000 });
                    });
                    // Strategy 2: by visible text
                    if (elem.label) {
                        strategies.push(async () => {
                            await page.getByText(elem.label, { exact: false }).first().click({ timeout: 5000 });
                        });
                    }
                }
                // Strategy 3: treat ref as text directly
                strategies.push(async () => {
                    await page.getByText(ref, { exact: false }).first().click({ timeout: 5000 });
                });
                // Strategy 4: getByRole button
                strategies.push(async () => {
                    await page.getByRole('button', { name: elem?.label || ref }).first().click({ timeout: 5000 });
                });
                for (const s of strategies) {
                    try {
                        await s();
                        break;
                    }
                    catch { /* try next */ }
                }
                await page.waitForTimeout(800);
                return `Clicked. Current URL: ${page.url()}, Title: ${await page.title()}`;
            }
            case 'fill': {
                const ref = String(args.ref || '');
                const value = String(args.value || '');
                const elem = this.elementMap.get(ref);
                if (!elem) {
                    return `Error: ref "${ref}" not found. Call get_page_info() to get fresh refs.`;
                }
                browser_1.automationEvents.emit('log', `⌨️ fill(${ref}, ***)`);
                try {
                    const loc = page.locator(elem.selector).first();
                    await loc.waitFor({ timeout: 8000 });
                    await loc.clear();
                    await loc.fill(value, { timeout: 8000 });
                    return `Filled "${elem.label}" successfully.`;
                }
                catch (err) {
                    // Fallback: try by placeholder or label text
                    try {
                        await page.getByLabel(elem.label, { exact: false }).fill(value, { timeout: 5000 });
                        return `Filled "${elem.label}" via label.`;
                    }
                    catch {
                        return `Error filling "${ref}": ${String(err)}`;
                    }
                }
            }
            case 'wait': {
                const secs = Math.min(Math.max(Number(args.seconds) || 2, 1), 15);
                browser_1.automationEvents.emit('log', `⏳ wait(${secs}s)`);
                await page.waitForTimeout(secs * 1000);
                return `Waited ${secs}s. URL: ${page.url()}`;
            }
            case 'finish': {
                const message = String(args.message || 'Task completed.');
                browser_1.automationEvents.emit('log', `✅ finish: ${message}`);
                return `__DONE__${message}`;
            }
            default:
                return `Unknown tool: ${name}`;
        }
    }
    // ── Main runner ───────────────────────────────────────────────────────────
    async runTask(userMessage, apiKey) {
        if (!this.page)
            await this.start();
        browser_1.automationEvents.emit('log', `💬 Task: "${userMessage}"`);
        // Override key if supplied from UI
        if (apiKey?.trim()) {
            const k = apiKey.trim();
            if (k.startsWith('gsk_')) {
                this.groqClient = new groq_sdk_1.default({ apiKey: k });
            }
            else {
                this.geminiClient = new generative_ai_1.GoogleGenerativeAI(k);
            }
        }
        if (!this.groqClient && !this.geminiClient) {
            return {
                success: false,
                reply: '⚠️ No AI key configured. Add GROQ_API_KEY to your .env file (free key at console.groq.com).',
                actionsPerformed: []
            };
        }
        const actionsPerformed = [];
        try {
            if (this.groqClient) {
                return await this.runWithGroq(userMessage, actionsPerformed);
            }
            else {
                return await this.runWithGemini(userMessage, actionsPerformed);
            }
        }
        catch (err) {
            const msg = String(err);
            if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('quota')) {
                return { success: false, reply: '⏳ AI rate limit hit. Wait a minute and try again.', actionsPerformed };
            }
            return { success: false, reply: `❌ Agent error: ${msg}`, actionsPerformed };
        }
    }
    // ── Groq runner (OpenAI-compatible function calling) ──────────────────────
    async runWithGroq(userMessage, actionsPerformed) {
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
        ];
        const MAX_STEPS = 25;
        for (let step = 1; step <= MAX_STEPS; step++) {
            const t0 = Date.now();
            browser_1.automationEvents.emit('log', `⚡ Groq thinking (Step ${step})...`);
            const resp = await this.groqClient.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages,
                tools: TOOLS,
                tool_choice: 'auto',
                temperature: 0.1,
                max_tokens: 2048
            });
            const msg = resp.choices[0].message;
            browser_1.automationEvents.emit('log', `⏱️ Groq: ${Date.now() - t0}ms — ${msg.tool_calls?.length || 0} tool(s)`);
            messages.push(msg);
            if (!msg.tool_calls?.length) {
                return { success: true, reply: msg.content || 'Task completed.', actionsPerformed };
            }
            for (const call of msg.tool_calls) {
                const args = JSON.parse(call.function.arguments || '{}');
                const t1 = Date.now();
                const result = await this.executeTool(call.function.name, args);
                browser_1.automationEvents.emit('log', `✅ ${call.function.name} in ${Date.now() - t1}ms`);
                actionsPerformed.push(`✅ ${call.function.name}`);
                messages.push({ role: 'tool', tool_call_id: call.id, content: result });
                if (result.startsWith('__DONE__')) {
                    return { success: true, reply: result.replace('__DONE__', ''), actionsPerformed };
                }
            }
        }
        return { success: false, reply: 'Reached max steps.', actionsPerformed };
    }
    // ── Gemini runner (fallback) ──────────────────────────────────────────────
    async runWithGemini(userMessage, actionsPerformed) {
        const genAI = this.geminiClient;
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: SYSTEM_PROMPT
        });
        const geminiDeclarations = TOOLS.map(t => ({
            name: t.function.name,
            description: t.function.description,
            parameters: {
                type: 'OBJECT',
                properties: Object.fromEntries(Object.entries(t.function.parameters.properties || {}).map(([k, v]) => [k, { type: v.type?.toUpperCase(), description: v.description }])),
                required: t.function.parameters.required || []
            }
        }));
        const chat = model.startChat({ tools: [{ functionDeclarations: geminiDeclarations }], history: [] });
        let currentMessage = userMessage;
        for (let step = 1; step <= 25; step++) {
            const t0 = Date.now();
            browser_1.automationEvents.emit('log', `✨ Gemini thinking (Step ${step})...`);
            const result = await chat.sendMessage(currentMessage);
            const parts = result.response.candidates?.[0]?.content?.parts || [];
            const fnCalls = parts.filter((p) => p.functionCall);
            const textPart = parts.find((p) => p.text);
            browser_1.automationEvents.emit('log', `⏱️ Gemini: ${Date.now() - t0}ms — ${fnCalls.length} tool(s)`);
            if (!fnCalls.length) {
                return { success: true, reply: textPart?.text || 'Task completed.', actionsPerformed };
            }
            const toolResults = [];
            for (const part of fnCalls) {
                const fn = part.functionCall;
                const t1 = Date.now();
                const res = await this.executeTool(fn.name, (fn.args || {}));
                browser_1.automationEvents.emit('log', `✅ ${fn.name} in ${Date.now() - t1}ms`);
                actionsPerformed.push(`✅ ${fn.name}`);
                toolResults.push({ functionResponse: { name: fn.name, response: { result: res } } });
                if (res.startsWith('__DONE__')) {
                    return { success: true, reply: res.replace('__DONE__', ''), actionsPerformed };
                }
            }
            currentMessage = toolResults;
        }
        return { success: false, reply: 'Reached max steps.', actionsPerformed };
    }
}
exports.PlaywrightAgent = PlaywrightAgent;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaMcpAgent = void 0;
exports.getOrCreateMcpEngine = getOrCreateMcpEngine;
exports.closeMcpEngine = closeMcpEngine;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const generative_ai_1 = require("@google/generative-ai");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const ollama_1 = __importDefault(require("ollama"));
const browser_1 = require("../../core/browser");
// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an autonomous browser automation agent with full control of a real web browser.

SNAPSHOT STRATEGY (minimise calls for speed, but verify critical steps):

TAKE A SNAPSHOT:
✅ After browser_navigate — but FIRST wait 3-5 seconds for the page to finish loading using browser_wait_for.
✅ After a login/form submit — wait for the next page to load, then snapshot.
✅ After clicking a menu/navigation item that opens a dropdown or new section.
✅ When you cannot find an expected element — re-snapshot to refresh refs.

SKIP THE SNAPSHOT:
🚫 Between typing username and typing password (same form, refs don't change).
🚫 After hovering or non-navigating mouse actions.
🚫 Between consecutive fills in the same form.

HANDLING LOADING SCREENS / SSO REDIRECTS:
- Enterprise applications often redirect through SSO/authentication providers and show loading screens.
- If a snapshot shows only a loading spinner, progress bar, or blank/transitional page: 
  DO NOT give up. Use browser_wait_for with time: 5 to wait, then re-snapshot.
- Repeat wait+snapshot up to 3 times if needed until the real page content appears.
- The login form may appear on a DIFFERENT domain (e.g., login.fics.net) — that is normal, interact with it there.

WORKFLOW EXAMPLE — Login task on SSO site:
1. browser_navigate → browser_wait_for (time: 3) → browser_snapshot
2. If snapshot shows loading/progress: browser_wait_for (time: 5) → browser_snapshot again
3. Find username + password refs → browser_type username → browser_type password → browser_click submit
4. browser_wait_for (time: 3) → browser_snapshot (verify login, get new page refs)
5. Find and click navigation items using refs from snapshot.
6. After each major click → browser_wait_for (time: 2) → browser_snapshot to verify and get new refs.

ACCURACY RULES:
- Use EXACT ref values from the most recent snapshot — never guess selectors or IDs.
- If a ref fails, re-snapshot immediately and use the updated refs.
- Read tool call results carefully — errors must be handled before moving on.

When done, give a plain-text summary of exactly what you completed and what the final page shows.`;
// ─── MCP Agent Engine ─────────────────────────────────────────────────────────
class OllamaMcpAgent {
    constructor() {
        this.client = null;
        this.transport = null;
        this.mcpToolsList = [];
        this.provider = 'none';
        this.groqClient = null;
        this.geminiClient = null;
        // kept for backwards-compat with UI toggle path
        this.useGemini = false;
        this.client = null;
        this.transport = null;
        this.mcpToolsList = [];
        this.geminiClient = null;
        this.groqClient = null;
        const groqKey = process.env.GROQ_API_KEY?.trim();
        const geminiKey = process.env.GEMINI_API_KEY?.trim();
        if (groqKey) {
            this.provider = 'groq';
            this.groqClient = new groq_sdk_1.default({ apiKey: groqKey });
            console.log('[Smart IMS AI] ⚡ Using Groq llama-3.1-8b-instant (fast mode, high rate limit)');
        }
        else if (geminiKey) {
            this.provider = 'gemini';
            this.useGemini = true;
            this.geminiClient = new generative_ai_1.GoogleGenerativeAI(geminiKey);
            console.log('[Smart IMS AI] ✨ Using Gemini 2.0 Flash');
        }
        else {
            this.provider = 'none';
            console.log('[Smart IMS AI] ⚠️ No AI key found! Add GROQ_API_KEY to .env (free key at console.groq.com)');
        }
    }
    // ── Start MCP Client ──────────────────────────────────────────────────────
    async startAgent() {
        if (this.client)
            return;
        browser_1.automationEvents.emit('log', '🚀 Starting Playwright MCP Server...');
        try {
            this.transport = new stdio_js_1.StdioClientTransport({
                command: "playwright-mcp",
                args: []
            });
            this.client = new index_js_1.Client({ name: "valgenesis-mcp-agent", version: "1.0.0" }, { capabilities: {} });
            await this.client.connect(this.transport);
            browser_1.automationEvents.emit('log', '✅ MCP Client connected!');
            const toolsResponse = await this.client.listTools();
            this.mcpToolsList = toolsResponse.tools;
            browser_1.automationEvents.emit('log', `🛠️ Discovered ${this.mcpToolsList.length} MCP tools.`);
        }
        catch (err) {
            browser_1.automationEvents.emit('error', `❌ Failed to start MCP Agent: ${String(err)}`);
            throw err;
        }
    }
    // ── Close MCP Client ──────────────────────────────────────────────────────
    async closeAgent() {
        if (this.client) {
            browser_1.automationEvents.emit('log', '🛑 Closing MCP Client...');
            await this.client.close();
        }
        this.client = null;
        this.transport = null;
    }
    // ── Main Task Runner ───────────────────────────────────────────────────────
    async runTask(userMessage, apiKey) {
        if (!this.client) {
            await this.startAgent();
        }
        browser_1.automationEvents.emit('log', `💬 User: "${userMessage}"`);
        // UI-supplied key: detect provider by key prefix (gsk_=Groq, AIza=Gemini)
        if (apiKey && apiKey.trim().length > 0) {
            const k = apiKey.trim();
            if (k.startsWith('gsk_')) {
                this.provider = 'groq';
                this.groqClient = new groq_sdk_1.default({ apiKey: k });
                browser_1.automationEvents.emit('log', '⚡ Using Groq (key from UI)');
            }
            else {
                this.provider = 'gemini';
                this.useGemini = true;
                this.geminiClient = new generative_ai_1.GoogleGenerativeAI(k);
                browser_1.automationEvents.emit('log', '✨ Using Gemini (key from UI)');
            }
        }
        if (this.provider === 'none') {
            return {
                success: false,
                reply: '⚠️ No AI key configured. Click ⚙️ in the top bar and paste your free Groq API key (get one at console.groq.com). Groq is faster and fully free!',
                actionsPerformed: []
            };
        }
        try {
            if (this.provider === 'groq')
                return await this.runWithGroq(userMessage);
            return await this.runWithGemini(userMessage);
        }
        catch (err) {
            const errStr = String(err);
            if (errStr.includes('limit: 0') || (errStr.includes('quota') && this.provider === 'gemini')) {
                return {
                    success: false,
                    reply: '❌ **Gemini API Error (limit: 0)**: Your SMART IMS company Google account is blocking free API access.\n\n**To fix this immediately:**\n1. Sign out of your company account.\n2. Sign in to https://aistudio.google.com using a **personal @gmail.com account**.\n3. Generate a new key and paste it in the settings ⚙️.',
                    actionsPerformed: []
                };
            }
            if (errStr.includes('429') || errStr.includes('rate_limit')) {
                return {
                    success: false,
                    reply: `⏳ AI rate limit reached (${this.provider.toUpperCase()}). Please wait 60 seconds and try again.`,
                    actionsPerformed: []
                };
            }
            return { success: false, reply: `❌ AI error: ${errStr}`, actionsPerformed: [] };
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // GROQ PATH  (llama-3.3-70b-versatile — fast, free, great tool calling)
    // ─────────────────────────────────────────────────────────────────────────
    async runWithGroq(userMessage) {
        const groq = this.groqClient;
        // Convert MCP tools → OpenAI-compatible function definitions
        const groqTools = this.mcpToolsList.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: (t.description || '').substring(0, 300),
                parameters: {
                    type: t.inputSchema?.type || 'object',
                    properties: t.inputSchema?.properties || {},
                    required: t.inputSchema?.required || []
                }
            }
        }));
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
        ];
        const MAX_STEPS = 20;
        let stepCount = 0;
        const actionsPerformed = [];
        while (stepCount < MAX_STEPS) {
            stepCount++;
            const t0 = Date.now();
            browser_1.automationEvents.emit('log', `⚡ Groq thinking (Step ${stepCount}/${MAX_STEPS})...`);
            // Prune context to prevent rate limits: Keep only the most recent large tool response.
            let lastLargeToolIndex = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'tool' && typeof messages[i].content === 'string' && messages[i].content.length > 3000) {
                    lastLargeToolIndex = i;
                    break;
                }
            }
            const prunedMessages = messages.map((m, i) => {
                if (i !== lastLargeToolIndex && m.role === 'tool' && typeof m.content === 'string' && m.content.length > 3000) {
                    return { ...m, content: '[Previous snapshot truncated to save context limits. Please rely on the most recent snapshot.]' };
                }
                return m;
            });
            const response = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages: prunedMessages,
                tools: groqTools,
                tool_choice: 'auto',
                temperature: 0.1,
                max_tokens: 4096
            });
            const msg = response.choices[0].message;
            const groqMs = Date.now() - t0;
            messages.push(msg);
            browser_1.automationEvents.emit('log', `⏱️ Groq responded in ${groqMs}ms — ${msg.tool_calls?.length || 0} tool call(s)`);
            // No tool calls → Groq is done
            if (!msg.tool_calls || msg.tool_calls.length === 0) {
                const finalText = msg.content || 'Task completed.';
                browser_1.automationEvents.emit('log', `✅ Final Answer: ${finalText.substring(0, 200)}`);
                return { success: true, reply: finalText, actionsPerformed };
            }
            // Execute each tool call
            for (const toolCall of msg.tool_calls) {
                const fn = toolCall.function;
                const tTool = Date.now();
                browser_1.automationEvents.emit('log', `⚡ Tool: ${fn.name}(${fn.arguments.substring(0, 80)})`);
                let toolResult;
                try {
                    let args = JSON.parse(fn.arguments || '{}');
                    if (!args || typeof args !== 'object') {
                        args = {};
                    }
                    const mcpResponse = await this.client.callTool({ name: fn.name, arguments: args });
                    toolResult = JSON.stringify(mcpResponse.content);
                    browser_1.automationEvents.emit('log', `✅ ${fn.name} done in ${Date.now() - tTool}ms`);
                    actionsPerformed.push(`✅ ${fn.name}`);
                }
                catch (toolErr) {
                    toolResult = `Error: ${String(toolErr)}`;
                    browser_1.automationEvents.emit('error', `❌ Tool Error (${fn.name}): ${toolResult}`);
                    actionsPerformed.push(`❌ ${fn.name}`);
                }
                // Feed result back as a tool message
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResult
                });
            }
        }
        return { success: false, reply: `Agent reached max steps (${MAX_STEPS}).`, actionsPerformed };
    }
    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI PATH
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Recursively strips JSON Schema fields that Gemini's API does not support.
     * Gemini only accepts: type, description, properties, required, items, enum
     */
    sanitizeSchemaForGemini(schema) {
        if (!schema || typeof schema !== 'object')
            return schema;
        // Fields that Gemini rejects
        const BLOCKED = new Set(['$schema', 'additionalProperties', 'default', 'examples', '$defs', '$ref', 'allOf', 'anyOf', 'oneOf', 'not', '$id', 'title']);
        const cleaned = {};
        for (const [key, value] of Object.entries(schema)) {
            if (BLOCKED.has(key))
                continue;
            if (key === 'properties' && value && typeof value === 'object') {
                cleaned[key] = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.sanitizeSchemaForGemini(v)]));
            }
            else if (key === 'items' && value && typeof value === 'object') {
                cleaned[key] = this.sanitizeSchemaForGemini(value);
            }
            else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
    async geminiChatWithRetry(chat, message, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await chat.sendMessage(message);
            }
            catch (err) {
                const errStr = String(err);
                const is429 = errStr.includes('429') || errStr.includes('Too Many Requests');
                const isDailyLimit = errStr.includes('PerDay') || errStr.includes('per_day');
                // Daily quota — cannot recover by waiting, bubble up immediately
                if (isDailyLimit)
                    throw err;
                if (is429 && attempt < maxRetries) {
                    // Extract exact retry delay from error message if available (e.g. "retry in 35s")
                    const match = errStr.match(/retry[\s\S]*?in\s+(\d+)[\.\d]*s/i)
                        || errStr.match(/retryDelay.*?"(\d+)s"/);
                    const waitSec = match ? (parseInt(match[1]) + 5) : (attempt * 35);
                    browser_1.automationEvents.emit('log', `⏳ Gemini rate limit. Waiting ${waitSec}s then retrying (attempt ${attempt}/${maxRetries})...`);
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                }
                else {
                    throw err;
                }
            }
        }
    }
    async runWithGemini(userMessage) {
        const genAI = this.geminiClient;
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: SYSTEM_PROMPT,
        });
        // Convert MCP tools → Gemini FunctionDeclarations (sanitize schemas)
        const geminiTools = [{
                functionDeclarations: this.mcpToolsList.map(t => ({
                    name: t.name,
                    description: t.description || '',
                    parameters: this.sanitizeSchemaForGemini(t.inputSchema)
                }))
            }];
        const actionsPerformed = [];
        const MAX_STEPS = 20;
        let stepCount = 0;
        // Start chat session — history is managed internally by the SDK
        const chat = model.startChat({ tools: geminiTools, history: [] });
        // currentMessage starts as the user's text, then switches to
        // tool result Parts[] — exactly 1 Gemini call per while iteration.
        let currentMessage = userMessage;
        while (stepCount < MAX_STEPS) {
            stepCount++;
            const t0 = Date.now();
            browser_1.automationEvents.emit('log', `🤖 Gemini thinking (Step ${stepCount}/${MAX_STEPS})...`);
            try {
                const result = await this.geminiChatWithRetry(chat, currentMessage);
                const geminiMs = Date.now() - t0;
                const parts = result.response.candidates?.[0]?.content?.parts || [];
                const functionCalls = parts.filter((p) => p.functionCall);
                const textPart = parts.find((p) => p.text);
                browser_1.automationEvents.emit('log', `⏱️ Gemini responded in ${geminiMs}ms — ${functionCalls.length} tool call(s)`);
                // ── No tool calls → Gemini is done ────────────────────────
                if (functionCalls.length === 0) {
                    const finalText = textPart?.text || 'Task completed.';
                    browser_1.automationEvents.emit('log', `✅ Final Answer: ${finalText.substring(0, 200)}`);
                    return { success: true, reply: finalText, actionsPerformed };
                }
                // ── Execute every tool call, collect results ───────────────
                const toolResultParts = [];
                for (const part of functionCalls) {
                    const fn = part.functionCall;
                    const tTool = Date.now();
                    browser_1.automationEvents.emit('log', `⚡ Tool: ${fn.name}(${JSON.stringify(fn.args || {}).substring(0, 80)})`);
                    try {
                        const mcpResponse = await this.client.callTool({
                            name: fn.name,
                            arguments: (fn.args || {})
                        });
                        const resultText = JSON.stringify(mcpResponse.content);
                        browser_1.automationEvents.emit('log', `✅ ${fn.name} done in ${Date.now() - tTool}ms — ${resultText.substring(0, 100)}`);
                        actionsPerformed.push(`✅ ${fn.name}`);
                        toolResultParts.push({
                            functionResponse: { name: fn.name, response: { result: resultText } }
                        });
                    }
                    catch (toolErr) {
                        const errMsg = String(toolErr);
                        browser_1.automationEvents.emit('error', `❌ Tool Error (${fn.name}) after ${Date.now() - tTool}ms: ${errMsg}`);
                        actionsPerformed.push(`❌ ${fn.name}`);
                        toolResultParts.push({
                            functionResponse: { name: fn.name, response: { error: errMsg } }
                        });
                    }
                }
                // ── Tool results become the next message (single-call loop) ─
                currentMessage = toolResultParts;
            }
            catch (err) {
                const errStr = String(err);
                browser_1.automationEvents.emit('error', `❌ Gemini Error: ${errStr}`);
                return { success: false, reply: `Gemini agent error: ${errStr}`, actionsPerformed };
            }
        }
        return { success: false, reply: `Agent reached max steps (${MAX_STEPS}).`, actionsPerformed };
    }
    // ─────────────────────────────────────────────────────────────────────────
    // OLLAMA PATH (qwen2.5:7b — already installed, minimal tool set for reliability)
    // ─────────────────────────────────────────────────────────────────────────
    async runWithOllama(userMessage) {
        // Only pass the 5 ESSENTIAL tools — smaller models fail with 22+ tools
        const ESSENTIAL_TOOLS = new Set([
            'browser_navigate',
            'browser_snapshot',
            'browser_click',
            'browser_type',
            'browser_take_screenshot'
        ]);
        const ollamaTools = this.mcpToolsList
            .filter(t => ESSENTIAL_TOOLS.has(t.name))
            .map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description || '',
                // Strip complex schema fields that confuse small models
                parameters: {
                    type: t.inputSchema?.type || 'object',
                    properties: t.inputSchema?.properties || {},
                    required: t.inputSchema?.required || []
                }
            }
        }));
        browser_1.automationEvents.emit('log', `🛠️ Ollama tools loaded: ${ollamaTools.map(t => t.function.name).join(', ')}`);
        const chatHistory = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
        ];
        const MAX_STEPS = 15;
        let stepCount = 0;
        const actionsPerformed = [];
        while (stepCount < MAX_STEPS) {
            stepCount++;
            browser_1.automationEvents.emit('log', `🦙 qwen2.5 thinking (Step ${stepCount}/${MAX_STEPS})...`);
            try {
                const response = await ollama_1.default.chat({
                    model: 'qwen2.5:7b',
                    messages: chatHistory,
                    tools: ollamaTools,
                    options: { temperature: 0.1, num_predict: 2048 }
                });
                const msg = response.message;
                chatHistory.push(msg);
                if (!msg.tool_calls || msg.tool_calls.length === 0) {
                    const finalText = msg.content || 'Task completed.';
                    browser_1.automationEvents.emit('log', `✅ Final Answer: ${finalText}`);
                    return { success: true, reply: finalText, actionsPerformed };
                }
                for (const toolCall of msg.tool_calls) {
                    browser_1.automationEvents.emit('log', `⚡ Executing Tool: ${toolCall.function.name}`);
                    try {
                        const mcpResponse = await this.client.callTool({
                            name: toolCall.function.name,
                            arguments: toolCall.function.arguments
                        });
                        const resultText = JSON.stringify(mcpResponse.content);
                        browser_1.automationEvents.emit('log', `✅ Tool done: ${resultText.substring(0, 120)}...`);
                        actionsPerformed.push(`✅ ${toolCall.function.name}`);
                        chatHistory.push({ role: 'tool', content: resultText });
                    }
                    catch (toolErr) {
                        const errMsg = String(toolErr);
                        browser_1.automationEvents.emit('error', `❌ Tool Error (${toolCall.function.name}): ${errMsg}`);
                        actionsPerformed.push(`❌ ${toolCall.function.name}`);
                        chatHistory.push({ role: 'tool', content: `Error: ${errMsg}` });
                    }
                }
            }
            catch (err) {
                const errStr = String(err);
                browser_1.automationEvents.emit('error', `❌ Ollama Error: ${errStr}`);
                return { success: false, reply: `Ollama agent error: ${errStr}`, actionsPerformed };
            }
        }
        return { success: false, reply: `Agent reached max steps (${MAX_STEPS}).`, actionsPerformed };
    }
}
exports.OllamaMcpAgent = OllamaMcpAgent;
// ─── Singleton Session Management ─────────────────────────────────────────────
let activeMcpEngine = null;
function getOrCreateMcpEngine() {
    if (!activeMcpEngine) {
        activeMcpEngine = new OllamaMcpAgent();
    }
    return activeMcpEngine;
}
async function closeMcpEngine() {
    if (activeMcpEngine) {
        await activeMcpEngine.closeAgent();
        activeMcpEngine = null;
    }
}

/* ─── Ollama AI Chat Frontend ──────────────────────────────────────────────── */

(function () {
    'use strict';

    // ── DOM refs ────────────────────────────────────────────────────────────────
    const chatWindow = document.getElementById('chatWindow');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const msgInput = document.getElementById('msgInput');
    const btnSend = document.getElementById('btnSend');
    const btnClearChat = document.getElementById('btnClearChat');
    const btnCloseSession = document.getElementById('btnCloseSession');
    const statusPill = document.getElementById('statusPill');
    const statusText = document.getElementById('statusText');
    const setupBanner = document.getElementById('setupBanner');

    let isWaiting = false;
    let msgCount = 0;
    let currentMode = localStorage.getItem('ai_mode') || 'ollama'; // 'ollama' | 'gemini'

    // ── Settings Panel ────────────────────────────────────────────────────────────
    const btnSettings = document.getElementById('btnSettings');
    const settingsPanel = document.getElementById('settingsPanel');

    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && e.target !== btnSettings) {
            settingsPanel.classList.remove('open');
        }
    });

    window.setMode = function (mode) {
        currentMode = mode;
        localStorage.setItem('ai_mode', mode);
        document.getElementById('modeOllama').classList.toggle('active', mode === 'ollama');
        document.getElementById('modeGemini').classList.toggle('active', mode === 'gemini');
        document.getElementById('geminiKeySection').style.display = mode === 'gemini' ? 'block' : 'none';
        // Load saved key into input when switching to Gemini
        if (mode === 'gemini') {
            const saved = localStorage.getItem('gemini_api_key') || '';
            document.getElementById('geminiKeyInput').value = saved;
        }
    };

    window.saveGeminiKey = function () {
        const key = document.getElementById('geminiKeyInput').value.trim();
        localStorage.setItem('gemini_api_key', key);
        settingsPanel.classList.remove('open');
        appendAIMessage(key ? '✨ Gemini API key saved! Using Gemini for next requests.' : '🦙 Key cleared. Using Smart IMS AI.', [], null);
    };

    // Restore mode from localStorage on load
    setMode(currentMode);

    // ── Status check ─────────────────────────────────────────────────────────────
    async function checkStatus() {
        try {
            const r = await fetch('/run/ollama-status');
            const data = await r.json();
            if (data.configured) {
                statusPill.className = 'pill online';
                statusText.textContent = 'Smart IMS AI Ready';
                setupBanner.classList.remove('show');
            } else {
                statusPill.className = 'pill offline';
                statusText.textContent = 'AI Offline';
                setupBanner.classList.add('show');
            }
        } catch {
            statusPill.className = 'pill offline';
            statusText.textContent = 'Server Offline';
        }
    }

    // ── Auto-resize textarea ─────────────────────────────────────────────────────
    msgInput.addEventListener('input', () => {
        msgInput.style.height = 'auto';
        msgInput.style.height = Math.min(msgInput.scrollHeight, 140) + 'px';
    });

    // ── Enter to send ────────────────────────────────────────────────────────────
    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    btnSend.addEventListener('click', sendMessage);

    // ── Suggestion chips ─────────────────────────────────────────────────────────
    window.useSuggestion = function (el) {
        msgInput.value = el.textContent;
        msgInput.dispatchEvent(new Event('input'));
        msgInput.focus();
        sendMessage();
    };

    // ── Clear chat ───────────────────────────────────────────────────────────────
    btnClearChat.addEventListener('click', () => {
        // Remove all message groups, keep welcome screen
        const msgs = chatWindow.querySelectorAll('.msg-group');
        msgs.forEach(m => m.remove());
        welcomeScreen.style.display = 'flex';
        msgCount = 0;

        // Also clear server session history
        fetch('/run/mcp-close', { method: 'POST' }).catch(() => { });
    });

    // ── Close browser session ────────────────────────────────────────────────────
    btnCloseSession.addEventListener('click', async () => {
        btnCloseSession.disabled = true;
        btnCloseSession.textContent = '⏳ Closing...';
        try {
            const r = await fetch('/run/mcp-close', { method: 'POST' });
            const data = await r.json();
            appendAIMessage('🔒 Browser session closed. I\'ll open a new one when you give me the next browser task.', [], null);
        } catch {
            appendAIMessage('⚠️ Could not close browser session.', [], null);
        } finally {
            btnCloseSession.disabled = false;
            btnCloseSession.innerHTML = '🔒 Close Browser';
        }
    });

    // ── Main send function ───────────────────────────────────────────────────────
    async function sendMessage() {
        const message = msgInput.value.trim();
        if (!message || isWaiting) return;

        setWaiting(true);
        hideWelcome();

        // Add user message bubble
        appendUserMessage(message);

        // Reset input
        msgInput.value = '';
        msgInput.style.height = 'auto';

        // Show typing indicator
        const typingId = showTyping();

        try {
            const geminiApiKey = currentMode === 'gemini' ? (localStorage.getItem('gemini_api_key') || '') : '';
            const response = await fetch('/run/mcp-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, geminiApiKey })
            });

            removeTyping(typingId);

            const data = await response.json();

            if (data.success) {
                appendAIMessage(data.reply, data.actionsPerformed || [], data.screenshot || null);
            } else {
                // Show the real error — reply already contains the friendly message from the server
                const errorDetail = data.error ? `\n\n🔍 Details: ${data.error}` : '';
                appendAIMessage(
                    `${data.reply || data.message || 'Something went wrong.'}${errorDetail}`,
                    [],
                    null,
                    true
                );
                // Show setup banner if AI is offline
                if ((data.message || data.reply || '').includes('ECONNREFUSED')) {
                    setupBanner.classList.add('show');
                }
            }
        } catch (err) {
            removeTyping(typingId);
            appendAIMessage('❌ Could not reach the server. Is it running?', [], null, true);
        } finally {
            setWaiting(false);
        }
    }

    // ── UI helpers ───────────────────────────────────────────────────────────────

    function hideWelcome() {
        if (welcomeScreen) welcomeScreen.style.display = 'none';
    }

    function setWaiting(val) {
        isWaiting = val;
        btnSend.disabled = val;
        msgInput.disabled = val;
        if (val) {
            btnSend.textContent = '⏳';
        } else {
            btnSend.textContent = '➤';
            msgInput.focus();
        }
    }

    function appendUserMessage(text) {
        const group = createMsgGroup('user');
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = text;

        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        meta.textContent = formatTime();

        group.querySelector('.msg-body').append(bubble, meta);
        chatWindow.appendChild(group);
        scrollToBottom();
        msgCount++;
    }

    function appendAIMessage(reply, actions, screenshotBase64, isError = false) {
        const group = createMsgGroup('ai');
        const body = group.querySelector('.msg-body');

        // Reply bubble
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';

        if (isError) {
            bubble.style.borderColor = 'rgba(248,81,73,.4)';
            bubble.style.color = '#f85149';
        }

        // Format reply text with line breaks
        bubble.innerHTML = escapeHtml(reply).replace(/\n/g, '<br>');
        body.appendChild(bubble);

        // Actions list
        if (actions && actions.length > 0) {
            const actDiv = document.createElement('div');
            actDiv.className = 'actions-list';
            actDiv.innerHTML = '<div class="actions-list-title">⚡ Actions Performed</div>';
            actions.forEach(a => {
                const item = document.createElement('div');
                item.className = 'action-item' + (a.includes('❌') ? ' fail' : '');
                item.textContent = a;
                actDiv.appendChild(item);
            });
            body.appendChild(actDiv);
        }

        // Screenshot preview
        if (screenshotBase64) {
            const preview = document.createElement('div');
            preview.className = 'screenshot-preview';
            const label = document.createElement('div');
            label.className = 'screenshot-label';
            label.innerHTML = '📸 Screenshot captured';
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${screenshotBase64}`;
            img.alt = 'Browser screenshot';
            img.style.cursor = 'pointer';
            img.title = 'Click to open full size';
            img.onclick = () => {
                const win = window.open();
                win.document.write(`<img src="data:image/png;base64,${screenshotBase64}" style="max-width:100%">`);
            };
            preview.append(label, img);
            body.appendChild(preview);
        }

        // Timestamp
        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        meta.textContent = `Smart IMS AI · ${formatTime()}`;
        body.appendChild(meta);

        chatWindow.appendChild(group);
        scrollToBottom();
        msgCount++;
    }

    function createMsgGroup(role) {
        const group = document.createElement('div');
        group.className = `msg-group ${role}`;

        const avatar = document.createElement('div');
        avatar.className = `avatar ${role}`;
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const body = document.createElement('div');
        body.className = 'msg-body';

        group.append(avatar, body);
        return group;
    }

    function showTyping() {
        const id = 'typing-' + Date.now();
        const group = createMsgGroup('ai');
        group.id = id;
        group.classList.add('typing-indicator');

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

        group.querySelector('.msg-body').appendChild(bubble);
        chatWindow.appendChild(group);
        scrollToBottom();
        return id;
    }

    function removeTyping(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function formatTime() {
        return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    // ── Init ─────────────────────────────────────────────────────────────────────
    checkStatus();
    msgInput.focus();

})();

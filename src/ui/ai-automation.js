document.addEventListener("DOMContentLoaded", () => {

    const logArea = document.getElementById("logArea");
    const aiCommand = document.getElementById("aiCommand");
    const btnRunAI = document.getElementById("btnRunAI");
    const btnClear = document.getElementById("btnClear");
    const resultsSection = document.getElementById("resultsSection");
    const resultsList = document.getElementById("resultsList");

    /* ---------------- LOGGING ---------------- */

    function appendLog(message, type = 'log') {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        logEntry.classList.add('fade-in');
        if (type === 'error') logEntry.classList.add('error-log');
        logArea.appendChild(logEntry);
        logArea.scrollTop = logArea.scrollHeight;
    }

    /* ---------------- LOG STREAM ---------------- */

    appendLog("🔌 Connecting to AI automation service...");
    const es = new EventSource("/logs/stream");

    es.onmessage = e => {
        try {
            const data = JSON.parse(e.data);
            appendLog(data.message, data.type === 'error' ? 'error' : 'log');
        } catch {
            appendLog(e.data);
        }
    };

    es.onerror = () => appendLog("⚠️ Lost connection to logs", "error");

    /* ---------------- SPINNER CONTROL ---------------- */

    function showSpinner(show) {
        const spinner = btnRunAI.querySelector('.spinner');
        if (spinner) {
            if (show) {
                spinner.classList.add('active');
            } else {
                spinner.classList.remove('active');
            }
        }
    }

    /* ---------------- POST HELPER ---------------- */

    async function post(url, body) {
        try {
            const r = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            return await r.json();
        } catch (e) {
            appendLog("❌ Request Failed: " + e.message, "error");
            return { success: false };
        }
    }

    /* ---------------- CLEAR BUTTON ---------------- */

    btnClear.addEventListener("click", () => {
        aiCommand.value = "";
        logArea.innerHTML = "";
        resultsSection.style.display = 'none';
        resultsList.innerHTML = "";
        appendLog("🧹 Cleared!");
        aiCommand.focus();
    });

    /* ---------------- RUN AI AUTOMATION BUTTON ---------------- */

    btnRunAI.addEventListener("click", async () => {

        const command = aiCommand.value.trim();

        if (!command) {
            alert("⚠️ Please enter a command for the AI to execute.");
            aiCommand.focus();
            return;
        }

        // Show spinner and disable button
        showSpinner(true);
        btnRunAI.disabled = true;

        appendLog(`🤖 Sending command to AI...`);
        appendLog(`📝 Command: "${command}"`);

        try {
            const result = await post("/run/nlp-automation", {
                command: command,
                // These are optional now - AI works without them
                baseUrl: "",
                username: "",
                password: ""
            });

            if (result.success) {
                appendLog("✅ AI automation completed successfully!");

                // Display results
                displayResults(result.result);

                // Show PDF download if available
                if (result.pdfDownloadUrl) {
                    showPDFDownloadLink(result.pdfFileName, result.pdfDownloadUrl);
                }
            } else {
                appendLog(`❌ Automation failed: ${result.message || 'Unknown error'}`, "error");
            }

        } catch (error) {
            appendLog(`❌ Error: ${error.message}`, "error");
        } finally {
            // Hide spinner and enable button
            showSpinner(false);
            btnRunAI.disabled = false;
        }

    });

    /* ---------------- DISPLAY RESULTS ---------------- */

    function displayResults(result) {
        resultsList.innerHTML = '';

        if (!result || !result.actions || result.actions.length === 0) {
            resultsList.innerHTML = '<p style="color: var(--text-muted);">No actions recorded.</p>';
            resultsSection.style.display = 'block';
            return;
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.innerHTML = '<h3 style="margin-bottom: 15px;">📋 Actions Performed:</h3>';

        result.actions.forEach((action, index) => {
            const actionCard = document.createElement('div');
            actionCard.className = 'result-item';
            actionCard.style.marginBottom = '10px';

            let actionHtml = `<h4>Action ${index + 1}: ${getActionEmoji(action.action)} ${formatActionName(action.action)}</h4>`;

            // Add action-specific details
            if (action.url) {
                actionHtml += `<p><strong>URL:</strong> <a href="${action.url}" target="_blank">${action.url}</a></p>`;
            }
            if (action.path) {
                actionHtml += `<p><strong>Screenshot:</strong> ${action.path}</p>`;
            }
            if (action.target) {
                actionHtml += `<p><strong>Target:</strong> ${action.target}</p>`;
            }
            if (action.field && action.value) {
                actionHtml += `<p><strong>Field:</strong> ${action.field} | <strong>Value:</strong> ${action.value}</p>`;
            }
            if (action.username) {
                actionHtml += `<p><strong>Username:</strong> ${action.username}</p>`;
            }

            actionHtml += `<p><strong>Status:</strong> <span style="color: lightgreen;">✓ ${action.status}</span></p>`;

            actionCard.innerHTML = actionHtml;
            actionsDiv.appendChild(actionCard);
        });

        // Show screenshot info if available
        if (result.screenshot) {
            const screenshotDiv = document.createElement('div');
            screenshotDiv.className = 'result-item';
            screenshotDiv.style.marginTop = '15px';
            screenshotDiv.style.background = 'rgba(0, 163, 224, 0.1)';
            screenshotDiv.innerHTML = `
        <h4>📸 Screenshot Captured</h4>
        <p><strong>Location:</strong> ${result.screenshot}</p>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
          Check the <code>audit-reports/</code> folder in your project directory to view the screenshot.
        </p>
      `;
            actionsDiv.appendChild(screenshotDiv);
        }

        resultsList.appendChild(actionsDiv);
        resultsSection.style.display = 'block';
    }

    function getActionEmoji(action) {
        const emojis = {
            'navigate': '🌐',
            'screenshot': '📸',
            'login': '🔐',
            'click': '🖱️',
            'fill': '⌨️',
            'create_role': '🔐',
            'create_department': '🏢',
            'create_user': '👤'
        };
        return emojis[action] || '⚙️';
    }

    function formatActionName(action) {
        return action.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    /* ---------------- PDF DOWNLOAD LINK ---------------- */

    function showPDFDownloadLink(fileName, downloadUrl) {
        const pdfDiv = document.createElement('div');
        pdfDiv.className = 'result-item';
        pdfDiv.style.marginTop = '15px';
        pdfDiv.style.background = 'rgba(0, 82, 165, 0.1)';
        pdfDiv.innerHTML = `
      <h4>📄 Audit Report Generated</h4>
      <p>
        <a href="${downloadUrl}" download="${fileName}" class="download-btn" style="
          display: inline-block;
          padding: 10px 20px;
          background: linear-gradient(135deg, #0052A5 0%, #00A3E0 100%);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 10px;
          font-weight: bold;
        ">
          📥 Download ${fileName}
        </a>
      </p>
    `;
        resultsList.appendChild(pdfDiv);
    }

    // Initial message
    appendLog("✅ AI Automation Ready!");
    appendLog("💡 Enter a command above and click 'Run AI Automation' to get started.");

});

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

    /* ---------------- DISPLAY RESULTS ---------------- */

    function displayResults(result) {
        resultsList.innerHTML = '';

        if (!result || !result.actions || result.actions.length === 0) {
            resultsList.innerHTML = '<p style="color: var(--text-muted);">No actions recorded.</p>';
            resultsSection.style.display = 'block';
            return;
        }

        // Show AI Summary if available
        if (result.summary) {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'result-item';
            summaryDiv.style.borderLeft = '4px solid #3b82f6';
            summaryDiv.style.background = 'rgba(59, 130, 246, 0.05)';
            summaryDiv.innerHTML = `
                <h4 style="color: #3b82f6; margin-bottom: 8px;">🧠 AI Verification Summary</h4>
                <p style="font-size: 14px; line-height: 1.5;">${result.summary}</p>
            `;
            resultsList.appendChild(summaryDiv);
        }

        // Show Evidence Gallery if screenshots exist
        if (result.screenshots && result.screenshots.length > 0) {
            const galleryDiv = document.createElement('div');
            galleryDiv.className = 'result-item';
            galleryDiv.innerHTML = `
                <h4 style="margin-bottom: 12px;">📸 Captured Visual Evidence</h4>
                <div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 10px;">
                    ${result.screenshots.map(ss => `
                        <div style="flex: 0 0 200px;">
                            <img src="${ss.path}" style="width: 100%; border-radius: 6px; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer;" onclick="window.open('${ss.path}', '_blank')">
                            <p style="font-size: 11px; margin-top: 5px; color: var(--text-muted); line-height: 1.2;">${ss.caption}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            resultsList.appendChild(galleryDiv);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.innerHTML = '<h3 style="margin-bottom: 15px; margin-top: 20px;">📋 Detailed Audit Log:</h3>';

        result.actions.forEach((action, index) => {
            const actionCard = document.createElement('div');
            actionCard.className = 'result-item';
            actionCard.style.marginBottom = '10px';

            let actionHtml = `<h4>Step ${index + 1}: ${getActionEmoji(action.action)} ${formatActionName(action.action)}</h4>`;

            if (action.status === 'completed' || action.status === 'sub-item-failed' || action.status.includes('warning')) {
                const color = action.status === 'completed' ? '#3fb950' : (action.status.includes('warning') ? '#d29922' : '#f85149');
                actionHtml += `<p><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${action.status.toUpperCase()}</span></p>`;
            }

            if (action.detail && Array.isArray(action.detail)) {
                actionHtml += `<ul style="margin-left: 20px; font-size: 13px; color: var(--text-muted);">`;
                action.detail.forEach(d => {
                    const dCol = d.status === 'error' || d.status === 'failed' ? '#f85149' : (d.status === 'skipped' ? '#d29922' : '#3fb950');
                    actionHtml += `<li>${d.role || d.department || d.category || d.subCategory || d.group || 'Item'} - <span style="color:${dCol}">${d.status}</span></li>`;
                });
                actionHtml += `</ul>`;
            }

            actionCard.innerHTML = actionHtml;
            actionsDiv.appendChild(actionCard);
        });

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
    appendLog("💡 Use voice or chips for faster automation.");

    /* ---------------- VOICE RECORDING (ROBUST) ---------------- */
    const micBtn = document.getElementById('micBtn');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    if (micBtn) {
        micBtn.onclick = async (e) => {
            e.preventDefault();
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        };
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(',')[1];
                    await transcribeAudio(base64Audio);
                };
            };

            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add('recording');
            aiCommand.placeholder = "🔴 Recording... Stop when finished.";
            appendLog("🎙️ Recording started...");
        } catch (err) {
            appendLog("❌ Microphone Access Denied: " + err.message, "error");
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            micBtn.classList.remove('recording');
            aiCommand.placeholder = "Processing your voice...";
            appendLog("⏹️ Recording stopped. Transcribing...");
            // Stop all tracks to release mic
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    async function transcribeAudio(base64) {
        try {
            const res = await post("/run/transcribe", { audio: base64 });
            if (res.success && res.text) {
                aiCommand.value = res.text;
                appendLog(`🎤 Voice Captured: "${res.text}"`);
                aiCommand.placeholder = 'Example: "Login and create a unique functional role called Lead Researcher"';
            } else {
                appendLog("❌ Transcription failed", "error");
            }
        } catch (err) {
            appendLog("❌ AI Transcription error: " + err.message, "error");
        }
    }

    /* ---------------- QUICK CHIPS ---------------- */
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.onclick = () => {
            aiCommand.value = chip.getAttribute('data-cmd');
            aiCommand.style.borderColor = 'var(--primary)';
            setTimeout(() => aiCommand.style.borderColor = '', 1000);
            appendLog("✨ Quick action loaded into prompt.");
        };
    });

});


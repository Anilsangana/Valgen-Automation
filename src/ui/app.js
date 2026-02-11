document.addEventListener("DOMContentLoaded", () => {

  const logArea = document.getElementById("logArea");
  const auditList = document.getElementById("auditList");
  const featureBox = document.getElementById("featureInputs");
  const featureSelect = document.getElementById("featureSelect");
  const runBtn = document.getElementById("btnRun");

  if (!featureSelect) {
    console.error("featureSelect not found in DOM");
    return;
  }

  /* ---------------- LOGGING ---------------- */

  function appendLog(message, type = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${message}`;
    logEntry.classList.add('fade-in');
    if (type === 'error') logEntry.classList.add('error-log');
    logArea.appendChild(logEntry);
    logArea.scrollTop = logArea.scrollHeight;
  }

  function addAudit(action, status = "Pending") {
    if (!auditList) return;
    const li = document.createElement("li");
    const time = new Date().toLocaleString();
    li.innerHTML = `
      <strong>${action}</strong><br/>
      <span>${time}</span><br/>
      Status:
      <span style="color:${status === "Completed" ? "lightgreen" :
        status === "Failed" ? "red" : "orange"
      }">${status}</span>
    `;
    auditList.prepend(li);
  }

  /* ---------------- RESULTS ---------------- */

  function displayResults(results, type) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach(item => {
      if (item.status === 'created' || item.status === 'created-appended') {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
          <h4>${type === 'roles' ? 'Role' : 'User'} Created</h4>
          <p><strong>Name:</strong> ${item.role || item.email}</p>
          ${item.createdAs ? `<p><strong>Created As:</strong> ${item.createdAs}</p>` : ''}
        `;
        resultsList.appendChild(div);
      }
    });

    resultsSection.style.display = 'block';
  }

  /* ---------------- LOG STREAM ---------------- */

  appendLog("Connecting to log stream...");
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

  /* ---------------- FEATURE DROPDOWN ---------------- */

  featureSelect.addEventListener("change", () => {
    const val = featureSelect.value;
    featureBox.innerHTML = "";

    console.log("Selected feature:", val); // debug proof

    if (val === "roles") {
      featureBox.innerHTML = `
        <h3>Create Roles</h3>
        <label>Role Name
          <input id="roleName" placeholder="Enter role name">
        </label>

        <label>Duplicate Strategy</label>
        <select id="dupStrategy">
          <option value="skip">Skip</option>
          <option value="append">Append</option>
          <option value="stop">Stop</option>
        </select>
      `;
    }

    if (val === "users") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">Create User</h3>

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Email <span style="color:var(--danger)">*</span></label>
          <input id="userEmail" placeholder="user@example.com" type="email">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Role <span style="color:var(--danger)">*</span></label>
          <input id="userRole" placeholder="e.g. QA Reviewer">
        </div>

        <div class="input-group slide-in" style="animation-delay: 150ms">
          <label>Department <span style="color:var(--danger)">*</span></label>
          <input id="userDepartment" placeholder="e.g. Quality">
        </div>
      `;
    }

    if (val === "unified") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">⚡ Complete Setup Flow</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Full lifecycle test: Create Role, Department, User, activate, verify login, and then deactivate.
        </p>

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Role Name <span style="color:var(--danger)">*</span></label>
          <input id="unifiedRoleName" placeholder="e.g. QA Reviewer">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Department Name <span style="color:var(--danger)">*</span></label>
          <input id="unifiedDeptName" placeholder="e.g. Quality Assurance">
        </div>

        <div class="input-group slide-in" style="animation-delay: 150ms">
          <label>User Email <span style="color:var(--danger)">*</span></label>
          <input id="unifiedUserEmail" placeholder="user@example.com" type="email">
        </div>
      `;
    }

    if (val === "deactivateUsers") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">🚫 Deactivate User</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Deactivate a user account in the system.
        </p>

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Username <span style="color:var(--danger)">*</span></label>
          <input id="deactivateUsername" placeholder="Enter username to deactivate">
        </div>
      `;
    }

    if (val === "departments") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">🏢 Create Department</h3>

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Department Name <span style="color:var(--danger)">*</span></label>
          <input id="deptName" placeholder="e.g. Quality Assurance">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Description</label>
          <input id="deptDescription" placeholder="Optional department description">
        </div>
      `;
    }
  });

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
      appendLog("Request Failed: " + e.message, "error");
      return { success: false };
    }
  }

  /* ---------------- SPINNER CONTROL ---------------- */

  function showSpinner(show) {
    const spinner = runBtn.querySelector('.spinner');
    if (spinner) {
      if (show) {
        spinner.classList.add('active');
      } else {
        spinner.classList.remove('active');
      }
    }
  }

  /* ---------------- RUN BUTTON ---------------- */

  runBtn.addEventListener("click", async () => {

    const feature = featureSelect.value;
    if (!feature) {
      alert("Please select a functionality.");
      featureSelect.focus();
      return;
    }

    const baseUrl = document.getElementById("baseUrl").value.trim();
    if (!baseUrl) {
      alert("Base URL is required.");
      document.getElementById("baseUrl").focus();
      return;
    }
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      alert("Base URL must start with http:// or https://");
      document.getElementById("baseUrl").focus();
      return;
    }

    const username = document.getElementById("username").value.trim();
    if (!username) {
      alert("Username is required.");
      document.getElementById("username").focus();
      return;
    }

    const password = document.getElementById("password").value.trim();
    if (!password) {
      alert("Password is required.");
      document.getElementById("password").focus();
      return;
    }

    let inputField = "";
    if (feature === "roles") {
      inputField = document.getElementById("roleName")?.value.trim();
      if (!inputField) {
        alert("Role name is required.");
        document.getElementById("roleName").focus();
        return;
      }

    } else if (feature === "users") {
      // Logic handled inside specific block below to avoid generic 'inputField' confusion
    }

    const dupStrategy = document.getElementById("dupStrategy")?.value;
    const body = { baseUrl, username, password };

    let endpoint = "";

    if (feature === "roles") {
      endpoint = "/run/createRoles";
      body.roleName = inputField;
      body.duplicateStrategy = dupStrategy;
      addAudit("Create Roles", "Running");
    }

    if (feature === "users") {
      endpoint = "/run/createUsers";

      const email = document.getElementById("userEmail")?.value.trim();
      const role = document.getElementById("userRole")?.value.trim();
      const department = document.getElementById("userDepartment")?.value.trim();

      if (!email) {
        alert("Email is required for user creation.");
        document.getElementById("userEmail").focus();
        return;
      }
      if (!email.includes('@')) {
        alert("Please enter a valid email address.");
        document.getElementById("userEmail").focus();
        return;
      }

      // Make Role and Department required
      if (!role) {
        alert("Role is required for user creation.");
        document.getElementById("userRole").focus();
        return;
      }

      if (!department) {
        alert("Department is required for user creation.");
        document.getElementById("userDepartment").focus();
        return;
      }

      body.users = [{
        Email: email,
        FirstName: email.split("@")[0],
        LastName: "Auto",
        UserName: email.split("@")[0],
        Password: "Welcome@123",
        Role: role,
        Department: department,
        Comments: "Auto-generated user"
      }];

      addAudit("Create User", "Running");
    }

    if (feature === "unified") {
      endpoint = "/run/unified";

      const roleName = document.getElementById("unifiedRoleName")?.value.trim();
      const departmentName = document.getElementById("unifiedDeptName")?.value.trim();
      const userEmail = document.getElementById("unifiedUserEmail")?.value.trim();

      if (!roleName) {
        alert("Role name is required for unified flow.");
        document.getElementById("unifiedRoleName").focus();
        return;
      }

      if (!departmentName) {
        alert("Department name is required for unified flow.");
        document.getElementById("unifiedDeptName").focus();
        return;
      }

      if (!userEmail) {
        alert("User email is required for unified flow.");
        document.getElementById("unifiedUserEmail").focus();
        return;
      }

      if (!userEmail.includes('@')) {
        alert("Please enter a valid email address.");
        document.getElementById("unifiedUserEmail").focus();
        return;
      }

      body.roleName = roleName;
      body.departmentName = departmentName;
      body.userEmail = userEmail;

      addAudit("Complete Setup (Role → Dept → User → Deactivate)", "Running");
    }

    if (feature === "deactivateUsers") {
      endpoint = "/run/deactivateUsers";

      const username = document.getElementById("deactivateUsername")?.value.trim();

      if (!username) {
        alert("Username is required for user deactivation.");
        document.getElementById("deactivateUsername").focus();
        return;
      }

      body.usernames = [username];

      addAudit("Deactivate User", "Running");
    }

    if (feature === "departments") {
      endpoint = "/run/createDepartments";

      const deptName = document.getElementById("deptName")?.value.trim();
      const deptDescription = document.getElementById("deptDescription")?.value.trim();

      if (!deptName) {
        alert("Department name is required.");
        document.getElementById("deptName").focus();
        return;
      }

      body.departments = [{
        name: deptName,
        description: deptDescription || `${deptName} department`
      }];

      addAudit("Create Department", "Running");
    }

    // Show spinner at start
    showSpinner(true);
    runBtn.disabled = true;

    appendLog(`➡️ Executing ${feature}...`);

    const result = await post(endpoint, body);
    appendLog("Result: " + JSON.stringify(result));
    addAudit(feature, result?.success ? "Completed" : "Failed");

    if (result?.success && result.result?.length) {
      displayResults(result.result, feature);
    } else if (result?.success && result.result && typeof result.result === 'object') {
      // Handle unified flow results
      displayResults([result.result], feature);
    }

    // Generate PDF audit trail for successful operations
    if (result?.success) {
      await generateAuditPDF(feature, body, result.result);
    }

    // Hide spinner at end
    showSpinner(false);
    runBtn.disabled = false;

  });

  // ===================== PDF GENERATION =====================

  async function generateAuditPDF(operation, requestBody, results) {
    try {
      appendLog('📄 Generating PDF audit trail...');

      const pdfData = {
        operation: getOperationDisplayName(operation),
        adminUser: requestBody.username,
        baseUrl: requestBody.baseUrl,
        results: {}
      };

      // Map results based on operation type
      if (operation === 'roles') {
        pdfData.results.role = Array.isArray(results) ? results : [results];
      } else if (operation === 'departments') {
        pdfData.results.department = Array.isArray(results) ? results : [results];
      } else if (operation === 'users') {
        pdfData.results.user = Array.isArray(results) ? results : [results];
      } else if (operation === 'deactivateUsers') {
        pdfData.results.deactivation = Array.isArray(results) ? results : [results];
      } else if (operation === 'unified') {
        pdfData.results = results; // Already has role, department, user structure
      }

      const pdfResult = await post('/generate-audit-pdf', pdfData);

      if (pdfResult.success) {
        appendLog(`✓ PDF audit report generated: ${pdfResult.fileName}`);

        // Add download button to the UI
        showPDFDownloadButton(pdfResult.fileName, pdfResult.downloadUrl);
      }
    } catch (err) {
      appendLog(`PDF generation failed: ${err.message}`);
    }
  }

  function getOperationDisplayName(operation) {
    const names = {
      'roles': 'Role Creation',
      'departments': 'Department Creation',
      'users': 'User Creation',
      'deactivateUsers': 'User Deactivation',
      'unified': 'Complete Setup Flow'
    };
    return names[operation] || operation;
  }

  function showPDFDownloadButton(fileName, downloadUrl) {
    const resultsSection = document.getElementById('resultsSection');

    // Remove any existing PDF download button
    const existingBtn = document.getElementById('pdfDownloadBtn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // Create new download button
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'pdfDownloadBtn';
    downloadBtn.className = 'pdf-download-btn';
    downloadBtn.innerHTML = `
      <span>📄</span>
      Download Audit PDF
    `;
    downloadBtn.onclick = () => {
      window.open(downloadUrl, '_blank');
      appendLog(`Downloaded audit PDF: ${fileName}`);
    };

    resultsSection.insertBefore(downloadBtn, resultsSection.firstChild);
  }

});
document.addEventListener("DOMContentLoaded", () => {

  const logArea = document.getElementById("logArea");
  const auditList = document.getElementById("auditList");
  const featureBox = document.getElementById("featureInputs");
  const featureSelect = document.getElementById("featureSelect");
  const categorySelect = document.getElementById("categorySelect");
  const featureSelectLabel = document.getElementById("featureSelectLabel");
  const runBtn = document.getElementById("btnRun");

  if (!featureSelect || !categorySelect) {
    console.error("featureSelect or categorySelect not found in DOM");
    return;
  }

  /* ---------------- CATEGORY → FEATURE MAP ---------------- */

  const categoryFeatureMap = {
    ai: [
      { value: "nlp", label: "🤖 Natural Language Automation (AI-Powered)" }
    ],
    userManagement: [
      { value: "roles", label: "🔐 Create Role" },
      { value: "departments", label: "🏢 Create Department" },
      { value: "users", label: "👤 Create User" },
      { value: "deactivateUsers", label: "🚫 Deactivate User" }
    ],
    systemModule: [
      { value: "categories", label: "🗂️ Create Category" },
      { value: "subCategories", label: "📁 Create Sub Category" },
      { value: "groups", label: "👥 Create Group" },
      { value: "functionalRole", label: "🔑 Create Functional Role" }
    ],
    advanced: [
      { value: "unified", label: "⚡ Complete Setup (Role → Dept → User → Deactivate)" }
    ]
  };

  categorySelect.addEventListener("change", () => {
    const cat = categorySelect.value;

    // Reset feature dropdown and dynamic inputs
    featureBox.innerHTML = "";
    featureSelect.innerHTML = "<option value=\'\'>-- Choose an Option --</option>";

    if (!cat) {
      featureSelect.style.display = "none";
      featureSelectLabel.style.display = "none";
      return;
    }

    const options = categoryFeatureMap[cat] || [];
    options.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      featureSelect.appendChild(el);
    });

    featureSelect.style.display = "block";
    featureSelectLabel.style.display = "block";
  });

  /* ---------------- LOGGING ---------------- */

  function appendLog(message, type = 'log') {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }) + ' UTC';
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
    const time = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false }) + ' UTC';
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
      if (item.status === 'created' || item.status === 'created-appended' || item.status === 'created-activated-and-verified') {
        const div = document.createElement('div');
        div.className = 'result-item';

        // Determine display name based on type
        let displayName = 'N/A';
        let displayTitle = 'Item Created';

        if (type === 'roles') {
          displayName = item.role || item.createdAs || 'N/A';
          displayTitle = 'Role Created';
        } else if (type === 'users') {
          displayName = item.username || item.email || 'N/A';
          displayTitle = 'User Created';
        } else if (type === 'departments') {
          displayName = item.department || item.createdAs || 'N/A';
          displayTitle = 'Department Created';
        } else if (type === 'categories') {
          displayName = item.category || item.createdAs || 'N/A';
          displayTitle = 'Category Created';
        } else if (type === 'subCategories') {
          displayName = item.subCategory || item.createdAs || 'N/A';
          displayTitle = 'Sub Category Created';
        } else if (type === 'groups') {
          displayName = item.group || item.createdAs || 'N/A';
          displayTitle = 'Group Created';
        } else if (type === 'functionalRole') {
          displayName = item.functionalRole || item.createdAs || 'N/A';
          displayTitle = 'Functional Role Created';
        }

        div.innerHTML = `
          <h4>${displayTitle}</h4>
          <p><strong>Name:</strong> ${displayName}</p>
          ${item.createdAs ? `<p><strong>Created As:</strong> ${item.createdAs}</p>` : ''}
          ${item.status ? `<p><strong>Status:</strong> ${item.status}</p>` : ''}
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

  /* ---------------- UNIQUE DATA GENERATOR ---------------- */

  function uid() {
    // Short unique suffix: last 5 digits of timestamp + 3 random alphanumeric chars
    const ts = String(Date.now()).slice(-5);
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${ts}${rand}`;
  }

  function generateData(type) {
    const id = uid();
    const names = {
      roles: { roleName: `AutoRole_${id}` },
      departments: { deptName: `AutoDept_${id}`, deptDescription: `Auto-generated department - ${id}` },
      users: {
        userEmail: `auto.user.${id.toLowerCase()}@smartims.com`,
        userRole: `AutoRole_${id}`,
        userDepartment: `AutoDept_${id}`
      },
      categories: {
        catName: `AutoCat_${id}`,
        catPrefix: id.slice(0, 3),
        catDescription: `Auto-generated category - ${id}`
      },
      subCategories: {
        // Parent category should not be auto-generated because it must be an existing valid category
        subCatName: `AutoSubCat_${id}`,
        subCatPrefix: id.slice(0, 3),
        subCatDescription: `Auto-generated sub category - ${id}`
      },
      groups: {
        grpName: `AutoGroup_${id}`,
        grpDescription: `Auto-generated group - ${id}`
      },
      functionalRole: {
        fnRoleName: `AutoFnRole_${id}`,
        fnRolePrefix: id.slice(0, 3).toUpperCase(),
        fnRoleDescription: `Auto-generated functional role - ${id}`
      },
      unified: {
        unifiedRoleName: `AutoRole_${id}`,
        unifiedDeptName: `AutoDept_${id}`,
        unifiedUserEmail: `auto.user.${id.toLowerCase()}@smartims.com`
      }
    };
    return names[type] || {};
  }

  function applyAutoGenerate(type, enabled) {
    const fields = generateData(type);
    Object.entries(fields).forEach(([id, value]) => {
      // Specifically skip subCatCategoryName from being disabled or modified as it needs user input
      if (id === 'subCatCategoryName') return;

      const el = document.getElementById(id);
      if (!el) return;
      if (enabled) {
        el.value = value;
        el.readOnly = true;
        el.style.opacity = '0.75';
        el.style.borderStyle = 'dashed';
        el.style.cursor = 'not-allowed';
      } else {
        el.value = '';
        el.readOnly = false;
        el.style.opacity = '';
        el.style.borderStyle = '';
        el.style.cursor = '';
      }
    });
  }

  // Expose on window so inline onchange handlers in HTML strings can reach it
  window.applyAutoGenerate = applyAutoGenerate;

  // Single helper: wires up the toggle's visual animation + field fill after a form is rendered
  function wireAutoGenToggle(type) {
    const toggle = document.getElementById('autoGenToggle');
    if (!toggle) return;
    toggle.addEventListener('change', function () {
      const track = document.getElementById('autoGenTrack');
      const thumb = document.getElementById('autoGenThumb');
      const banner = document.getElementById('autoGenBanner');
      if (this.checked) {
        track.style.background = '#10b981';
        thumb.style.transform = 'translateX(20px)';
        banner.style.background = 'linear-gradient(135deg,rgba(16,185,129,0.2) 0%,rgba(5,150,105,0.2) 100%)';
        banner.style.borderColor = 'rgba(16,185,129,0.5)';
      } else {
        track.style.background = '#444';
        thumb.style.transform = 'translateX(0)';
        banner.style.background = 'linear-gradient(135deg,rgba(0,163,224,0.12) 0%,rgba(0,82,165,0.12) 100%)';
        banner.style.borderColor = 'rgba(0,163,224,0.3)';
      }
      applyAutoGenerate(type, this.checked);
    });
  }

  function autoGenToggleHTML() {
    return `
      <div id="autoGenBanner" style="
        display: flex; align-items: center; justify-content: space-between;
        background: linear-gradient(135deg, rgba(0,163,224,0.12) 0%, rgba(0,82,165,0.12) 100%);
        border: 1px solid rgba(0,163,224,0.3);
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
        gap: 12px;
      ">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">🎲</span>
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--text);">Auto-Generate Data</div>
            <div style="font-size:11px;color:var(--text-muted);">Fills all fields with unique synthetic data</div>
          </div>
        </div>
        <label style="position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0;cursor:pointer;">
          <input type="checkbox" id="autoGenToggle" style="opacity:0;width:0;height:0;">
          <span id="autoGenTrack" style="
            position:absolute;top:0;left:0;right:0;bottom:0;
            background:#444;border-radius:26px;transition:background 0.3s;
          "></span>
          <span id="autoGenThumb" style="
            position:absolute;height:20px;width:20px;
            left:3px;bottom:3px;background:white;border-radius:50%;
            transition:transform 0.3s;transform:translateX(0);
          "></span>
        </label>
      </div>
    `;
  }

  /* ---------------- FEATURE DROPDOWN ---------------- */

  featureSelect.addEventListener("change", () => {
    const val = featureSelect.value;
    featureBox.innerHTML = "";

    console.log("Selected feature:", val); // debug proof

    if (val === "nlp") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">🤖 Natural Language Automation</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Describe what you want to automate in plain English. The AI will execute your commands using Playwright.
        </p>

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Natural Language Command <span style="color:var(--danger)">*</span></label>
          <textarea 
            id="nlpCommand" 
            placeholder='Example: "Login with these credentials username and password and create a role Associate with role type Review and Approve"'
            rows="4"
            style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-family: inherit; font-size: 14px; resize: vertical;"
          ></textarea>
        </div>

        <div class="info-box slide-in" style="animation-delay: 100ms; background: rgba(0, 163, 224, 0.1); border-left: 3px solid var(--primary); padding: 12px; border-radius: 6px; margin-top: 12px;">
          <div style="font-size: 12px; color: var(--text-muted);">
            <strong style="color: var(--primary);">💡 Pro Tips:</strong><br>
            • Be specific about credentials and values<br>
            • Mention exact field names and options<br>
            • Chain multiple actions in one command<br>
            • System will use credentials from Connection Settings above
          </div>
        </div>
      `;
    }

    if (val === "roles") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay:0ms">🔐 Create Role</h3>
        ${autoGenToggleHTML()}

        <div class="input-group slide-in" style="animation-delay:50ms">
          <label>Role Name <span style="color:var(--danger)">*</span></label>
          <input id="roleName" placeholder="Enter role name">
        </div>

        <div class="input-group slide-in" style="animation-delay:100ms">
          <label>Duplicate Strategy</label>
          <select id="dupStrategy">
            <option value="skip">Skip</option>
            <option value="append">Append</option>
            <option value="stop">Stop</option>
          </select>
        </div>
      `;
      wireAutoGenToggle('roles');
    }

    if (val === "users") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">👤 Create User</h3>
        ${autoGenToggleHTML()}

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
      wireAutoGenToggle('users');
    }

    if (val === "unified") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">⚡ Complete Setup Flow</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Full lifecycle test: Create Role, Department, User, activate, verify login, and then deactivate.
        </p>
        ${autoGenToggleHTML()}

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
      wireAutoGenToggle('unified');
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
        ${autoGenToggleHTML()}

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Department Name <span style="color:var(--danger)">*</span></label>
          <input id="deptName" placeholder="e.g. Quality Assurance">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Description</label>
          <input id="deptDescription" placeholder="Optional department description">
        </div>
      `;
      wireAutoGenToggle('departments');
    }

    if (val === "categories") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">🗂️ Create Category</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Navigate to System → Create → Category and create a new category entry.
        </p>
        ${autoGenToggleHTML()}

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Category Name <span style="color:var(--danger)">*</span></label>
          <input id="catName" placeholder="e.g. Validation Protocol">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Prefix <span style="color:var(--danger)">*</span></label>
          <input id="catPrefix" placeholder="e.g. VP (max 3 chars)" maxlength="10">
        </div>

        <div class="input-group slide-in" style="animation-delay: 150ms">
          <label>Description</label>
          <input id="catDescription" placeholder="Optional description">
        </div>

        <div class="input-group slide-in" style="animation-delay: 200ms">
          <label>Duplicate Strategy</label>
          <select id="catDupStrategy">
            <option value="skip">Skip (default)</option>
            <option value="append">Append timestamp</option>
            <option value="stop">Stop on duplicate</option>
          </select>
        </div>
      `;
      wireAutoGenToggle('categories');
    }

    if (val === "subCategories") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">📁 Create Sub Category</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Navigate to System → Create → Sub Category and create a new sub category entry.
        </p>
        ${autoGenToggleHTML()}

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Parent Category Name <span style="color:var(--danger)">*</span></label>
          <input id="subCatCategoryName" placeholder="You must enter an existing Parent Category Name">
          <small style="color:var(--text-muted); font-size:11px;">This must be provided manually even if Auto-Generate is enabled.</small>
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Sub Category Name <span style="color:var(--danger)">*</span></label>
          <input id="subCatName" placeholder="e.g. Test Sub Category">
        </div>

        <div class="input-group slide-in" style="animation-delay: 150ms">
          <label>Prefix <span style="color:var(--danger)">*</span></label>
          <input id="subCatPrefix" placeholder="e.g. TSC (max 3 chars)" maxlength="10">
        </div>

        <div class="input-group slide-in" style="animation-delay: 200ms">
          <label>Description</label>
          <input id="subCatDescription" placeholder="Optional description">
        </div>

        <div class="input-group slide-in" style="animation-delay: 250ms">
          <label>Duplicate Strategy</label>
          <select id="subCatDupStrategy">
            <option value="skip">Skip (default)</option>
            <option value="append">Append timestamp</option>
            <option value="stop">Stop on duplicate</option>
          </select>
        </div>
      `;
      wireAutoGenToggle('subCategories');
    }

    if (val === "groups") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">👥 Create Group</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Navigate to System → Create → Group and create a new group with assigned users.
        </p>
        ${autoGenToggleHTML()}

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Group Name <span style="color:var(--danger)">*</span></label>
          <input id="grpName" placeholder="e.g. QA Validators">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Group Type <span style="color:var(--danger)">*</span></label>
          <select id="grpType">
            <option value="Internal">Internal</option>
            <option value="External">External</option>
            <option value="Review and Approval">Review and Approval</option>
          </select>
        </div>

        <div class="input-group slide-in" style="animation-delay: 150ms">
          <label>Description</label>
          <input id="grpDescription" placeholder="Optional group description">
        </div>

        <div class="input-group slide-in" style="animation-delay: 200ms">
          <label>Select Users</label>
          <select id="grpSelectUsers">
            <option value="true">Select All Available Users</option>
            <option value="false">No Users (empty group)</option>
          </select>
        </div>

        <div class="input-group slide-in" style="animation-delay: 250ms">
          <label>Duplicate Strategy</label>
          <select id="grpDupStrategy">
            <option value="skip">Skip (default)</option>
            <option value="append">Append timestamp</option>
            <option value="stop">Stop on duplicate</option>
          </select>
        </div>
      `;
      wireAutoGenToggle('groups');
    }

    if (val === "functionalRole") {
      featureBox.innerHTML = `
        <h3 class="slide-in" style="animation-delay: 0ms">🔑 Create Functional Role</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Navigate to System → Create → Functional Role.
        </p>
        ${autoGenToggleHTML()}

        <div class="input-group slide-in" style="animation-delay: 50ms">
          <label>Functional Role Name <span style="color:var(--danger)">*</span></label>
          <input id="fnRoleName" placeholder="e.g. QA Manager">
        </div>

        <div class="input-group slide-in" style="animation-delay: 100ms">
          <label>Prefix <span style="color:var(--danger)">*</span></label>
          <input id="fnRolePrefix" placeholder="e.g. QAM (max 3 chars)" maxlength="10">
        </div>

        <div class="input-group slide-in" style="animation-delay: 150ms">
          <label>Description</label>
          <input id="fnRoleDescription" placeholder="Optional description">
        </div>

        <div class="input-group slide-in" style="animation-delay: 200ms">
          <label>Duplicate Strategy</label>
          <select id="fnRoleDupStrategy">
            <option value="skip">Skip (default)</option>
            <option value="append">Append timestamp</option>
            <option value="stop">Stop on duplicate</option>
          </select>
        </div>
      `;
      wireAutoGenToggle('functionalRole');
    }

  }); // end featureSelect change

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

    // Check if auto-generate toggle is ON — skip field-level validation if so
    const isAutoGen = document.getElementById('autoGenToggle')?.checked || false;

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
      if (!inputField && !isAutoGen) {
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

    // Handle Natural Language Processing automation
    if (feature === "nlp") {
      const nlpCommand = document.getElementById("nlpCommand")?.value.trim();

      if (!nlpCommand) {
        alert("Please enter a natural language command.");
        document.getElementById("nlpCommand").focus();
        return;
      }

      endpoint = "/run/nlp-automation";
      body.command = nlpCommand;
      addAudit("Natural Language Automation", "Running");
    }

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

      if (!isAutoGen) {
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
      }

      body.users = [{
        Email: email,
        FirstName: email.split("@")[0],
        LastName: "Auto",
        UserName: email.split("@")[0],
        Password: "Welcome@123",
        Role: role,
        Department: department,
        Comments: isAutoGen ? "Auto-generated user [data auto-generated]" : "Auto-generated user"
      }];

      addAudit("Create User", "Running");
    }

    if (feature === "unified") {
      endpoint = "/run/unified";

      const roleName = document.getElementById("unifiedRoleName")?.value.trim();
      const departmentName = document.getElementById("unifiedDeptName")?.value.trim();
      const userEmail = document.getElementById("unifiedUserEmail")?.value.trim();

      if (!isAutoGen) {
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
      }

      body.roleName = roleName;
      body.departmentName = departmentName;
      body.userEmail = userEmail;

      addAudit("Complete Setup (Role → Dept → User → Deactivate)", "Running");
    }

    if (feature === "deactivateUsers") {
      endpoint = "/run/deactivateUsers";

      const username = document.getElementById("deactivateUsername")?.value.trim();

      if (!username && !isAutoGen) {
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

      if (!deptName && !isAutoGen) {
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

    if (feature === "categories") {
      endpoint = "/run/createCategories";

      const catName = document.getElementById("catName")?.value.trim();
      const catPrefix = document.getElementById("catPrefix")?.value.trim();
      const catDescription = document.getElementById("catDescription")?.value.trim();
      const catDupStrategy = document.getElementById("catDupStrategy")?.value;

      if (!catName && !isAutoGen) {
        alert("Category name is required.");
        document.getElementById("catName").focus();
        return;
      }

      body.categories = [{
        name: catName,
        prefix: catPrefix || catName.replace(/\s+/g, '').substring(0, 3).toUpperCase(),
        description: catDescription || `Auto-created category - ${catName}`
      }];
      body.duplicateStrategy = catDupStrategy || 'skip';

      addAudit("Create Category", "Running");
    }

    if (feature === "subCategories") {
      endpoint = "/run/createSubCategories";

      const subCatCategoryName = document.getElementById("subCatCategoryName")?.value.trim();
      const subCatName = document.getElementById("subCatName")?.value.trim();
      const subCatPrefix = document.getElementById("subCatPrefix")?.value.trim();
      const subCatDescription = document.getElementById("subCatDescription")?.value.trim();
      const subCatDupStrategy = document.getElementById("subCatDupStrategy")?.value;

      // Parent Category Name is ALWAYS required, regardless of Auto Gen being on or not
      if (!subCatCategoryName) {
        alert("Parent category name is required.");
        document.getElementById("subCatCategoryName").focus();
        return;
      }

      if (!isAutoGen) {
        if (!subCatName) {
          alert("Sub Category name is required.");
          document.getElementById("subCatName").focus();
          return;
        }
      }

      body.subCategories = [{
        categoryName: subCatCategoryName,
        subCategoryName: subCatName,
        prefix: subCatPrefix || subCatName.replace(/\s+/g, '').substring(0, 3).toUpperCase(),
        description: subCatDescription || `Auto-created sub category - ${subCatName}`
      }];
      body.duplicateStrategy = subCatDupStrategy || 'skip';

      addAudit("Create Sub Category", "Running");
    }

    if (feature === "groups") {
      endpoint = "/run/createGroups";

      const grpName = document.getElementById("grpName")?.value.trim();
      const grpType = document.getElementById("grpType")?.value;
      const grpDescription = document.getElementById("grpDescription")?.value.trim();
      const grpSelectUsers = document.getElementById("grpSelectUsers")?.value;
      const grpDupStrategy = document.getElementById("grpDupStrategy")?.value;

      if (!grpName && !isAutoGen) {
        alert("Group name is required.");
        document.getElementById("grpName").focus();
        return;
      }

      body.groups = [{
        name: grpName,
        groupType: grpType || 'Internal',
        description: grpDescription || `Auto-created group - ${grpName}`,
        selectAllUsers: grpSelectUsers !== 'false'
      }];
      body.duplicateStrategy = grpDupStrategy || 'skip';

      addAudit("Create Group", "Running");
    }

    if (feature === "functionalRole") {
      endpoint = "/run/createFunctionalRoles";

      const fnRoleName = document.getElementById("fnRoleName")?.value.trim();
      const fnRolePrefix = document.getElementById("fnRolePrefix")?.value.trim();
      const fnRoleDescription = document.getElementById("fnRoleDescription")?.value.trim();
      const fnRoleDupStrategy = document.getElementById("fnRoleDupStrategy")?.value;

      if (!fnRoleName && !isAutoGen) {
        alert("Functional Role name is required.");
        document.getElementById("fnRoleName").focus();
        return;
      }

      body.functionalRoles = [{
        name: fnRoleName,
        prefix: fnRolePrefix || fnRoleName.replace(/\s+/g, '').substring(0, 3).toUpperCase(),
        description: fnRoleDescription || `Auto-created functional role - ${fnRoleName}`
      }];
      body.duplicateStrategy = fnRoleDupStrategy || 'skip';

      addAudit("Create Functional Role", "Running");
    }

    // Show spinner at start
    showSpinner(true);
    runBtn.disabled = true;

    appendLog(`➡️ Executing ${feature}...`);

    try {
      const result = await post(endpoint, body);
      appendLog("Result: " + JSON.stringify(result));
      addAudit(feature, result?.success ? "Completed" : "Failed");

      if (result?.success && result.result?.length) {
        displayResults(result.result, feature);
      } else if (result?.success && result.result && typeof result.result === 'object') {
        // Handle unified flow results
        displayResults([result.result], feature);
      }

      // Show PDF download link if backend generated one (success OR failure)
      if (result?.pdfDownloadUrl) {
        showPDFDownloadLink(result.pdfFileName, result.pdfDownloadUrl);
      } else if (result?.success) {
        // For unified flow that doesn't return pdfDownloadUrl yet, generate PDF on frontend
        await generateAuditPDF(feature, body, result.result);
      }
    } catch (err) {
      appendLog("Unexpected error: " + (err?.message || String(err)), 'error');
    } finally {
      // Always hide spinner and re-enable button
      showSpinner(false);
      runBtn.disabled = false;
    }

  });

  // ===================== PDF DOWNLOAD LINK =====================

  function showPDFDownloadLink(fileName, downloadUrl) {
    const pdfSection = document.getElementById('pdfSection');
    const pdfDownload = document.getElementById('pdfDownload');
    if (!pdfSection || !pdfDownload) return;

    pdfDownload.innerHTML = `
      <a
        href="${downloadUrl}"
        download="${fileName}"
        class="pdf-download-btn"
        style="display:inline-flex;align-items:center;justify-content:center;gap:12px;
               width:100%;padding:16px 24px;margin:8px 0;border-radius:12px;
               background:linear-gradient(135deg,#10b981 0%,#059669 100%);
               color:#fff;font-size:15px;font-weight:700;text-decoration:none;
               text-transform:uppercase;letter-spacing:1px;
               box-shadow:0 4px 20px rgba(16,185,129,0.4),inset 0 1px 0 rgba(255,255,255,0.2);
               transition:all 200ms cubic-bezier(.4,0,.2,1);
               animation:slideIn 400ms ease forwards;"
        onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 30px rgba(16,185,129,0.6),0 0 20px rgba(16,185,129,0.3)'"
        onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(16,185,129,0.4),inset 0 1px 0 rgba(255,255,255,0.2)'"
      >
        <span style="font-size:20px;line-height:1">📄</span>
        Download Audit PDF
        <span style="font-size:11px;opacity:0.8;font-weight:400;letter-spacing:0;text-transform:none;margin-left:4px">${fileName}</span>
      </a>
    `;

    pdfSection.style.display = 'block';
    appendLog(`✓ PDF audit report ready: ${fileName}`);
  }

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
      'unified': 'Complete Setup Flow',
      'categories': 'Category Creation',
      'groups': 'Group Creation',
      'functionalRole': 'Functional Role Creation'
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
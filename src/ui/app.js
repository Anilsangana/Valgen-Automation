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
      <span style="color:${
        status === "Completed" ? "lightgreen" :
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
        <h3>Create Users</h3>
        <label>Email
          <input id="email" placeholder="Enter user email">
        </label>
      `;
    }

    if (val === "assign") {
      featureBox.innerHTML = `
        <h3>Assign Roles</h3>
        <label>CSV File
          <input id="csvPath" value="data/assignments.csv">
        </label>
      `;
    }

    if (val === "departments") {
      featureBox.innerHTML = `
        <h3>Create Departments</h3>
        <label>CSV File
          <input id="csvPath" value="data/departments.csv">
        </label>
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
      inputField = document.getElementById("email")?.value.trim();
      if (!inputField) {
        alert("Email is required.");
        document.getElementById("email").focus();
        return;
      }
      if (!inputField.includes('@')) {
        alert("Please enter a valid email address.");
        document.getElementById("email").focus();
        return;
      }
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
      body.email = inputField;
      addAudit("Create Users", "Running");
    }

    appendLog(`➡️ Executing ${feature}...`);

    const result = await post(endpoint, body);
    appendLog("Result: " + JSON.stringify(result));
    addAudit(feature, result?.success ? "Completed" : "Failed");

    if (result?.success && result.result?.length) {
      displayResults(result.result, feature);
    }
  });

});

# ValGenesis Admin Automation (Boilerplate)

This project is a simple Playwright-based UI automation tool (not tests) to perform ValGenesis 4.2 administrative tasks.

Features:
- Programmatic Playwright automation
- Express server with SSE to stream live logs to a UI
- CSV-based input using papaparse
- Action modules with idempotency and structured JSON logs

Getting started:
1. Copy `.env.example` → `.env` and provide VG_USERNAME/VG_PASSWORD
2. Install dependencies: `npm install`
3. Run in dev: `npm run dev`
4. Open `http://localhost:3000` and provide credentials/data folder

Structure:
- `src/core` - Playwright boot & helpers
- `src/actions` - action modules (createUser, createRole, etc.)
- `src/server` - Express API and job runner
- `src/ui` - simple UI for triggering jobs and viewing logs
- `data` - CSV files to import

Notes & next steps:
- Adapt selectors and navigation flows to match ValGenesis pages
- Implement robust grid selectors and iframe/popup handling in action modules
- Add authentication handling for multi-factor flows if needed
- Add tests for action modules by mocking Page

Selectors and customization
- You can provide optional selector overrides for actions (e.g., Create Roles) via the UI: paste a JSON object into the "Role Selectors" field and click "Create Roles". Example:
	{
		"addButton": "button#btnAddRole",
		"roleNameInput": "#txtRoleName",
		"saveButton": "#btnSave",
		"successSelector": "text=Saved"
	}

# ValGenesis Admin Automation

A comprehensive Playwright-based automation platform for ValGenesis 4.2 administrative tasks with AI-powered natural language processing and complete workflow orchestration.

## Features

### Core Automation
- **Programmatic Playwright Automation**: Reliable browser automation for ValGenesis admin tasks
- **Express Server with SSE**: Real-time log streaming to web UI
- **CSV-Based Input**: Bulk operations using papaparse for data import
- **Idempotent Actions**: Structured JSON logs with retry and error handling

### AI-Powered Automation
- **Natural Language Processing**: Execute commands using plain English
- **Voice Command Support**: Transcribe and execute voice commands
- **AI Agent Integration**: MCP (Model Context Protocol) agent for advanced automation
- **Groq & Ollama Integration**: Multiple AI backend support

### Workflow Management
- **Complete Workflow Automation**: End-to-end workflow creation and management
- **Entity Management**: Track users, roles, departments, categories, groups
- **Audit Trail Generation**: PDF reports with screenshots and evidence
- **Statistics & Analytics**: Track automation performance and success rates

### Data Persistence
- **SQLite Database**: Persistent storage for entities, sessions, and history
- **Session Management**: Cross-navigation state persistence
- **Chat History**: AI conversation tracking and context management
- **Browser Session Tracking**: Monitor and manage automation sessions

## Getting Started

### Prerequisites
- Node.js 18+ 
- Playwright browsers installed
- Access to ValGenesis 4.2 instance

### Installation
1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Playwright**
   ```bash
   npx playwright install
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Web UI**
   Open `http://localhost:3000` and provide credentials/data folder

### Production Build
```bash
npm run build
npm start
```

## Project Structure

```
src/
├── core/              # Playwright boot & browser management
├── actions/           # Action modules (users, roles, workflows)
│   ├── ai/          # AI-powered automation
│   ├── nlp/         # Natural language processing
│   ├── roles/        # Role management
│   ├── workflow/     # Workflow automation
│   └── ...
├── pages/            # Page Object Models
├── server/           # Express API and job orchestration
├── ui/              # Web interface
├── utils/            # Database, data services, helpers
└── types/            # TypeScript type definitions
```

## API Endpoints

### Core Automation
- `POST /run/createUsers` - Bulk user creation
- `POST /run/createRoles` - Role creation with duplicate handling
- `POST /run/createDepartments` - Department management
- `POST /run/createCategories` - Category creation
- `POST /run/createGroups` - Group management

### AI Automation
- `POST /run/nlp-automation` - Natural language command execution
- `POST /run/transcribe` - Voice command transcription
- `POST /run/ollama-chat` - AI chat interface
- `POST /run/mcp-agent` - Advanced AI agent automation

### Workflow Management
- `POST /run/complete-workflow` - End-to-end workflow automation
- `GET /api/entities` - Retrieve created entities
- `POST /api/entities` - Save entity data
- `PATCH /api/entities/:id/status` - Update entity status

### Analytics & Monitoring
- `GET /api/stats` - Automation statistics
- `GET /audit-reports` - Audit trail listing
- `POST /generate-audit-pdf` - Generate audit reports

## Configuration

### Environment Variables
```bash
# ValGenesis Credentials
VG_USERNAME=your_username
VG_PASSWORD=your_password
VG_BASE_URL=https://your-valgenesis-instance.com

# AI Services (Optional)
GROQ_API_KEY=your_groq_key
OLLAMA_URL=http://localhost:11434

# Server
PORT=3000
NODE_ENV=development
```

### Selector Customization
Override default selectors for actions via JSON configuration:

```json
{
  "addButton": "button#btnAddRole",
  "roleNameInput": "#txtRoleName", 
  "saveButton": "#btnSave",
  "successSelector": "text=Saved"
}
```

## Workflow Automation

The system supports complete workflow automation including:
1. **Login & Navigation** - Secure authentication and menu navigation
2. **Workflow Configuration** - Set approval periods, frequencies, roles
3. **Group Creation** - Create and configure approval groups
4. **Permission Assignment** - Map groups to workflow approvers
5. **Audit Generation** - Comprehensive PDF reports with evidence

### Example Workflow Request
```json
{
  "baseUrl": "https://your-instance.com/login.aspx",
  "username": "admin",
  "password": "password",
  "functionalRoleName": "Quality Reviewer",
  "approvalPeriodDays": 30,
  "frequencyDays": 15,
  "serialParallel": "Serial"
}
```

## AI-Powered Features

### Natural Language Commands
Execute complex automations using plain English:
- "Create 5 users in the QA department"
- "Setup a new workflow for document approval"
- "Generate audit report for last week's activities"

### Voice Commands
Transcribe and execute voice commands through the web interface.

### AI Agent
Advanced automation using MCP with:
- Context-aware decision making
- Dynamic element detection
- Error recovery and retry logic

## Database Schema

The system uses SQLite with the following key tables:
- `automation_runs` - Execution history and statistics
- `created_entities` - Track all created resources
- `ai_chat_history` - AI conversation logs
- `browser_sessions` - Session management
- `session_data` - Cross-navigation state

## Security Considerations

- **Input Validation**: All API endpoints validate input parameters
- **SQL Injection Protection**: Parameterized queries throughout
- **Credential Management**: Environment-based credential storage
- **Audit Trail**: Complete logging of all automation activities

## Troubleshooting

### Common Issues
1. **Browser Launch Failures**: Ensure Playwright browsers are installed
2. **Selector Changes**: Update selectors when ValGenesis UI changes
3. **Timeout Issues**: Adjust timeouts in configuration
4. **Database Locks**: Check for concurrent access issues

### Debug Mode
Enable detailed logging:
```bash
DEBUG=* npm run dev
```

## Development

### Adding New Actions
1. Create action module in `src/actions/`
2. Implement standardized interface
3. Add API endpoint in `src/server/api.ts`
4. Update UI components in `src/ui/`

### Testing
```bash
# Run action module tests
npm test

# Run integration tests  
npm run test:integration
```

## Contributing

1. Follow existing code patterns and TypeScript conventions
2. Add comprehensive error handling
3. Update documentation for new features
4. Include audit trail generation for new automations

## License

ISC License - See LICENSE file for details.

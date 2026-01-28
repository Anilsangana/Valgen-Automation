import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { runCreateRoles, runAll, runCreateUsers } from './jobRunner';
import { automationEvents } from '../core/browser';

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', '..', 'src', 'ui')));

// Simple SSE endpoint for streaming logs to the UI
app.get('/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const onLog = (msg: any) => res.write(`data: ${JSON.stringify({type: 'log', message: msg})}\n\n`);
  const onError = (msg: any) => res.write(`data: ${JSON.stringify({type: 'error', message: msg})}\n\n`);
  automationEvents.on('log', onLog);
  automationEvents.on('error', onError);
  req.on('close', () => {
    automationEvents.off('log', onLog);
    automationEvents.off('error', onError);
  });
});

app.post('/run/createUsers', async (req, res) => {
  const { baseUrl, username, password, email } = req.body;

  // Server-side validation
  if (!baseUrl || !username || !password || !email) {
    automationEvents.emit('error', 'Missing required fields: baseUrl, username, password, or email');
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    automationEvents.emit('error', 'Invalid email format provided');
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  try {
    automationEvents.emit('log', 'Processing user creation request...');
    const result = await runCreateUsers(baseUrl, username, password, email);
    const hasSuccess = result.some((r: any) => r.status === 'created');
    res.json({ success: hasSuccess, result });
  } catch (err) {
    automationEvents.emit('error', `User creation failed: ${String(err)}`);
    res.status(500).json({ success: false, message: String(err) });
  }
});


app.post('/run/createRoles', async (req, res) => {
  const { baseUrl, username, password, roleName, duplicateStrategy } = req.body;

  // Server-side validation
  if (!baseUrl || !username || !password || !roleName) {
    automationEvents.emit('error', 'Missing required fields: baseUrl, username, password, or roleName');
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    automationEvents.emit('log', 'Processing role creation request...');
    const result = await runCreateRoles(baseUrl, username, password, roleName, duplicateStrategy);
    res.json({ success: true, result });
  } catch (err) {
    automationEvents.emit('error', `Role creation failed: ${String(err)}`);
    res.status(500).json({ success: false, message: String(err) });
  }
});

app.post('/run/all', async (req, res) => {
  const { baseUrl, username, password, dataDir } = req.body;
  try {
    const result = await runAll(baseUrl, username, password, dataDir);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

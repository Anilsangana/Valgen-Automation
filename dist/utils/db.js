"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.dbAll = dbAll;
exports.dbRun = dbRun;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = path_1.default.join(process.cwd(), 'data', 'valgenesis.db');
function ensureDataDir() {
    const dataDir = path_1.default.dirname(dbPath);
    if (!fs_1.default.existsSync(dataDir))
        fs_1.default.mkdirSync(dataDir, { recursive: true });
}
let dbSingleton = null;
let initPromise = null;
async function getDb() {
    ensureDataDir();
    if (dbSingleton)
        return dbSingleton;
    dbSingleton = await new Promise((resolve, reject) => {
        const db = new sqlite3_1.default.Database(dbPath, (err) => {
            if (err)
                reject(err);
            else
                resolve(db);
        });
    });
    // Reduce "database is locked" stalls under concurrent access
    try {
        dbSingleton.configure('busyTimeout', 5000);
    }
    catch {
        // ignore
    }
    // Don't let DB init stall the entire app forever
    await withTimeout(initDb(dbSingleton), 3000);
    return dbSingleton;
}
async function initDb(db) {
    if (initPromise)
        return initPromise;
    initPromise = new Promise((resolve, reject) => {
        db.exec(`CREATE TABLE IF NOT EXISTS automation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        command TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER,
        actions_count INTEGER NOT NULL DEFAULT 0,
        time_saved_seconds INTEGER NOT NULL DEFAULT 0
      );

      -- Store all created entities
      CREATE TABLE IF NOT EXISTS created_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL, -- 'role', 'user', 'department', 'category', etc.
        entity_name TEXT NOT NULL,
        entity_data TEXT, -- JSON string with all entity properties
        creation_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        automation_run_id INTEGER,
        status TEXT DEFAULT 'active', -- 'active', 'deactivated', 'deleted'
        FOREIGN KEY (automation_run_id) REFERENCES automation_runs(id)
      );

      -- Store session data for persistence across navigation
      CREATE TABLE IF NOT EXISTS session_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_key TEXT UNIQUE NOT NULL,
        session_value TEXT, -- JSON string
        updated_timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Store AI chat history
      CREATE TABLE IF NOT EXISTS ai_chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_type TEXT NOT NULL, -- 'user', 'assistant', 'system'
        message_content TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        session_id TEXT,
        metadata TEXT -- JSON for additional data like screenshots, actions, etc.
      );

      -- Store browser automation sessions
      CREATE TABLE IF NOT EXISTS browser_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active', -- 'active', 'closed', 'error'
        created_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        closed_timestamp TEXT,
        metadata TEXT -- JSON for session data
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_entities_type ON created_entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_entities_timestamp ON created_entities(creation_timestamp);
      CREATE INDEX IF NOT EXISTS idx_entities_status ON created_entities(status);
      CREATE INDEX IF NOT EXISTS idx_session_key ON session_data(session_key);
      CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON ai_chat_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_chat_session ON ai_chat_history(session_id);`, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
    return initPromise;
}
function withTimeout(p, timeoutMs) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`DB operation timed out after ${timeoutMs}ms`)), timeoutMs);
        p.then((v) => {
            clearTimeout(t);
            resolve(v);
        }).catch((e) => {
            clearTimeout(t);
            reject(e);
        });
    });
}
async function dbAll(sql, params = []) {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
async function dbRun(sql, params = []) {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

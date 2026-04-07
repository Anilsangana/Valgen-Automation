"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbRun = exports.dbQuery = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = path_1.default.join(process.cwd(), 'data', 'valgenesis.db');
// Ensure data directory exists
const dataDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    }
    else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});
function initializeDatabase() {
    db.serialize(() => {
        // Table for automation runs
        db.run(`CREATE TABLE IF NOT EXISTS automation_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            command TEXT NOT NULL,
            success INTEGER DEFAULT 0,
            duration_ms INTEGER,
            actions_count INTEGER DEFAULT 0,
            summary TEXT,
            pdf_path TEXT
        )`);
        // Table for individual actions within a run
        db.run(`CREATE TABLE IF NOT EXISTS run_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER,
            action_type TEXT,
            status TEXT,
            details TEXT,
            FOREIGN KEY(run_id) REFERENCES automation_runs(id)
        )`);
        // Table for audit logs (events)
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            level TEXT,
            message TEXT
        )`);
    });
}
const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.dbQuery = dbQuery;
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ id: this.lastID });
        });
    });
};
exports.dbRun = dbRun;
exports.default = db;

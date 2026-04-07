"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRun = logRun;
exports.getStats = getStats;
exports.getStatsAsync = getStatsAsync;
// Default time saved per procedure (in seconds) - Estimating common human manual time
const TIME_SAVED_PER_PROCEDURE = 120; // 2 minutes per action
const db_1 = require("./db");
function logRun(command, success, durationMs, actionsCount) {
    // Fire-and-forget DB insert so we don't block the response path.
    const timeSaved = actionsCount * TIME_SAVED_PER_PROCEDURE;
    void (0, db_1.dbRun)(`INSERT INTO automation_runs (command, success, duration_ms, actions_count, time_saved_seconds)
         VALUES (?, ?, ?, ?, ?)`, [command, success ? 1 : 0, durationMs, actionsCount, timeSaved]).catch(() => {
        // If DB is unavailable, stats endpoint will just show zeros.
        // (Avoid throwing from core automation paths.)
    });
}
function getStats() {
    // Synchronous contract preserved for existing callers.
    // The UI polls stats frequently; we keep this lightweight by returning cached/empty values
    // and letting async refresh happen underneath.
    return getStatsSnapshot();
}
async function getStatsAsync() {
    try {
        await withTimeout(refreshStatsFromDb(), 1500);
    }
    catch {
        // Fall back to last snapshot if DB is slow/locked.
    }
    return getStatsSnapshot();
}
let snapshot = null;
let refreshInFlight = null;
function getStatsSnapshot() {
    if (!snapshot) {
        snapshot = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            totalTimeSavedSeconds: 0,
            modulePerformance: {},
            history: []
        };
        void refreshStatsFromDb();
    }
    else {
        void refreshStatsFromDb();
    }
    return snapshot;
}
async function refreshStatsFromDb() {
    if (refreshInFlight)
        return refreshInFlight;
    refreshInFlight = (async () => {
        try {
            const totals = await (0, db_1.dbAll)(`SELECT
                    COUNT(1) AS totalRuns,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successfulRuns,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failedRuns,
                    COALESCE(SUM(time_saved_seconds), 0) AS totalTimeSavedSeconds
                 FROM automation_runs`);
            const historyRows = await (0, db_1.dbAll)(`SELECT timestamp, command, success, duration_ms, time_saved_seconds
                 FROM automation_runs
                 ORDER BY datetime(timestamp) DESC
                 LIMIT 100`);
            const t = totals[0] || { totalRuns: 0, successfulRuns: 0, failedRuns: 0, totalTimeSavedSeconds: 0 };
            snapshot = {
                totalRuns: Number(t.totalRuns || 0),
                successfulRuns: Number(t.successfulRuns || 0),
                failedRuns: Number(t.failedRuns || 0),
                totalTimeSavedSeconds: Number(t.totalTimeSavedSeconds || 0),
                modulePerformance: {},
                history: historyRows
                    .slice()
                    .reverse()
                    .map(r => ({
                    timestamp: r.timestamp,
                    command: r.command,
                    success: r.success === 1,
                    duration: (r.duration_ms ?? 0) / 1000,
                    timeSaved: Number(r.time_saved_seconds || 0)
                }))
            };
        }
        finally {
            refreshInFlight = null;
        }
    })();
    return refreshInFlight;
}
function withTimeout(p, timeoutMs) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`Stats DB timeout after ${timeoutMs}ms`)), timeoutMs);
        p.then((v) => {
            clearTimeout(t);
            resolve(v);
        }).catch((e) => {
            clearTimeout(t);
            reject(e);
        });
    });
}

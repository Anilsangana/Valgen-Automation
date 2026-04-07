interface RunStats {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalTimeSavedSeconds: number;
    modulePerformance: Record<string, number[]>; // procedure -> durations[]
    history: Array<{
        timestamp: string;
        command: string;
        success: boolean;
        duration: number;
        timeSaved: number;
    }>;
}

// Default time saved per procedure (in seconds) - Estimating common human manual time
const TIME_SAVED_PER_PROCEDURE = 120; // 2 minutes per action

import { dbAll, dbRun } from './db';

export function logRun(command: string, success: boolean, durationMs: number, actionsCount: number) {
    // Fire-and-forget DB insert so we don't block the response path.
    const timeSaved = actionsCount * TIME_SAVED_PER_PROCEDURE;
    void dbRun(
        `INSERT INTO automation_runs (command, success, duration_ms, actions_count, time_saved_seconds)
         VALUES (?, ?, ?, ?, ?)`,
        [command, success ? 1 : 0, durationMs, actionsCount, timeSaved]
    ).catch(() => {
        // If DB is unavailable, stats endpoint will just show zeros.
        // (Avoid throwing from core automation paths.)
    });
}

export function getStats(): RunStats {
    // Synchronous contract preserved for existing callers.
    // The UI polls stats frequently; we keep this lightweight by returning cached/empty values
    // and letting async refresh happen underneath.
    return getStatsSnapshot();
}

export async function getStatsAsync(): Promise<RunStats> {
    try {
        await withTimeout(refreshStatsFromDb(), 1500);
    } catch {
        // Fall back to last snapshot if DB is slow/locked.
    }
    return getStatsSnapshot();
}

let snapshot: RunStats | null = null;
let refreshInFlight: Promise<void> | null = null;

function getStatsSnapshot(): RunStats {
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
    } else {
        void refreshStatsFromDb();
    }
    return snapshot;
}

async function refreshStatsFromDb(): Promise<void> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        try {
            const totals = await dbAll<{
                totalRuns: number;
                successfulRuns: number;
                failedRuns: number;
                totalTimeSavedSeconds: number;
            }>(
                `SELECT
                    COUNT(1) AS totalRuns,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successfulRuns,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failedRuns,
                    COALESCE(SUM(time_saved_seconds), 0) AS totalTimeSavedSeconds
                 FROM automation_runs`
            );

            const historyRows = await dbAll<{
                timestamp: string;
                command: string;
                success: number;
                duration_ms: number | null;
                time_saved_seconds: number;
            }>(
                `SELECT timestamp, command, success, duration_ms, time_saved_seconds
                 FROM automation_runs
                 ORDER BY datetime(timestamp) DESC
                 LIMIT 100`
            );

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
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
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

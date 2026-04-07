"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataService = void 0;
const db_1 = require("./db");
// Entity Management
class DataService {
    // Save a created entity to the database
    static async saveEntity(entityType, entityName, entityData, automationRunId) {
        const result = await (0, db_1.dbRun)(`INSERT INTO created_entities (entity_type, entity_name, entity_data, automation_run_id)
       VALUES (?, ?, ?, ?)`, [entityType, entityName, JSON.stringify(entityData), automationRunId]);
        return result.id || 0;
    }
    // Get all entities of a specific type
    static async getEntities(entityType, status = 'active') {
        return await (0, db_1.dbAll)(`SELECT * FROM created_entities 
       WHERE entity_type = ? AND status = ? 
       ORDER BY creation_timestamp DESC`, [entityType, status]);
    }
    // Get all entities grouped by type
    static async getAllEntities() {
        const entities = await (0, db_1.dbAll)(`SELECT * FROM created_entities 
       WHERE status = 'active' 
       ORDER BY entity_type, creation_timestamp DESC`);
        const grouped = {};
        entities.forEach(entity => {
            if (!grouped[entity.entity_type]) {
                grouped[entity.entity_type] = [];
            }
            grouped[entity.entity_type].push(entity);
        });
        return grouped;
    }
    // Update entity status
    static async updateEntityStatus(entityId, status) {
        await (0, db_1.dbRun)(`UPDATE created_entities SET status = ? WHERE id = ?`, [status, entityId]);
    }
    // Delete an entity
    static async deleteEntity(entityId) {
        await (0, db_1.dbRun)(`UPDATE created_entities SET status = 'deleted' WHERE id = ?`, [entityId]);
    }
    // Session Management
    static async setSessionData(key, value) {
        const valueStr = JSON.stringify(value);
        await (0, db_1.dbRun)(`INSERT OR REPLACE INTO session_data (session_key, session_value) VALUES (?, ?)`, [key, valueStr]);
    }
    static async getSessionData(key) {
        const result = await (0, db_1.dbAll)(`SELECT session_value FROM session_data WHERE session_key = ?`, [key]);
        if (result.length > 0) {
            return JSON.parse(result[0].session_value);
        }
        return null;
    }
    static async getAllSessionData() {
        const sessions = await (0, db_1.dbAll)(`SELECT session_key, session_value FROM session_data`);
        const data = {};
        sessions.forEach(session => {
            data[session.session_key] = JSON.parse(session.session_value);
        });
        return data;
    }
    // Chat History Management
    static async saveChatMessage(messageType, content, sessionId, metadata) {
        const result = await (0, db_1.dbRun)(`INSERT INTO ai_chat_history (message_type, message_content, session_id, metadata)
       VALUES (?, ?, ?, ?)`, [messageType, content, sessionId, metadata ? JSON.stringify(metadata) : null]);
        return result.id || 0;
    }
    static async getChatHistory(sessionId, limit = 50) {
        let query = `SELECT * FROM ai_chat_history`;
        const params = [];
        if (sessionId) {
            query += ` WHERE session_id = ?`;
            params.push(sessionId);
        }
        query += ` ORDER BY timestamp DESC LIMIT ?`;
        params.push(limit);
        const messages = await (0, db_1.dbAll)(query, params);
        // Parse metadata for each message
        return messages.map(msg => ({
            ...msg,
            metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined
        }));
    }
    // Browser Session Management
    static async createBrowserSession(sessionId, metadata) {
        const result = await (0, db_1.dbRun)(`INSERT INTO browser_sessions (session_id, metadata) VALUES (?, ?)`, [sessionId, metadata ? JSON.stringify(metadata) : null]);
        return result.id || 0;
    }
    static async updateBrowserSession(sessionId, status) {
        if (status === 'closed') {
            await (0, db_1.dbRun)(`UPDATE browser_sessions SET status = ?, closed_timestamp = datetime('now') 
         WHERE session_id = ?`, [status, sessionId]);
        }
        else {
            await (0, db_1.dbRun)(`UPDATE browser_sessions SET status = ? WHERE session_id = ?`, [status, sessionId]);
        }
    }
    static async getActiveBrowserSessions() {
        const sessions = await (0, db_1.dbAll)(`SELECT * FROM browser_sessions WHERE status = 'active' ORDER BY created_timestamp DESC`);
        return sessions.map(session => ({
            ...session,
            metadata: session.metadata ? JSON.parse(session.metadata) : undefined
        }));
    }
    // Statistics and Summary
    static async getEntityStats() {
        const stats = await (0, db_1.dbAll)(`SELECT entity_type, COUNT(*) as count 
       FROM created_entities 
       WHERE status = 'active' 
       GROUP BY entity_type`);
        const result = {};
        stats.forEach(stat => {
            result[stat.entity_type] = stat.count;
        });
        return result;
    }
    static async getRecentEntities(limit = 10) {
        return await (0, db_1.dbAll)(`SELECT * FROM created_entities 
       WHERE status = 'active' 
       ORDER BY creation_timestamp DESC 
       LIMIT ?`, [limit]);
    }
    // Cleanup old data
    static async cleanupOldData(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffStr = cutoffDate.toISOString();
        // Clean old chat history
        await (0, db_1.dbRun)(`DELETE FROM ai_chat_history WHERE timestamp < ?`, [cutoffStr]);
        // Clean old closed browser sessions
        await (0, db_1.dbRun)(`DELETE FROM browser_sessions WHERE status = 'closed' AND closed_timestamp < ?`, [cutoffStr]);
        // Clean old automation runs (keep entities)
        await (0, db_1.dbRun)(`DELETE FROM automation_runs WHERE timestamp < ?`, [cutoffStr]);
    }
}
exports.DataService = DataService;

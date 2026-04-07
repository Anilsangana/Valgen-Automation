import { dbAll, dbRun } from './db';

export interface CreatedEntity {
  id: number;
  entity_type: string;
  entity_name: string;
  entity_data: string;
  creation_timestamp: string;
  automation_run_id?: number;
  status: string;
}

export interface SessionData {
  id: number;
  session_key: string;
  session_value: string;
  updated_timestamp: string;
}

export interface ChatMessage {
  id: number;
  message_type: 'user' | 'assistant' | 'system';
  message_content: string;
  timestamp: string;
  session_id?: string;
  metadata?: string;
}

export interface BrowserSession {
  id: number;
  session_id: string;
  status: 'active' | 'closed' | 'error';
  created_timestamp: string;
  closed_timestamp?: string;
  metadata?: string;
}

// Entity Management
export class DataService {
  // Save a created entity to the database
  static async saveEntity(
    entityType: string,
    entityName: string,
    entityData: any,
    automationRunId?: number
  ): Promise<number> {
    const result = await dbRun(
      `INSERT INTO created_entities (entity_type, entity_name, entity_data, automation_run_id)
       VALUES (?, ?, ?, ?)`,
      [entityType, entityName, JSON.stringify(entityData), automationRunId]
    );
    return result.id || 0;
  }

  // Get all entities of a specific type
  static async getEntities(entityType: string, status: string = 'active'): Promise<CreatedEntity[]> {
    return await dbAll<CreatedEntity>(
      `SELECT * FROM created_entities 
       WHERE entity_type = ? AND status = ? 
       ORDER BY creation_timestamp DESC`,
      [entityType, status]
    );
  }

  // Get all entities grouped by type
  static async getAllEntities(): Promise<Record<string, CreatedEntity[]>> {
    const entities = await dbAll<CreatedEntity>(
      `SELECT * FROM created_entities 
       WHERE status = 'active' 
       ORDER BY entity_type, creation_timestamp DESC`
    );

    const grouped: Record<string, CreatedEntity[]> = {};
    entities.forEach(entity => {
      if (!grouped[entity.entity_type]) {
        grouped[entity.entity_type] = [];
      }
      grouped[entity.entity_type].push(entity);
    });

    return grouped;
  }

  // Update entity status
  static async updateEntityStatus(entityId: number, status: string): Promise<void> {
    await dbRun(
      `UPDATE created_entities SET status = ? WHERE id = ?`,
      [status, entityId]
    );
  }

  // Delete an entity
  static async deleteEntity(entityId: number): Promise<void> {
    await dbRun(
      `UPDATE created_entities SET status = 'deleted' WHERE id = ?`,
      [entityId]
    );
  }

  // Session Management
  static async setSessionData(key: string, value: any): Promise<void> {
    const valueStr = JSON.stringify(value);
    await dbRun(
      `INSERT OR REPLACE INTO session_data (session_key, session_value) VALUES (?, ?)`,
      [key, valueStr]
    );
  }

  static async getSessionData(key: string): Promise<any> {
    const result = await dbAll<SessionData>(
      `SELECT session_value FROM session_data WHERE session_key = ?`,
      [key]
    );
    
    if (result.length > 0) {
      return JSON.parse(result[0].session_value);
    }
    return null;
  }

  static async getAllSessionData(): Promise<Record<string, any>> {
    const sessions = await dbAll<SessionData>(
      `SELECT session_key, session_value FROM session_data`
    );
    
    const data: Record<string, any> = {};
    sessions.forEach(session => {
      data[session.session_key] = JSON.parse(session.session_value);
    });
    
    return data;
  }

  // Chat History Management
  static async saveChatMessage(
    messageType: 'user' | 'assistant' | 'system',
    content: string,
    sessionId?: string,
    metadata?: any
  ): Promise<number> {
    const result = await dbRun(
      `INSERT INTO ai_chat_history (message_type, message_content, session_id, metadata)
       VALUES (?, ?, ?, ?)`,
      [messageType, content, sessionId, metadata ? JSON.stringify(metadata) : null]
    );
    return result.id || 0;
  }

  static async getChatHistory(sessionId?: string, limit: number = 50): Promise<ChatMessage[]> {
    let query = `SELECT * FROM ai_chat_history`;
    const params: any[] = [];

    if (sessionId) {
      query += ` WHERE session_id = ?`;
      params.push(sessionId);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    const messages = await dbAll<ChatMessage>(query, params);
    
    // Parse metadata for each message
    return messages.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined
    }));
  }

  // Browser Session Management
  static async createBrowserSession(sessionId: string, metadata?: any): Promise<number> {
    const result = await dbRun(
      `INSERT INTO browser_sessions (session_id, metadata) VALUES (?, ?)`,
      [sessionId, metadata ? JSON.stringify(metadata) : null]
    );
    return result.id || 0;
  }

  static async updateBrowserSession(sessionId: string, status: 'active' | 'closed' | 'error'): Promise<void> {
    if (status === 'closed') {
      await dbRun(
        `UPDATE browser_sessions SET status = ?, closed_timestamp = datetime('now') 
         WHERE session_id = ?`,
        [status, sessionId]
      );
    } else {
      await dbRun(
        `UPDATE browser_sessions SET status = ? WHERE session_id = ?`,
        [status, sessionId]
      );
    }
  }

  static async getActiveBrowserSessions(): Promise<BrowserSession[]> {
    const sessions = await dbAll<BrowserSession>(
      `SELECT * FROM browser_sessions WHERE status = 'active' ORDER BY created_timestamp DESC`
    );
    
    return sessions.map(session => ({
      ...session,
      metadata: session.metadata ? JSON.parse(session.metadata) : undefined
    }));
  }

  // Statistics and Summary
  static async getEntityStats(): Promise<Record<string, number>> {
    const stats = await dbAll<{entity_type: string, count: number}>(
      `SELECT entity_type, COUNT(*) as count 
       FROM created_entities 
       WHERE status = 'active' 
       GROUP BY entity_type`
    );

    const result: Record<string, number> = {};
    stats.forEach(stat => {
      result[stat.entity_type] = stat.count;
    });

    return result;
  }

  static async getRecentEntities(limit: number = 10): Promise<CreatedEntity[]> {
    return await dbAll<CreatedEntity>(
      `SELECT * FROM created_entities 
       WHERE status = 'active' 
       ORDER BY creation_timestamp DESC 
       LIMIT ?`,
      [limit]
    );
  }

  // Cleanup old data
  static async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString();

    // Clean old chat history
    await dbRun(
      `DELETE FROM ai_chat_history WHERE timestamp < ?`,
      [cutoffStr]
    );

    // Clean old closed browser sessions
    await dbRun(
      `DELETE FROM browser_sessions WHERE status = 'closed' AND closed_timestamp < ?`,
      [cutoffStr]
    );

    // Clean old automation runs (keep entities)
    await dbRun(
      `DELETE FROM automation_runs WHERE timestamp < ?`,
      [cutoffStr]
    );
  }
}

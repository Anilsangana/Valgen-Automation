/**
 * Client-side data persistence utility
 * Handles session data, form state, and cross-module data sharing
 */
class DataPersistence {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.cache = new Map();
        this.apiBase = '';
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize with API base URL
     */
    async init(apiBase = '') {
        this.apiBase = apiBase;
        await this.loadSessionData();
    }

    /**
     * Save data to server-side session storage
     */
    async setSessionData(key, value) {
        try {
            const response = await fetch(`${this.apiBase}/api/session/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });

            if (response.ok) {
                this.cache.set(key, value);
                return true;
            }
        } catch (error) {
            console.error('Failed to save session data:', error);
        }
        return false;
    }

    /**
     * Get data from server-side session storage
     */
    async getSessionData(key) {
        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            const response = await fetch(`${this.apiBase}/api/session/${key}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data !== null) {
                    this.cache.set(key, result.data);
                    return result.data;
                }
            }
        } catch (error) {
            console.error('Failed to get session data:', error);
        }
        return null;
    }

    /**
     * Load all session data
     */
    async loadSessionData() {
        try {
            const response = await fetch(`${this.apiBase}/api/session`);
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    Object.entries(result.data).forEach(([key, value]) => {
                        this.cache.set(key, value);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load session data:', error);
        }
    }

    /**
     * Save form data across navigation
     */
    async saveFormData(formId, formData) {
        return await this.setSessionData(`form_${formId}`, {
            data: formData,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        });
    }

    /**
     * Get saved form data
     */
    async getFormData(formId) {
        const sessionData = await this.getSessionData(`form_${formId}`);
        return sessionData ? sessionData.data : null;
    }

    /**
     * Save automation state
     */
    async saveAutomationState(state) {
        return await this.setSessionData('automation_state', {
            ...state,
            lastUpdated: new Date().toISOString(),
            sessionId: this.sessionId
        });
    }

    /**
     * Get automation state
     */
    async getAutomationState() {
        return await this.getSessionData('automation_state');
    }

    /**
     * Save user preferences
     */
    async savePreferences(preferences) {
        return await this.setSessionData('user_preferences', {
            ...preferences,
            lastUpdated: new Date().toISOString()
        });
    }

    /**
     * Get user preferences
     */
    async getPreferences() {
        return await this.getSessionData('user_preferences');
    }

    /**
     * Save current page context
     */
    async savePageContext(page, context) {
        return await this.setSessionData(`page_${page}`, {
            ...context,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        });
    }

    /**
     * Get current page context
     */
    async getPageContext(page) {
        return await this.getSessionData(`page_${page}`);
    }

    /**
     * Clear specific session data
     */
    async clearSessionData(key) {
        try {
            const response = await fetch(`${this.apiBase}/api/session/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: null })
            });

            if (response.ok) {
                this.cache.delete(key);
                return true;
            }
        } catch (error) {
            console.error('Failed to clear session data:', error);
        }
        return false;
    }

    /**
     * Get all created entities from the server
     */
    async getEntities(entityType = null) {
        try {
            const url = entityType 
                ? `${this.apiBase}/api/entities/${entityType}`
                : `${this.apiBase}/api/entities`;
            
            const response = await fetch(url);
            if (response.ok) {
                const result = await response.json();
                return result.success ? result.data : {};
            }
        } catch (error) {
            console.error('Failed to get entities:', error);
        }
        return entityType ? [] : {};
    }

    /**
     * Save a new entity
     */
    async saveEntity(entityType, entityName, entityData) {
        try {
            const response = await fetch(`${this.apiBase}/api/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    entityType,
                    entityName,
                    entityData
                })
            });

            if (response.ok) {
                const result = await response.json();
                return result.success ? result.data.id : null;
            }
        } catch (error) {
            console.error('Failed to save entity:', error);
        }
        return null;
    }

    /**
     * Auto-save form data with debounce
     */
    autoSave(formId, formData, delay = 1000) {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(async () => {
            await this.saveFormData(formId, formData);
        }, delay);
    }

    /**
     * Restore form data on page load
     */
    async restoreFormData(formId, formElement) {
        const savedData = await this.getFormData(formId);
        if (savedData && formElement) {
            // Restore form fields
            Object.entries(savedData).forEach(([name, value]) => {
                const field = formElement.querySelector(`[name="${name}"], #${name}`);
                if (field) {
                    if (field.type === 'checkbox' || field.type === 'radio') {
                        field.checked = value;
                    } else {
                        field.value = value;
                    }
                }
            });

            return savedData;
        }
        return null;
    }
}

// Create global instance
const dataPersistence = new DataPersistence();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataPersistence;
} else {
    window.DataPersistence = DataPersistence;
    window.dataPersistence = dataPersistence;
}

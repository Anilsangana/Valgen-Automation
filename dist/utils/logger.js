"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const events_1 = require("events");
class Logger extends events_1.EventEmitter {
    info(message) {
        const entry = { level: 'info', message, time: new Date().toISOString() };
        this.emit('log', entry);
    }
    warn(message) {
        const entry = { level: 'warn', message, time: new Date().toISOString() };
        this.emit('log', entry);
    }
    error(message) {
        const entry = { level: 'error', message, time: new Date().toISOString() };
        this.emit('log', entry);
    }
}
exports.logger = new Logger();
exports.default = exports.logger;

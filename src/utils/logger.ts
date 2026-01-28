import { EventEmitter } from 'events';

export type LogEntry = { level: 'info' | 'warn' | 'error'; message: string; time: string };

class Logger extends EventEmitter {
  info(message: string) {
    const entry: LogEntry = { level: 'info', message, time: new Date().toISOString() };
    this.emit('log', entry);
  }
  warn(message: string) {
    const entry: LogEntry = { level: 'warn', message, time: new Date().toISOString() };
    this.emit('log', entry);
  }
  error(message: string) {
    const entry: LogEntry = { level: 'error', message, time: new Date().toISOString() };
    this.emit('log', entry);
  }
}

export const logger = new Logger();
export default logger;

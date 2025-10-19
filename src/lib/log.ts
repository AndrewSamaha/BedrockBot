import fs from 'fs';
import path from 'path';

import { env } from '@/config/env';
import { type UnknownObject } from '@/lib/types';

// Custom JSON stringify replacer to handle BigInt values
const bigIntReplacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

class Logger {
  private static instance: Logger;
  private logFilePath: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.logFilePath = '';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    if (!env.LOG_PATH) {
      console.warn('LOG_PATH not set, logging to console only');
      this.isInitialized = true;
      return;
    }

    // Create log directory if it doesn't exist
    const logDir = path.dirname(env.LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(env.LOG_PATH) || '.json';
    const baseName = path.basename(env.LOG_PATH, ext);
    this.logFilePath = path.join(logDir, `${baseName}-${timestamp}${ext}`);

    console.log(`Saving logs to ${this.logFilePath}`);
    this.isInitialized = true;
  }

  public log(obj: UnknownObject): void {
    // Initialize if not already done
    if (!this.isInitialized) {
      this.initialize();
    }

    const logObj = { timestamp: new Date(), ...obj };
    console.log(logObj);

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, `${JSON.stringify(logObj, bigIntReplacer)}\n`, 'utf8');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }
}

// Export singleton instance
const logger = Logger.getInstance();

// Export the log function for backward compatibility
export const log = (obj: UnknownObject) => {
  logger.log(obj);
};

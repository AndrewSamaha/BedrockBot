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
  private logDirectory: string;
  private logFilePattern: string;
  private isInitialized: boolean = false;

  private constructor() {
    this.logFilePath = '';
    this.logDirectory = '';
    this.logFilePattern = '';
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
    this.logDirectory = path.dirname(env.LOG_PATH);
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(env.LOG_PATH) || '.json';
    const baseName = path.basename(env.LOG_PATH, ext);
    this.logFilePath = path.join(this.logDirectory, `${baseName}-${timestamp}${ext}`);

    // Set up pattern for finding log files (for pruning)
    this.logFilePattern = path.join(this.logDirectory, `${baseName}-*${ext}`);

    console.log(`Saving logs to ${this.logFilePath}`);

    // Prune old log files
    this.pruneOldLogFiles();

    this.isInitialized = true;
  }

  private pruneOldLogFiles(): void {
    if (!env.LOG_MAX_FILES || env.LOG_MAX_FILES <= 0) {
      console.log('PRUNE: no max files set, exiting...')
      return; // No limit set or invalid value
    }

    try {
      // Get the base name and extension from the original LOG_PATH
      const ext = path.extname(env.LOG_PATH) || '.json';
      const baseName = path.basename(env.LOG_PATH, ext);

      console.log(`PRUNE: Looking for files with pattern: ${baseName}-*${ext} in ${this.logDirectory}`);

      // Get all log files matching the pattern
      const files = fs.readdirSync(this.logDirectory)
        .filter(file => {
          const filePath = path.join(this.logDirectory, file);
          const stats = fs.statSync(filePath);
          if (!stats.isFile()) return false;

          // Check if file matches the pattern: baseName-YYYY-MM-DDTHH-MM-SS-sssZ.ext
          const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
          const expectedPrefix = `${baseName}-`;
          const expectedSuffix = ext;

          if (!file.startsWith(expectedPrefix) || !file.endsWith(expectedSuffix)) {
            return false;
          }

          // Extract the timestamp part and validate it
          const timestampPart = file.slice(expectedPrefix.length, -expectedSuffix.length);
          return timestampPattern.test(timestampPart);
        })
        .map(file => {
          const filePath = path.join(this.logDirectory, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by modification time, newest first

      console.log(`PRUNE: Found ${files.length} log files, max allowed: ${env.LOG_MAX_FILES}`);

      // Remove files beyond the limit
      if (files.length >= env.LOG_MAX_FILES) {
        const filesToDelete = files.slice(env.LOG_MAX_FILES-1);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log(`Deleted old log file: ${file.name}`);
          } catch (error) {
            console.error(`Failed to delete log file ${file.name}:`, error);
          }
        });
      } else {
        console.log('PRUNE: Not enough files to delete', files.length, env.LOG_MAX_FILES)
      }
    } catch (error) {
      console.error('Failed to prune old log files:', error);
    }
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

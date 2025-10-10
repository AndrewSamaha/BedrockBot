import fs from 'fs';
import { type UnknownObject } from '@/lib/queues';
import { env } from '@/config/env';

console.log(`Saving logs to ${env.LOG_FILENAME}`)
export const log = (obj: UnknownObject) => {
  const logObj = { timestamp: new Date(), ...obj };
  console.log(logObj);

  if (env.LOG_FILENAME) {
    fs.appendFileSync(env.LOG_FILENAME, `${JSON.stringify(obj)}\n`, 'utf8');
  }
}

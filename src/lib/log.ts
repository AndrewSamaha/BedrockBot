import fs from 'fs';

import { env } from '@/config/env';
import { type UnknownObject } from '@/lib/types';

console.log(`Saving logs to ${env.LOG_FILENAME}`)

// Custom JSON stringify replacer to handle BigInt values
const bigIntReplacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

export const log = (obj: UnknownObject) => {
  const logObj = { timestamp: new Date(), ...obj };
  console.log(logObj);

  if (env.LOG_FILENAME) {
    fs.appendFileSync(env.LOG_FILENAME, `${JSON.stringify(obj, bigIntReplacer)}\n`, 'utf8');
  }
}

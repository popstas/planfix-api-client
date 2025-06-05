import { Configuration } from './generated';
import * as dotenv from 'dotenv';

/**
 * Loads PLANFIX_ACCOUNT and PLANFIX_TOKEN from .env file and returns Configuration.
 */
export function loadConfig(): Configuration {
  dotenv.config();
  const account = process.env.PLANFIX_ACCOUNT;
  const token = process.env.PLANFIX_TOKEN;
  if (!account) throw new Error('PLANFIX_ACCOUNT is not set');
  if (!token) throw new Error('PLANFIX_TOKEN is not set');
  return new Configuration({
    basePath: `https://${account}.planfix.com/rest`,
    accessToken: token,
  });
}

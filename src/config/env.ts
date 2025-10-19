import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Export environment variables for use in other modules
export const env = {
  BEDROCK_HOST: process.env.BEDROCK_HOST || 'localhost',
  BEDROCK_PORT: Number(process.env.BEDROCK_PORT || 19132),
  BEDROCK_USERNAME: process.env.BEDROCK_USERNAME || `AgentBot0${Math.floor(Math.random() * 1000)}`,
  ADMIN_XUIDS: process.env.ADMIN_XUIDS?.split(',') || [],
  LOG_PATH: process.env.LOG_PATH,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

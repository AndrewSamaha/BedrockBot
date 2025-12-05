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
  LOG_MAX_FILES: Number(process.env.LOG_MAX_FILES || 5),
  LOG_INCLUDE_PACKETS: process.env.LOG_INCLUDE_PACKETS?.split(',') || [],
  LOG_EXCLUDE_PACKETS: process.env.LOG_EXCLUDE_PACKETS?.split(',') || [],
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  BED_LOCATION: process.env.BED_LOCATION,
  WEBSOCKET_PORT: Number(process.env.WEBSOCKET_PORT || 8080),
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  LANGFUSE_ENABLED: process.env.LANGFUSE_ENABLED === 'true',
};

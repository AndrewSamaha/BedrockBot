import type { Client } from "bedrock-protocol";

import { say } from '@/lib/serverCommands';

import { gameState } from "@/lib/GameState";
import { log } from "@/lib/log";
import { incomingMessageQueue } from "@/lib/queues";
import { ItemStatus } from "@/lib/types";
import { processChatMessage, initializeAgentExecutor } from '@/lib/agent/chatIntegration.js';

type InitializeChatPipelineParams = {
  username: string;
  admins: string[];
};

const POLL_INTERVAL_MS = 2_000;

export function initializeChatPipeline({ username, admins }: InitializeChatPipelineParams): NodeJS.Timeout {

  return setInterval(async () => {
    if (incomingMessageQueue.getNumMessages() === 0) {
      return;
    }

    const nextMessage = incomingMessageQueue.getNextMessage();

    if (!nextMessage) {
      return;
    }

    if (nextMessage.getStatus() === ItemStatus.RECEIVED) {
      //const { packet } = nextMessage;
      const packet = nextMessage.packet as any;
      const client = packet.getClient() as Client;
      const packetData = packet as any;

      if (packetData.type.toLowerCase() === "chat") {
        // Mark as PROCESSING before starting async operation to prevent duplicate processing
        nextMessage.markProcessing(undefined);

        log({ call: "chat_model_invoke", message: packetData.message });
        try {
          // Try agent first, fall back to simple chat
          const chatResponse = await processChatMessage(
            gameState,
            packetData.message,
            packetData.source_name,
            client,
            username as string
          );

          if (chatResponse) {
            say(client, username as string, chatResponse);
            nextMessage.markSuccess({ chatResponse });
          } else {
            log({ error: "Chat response was null" });
            nextMessage.markSuccess({ chatResponse: null });
          }
          return;
        } catch (error) {
          log({ error: "Failed to invoke chat model", details: (error as Error).message, stack: (error as Error).stack });
          nextMessage.markSuccess(undefined);
          return;
        }

      }

      nextMessage.markSuccess(undefined);
      return;
    }

    if (nextMessage.getStatus() === ItemStatus.PROCESSING) {
      const packet = nextMessage.packet as any;
      const client = packet.getClient() as Client;
      const isAdmin = packet.xuid && admins.includes(packet.xuid);

      // let message = `${packet.source_name} ${isAdmin ? "an actual ADMIN" : "a regular user"} said: ${packet.message}`;
      //
      // if (nextMessage.result && nextMessage.result.chatResponse) {
      //   message = `${nextMessage.result.chatResponse}`;
      // }

      // const outgoingItem = {
      //   type: "chat",
      //   needs_translation: false,
      //   source_name: username,
      //   xuid: "",
      //   platform_chat_id: "",
      //   filtered_message: "",
      //   message
      // };
      //
      // log({ outgoingItem });
      // client.queue("text", outgoingItem);
      //
      // const command_text = "tp 2000 150 2000";
      //
      // const command_request = {
      //   command: command_text,
      //   origin: {
      //     type: 0,
      //     uuid: (client as any).profile?.uuid || (client as any).uuid || "00000000-0000-0000-0000-000000000000",
      //     request_id: `${Math.floor(Math.random() * 100_100)}`,
      //     player_entity_id: gameState.runtimeEntityId
      //   },
      //   internal: false,
      //   interval: 0
      // };
      //
      // log({ command_request });
      // client.queue("command_request", command_request);

      nextMessage.markSuccess(undefined);
    }
  }, POLL_INTERVAL_MS);
}

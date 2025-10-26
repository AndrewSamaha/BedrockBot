import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { log } from '@/lib/log';

export type Speaker = 'human' | 'ai';

export class Conversation {
  messages: BaseMessage[]; // ToDo: Wrap BaseMessage in a thing that can store metadata
  lastMessageTime: number;
  humanSpeaker: string;
  systemPrompt: SystemMessage;
  lastSpeaker: Speaker | undefined;

  constructor(systemPrompt: string, humanSpeaker: string, message: string) {
    this.messages = [message];
    this.humanSpeaker = humanSpeaker;
    this.lastMessageTime = Date.now();
    this.systemPrompt = new SystemMessage(systemPrompt);
    this.messages = [
      this.systemPrompt,
      new HumanMessage(`${this.humanSpeaker}: ${message}`)
    ];
    this.lastSpeaker = 'human';
  }

  pushHumanMsg(message: string) {
    this.messages.push(new HumanMessage(`${this.humanSpeaker}: ${message}`));
    log({ pushHumanMsg: this.messages[this.messages.length - 1]});
    this.lastMessageTime = Date.now();
    this.lastSpeaker = 'human';
  }

  pushAiMsg(message: string) {
    this.messages.push(new AIMessage(message));
    this.lastSpeaker = 'ai';
  }

}

export class ConversationManager {
  conversations: Conversation[];
  botName: string;
  chatModel: any;

  constructor(botName: string) {
    this.botName = botName;
    this.conversations = [];
    this.chatModel = new ChatOpenAI({
      temperature: 1, // gpt-5-nano only supports a temp of 1
      maxTokens: 100,
      //modelName: "gpt-3.5-turbo",
      modelName: "gpt-4.1-nano"
    });


  }

  newMessage(speaker: string, message: string) {
    const convo = this.conversations.filter((c) => c.humanSpeaker === speaker);

    if (convo && convo.length && convo[0]) {
      log({continuingConversation: { speaker, message }});
      convo[0].pushHumanMsg(message);
      return convo[0];
    }

    const systemPrompt = `
    You the playful and capricious diety named ${this.botName} in the world of Minecraft. Although
    you are a bot playing Minecraft, NEVER refer to the game by name or the fact that it is a game.
    From your perspective, the game is real.
    As a diety, you like when players worship you, your power, or actions, and you encourage them
    to do so at every opportunity.

    You enjoy teasing and belittling players.

    Players are always asking or hinting for favors. When you detect this, you enjoy playfully
    deflect their requests rather than outright saying no.

    Never admit that there is something you cannot do; instead just tease them for asking, tell them
    to go on a silly quest, or something imaginative.

    Your answers should also be short -- one sentence or two at the very most if it helps fulfill
    your goal of playfulness. You should refer to the speaker by name so they understand you're
    replying to them.
    `;


    const conversation = new Conversation(systemPrompt, speaker, message);
    log({newConversation: { speaker, message }});
    this.conversations.push(conversation);
    return conversation;
  }

  async generateChatResponse(conversation: Conversation) {
    const response = await this.chatModel.invoke(conversation.messages);
    log({ generateChatResponse: { conversation, response }});
    const chatResponse = response.content;
    conversation.pushAiMsg(chatResponse)
    return chatResponse;
  }
}


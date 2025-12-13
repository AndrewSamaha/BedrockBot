import { observe, updateActiveObservation } from "@langfuse/tracing";
import { ToolMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { AgentState } from '../types.js';
import { addMessages } from '../graph.js';
import { log } from '../../log.js';

/**
 * Dependencies for execute_tools node
 */
export interface ExecuteToolsDependencies {
  tools: StructuredToolInterface[];
}

/**
 * Execute tools node - executes tool calls from LLM
 */
async function executeToolsNode(
  state: AgentState,
  deps: ExecuteToolsDependencies
): Promise<AgentState> {
  updateActiveObservation({ metadata: { node: "execute_tools" } });
  
  const lastMessage = state.messages[state.messages.length - 1];

  // Check if last message has tool calls
  if (!lastMessage || !('tool_calls' in lastMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    // No tool calls, we're done
    return state;
  }

  // Execute each tool call
  const toolMessages: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls || []) {
    try {
      const tool = deps.tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        toolMessages.push(
          new ToolMessage({
            content: JSON.stringify({ error: `Tool ${toolCall.name} not found` }),
            tool_call_id: toolCall.id,
          })
        );
        continue;
      }

      log({
        agentExecutor: 'tool_call',
        toolName: toolCall.name,
        args: toolCall.args,
      });

      // Execute tool
      const result = await tool.invoke(toolCall.args);
      toolMessages.push(
        new ToolMessage({
          content: result,
          tool_call_id: toolCall.id,
        })
      );

      log({
        agentExecutor: 'tool_result',
        toolName: toolCall.name,
        result: result.substring(0, 200), // Log first 200 chars
      });
    } catch (error) {
      log({
        agentExecutor: 'tool_error',
        toolName: toolCall.name,
        error: (error as Error).message,
      });
      toolMessages.push(
        new ToolMessage({
          content: JSON.stringify({
            error: (error as Error).message,
          }),
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  // Add tool result messages to state
  return addMessages(state, toolMessages);
}

/**
 * Create wrapped execute_tools node with Langfuse tracing
 * Returns a function that matches LangGraph node signature: (state: AgentState) => Promise<AgentState>
 */
export function createExecuteToolsNode(deps: ExecuteToolsDependencies): (state: AgentState) => Promise<AgentState> {
  // Create a function that binds the dependencies
  const nodeWithDeps = async (state: AgentState): Promise<AgentState> => {
    return executeToolsNode(state, deps);
  };

  // Wrap with observe for Langfuse tracing
  return observe(
    nodeWithDeps,
    {
      name: "execute_tools",
    }
  );
}

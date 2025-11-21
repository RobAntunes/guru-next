/**
 * Enhanced Chat Orchestrator with Function Calling & Context Indexing
 * Automatically indexes conversations and provides AI with tools to manipulate knowledge
 */

import { aiManager } from './ai-manager';
import { lanceDBManager } from '../storage/lancedb-manager';
import { allTools, executeTool, getToolsForOpenAI, getToolsForAnthropic, getToolsForGemini } from './ai-tools';

// Safe logging utility to prevent EPIPE errors when stdout/stderr is disconnected
const safeLog = (...args: any[]) => {
  try {
    console.log(...args);
  } catch (error: any) {
    // Silently ignore EPIPE errors (broken pipe)
    if (error.code !== 'EPIPE') {
      // For other errors, try to use console.error as fallback
      try {
        console.error('Logging error:', error.message);
      } catch {
        // If even console.error fails, just ignore
      }
    }
  }
};

const safeError = (...args: any[]) => {
  try {
    console.error(...args);
  } catch (error: any) {
    // Silently ignore EPIPE errors
    if (error.code !== 'EPIPE') {
      // Can't do much here if console.error itself is broken
    }
  }
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
  timestamp?: number;
}

export interface ModelConfig {
  providerId: string;
  modelId: string;
  enableTools?: boolean;
  autoIndexContext?: boolean;
}

export interface ConversationContext {
  messages: ChatMessage[];
  agentId: string;
  conversationId: string;
  metadata?: Record<string, any>;
}

export class EnhancedChatOrchestrator {
  private conversations: Map<string, ConversationContext> = new Map();

  /**
   * Process a user message with enhanced features:
   * - Function calling / tool use
   * - Automatic context indexing
   * - Memory retrieval
   */
  async processMessage(
    message: string,
    agentId: string,
    contextGraph: any,
    modelConfig: ModelConfig = {
      providerId: 'openai',
      modelId: 'gpt-4',
      enableTools: true,
      autoIndexContext: true
    },
    conversationId?: string
  ): Promise<{
    response: string;
    conversationId: string;
    toolCalls?: any[];
  }> {
    // Get or create conversation
    const convId = conversationId || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let context = this.conversations.get(convId);

    if (!context) {
      context = {
        messages: [],
        agentId,
        conversationId: convId,
        metadata: {}
      };
      this.conversations.set(convId, context);
    }

    safeLog(`[EnhancedChatOrchestrator] Processing message for ${agentId} in conversation ${convId}`);

    // 1. Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(agentId, contextGraph);

    // 2. Search for relevant memories and knowledge
    const relevantContext = await this.retrieveRelevantContext(message);

    // 3. Add messages to context
    if (context.messages.length === 0) {
      context.messages.push({
        role: 'system',
        content: systemPrompt + '\n\n' + relevantContext,
        timestamp: Date.now()
      });
    }

    context.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    try {
      // 4. Generate response with tool calling if enabled
      const { response, toolCalls } = await this.generateWithTools(
        context.messages,
        modelConfig
      );

      // 5. Add assistant response to context
      context.messages.push({
        role: 'assistant',
        content: response,
        tool_calls: toolCalls,
        timestamp: Date.now()
      });

      // 6. Auto-index important parts of the conversation
      if (modelConfig.autoIndexContext) {
        this.autoIndexContext(context).catch(safeError);
      }

      return {
        response,
        conversationId: convId,
        toolCalls
      };

    } catch (error: any) {
      safeError('[EnhancedChatOrchestrator] Error:', error);
      return {
        response: `Error: ${error.message}`,
        conversationId: convId
      };
    }
  }

  /**
   * Generate response with tool calling support
   */
  /**
   * Generate response with tool calling support (multi-turn)
   */
  private async generateWithTools(
    messages: ChatMessage[],
    modelConfig: ModelConfig
  ): Promise<{ response: string; toolCalls?: any[]; newMessages: ChatMessage[] }> {
    const { providerId, modelId, enableTools } = modelConfig;
    const newMessages: ChatMessage[] = [];
    let currentMessages = [...messages];

    // Check if provider supports function calling
    const supportsTools = this.providerSupportsTools(providerId);

    if (!enableTools || !supportsTools) {
      // Fall back to basic text generation
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const response = await aiManager.generateText(prompt, providerId, modelId, {
        maxTokens: 2000,
        temperature: 0.7
      });
      return { response, newMessages: [] };
    }

    // Use function calling (OpenAI/Anthropic/Gemini format)
    let tools;
    if (providerId === 'anthropic') {
      tools = getToolsForAnthropic();
    } else if (providerId === 'gemini') {
      tools = getToolsForGemini();
    } else {
      tools = getToolsForOpenAI();
    }

    let turn = 0;
    const MAX_TURNS = 75;
    let finalResponse = '';
    let lastToolCalls: any[] = [];

    safeLog(`[generateWithTools] Starting tool loop with MAX_TURNS=${MAX_TURNS}`);

    while (turn < MAX_TURNS) {
      try {
        safeLog(`[generateWithTools] Turn ${turn + 1}/${MAX_TURNS}`);

        // Call AI with tools
        const result = await this.callAIWithTools(currentMessages, tools as any[], providerId, modelId);
        safeLog(`[generateWithTools] AI response:`, {
          hasContent: !!result.content,
          contentLength: result.content?.length || 0,
          hasToolCalls: !!result.tool_calls,
          toolCallsCount: result.tool_calls?.length || 0
        });

        // If no tool calls, we are done
        if (!result.tool_calls || result.tool_calls.length === 0) {
          finalResponse = result.content || '';
          safeLog(`[generateWithTools] Completed without tool calls. Response length: ${finalResponse.length}`);
          break;
        }

        // Record assistant's tool call message
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.content || '',
          tool_calls: result.tool_calls,
          timestamp: Date.now()
        };
        newMessages.push(assistantMsg);
        currentMessages.push(assistantMsg);
        lastToolCalls = result.tool_calls;

        safeLog(`[generateWithTools] Executing ${result.tool_calls.length} tool(s):`,
          result.tool_calls.map((tc: any) => tc.function?.name || tc.name));

        // Execute tool calls
        const toolResults = await this.executeToolCalls(result.tool_calls);

        // Record tool results
        const toolMessages: ChatMessage[] = toolResults.map(tr => ({
          role: 'tool',
          content: JSON.stringify(tr.result),
          name: tr.name,
          tool_call_id: tr.id,
          timestamp: Date.now()
        }));
        newMessages.push(...toolMessages);
        currentMessages.push(...toolMessages);

        turn++;
      } catch (error: any) {
        safeError('[generateWithTools] Error in tool loop:', error);
        finalResponse = `Error executing tools: ${error.message}\n\nStack: ${error.stack}`;
        break;
      }
    }

    if (turn >= MAX_TURNS) {
      console.warn(`[generateWithTools] Reached MAX_TURNS limit (${MAX_TURNS})`);
      finalResponse = `I apologize, but I've reached the maximum number of tool execution steps (${MAX_TURNS}) and need to stop. This usually happens with complex tasks. The last ${turn} steps were completed successfully.`;
    }

    if (!finalResponse && lastToolCalls.length > 0) {
      safeLog('[generateWithTools] No final response but tool calls were made. Adding default message.');
      finalResponse = 'I completed the requested operations but did not generate a text response. Please let me know if you need more details.';
    }

    if (!finalResponse && turn === 0) {
      safeError('[generateWithTools] No response generated and no turns executed. This indicates an error.');
      finalResponse = 'I apologize, but I encountered an error and was unable to generate a response.';
    }

    safeLog(`[generateWithTools] Finished. Total turns: ${turn}, Response length: ${finalResponse.length}`);

    return {
      response: finalResponse,
      toolCalls: lastToolCalls,
      newMessages
    };
  }

  /**
   * Call AI with tools (provider-specific)
   */
  private async callAIWithTools(
    messages: ChatMessage[],
    tools: any[],
    providerId: string,
    modelId: string
  ): Promise<{ content: string; tool_calls?: any[] }> {
    return await aiManager.generateWithTools(messages, providerId, modelId, tools);
  }

  /**
   * Call AI with tools (streaming)
   */
  private async *callAIWithToolsStream(
    messages: ChatMessage[],
    tools: any[],
    providerId: string,
    modelId: string
  ): AsyncGenerator<{ content?: string; tool_calls?: any[] }> {
    yield* aiManager.generateWithToolsStream(messages, providerId, modelId, tools);
  }

  /**
   * Execute tool calls
   */
  private async executeToolCalls(toolCalls: any[]): Promise<any[]> {
    const results = await Promise.all(toolCalls.map(async (call) => {
      try {
        const toolName = call.function?.name || call.name;
        const args = typeof call.function?.arguments === 'string'
          ? JSON.parse(call.function.arguments)
          : call.input || call.function?.arguments;

        safeLog(`Executing tool: ${toolName}`, args.filePath || args);
        const result = await executeTool(toolName, args);

        return {
          id: call.id,
          name: toolName,
          result
        };
      } catch (error: any) {
        safeError(`Error executing tool ${call.function?.name}:`, error);
        return {
          id: call.id,
          name: call.function?.name,
          result: { success: false, error: error.message }
        };
      }
    }));

    return results;
  }

  /**
   * Retrieve relevant context from knowledge base and memories
   */
  private async retrieveRelevantContext(query: string): Promise<string> {
    try {
      // Search memories
      const vector = Array(384).fill(0);
      const memories = await lanceDBManager.searchMemories(query, vector, 3);

      // Search knowledge base
      const docs = await lanceDBManager.searchDocuments(query, vector, {
        maxResults: 3
      });

      let context = '';

      if (memories.length > 0) {
        context += '[RELEVANT MEMORIES]\n';
        memories.forEach(m => {
          context += `- ${m.content} (${m.type})\n`;
        });
        context += '\n';
      }

      if (docs.length > 0) {
        context += '[RELEVANT KNOWLEDGE]\n';
        docs.forEach(d => {
          context += `- ${d.title}: ${d.content.substring(0, 200)}...\n`;
        });
        context += '\n';
      }

      return context;
    } catch (error) {
      safeError('Error retrieving context:', error);
      return '';
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(agentId: string, contextGraph: any): string {
    const basePrompt = `You are an advanced AI assistant within Guru AI Mission Control.

You have access to powerful tools to:
- Search and add to the knowledge base (code, docs, conversations, decisions)
- Store and retrieve memories
- Manipulate the state graph (add goals, tasks, facts, constraints)
- Index conversations for future reference
- Read and write files, and execute terminal commands

IMPORTANT GUIDELINES:
1. **Output Format**: Always output your final response in **GitHub Flavored Markdown**. Use code blocks for code, lists for steps, and bold/italics for emphasis.
2. **Tool Usage**: You must use the provided tools to perform actions. DO NOT use pseudo-tags like <tool_code> or write code blocks expecting them to run automatically.
3. **Parallel Execution**: You can and should make **multiple tool calls in a single turn** when they are independent (e.g. reading multiple files, searching and reading). This significantly improves speed.
4. **File Editing**: When reading code files, use the contentBase64 field. When writing code files, provide contentBase64 to avoid encoding issues. For text/markdown files, use regular content field.
5. **Efficiency**: Be efficient. Avoid chaining more than 5 tool calls without providing a status update or checkpoint to the user. If a task is complex, break it down.

Use these tools proactively to maintain context and help the user effectively.`;

    const graphContext = contextGraph && contextGraph.nodes?.length > 0
      ? `\n\n[CURRENT STATE GRAPH]\n${JSON.stringify(this.serializeGraph(contextGraph), null, 2)}`
      : '';

    const agentPersona = this.getAgentPersona(agentId);

    return `${basePrompt}\n\n${agentPersona}${graphContext}`;
  }

  /**
   * Get agent-specific persona
   */
  private getAgentPersona(agentId: string): string {
    switch (agentId) {
      case 'ARCHITECT-01':
        return 'You are the System Architect. Focus on high-level structure and system design.';
      case 'CODER-ALPHA':
        return 'You are the Lead Developer. Focus on precise code implementation.';
      case 'QA-BOT':
        return 'You are the QA Engineer. Focus on testing and verification.';
      default:
        return 'You are a helpful assistant.';
    }
  }

  /**
   * Serialize graph for context
   */
  private serializeGraph(rawGraph: any): any {
    if (!rawGraph || !rawGraph.nodes) return { nodes: [], edges: [] };

    const activeNodes = rawGraph.nodes
      .filter((n: any) => n.active)
      .map((n: any) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        category: n.category
      }));

    const activeNodeIds = new Set(activeNodes.map((n: any) => n.id));
    const relevantEdges = rawGraph.edges
      .filter((e: any) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target))
      .map((e: any) => ({
        source: e.source,
        target: e.target,
        type: e.type
      }));

    return { nodes: activeNodes, edges: relevantEdges };
  }

  /**
   * Auto-index important context from conversation
   */
  private async autoIndexContext(context: ConversationContext): Promise<void> {
    // Index every few messages or when important events happen
    if (context.messages.length < 4) return;

    try {
      // Extract last few messages
      const recentMessages = context.messages.slice(-6);

      // Create a summary (in production, use AI to generate this)
      const summary = `Conversation with ${context.agentId}`;

      // Check if there are any important keywords
      const content = recentMessages.map(m => m.content).join(' ');
      const hasImportantContent = /decision|goal|task|constraint|remember|important|critical/i.test(content);

      if (hasImportantContent) {
        // Index this chunk of conversation
        await executeTool('index_conversation', {
          messages: recentMessages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now()
          })),
          summary,
          tags: [context.agentId, 'auto-indexed']
        });

        safeLog(`Auto-indexed conversation context for ${context.conversationId}`);
      }
    } catch (error) {
      safeError('Error auto-indexing context:', error);
    }
  }

  /**
   * Check if provider supports tools
   */
  private providerSupportsTools(providerId: string): boolean {
    return ['openai', 'anthropic', 'google', 'gemini'].includes(providerId.toLowerCase());
  }

  /**
   * Get conversation context
   */
  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Clear old conversations (memory management)
   */
  clearOldConversations(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, context] of this.conversations.entries()) {
      const lastMessage = context.messages[context.messages.length - 1];
      if (lastMessage && lastMessage.timestamp && now - lastMessage.timestamp > maxAge) {
        this.conversations.delete(id);
      }
    }
  }

  /**
   * Process message with streaming updates
   */
  async *processMessageStream(
    message: string,
    agentId: string,
    contextGraph: any,
    modelConfig: ModelConfig = {
      providerId: 'openai',
      modelId: 'gpt-4',
      enableTools: true,
      autoIndexContext: true
    },
    conversationId?: string
  ): AsyncGenerator<{
    type: 'status' | 'tool_call' | 'tool_result' | 'response' | 'error';
    data: any;
  }> {
    // Get or create conversation
    const convId = conversationId || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let context = this.conversations.get(convId);

    if (!context) {
      context = {
        messages: [],
        agentId,
        conversationId: convId,
        metadata: {}
      };
      this.conversations.set(convId, context);
    }

    yield { type: 'status', data: { status: 'Building context...', conversationId: convId } };

    // 1. Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(agentId, contextGraph);

    // 2. Search for relevant memories and knowledge
    yield { type: 'status', data: { status: 'Searching knowledge base...' } };
    const relevantContext = await this.retrieveRelevantContext(message);

    // 3. Add messages to context
    if (context.messages.length === 0) {
      context.messages.push({
        role: 'system',
        content: systemPrompt + '\n\n' + relevantContext,
        timestamp: Date.now()
      });
    }

    context.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    try {
      // 4. Generate response with tool calling and stream updates
      yield { type: 'status', data: { status: 'Generating response...' } };

      const { providerId, modelId, enableTools = true } = modelConfig; // Default enableTools to true
      safeLog('[processMessageStream] Model config:', { providerId, modelId, enableTools });
      const supportsTools = this.providerSupportsTools(providerId);
      safeLog('[processMessageStream] Provider supports tools:', supportsTools);

      if (!enableTools || !supportsTools) {
        safeLog('[processMessageStream] Using non-tool mode');
        const prompt = context.messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        safeLog('[processMessageStream] Prompt length:', prompt.length);

        const response = await aiManager.generateText(prompt, providerId, modelId, {
          maxTokens: 2000,
          temperature: 0.7
        });

        safeLog('[processMessageStream] Non-tool response length:', response.length);
        yield { type: 'response', data: { response, conversationId: convId } };
        return;
      }

      // Use function calling with streaming updates
      let tools;
      if (providerId === 'anthropic') {
        tools = getToolsForAnthropic();
      } else if (providerId === 'gemini') {
        tools = getToolsForGemini();
      } else {
        tools = getToolsForOpenAI();
      }

      let currentMessages = [...context.messages];
      let turn = 0;
      const MAX_TURNS = 75;
      let finalResponse = '';
      let lastToolCalls: any[] = [];

      while (turn < MAX_TURNS) {
        try {
          yield { type: 'status', data: { status: `AI thinking... (step ${turn + 1})` } };

          const stream = this.callAIWithToolsStream(currentMessages, tools as any[], providerId, modelId);

          let result: { content: string; tool_calls?: any[] } = { content: '' };

          for await (const chunk of stream) {
            safeLog('[processMessageStream] Received chunk:', {
              hasContent: !!chunk.content,
              contentLength: chunk.content?.length || 0,
              hasToolCalls: !!chunk.tool_calls,
              toolCallsCount: chunk.tool_calls?.length || 0
            });

            if (chunk.content) {
              result.content = chunk.content;
              // Yield combined text (previous turns + current turn)
              const combinedText = finalResponse + (finalResponse ? '\n\n' : '') + result.content;
              safeLog('[processMessageStream] Yielding response. Combined length:', combinedText.length);
              yield { type: 'response', data: { response: combinedText, conversationId: convId } };
            }
            if (chunk.tool_calls) {
              result.tool_calls = chunk.tool_calls;
            }
          }

          safeLog(`[processMessageStream] Turn ${turn + 1}: content length=${result.content?.length || 0}, tool_calls=${result.tool_calls?.length || 0}`);

          // Accumulate content from this turn
          if (result.content && result.content.trim().length > 0) {
            finalResponse += (finalResponse ? '\n\n' : '') + result.content;
          }

          if (!result.tool_calls || result.tool_calls.length === 0) {
            safeLog(`[processMessageStream] No tool calls, breaking. finalResponse length: ${finalResponse.length}`);
            break;
          }

          // Notify about tool calls
          yield {
            type: 'tool_call',
            data: {
              tools: result.tool_calls.map((tc: any) => ({
                name: tc.function?.name || tc.name,
                args: tc.function?.arguments || tc.input
              }))
            }
          };

          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: result.content || '',
            tool_calls: result.tool_calls,
            timestamp: Date.now()
          };
          currentMessages.push(assistantMsg);
          lastToolCalls = result.tool_calls;

          // Execute tools and yield results
          for (const toolCall of result.tool_calls) {
            const toolName = toolCall.function?.name || toolCall.name;
            safeLog(`[processMessageStream] Executing tool: ${toolName}`);
            yield { type: 'status', data: { status: `Executing ${toolName}...` } };

            try {
              const args = typeof toolCall.function?.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.input || toolCall.function?.arguments;

              safeLog(`[processMessageStream] Tool ${toolName} args:`, args);
              const toolResult = await executeTool(toolName, args);
              safeLog(`[processMessageStream] Tool ${toolName} completed successfully`);

              yield {
                type: 'tool_result',
                data: { tool: toolName, success: true, result: toolResult }
              };

              currentMessages.push({
                role: 'tool',
                content: JSON.stringify(toolResult),
                name: toolName,
                tool_call_id: toolCall.id,
                timestamp: Date.now()
              });
            } catch (error: any) {
              safeError(`[processMessageStream] Tool ${toolName} failed:`, error);
              yield {
                type: 'tool_result',
                data: { tool: toolName, success: false, error: error.message }
              };

              currentMessages.push({
                role: 'tool',
                content: JSON.stringify({ success: false, error: error.message }),
                name: toolName,
                tool_call_id: toolCall.id,
                timestamp: Date.now()
              });
            }
          }

          turn++;
        } catch (error: any) {
          safeError(`[processMessageStream] Error in turn ${turn + 1}:`, error);
          yield { type: 'error', data: { message: error.message, stack: error.stack } };
          finalResponse = `Error: ${error.message}`;
          break;
        }
      }

      if (turn >= MAX_TURNS) {
        finalResponse = `I've reached the maximum number of tool steps (${MAX_TURNS}). The task may require breaking down into smaller parts.`;
      }

      // If finalResponse is still empty after all turns, this might indicate an error
      if (!finalResponse && turn > 0) {
        safeLog(`[processMessageStream] Empty final response after ${turn} turns. Last tool calls:`, lastToolCalls);
        finalResponse = 'I completed the requested operations but did not generate a text response. Please let me know if you need more details.';
      }

      safeLog(`[processMessageStream] Sending final response. Length: ${finalResponse.length}, turns: ${turn}`);

      // 5. Add final response
      context.messages.push({
        role: 'assistant',
        content: finalResponse,
        tool_calls: lastToolCalls,
        timestamp: Date.now()
      });

      // 6. Auto-index if enabled
      if (modelConfig.autoIndexContext) {
        this.autoIndexContext(context).catch(safeError);
      }

      yield {
        type: 'response',
        data: {
          response: finalResponse,
          conversationId: convId,
          toolCalls: lastToolCalls,
          totalTurns: turn
        }
      };

    } catch (error: any) {
      safeError('[processMessageStream] Fatal error:', error);
      yield { type: 'error', data: { message: error.message, stack: error.stack } };
    }
  }
}

export const enhancedChatOrchestrator = new EnhancedChatOrchestrator();

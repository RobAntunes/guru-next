/**
 * Task Runner Service
 * Orchestrates AI task execution with context and streaming
 */

import type { TaskConfig, TaskResult } from '../../../../shared/types/task';
import { extractCodeBlocks, extractBashCommands } from '../../utils/code-extractor';
import { parseDiffText } from '../../utils/diff-parser';

declare global {
  interface Window {
    api: any;
  }
}

type StreamCallback = (chunk: string) => void;
type CompleteCallback = () => void;
type ErrorCallback = (error: string) => void;

class TaskRunnerService {
  private streamCallbacks: Set<StreamCallback> = new Set();
  private completeCallbacks: Set<CompleteCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  constructor() {
    // Register stream event handlers
    window.api.task.onStreamChunk((text: string) => {
      this.streamCallbacks.forEach(cb => cb(text));
    });

    window.api.task.onStreamComplete(() => {
      this.completeCallbacks.forEach(cb => cb());
    });

    window.api.task.onStreamError((error: string) => {
      this.errorCallbacks.forEach(cb => cb(error));
    });
  }

  /**
   * Execute a task (non-streaming)
   */
  async executeTask(config: TaskConfig): Promise<TaskResult> {
    const result = await window.api.task.execute(config);
    if (!result.success) {
      throw new Error(result.error);
    }

    const taskResult = result.data as TaskResult;

    // Parse response for diffs and commands
    taskResult.diff = this.extractDiffs(taskResult.response);
    taskResult.commands = this.extractCommands(taskResult.response);

    return taskResult;
  }

  /**
   * Execute a task with streaming
   */
  async executeTaskStream(
    config: TaskConfig,
    onChunk: StreamCallback,
    onComplete: CompleteCallback,
    onError: ErrorCallback
  ): Promise<void> {
    // Add callbacks
    this.streamCallbacks.add(onChunk);
    this.completeCallbacks.add(onComplete);
    this.errorCallbacks.add(onError);

    try {
      const result = await window.api.task.executeStream(config);
      if (!result.success) {
        onError(result.error);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Clean up callbacks
      this.streamCallbacks.delete(onChunk);
      this.completeCallbacks.delete(onComplete);
      this.errorCallbacks.delete(onError);
    }
  }

  /**
   * Extract diffs from response
   */
  private extractDiffs(response: string) {
    const parsed = parseDiffText(response);
    if (parsed.files.length === 0) return undefined;

    return {
      files: parsed.files.map(f => ({
        path: f.path,
        oldContent: f.oldContent,
        newContent: f.newContent,
        diff: f.diff
      }))
    };
  }

  /**
   * Extract bash commands from response
   */
  private extractCommands(response: string) {
    const commands = extractBashCommands(response);
    if (commands.length === 0) return undefined;

    return commands.map(cmd => ({
      command: cmd.command,
      risk: this.assessCommandRisk(cmd.command),
      reason: cmd.description
    }));
  }

  /**
   * Assess risk level of a command
   */
  private assessCommandRisk(command: string): 'safe' | 'warning' | 'danger' {
    const dangerous = ['rm -rf', 'dd ', 'mkfs', ':(){:|:&};:', 'curl | sh', 'wget | sh'];
    const warnings = ['rm ', 'sudo ', 'chmod 777', 'chown'];

    for (const pattern of dangerous) {
      if (command.includes(pattern)) return 'danger';
    }

    for (const pattern of warnings) {
      if (command.includes(pattern)) return 'warning';
    }

    return 'safe';
  }
}

export const taskRunner = new TaskRunnerService();

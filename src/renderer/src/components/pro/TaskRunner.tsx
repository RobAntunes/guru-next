/**
 * Task Runner - Execute AI tasks with streaming
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Play, Square, Loader2 } from 'lucide-react';
import { taskRunner } from '../../services/pro/task-runner';
import type { TaskConfig } from '../../../../shared/types/task';

interface TaskRunnerProps {
  contextFiles: string[];
  specs: string[];
}

export function TaskRunner({ contextFiles, specs }: TaskRunnerProps) {
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState('');

  const handleRun = async () => {
    if (!task.trim() || running) return;

    setRunning(true);
    setResponse('');

    const config: TaskConfig = {
      description: task,
      contextFiles,
      specs,
      maxTokens: 4096
    };

    try {
      await taskRunner.executeTaskStream(
        config,
        (chunk) => {
          setResponse(prev => prev + chunk);
        },
        () => {
          setRunning(false);
        },
        (error) => {
          setResponse(prev => prev + `\n\nError: ${error}`);
          setRunning(false);
        }
      );
    } catch (error) {
      setResponse(`Error: ${error}`);
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Task Runner
          </CardTitle>
          <CardDescription>
            Describe what you want to build and AI will help execute it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Example: Add a dark mode toggle to the settings page..."
              rows={3}
              disabled={running}
            />
          </div>

          <Button onClick={handleRun} disabled={!task.trim() || running} className="w-full">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Task
              </>
            )}
          </Button>

          {response && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
              <pre className="whitespace-pre-wrap">{response}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

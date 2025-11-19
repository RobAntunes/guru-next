export interface TaskConfig {
  description: string;
  contextFiles: string[];
  specs: string[];
  maxTokens: number;
}

export interface TaskResult {
  id: string;
  taskDescription: string;
  response: string;
  diff?: CodeDiff;
  summary?: DiffSummary;
  commands?: PendingCommand[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  timestamp: Date;
}

export interface CodeDiff {
  files: Array<{
    path: string;
    oldContent: string;
    newContent: string;
    diff: string;
  }>;
}

export interface DiffSummary {
  overview: string;
  categories: {
    dependencies: string[];
    newCode: string[];
    modifiedBehavior: string[];
    deletions: string[];
    risks: string[];
  };
  impactScore: 'low' | 'medium' | 'high';
}

export interface PendingCommand {
  command: string;
  risk: 'safe' | 'warning' | 'danger';
  reason?: string;
  violatesSpec?: string;
}

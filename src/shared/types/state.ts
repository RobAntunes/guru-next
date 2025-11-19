export interface ConversationState {
  goal: string;
  constraints: Array<{
    id: string;
    label: string;
    value: string;
    active: boolean;
    source: 'spec' | 'manual';
  }>;
  facts: Array<{
    id: string;
    label: string;
    value: any;
    confidence: number;
  }>;
  history: Array<{
    action: string;
    result: 'success' | 'failure';
    summary: string;
    timestamp: Date;
  }>;
}

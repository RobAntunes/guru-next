/**
 * Diff Preview - Show code diffs with Second Face summary
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FileCode, AlertTriangle } from 'lucide-react';
import type { CodeDiff, DiffSummary } from '../../../../shared/types/task';

interface DiffPreviewProps {
  diff: CodeDiff;
  summary?: DiffSummary;
}

export function DiffPreview({ diff, summary }: DiffPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Changes ({diff.files.length} files)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold">Second Face Summary</h4>
            <p className="text-sm">{summary.overview}</p>

            {summary.categories.risks.length > 0 && (
              <div className="mt-2 space-y-1">
                {summary.categories.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-orange-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2">
              <span className={`text-xs px-2 py-1 rounded ${
                summary.impactScore === 'low' ? 'bg-green-100 text-green-700' :
                summary.impactScore === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                Impact: {summary.impactScore}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {diff.files.map((file, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono text-sm">
                {file.path}
              </div>
              <pre className="p-3 text-xs overflow-auto max-h-64 bg-slate-900 text-slate-100">
                {file.diff}
              </pre>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

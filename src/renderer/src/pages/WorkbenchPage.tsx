import React from 'react';
import { Terminal, Play, Save, GitBranch, CheckCircle2, XCircle, AlertCircle, ArrowRight, Box } from 'lucide-react';
import { cn } from '../lib/utils';
import { SandboxConsole } from '../components/workbench/SandboxConsole';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';

SyntaxHighlighter.registerLanguage('tsx', tsx);

// Custom monochromatic style for flat design
const monochromeStyle = {
    'code[class*="language-"]': {
        color: 'hsl(var(--foreground))',
        fontFamily: 'monospace',
    },
    'pre[class*="language-"]': {
        color: 'hsl(var(--foreground))',
        fontFamily: 'monospace',
    },
    'comment': { color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' },
    'prolog': { color: 'hsl(var(--muted-foreground))' },
    'doctype': { color: 'hsl(var(--muted-foreground))' },
    'cdata': { color: 'hsl(var(--muted-foreground))' },
    'punctuation': { color: 'hsl(var(--muted-foreground))' },
    'property': { color: 'hsl(var(--foreground))' },
    'tag': { color: 'hsl(var(--foreground))' },
    'boolean': { color: 'hsl(var(--foreground))' },
    'number': { color: 'hsl(var(--foreground))' },
    'constant': { color: 'hsl(var(--foreground))' },
    'symbol': { color: 'hsl(var(--foreground))' },
    'selector': { color: 'hsl(var(--foreground))' },
    'attr-name': { color: 'hsl(var(--foreground))' },
    'string': { color: 'hsl(var(--foreground))' },
    'char': { color: 'hsl(var(--foreground))' },
    'builtin': { color: 'hsl(var(--foreground))' },
    'operator': { color: 'hsl(var(--muted-foreground))' },
    'entity': { color: 'hsl(var(--foreground))' },
    'url': { color: 'hsl(var(--foreground))' },
    'variable': { color: 'hsl(var(--foreground))' },
    'atrule': { color: 'hsl(var(--foreground))' },
    'attr-value': { color: 'hsl(var(--foreground))' },
    'keyword': { color: 'hsl(var(--foreground))', fontWeight: 'bold' },
    'function': { color: 'hsl(var(--foreground))' },
    'class-name': { color: 'hsl(var(--foreground))' },
    'regex': { color: 'hsl(var(--muted-foreground))' },
    'important': { color: 'hsl(var(--foreground))', fontWeight: 'bold' },
};

const codeSnippet = `import { Stripe } from 'stripe';
import { z } from 'zod'; // Assuming z is imported from zod

// Dynamic Tool Definition
export const stripeTool = {
    name: 'stripe_charge',
    description: 'Create a charge using Stripe API',
    parameters: z.object({
        amount: z.number(),
        currency: z.string().default('usd'),
    }),
    execute: async (args) => {
        // Sandbox intercepts this call
        const stripe = new Stripe(process.env.STRIPE_KEY);
        return await stripe.charges.create(args);
    }
}; `;

export const WorkbenchPage = () => {
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <Terminal className="w-4 h-4" />
                        <span className="font-mono text-sm font-bold text-foreground">tool.ts</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Context:</span>
                        <span className="px-2 py-0.5 bg-secondary border border-border text-xs font-mono text-foreground">@stripe/sdk</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors">
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium border border-foreground transition-colors">
                        <Play className="w-3.5 h-3.5" />
                        <span>Run in Sandbox</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Editor Area */}
                <div className="flex-1 flex flex-col border-r border-border bg-background">
                    <div className="flex-1 overflow-auto bg-background">
                        <SyntaxHighlighter
                            language="tsx"
                            style={monochromeStyle}
                            customStyle={{
                                margin: 0,
                                padding: '1.5rem',
                                background: 'transparent',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                                fontFamily: 'monospace',
                            }}
                            codeTagProps={{
                                style: {
                                    fontFamily: 'monospace',
                                }
                            }}
                        >
                            {codeSnippet}
                        </SyntaxHighlighter>
                    </div>

                    {/* Console / Flight Recorder */}
                    <div className="h-64 border-t border-border bg-background flex flex-col">
                        <div className="h-8 border-b border-border flex items-center px-4 bg-secondary/30">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Flight Recorder</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <SandboxConsole />
                        </div>
                    </div>
                </div>

                {/* Sidebar / Promotion Pipeline */}
                <div className="w-80 bg-background flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Promotion Pipeline</h3>
                        <div className="space-y-6 relative">
                            {/* Connecting Line */}
                            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border -z-10" />

                            {/* Steps */}
                            <div className="flex items-start space-x-3">
                                <div className="w-7 h-7 rounded-none bg-background border border-foreground flex items-center justify-center z-10">
                                    <Box className="w-3.5 h-3.5 text-foreground" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">Sandbox</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">Isolated execution environment</div>
                                    <div className="mt-2 flex items-center text-xs font-mono text-foreground">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        <span>Tests Passing</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="w-7 h-7 rounded-none bg-background border border-muted-foreground flex items-center justify-center z-10">
                                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Shadow Mode</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">Run against prod traffic (read-only)</div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <div className="w-7 h-7 rounded-none bg-background border border-muted-foreground flex items-center justify-center z-10">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Production</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">Full access enabled</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Active Policies</h3>
                        <div className="space-y-2">
                            <div className="p-3 border border-border bg-card">
                                <div className="flex items-center space-x-2 mb-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-foreground" />
                                    <span className="text-xs font-bold text-foreground">PII Redaction</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Automatically masks email addresses and phone numbers in logs.
                                </p>
                            </div>
                            <div className="p-3 border border-border bg-card">
                                <div className="flex items-center space-x-2 mb-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-foreground" />
                                    <span className="text-xs font-bold text-foreground">Rate Limiting</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Max 10 requests / second per agent instance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Custom code block component with syntax highlighting
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          return !inline && language ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              className="rounded-sm !bg-black/90 !mt-2 !mb-2 border border-border/50"
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.75rem',
                lineHeight: '1.5',
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code
              className="bg-black/30 text-green-400 px-1.5 py-0.5 rounded text-xs font-mono border border-border/30"
              {...props}
            >
              {children}
            </code>
          );
        },

        // Custom heading components
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-foreground mt-4 mb-2 pb-2 border-b border-border font-mono uppercase tracking-wider">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold text-foreground mt-3 mb-2 font-mono uppercase tracking-wide">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold text-foreground mt-2 mb-1 font-mono">
            {children}
          </h3>
        ),

        // Custom paragraph with proper spacing
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-3 last:mb-0">
            {children}
          </p>
        ),

        // Custom list components
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2 text-sm">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2 text-sm">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm leading-relaxed">
            {children}
          </li>
        ),

        // Custom blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-2 bg-secondary/20 italic text-sm">
            {children}
          </blockquote>
        ),

        // Custom link
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),

        // Custom table components
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-border text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-secondary border-b border-border">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-secondary/50 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-bold font-mono uppercase tracking-wider text-xs">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2">
            {children}
          </td>
        ),

        // Custom horizontal rule
        hr: () => (
          <hr className="my-4 border-t border-border/50" />
        ),

        // Custom strong/bold
        strong: ({ children }) => (
          <strong className="font-bold text-foreground">
            {children}
          </strong>
        ),

        // Custom emphasis/italic
        em: ({ children }) => (
          <em className="italic text-foreground/90">
            {children}
          </em>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

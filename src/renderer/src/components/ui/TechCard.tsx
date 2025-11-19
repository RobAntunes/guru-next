import React from 'react';
import { cn } from '../../lib/utils';

export interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const TechCard = ({ children, className, onClick, ...props }: TechCardProps) => (
    <div
        onClick={onClick}
        className={cn(
            "relative bg-card border border-border p-6 group transition-all duration-300 hover:border-primary/50 cursor-pointer overflow-hidden",
            className
        )}
        {...props}
    >
        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-foreground/30 transition-all group-hover:w-4 group-hover:h-4 group-hover:border-primary" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-foreground/30 transition-all group-hover:w-4 group-hover:h-4 group-hover:border-primary" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-foreground/30 transition-all group-hover:w-4 group-hover:h-4 group-hover:border-primary" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-foreground/30 transition-all group-hover:w-4 group-hover:h-4 group-hover:border-primary" />

        {/* Content */}
        <div className="relative z-10">
            {children}
        </div>

        {/* Subtle Scanline Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 pointer-events-none" />
    </div>
);

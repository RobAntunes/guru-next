import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

export const ThemeToggle = ({ collapsed }: { collapsed?: boolean }) => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'dark' : 'light');
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
            )}
            title={collapsed ? (theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode") : undefined}
        >
            {theme === 'light' ? (
                <>
                    <Moon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium text-sm">Dark Mode</span>}
                </>
            ) : (
                <>
                    <Sun className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium text-sm">Light Mode</span>}
                </>
            )}
        </button>
    );
};

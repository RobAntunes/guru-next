import React, { useEffect, useState } from 'react';
import { Sidebar, Page } from '../sidebar/Sidebar';
import { ControlRoomPage } from '../../pages/ControlRoomPage';
import { WorkbenchPage } from '../../pages/WorkbenchPage';
import { DogfoodWorkbenchPage } from '../../pages/DogfoodWorkbenchPage';
import { RuntimePage } from '../../pages/RuntimePage';
import { GovernancePage } from '../../pages/GovernancePage';
import { KnowledgePage } from '../../pages/KnowledgePage';
import { CommandBar } from '../command-bar/CommandBar';
import { CommsPanel, CommsMode } from '../comms/CommsPanel';
import { cn } from '@/lib/utils';

export const MainLayout = () => {
    const [activePage, setActivePage] = useState<Page>('control-room');
    const [commsMode, setCommsMode] = useState<CommsMode>('hidden');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (commsMode === 'sidebar') {
            setSidebarCollapsed(true);
        } else if (commsMode === 'hidden') {
            setSidebarCollapsed(false);
        }
    }, [commsMode]);

    const handleNavigate = (page: Page) => {
        if (page === 'chat') {
            // Toggle Comms Panel instead of navigating
            setCommsMode(prev => prev === 'hidden' ? 'sidebar' : 'hidden');
        } else {
            setActivePage(page);
        }
    };

    const renderPage = () => {
        switch (activePage) {
            case 'control-room':
                return <ControlRoomPage onNavigate={handleNavigate} />;
            case 'workbench':
                return <DogfoodWorkbenchPage />;
            case 'runtime':
                return <RuntimePage />;
            case 'governance':
                return <GovernancePage />;
            case 'knowledge':
                return <KnowledgePage />;
            default:
                return <div className="flex items-center justify-center h-full text-muted-foreground">Page not implemented</div>;
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex relative">
            {/* Global Background Grid Texture */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
                style={{
                    backgroundImage: `linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="relative z-10 flex h-full w-full">
                <CommandBar />
                <Sidebar
                    activePage={activePage}
                    onNavigate={handleNavigate}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                {/* Main Content Area - Shrinks when Comms is in Sidebar mode */}
                <main
                    className={cn(
                        "flex-1 overflow-hidden relative transition-all duration-300 ease-in-out",
                        commsMode === 'sidebar' && "mr-[50vw]"
                    )}
                >
                    {renderPage()}
                </main>

                {/* Persistent Comms Panel */}
                <CommsPanel mode={commsMode} onModeChange={setCommsMode} />
            </div>
        </div>
    );
};

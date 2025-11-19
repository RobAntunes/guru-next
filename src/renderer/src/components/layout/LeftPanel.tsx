import React from 'react';
import { FileTree } from '../context/FileTree';
import { StateGraph } from '../context/StateGraph';

export const LeftPanel = () => {
    return (
        <div className="h-full w-full bg-sidebar border-r border-border flex flex-col">
            <div className="flex-1 overflow-hidden border-b border-border">
                <FileTree />
            </div>
            <div className="h-1/3 overflow-hidden">
                <StateGraph />
            </div>
        </div>
    );
};

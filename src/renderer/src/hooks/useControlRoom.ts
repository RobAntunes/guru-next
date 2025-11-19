import { useEffect, useState } from 'react';
import { controlRoomService } from '../services/control-room.service';
import { ControlRoomMetrics, SystemLog } from '../types/control-room';

export const useControlRoom = () => {
    const [metrics, setMetrics] = useState<ControlRoomMetrics>({
        activeAgents: 0,
        eventsPerMinute: 0,
        openIncidents: 0,
        latency: 0,
        isSystemOnline: false
    });

    const [logs, setLogs] = useState<SystemLog[]>([]);

    useEffect(() => {
        const unsubMetrics = controlRoomService.subscribeToMetrics(setMetrics);

        const unsubLogs = controlRoomService.subscribeToLogs((newLog) => {
            setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
        });

        return () => {
            unsubMetrics();
            unsubLogs();
        };
    }, []);

    return { metrics, logs };
};

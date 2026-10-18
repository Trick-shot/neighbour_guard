/**
 * Chat socket for one conversation.
 * - Gets a fresh one-time ticket before every connect (the JWT never goes in a URL).
 * - Reconnects with back-off (1, 2, 4 … 30 s) and stops for good when the screen unmounts.
 * - After a reconnect, fetches anything missed over HTTP.
 */
import {useCallback, useEffect, useRef, useState} from 'react';

import {chatApi} from './endpoints';
import {ChatMessage} from './types';

type AlertUpdate = { alert_id: number; status: string; responders: { user_id: number; name: string; state: string }[] };

export function useChatSocket(conversationId: number, handlers: {
    onMessage: (m: ChatMessage) => void;
    onAlertUpdate?: (u: AlertUpdate) => void;
    lastMessageId: () => number | undefined;
}) {
    const ws = useRef<WebSocket | null>(null);
    const closedByUs = useRef(false);
    const attempt = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;
    const [connected, setConnected] = useState(false);

    const connect = useCallback(async () => {
        if (closedByUs.current) return;
        try {
            const {ticket} = await chatApi.ticket();
            const socket = new WebSocket(`${process.env.EXPO_PUBLIC_WS_URL}/ws/v2/chat/${conversationId}/?ticket=${ticket}`);
            ws.current = socket;
            socket.onopen = async () => {
                const reconnect = attempt.current > 0;
                attempt.current = 0;
                setConnected(true);
                const after = handlersRef.current.lastMessageId();
                if (reconnect && after) {
                    const missed = await chatApi.messages(conversationId, {after}).catch(() => []);
                    missed.forEach(handlersRef.current.onMessage);
                }
            };
            socket.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'message') handlersRef.current.onMessage(data as ChatMessage);
                if (data.type === 'alert_update') handlersRef.current.onAlertUpdate?.(data);
            };
            socket.onclose = (e) => {
                setConnected(false);
                if (closedByUs.current || e.code === 4403) return;
                scheduleReconnect();
            };
        } catch {
            scheduleReconnect();
        }
    }, [conversationId]);

    const scheduleReconnect = () => {
        if (closedByUs.current) return;
        const delay = Math.min(30_000, 1000 * 2 ** attempt.current);
        attempt.current += 1;
        timer.current = setTimeout(connect, delay);
    };

    useEffect(() => {
        closedByUs.current = false;
        connect();
        return () => {
            closedByUs.current = true;
            if (timer.current) clearTimeout(timer.current);
            ws.current?.close();
        };
    }, [connect]);

    const send = useCallback((frame: object) => {
        if (ws.current?.readyState !== WebSocket.OPEN) return false;
        ws.current.send(JSON.stringify(frame));
        return true;
    }, []);

    return {connected, send};
}

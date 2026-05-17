import authStorage from "@/auth/storage";
import {useEffect, useRef, useState} from "react";

export interface ChatMessage {
    message_id: number;
    content: string;
    sender_id: number;
    sender_name: string;
    created_at: string;
    type: string;
}

const WS_BASE = 'ws://192.168.1.6:8000';

export const useWebSocket = (conversationId: number) => {
    const ws = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

    useEffect(() => {
        connect();
        return () => ws.current?.close();
    }, [conversationId]);

    const connect = async () => {
        const token = await authStorage.getToken();

        ws.current = new WebSocket(`${WS_BASE}/ws/chat/${conversationId}/?token=${token}`);

        ws.current.onopen = () => {
            setIsConnected(true);
            console.log('WebSocket connected ✅');
        };

        ws.current.onmessage = (e) => {
            const data = JSON.parse(e.data);
            console.log('WS message:', data);

            if (data.type === 'message') {
                setMessages(prev => [...prev, data]);
            } else if (data.type === 'status') {
                setOnlineUsers(prev =>
                    data.is_online
                        ? [...prev, data.user_id]
                        : prev.filter(id => id !== data.user_id)
                );
            }
        };

        ws.current.onclose = (e) => {
            setIsConnected(false);
            console.log('WS closed:', e.code);
            setTimeout(connect, 3000);
        };

        ws.current.onerror = (e) => {
            console.log('WebSocket error:', e);
        };
    };

    const sendMessage = (content: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({type: 'message', content}));
        }
    };

    const sendReadReceipt = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({type: 'read'}));
        }
    };

    return {messages, isConnected, onlineUsers, sendMessage, sendReadReceipt};
};
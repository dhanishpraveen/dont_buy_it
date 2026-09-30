import { MessageSquare, Send, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversationMessages, getConversations, sendMessage, type MessageRecord } from '../services/messageService';
import { formatRelativeTime } from '../services/notificationService';

export function MessagesPage() {
    const { user } = useAuth();
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Array<{ id: string; listing_id: string; request_id: string | null; exchange_id: string | null; created_at: string }>>([]);
    const [messages, setMessages] = useState<MessageRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!user) return;
        void (async () => {
            setLoading(true);
            try {
                const nextConversations = await getConversations();
                setConversations(nextConversations);
                if (!conversationId && nextConversations[0]) {
                    navigate(`/messages/${nextConversations[0].id}`, { replace: true });
                }
            } catch {
                setConversations([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [conversationId, navigate, user]);

    useEffect(() => {
        if (!conversationId) return;
        void (async () => {
            try {
                const nextMessages = await getConversationMessages(conversationId);
                setMessages(nextMessages);
            } catch {
                setMessages([]);
            }
        })();
    }, [conversationId]);

    const activeConversation = useMemo(
        () => conversations.find((conversation) => conversation.id === conversationId) ?? conversations[0],
        [conversationId, conversations],
    );

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const send = async () => {
        if (!activeConversation || !draft.trim() || !conversationId) return;
        setSending(true);
        try {
            await sendMessage(conversationId, draft);
            setDraft('');
            const nextMessages = await getConversationMessages(conversationId);
            setMessages(nextMessages);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-card border border-line bg-surface p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="font-display text-2xl font-semibold text-ink">Messages</h1>
                    <span className="rounded-full bg-sage-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sage">{conversations.length}</span>
                </div>
                {loading ? (
                    <p className="text-sm text-muted">Loading conversations...</p>
                ) : conversations.length ? (
                    <div className="space-y-2">
                        {conversations.map((conversation) => {
                            const active = conversation.id === activeConversation?.id;
                            return (
                                <Link
                                    key={conversation.id}
                                    to={`/messages/${conversation.id}`}
                                    className={`block rounded-control border p-3 text-left transition-colors ${active ? 'border-sage bg-sage-soft' : 'border-line bg-canvas hover:border-sage'}`}
                                >
                                    <p className="text-sm font-semibold text-ink">Conversation #{conversation.id.slice(0, 8)}</p>
                                    <p className="mt-1 text-xs text-muted">
                                        {conversation.request_id ? 'Request conversation' : 'Exchange conversation'}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-control border border-dashed border-line bg-canvas p-6 text-sm text-muted">
                        No conversations yet. Requests and exchanges create one automatically for coordination.
                    </div>
                )}
            </aside>

            <section className="rounded-card border border-line bg-surface p-4">
                {!activeConversation ? (
                    <div className="flex h-full min-h-[420px] items-center justify-center text-center text-muted">
                        Pick a conversation to begin.
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage">
                                <MessageSquare size={19} />
                            </div>
                            <div>
                                <p className="font-display text-xl font-semibold text-ink">Conversation</p>
                                <p className="text-xs text-muted">{activeConversation.request_id ? 'Request coordination' : 'Exchange coordination'}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {messages.length ? (
                                messages.map((message) => {
                                    const isMine = message.sender_id === user.id;
                                    return (
                                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-card border p-3 ${isMine ? 'border-bark bg-bark text-white' : 'border-line bg-canvas text-ink'}`}>
                                                <div className="mb-1 flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold uppercase">
                                                        {message.sender?.full_name ? message.sender.full_name.slice(0, 2) : <UserRound size={12} />}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${isMine ? 'text-white/80' : 'text-muted'}`}>
                                                        {isMine ? 'You' : message.sender?.full_name ?? 'Participant'}
                                                    </span>
                                                    <span className={`text-[10px] ${isMine ? 'text-white/70' : 'text-muted'}`}>{formatRelativeTime(message.created_at)}</span>
                                                </div>
                                                <p className={`whitespace-pre-wrap text-sm leading-6 ${isMine ? 'text-white' : 'text-ink'}`}>{message.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-control border border-dashed border-line bg-canvas px-4 py-8 text-center text-sm text-muted">
                                    No messages yet. Start the conversation with a quick update.
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex gap-3 border-t border-line pt-4">
                            <textarea
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                rows={3}
                                className="min-h-[92px] flex-1 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-sage focus:outline-none"
                                placeholder="Send a quick update about collection, pickup, or return timing..."
                            />
                            <button
                                type="button"
                                onClick={() => { void send(); }}
                                disabled={sending || !draft.trim()}
                                className="inline-flex items-center justify-center gap-2 rounded-control bg-bark px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send size={15} />
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

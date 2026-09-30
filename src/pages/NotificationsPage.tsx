import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCachedResource } from '../hooks/useCachedResource';
import { cacheKeys, cacheTtl } from '../lib/localStorageCache';
import {
    buildNotificationUrl,
    formatRelativeTime,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    type NotificationRecord,
} from '../services/notificationService';

export function NotificationsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const { data, loading, refresh } = useCachedResource<NotificationRecord[]>(
        cacheKeys.notifications(user?.id ?? 'signed-out'),
        cacheTtl.notifications,
        getNotifications,
    );

    const notifications = data ?? [];
    const unreadCount = notifications.filter((entry) => !entry.is_read).length;
    const visibleNotifications = useMemo(
        () => (filter === 'unread' ? notifications.filter((entry) => !entry.is_read) : notifications),
        [filter, notifications],
    );

    useEffect(() => {
        if (user?.id) {
            void refresh();
        }
    }, [refresh, user?.id]);

    const openNotification = async (notification: NotificationRecord) => {
        if (!notification.is_read) {
            await markNotificationRead(notification.id);
            refresh();
        }
        navigate(buildNotificationUrl(notification));
    };

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-card bg-sage-soft p-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-handwritten text-2xl text-sage">Updates</p>
                    <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Notifications</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFilter('all')} className={`rounded-control px-3 py-2 text-sm font-semibold ${filter === 'all' ? 'bg-bark text-white' : 'bg-white text-muted'}`}>
                        All
                    </button>
                    <button type="button" onClick={() => setFilter('unread')} className={`rounded-control px-3 py-2 text-sm font-semibold ${filter === 'unread' ? 'bg-bark text-white' : 'bg-white text-muted'}`}>
                        Unread ({unreadCount})
                    </button>
                    <button type="button" onClick={() => { void markAllNotificationsRead(); refresh(); }} className="inline-flex items-center gap-2 rounded-control border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas">
                        <CheckCheck size={16} />
                        Mark all read
                    </button>
                </div>
            </section>

            {loading ? (
                <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-muted">Loading notifications...</div>
            ) : visibleNotifications.length ? (
                <div className="space-y-3">
                    {visibleNotifications.map((notification) => (
                        <button
                            key={notification.id}
                            type="button"
                            onClick={() => { void openNotification(notification); }}
                            className={`flex w-full items-start justify-between gap-4 rounded-card border p-4 text-left transition-colors ${notification.is_read ? 'border-line bg-surface' : 'border-sage bg-sage-soft'} hover:border-sage`}
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <div className={`mt-0.5 rounded-full p-2 ${notification.is_read ? 'bg-white text-muted' : 'bg-bark text-white'}`}>
                                    <Bell size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink">{notification.title}</p>
                                    <p className="mt-1 text-sm text-muted">{notification.message}</p>
                                </div>
                            </div>
                            <div className="shrink-0 text-right text-xs text-muted">
                                <div>{formatRelativeTime(notification.created_at)}</div>
                                {!notification.is_read ? <div className="mt-2 inline-flex rounded-full bg-bark px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">New</div> : null}
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-soft text-sage">
                        <Inbox size={20} />
                    </div>
                    <h2 className="mt-4 font-display text-xl font-semibold text-ink">No notifications yet</h2>
                    <p className="mt-2 text-sm text-muted">When someone requests an item or you receive a message, it will appear here.</p>
                </div>
            )}
        </div>
    );
}

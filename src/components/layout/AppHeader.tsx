import { Bell, ChevronDown, MapPin, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockUser } from '../../data/mockUser';
import { useAuth } from '../../context/AuthContext';
import { cacheKeys, cacheTtl, getCacheEntry, setCacheEntry } from '../../lib/localStorageCache';
import { buildNotificationUrl, getNotifications, markNotificationRead, type NotificationRecord } from '../../services/notificationService';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { IconButton } from '../ui/IconButton';
import { SearchInput } from '../ui/SearchInput';

type AppHeaderProps = { onMenuClick: () => void };

export function AppHeader({ onMenuClick }: AppHeaderProps) {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const displayUser = user ?? mockUser;
    const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!user?.id) {
            setNotifications([]);
            return;
        }

        const loadNotifications = async () => {
            const cacheKey = cacheKeys.notifications(user.id);
            const cached = getCacheEntry<NotificationRecord[]>(cacheKey);
            if (cached) setNotifications(cached);

            try {
                const nextNotifications = await getNotifications();
                setCacheEntry(cacheKey, nextNotifications, cacheTtl.notifications);
                setNotifications(nextNotifications);
            } catch {
                setNotifications(cached ?? []);
            }
        };

        void loadNotifications();
    }, [user?.id]);

    const unreadCount = notifications.filter((notification) => !notification.is_read).length;

    const openNotification = async (notification: NotificationRecord) => {
        setMenuOpen(false);
        if (!notification.is_read) {
            await markNotificationRead(notification.id);
            setNotifications((current) => current.map((entry) => entry.id === notification.id ? { ...entry, is_read: true } : entry));
        }
        navigate(buildNotificationUrl(notification));
    };

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur-sm">
            <div className="flex min-h-[72px] items-center gap-3 px-5 sm:px-8 lg:px-10">
                <IconButton label="Open navigation" className="lg:hidden" onClick={onMenuClick}><Menu size={21} /></IconButton>
                <div className="min-w-0 flex-1 sm:max-w-md"><SearchInput className="w-full" /></div>
                <button className="hidden items-center gap-1.5 rounded-control px-2 py-2 text-sm font-semibold text-muted hover:bg-sage-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage xl:flex" aria-label="Choose location"><MapPin size={16} aria-hidden="true" /><span>{mockUser.location}</span><ChevronDown size={14} aria-hidden="true" /></button>
                <div className="relative">
                    <IconButton label="View notifications" onClick={() => { setMenuOpen((current) => !current); navigate('/notifications'); }}><Bell size={19} /></IconButton>
                    {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bark px-1 text-[10px] font-bold text-white">{unreadCount}</span> : null}
                    {menuOpen && user ? (
                        <div className="absolute right-0 top-full z-30 mt-3 w-[320px] rounded-card border border-line bg-surface p-3 shadow-soft">
                            <div className="mb-3 flex items-center justify-between px-1">
                                <p className="text-sm font-semibold text-ink">Notifications</p>
                                <button type="button" onClick={() => navigate('/notifications')} className="text-xs font-semibold text-bark">View all</button>
                            </div>
                            <div className="space-y-2">
                                {notifications.slice(0, 4).map((notification) => (
                                    <button key={notification.id} type="button" onClick={() => { void openNotification(notification); }} className={`block w-full rounded-control border p-2 text-left ${notification.is_read ? 'border-line bg-canvas' : 'border-sage bg-sage-soft'}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-ink">{notification.title}</p>
                                            {!notification.is_read ? <span className="h-2 w-2 rounded-full bg-bark" /> : null}
                                        </div>
                                        <p className="mt-1 text-xs leading-5 text-muted">{notification.message}</p>
                                    </button>
                                ))}
                                {!notifications.length ? <p className="px-2 py-3 text-sm text-muted">No notifications yet.</p> : null}
                            </div>
                        </div>
                    ) : null}
                </div>
                <Dropdown label=""><span className="flex items-center gap-2"><Avatar initials={displayUser.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} size="sm" /><span className="hidden text-left sm:block"><span className="block text-sm font-semibold text-ink">{displayUser.name}</span><span className="block text-xs text-muted">{user ? 'Member' : 'Demo mode'}</span></span></span><span className="sr-only">Open user menu</span>
                    {user ? <Link to="/profile" role="menuitem" className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-sage-soft">Profile</Link> : null}
                    <Link to="/settings" role="menuitem" className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-sage-soft">Settings</Link>
                    {user ? <button type="button" role="menuitem" onClick={() => { void signOut().finally(() => navigate('/login', { replace: true })); }} className="block w-full rounded-control px-3 py-2 text-left text-sm text-ink hover:bg-sage-soft">Sign out</button> : <Link to="/login" role="menuitem" className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-sage-soft">Sign in</Link>}
                </Dropdown>
            </div>
        </header>
    );
}
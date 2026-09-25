import { HelpCircle, Home, LayoutGrid, ListChecks, MessageCircle, Settings, Users, X, Heart, Sparkles, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { IconButton } from '../ui/IconButton';

type AppSidebarProps = { open: boolean; onClose: () => void };

const navigation = [
    { label: 'Home', to: '/dashboard', icon: Home },
    { label: 'AI Assistant', to: '/ai-assistant', icon: Sparkles },
    { label: 'Scenario Comparison', to: '/scenario-comparison', icon: BarChart3 },
    { label: 'Browse', to: '/browse', icon: LayoutGrid },
    { label: 'My Requests', to: '/requests', icon: ListChecks },
    { label: 'My Listings', to: '/listings', icon: LayoutGrid },
    { label: 'Messages', to: '/messages', icon: MessageCircle },
    { label: 'Saved', to: '/saved', icon: Heart },
    { label: 'Community', to: '/community', icon: Users },
];

export function AppSidebar({ open, onClose }: AppSidebarProps) {
    return (
        <>
            {open ? <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={onClose} /> : null}
            <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line bg-surface px-5 py-6 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between px-2">
                    <NavLink to="/dashboard" className="font-handwritten text-3xl font-semibold text-bark" onClick={onClose}>Don't Buy It</NavLink>
                    <IconButton label="Close navigation" className="lg:hidden" onClick={onClose}><X size={19} /></IconButton>
                </div>
                <nav className="mt-10 flex-1" aria-label="App navigation">
                    <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Workspace</p>
                    <div className="mt-3 grid gap-1">
                        {navigation.map(({ label, to, icon: Icon }) => (
                            <NavLink key={to} to={to} state={to === '/community' ? { authenticated: true } : undefined} onClick={onClose} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors ${isActive ? 'bg-sage-soft text-sage' : 'text-muted hover:bg-canvas hover:text-ink'}`}>
                                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                                {label}
                            </NavLink>
                        ))}
                    </div>
                    <div className="my-6 h-px bg-line" />
                    <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Account</p>
                    <div className="mt-3 grid gap-1">
                        <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors ${isActive ? 'bg-sage-soft text-sage' : 'text-muted hover:bg-canvas hover:text-ink'}`}><Settings size={18} strokeWidth={1.8} aria-hidden="true" />Settings</NavLink>
                        <NavLink to="/help" onClick={onClose} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors ${isActive ? 'bg-sage-soft text-sage' : 'text-muted hover:bg-canvas hover:text-ink'}`}><HelpCircle size={18} strokeWidth={1.8} aria-hidden="true" />Help &amp; Support</NavLink>
                    </div>
                </nav>
                <div className="rounded-card bg-sage-soft p-4">
                    <p className="font-display text-base font-semibold text-ink">Borrow first.</p>
                    <p className="mt-1 text-xs leading-5 text-muted">A small choice can keep useful things in motion.</p>
                </div>
            </aside>
        </>
    );
}
import { Bell, ChevronDown, MapPin, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { mockUser } from '../../data/mockUser';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { IconButton } from '../ui/IconButton';
import { SearchInput } from '../ui/SearchInput';

type AppHeaderProps = { onMenuClick: () => void };

export function AppHeader({ onMenuClick }: AppHeaderProps) {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur-sm">
            <div className="flex min-h-[72px] items-center gap-3 px-5 sm:px-8 lg:px-10">
                <IconButton label="Open navigation" className="lg:hidden" onClick={onMenuClick}><Menu size={21} /></IconButton>
                <div className="min-w-0 flex-1 sm:max-w-md"><SearchInput className="w-full" /></div>
                <button className="hidden items-center gap-1.5 rounded-control px-2 py-2 text-sm font-semibold text-muted hover:bg-sage-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage xl:flex" aria-label="Choose location"><MapPin size={16} aria-hidden="true" /><span>{mockUser.location}</span><ChevronDown size={14} aria-hidden="true" /></button>
                <IconButton label="View notifications" onClick={() => navigate('/notifications')}><Bell size={19} /></IconButton>
                <Dropdown label=""><span className="flex items-center gap-2"><Avatar initials={mockUser.initials} size="sm" /><span className="hidden text-left sm:block"><span className="block text-sm font-semibold text-ink">{mockUser.name}</span><span className="block text-xs text-muted">Member</span></span></span><span className="sr-only">Open user menu</span>
                    <Link to="/settings" role="menuitem" className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-sage-soft">Settings</Link>
                    <Link to="/" role="menuitem" className="block rounded-control px-3 py-2 text-sm text-ink hover:bg-sage-soft">Sign out</Link>
                </Dropdown>
            </div>
        </header>
    );
}
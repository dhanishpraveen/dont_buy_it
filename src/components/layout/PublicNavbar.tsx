import { ChevronDown, MapPin } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const links = [
    { label: 'Home', to: '/' },
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'Community', to: '/community' },
    { label: 'About', to: '/about' },
];

export function PublicNavbar() {
    const { user } = useAuth();
    return (
        <header className="border-b border-line bg-canvas/95">
            <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-8 px-6 lg:px-10" aria-label="Public navigation">
                <Link to="/" className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage" aria-label="Don't Buy It home">
                    <span className="font-handwritten text-3xl font-semibold leading-none text-bark">Don't Buy It</span>
                </Link>
                <div className="hidden items-center gap-7 lg:flex">
                    {links.map((link) => (
                        <NavLink key={link.to} to={link.to} className={({ isActive }) => `text-sm font-semibold transition-colors hover:text-bark ${isActive ? 'text-bark' : 'text-muted'}`}>
                            {link.label}
                        </NavLink>
                    ))}
                </div>
                <div className="hidden items-center gap-3 md:flex">
                    <button className="inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-semibold text-muted hover:bg-sage-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage" aria-label="Choose location">
                        <MapPin size={16} aria-hidden="true" />
                        <span>Chennai, India</span>
                        <ChevronDown size={14} aria-hidden="true" />
                    </button>
                    {user ? <Link to="/dashboard"><Button className="h-10 px-4">Open workspace</Button></Link> : <><Link to="/login" className="px-3 py-2 text-sm font-semibold text-ink hover:text-bark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage">Sign In</Link><Link to="/signup"><Button className="h-10 px-4">Sign Up</Button></Link></>}
                </div>
                <div className="flex items-center gap-2 md:hidden">
                    {user ? <Link to="/dashboard"><Button className="h-10 px-3">Workspace</Button></Link> : <><Link to="/login" className="text-sm font-semibold text-ink">Sign In</Link><Link to="/signup"><Button className="h-10 px-3">Sign Up</Button></Link></>}
                </div>
            </nav>
            <div className="flex gap-5 overflow-x-auto border-t border-line px-6 py-3 lg:hidden">
                {links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `whitespace-nowrap text-sm font-semibold ${isActive ? 'text-bark' : 'text-muted'}`}>{link.label}</NavLink>)}
            </div>
        </header>
    );
}
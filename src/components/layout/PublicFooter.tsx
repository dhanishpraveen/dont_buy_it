import { Globe2, Link2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from '../ui/IconButton';

export function PublicFooter() {
    return (
        <footer className="border-t border-line bg-surface">
            <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
                <div>
                    <Link to="/" className="font-handwritten text-3xl font-semibold text-bark">Don't Buy It</Link>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-muted">Access more. Own less. Share what already exists in your community.</p>
                    <div className="mt-5 flex gap-1">
                        <IconButton label="Visit Don't Buy It online"><Globe2 size={17} /></IconButton>
                        <IconButton label="Email Don't Buy It"><Mail size={17} /></IconButton>
                        <IconButton label="Share Don't Buy It"><Link2 size={17} /></IconButton>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-bold text-ink">Explore</p>
                    <div className="mt-4 grid gap-3 text-sm text-muted"><Link to="/how-it-works" className="hover:text-bark">How It Works</Link><Link to="/community" className="hover:text-bark">Community</Link><Link to="/about" className="hover:text-bark">About Us</Link></div>
                </div>
                <div>
                    <p className="text-sm font-bold text-ink">Company</p>
                    <div className="mt-4 grid gap-3 text-sm text-muted"><Link to="/privacy" className="hover:text-bark">Privacy</Link><Link to="/terms" className="hover:text-bark">Terms</Link><Link to="/contact" className="hover:text-bark">Contact</Link></div>
                </div>
            </div>
            <div className="border-t border-line px-6 py-5 text-center text-xs text-muted">© 2026 Don't Buy It. Built for more thoughtful access.</div>
        </footer>
    );
}
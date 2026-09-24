import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';
import { PublicNavbar } from './PublicNavbar';

export function PublicLayout({ children }: { children?: ReactNode }) {
    return <div className="min-h-screen bg-canvas text-ink"><PublicNavbar /><main>{children ?? <Outlet />}</main><PublicFooter /></div>;
}
import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export function AuthenticatedLayout({ children }: { children?: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-canvas text-ink">
            <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="min-h-screen lg:pl-[248px]">
                <AppHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">{children ?? <Outlet />}</main>
            </div>
        </div>
    );
}
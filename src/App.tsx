import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { CommunityRoute } from './pages/CommunityRoute';
import { RoutePlaceholder } from './pages/RoutePlaceholder';

const publicRoutes = [
    { path: '/', title: 'Home' },
    { path: '/how-it-works', title: 'How It Works' },
    { path: '/about', title: 'About' },
    { path: '/login', title: 'Sign In' },
    { path: '/signup', title: 'Create your account' },
];

const authenticatedRoutes = [
    { path: '/dashboard', title: 'Dashboard' },
    { path: '/browse', title: 'Browse' },
    { path: '/requests', title: 'My Requests' },
    { path: '/listings', title: 'My Listings' },
    { path: '/messages', title: 'Messages' },
    { path: '/saved', title: 'Saved Items' },
    { path: '/settings', title: 'Settings' },
    { path: '/help', title: 'Help & Support' },
    { path: '/notifications', title: 'Notifications' },
];

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicLayout />}>
                    {publicRoutes.map((route) => <Route key={route.path} path={route.path} element={<RoutePlaceholder title={route.title} />} />)}
                </Route>
                <Route path="/community" element={<CommunityRoute />} />
                <Route element={<AuthenticatedLayout />}>
                    {authenticatedRoutes.map((route) => <Route key={route.path} path={route.path} element={<RoutePlaceholder title={route.title} />} />)}
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
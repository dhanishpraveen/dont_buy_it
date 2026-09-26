import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { CommunityRoute } from './pages/CommunityRoute';
import { RoutePlaceholder } from './pages/RoutePlaceholder';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { BrowsePage } from './pages/BrowsePage';
import { ItemDetailsPage } from './pages/ItemDetailsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ScenarioComparisonPage } from './pages/ScenarioComparisonPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProtectedRoute } from './components/navigation/ProtectedRoute';

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
                    <Route path="/" element={<HomePage />} />
                    <Route path="/how-it-works" element={<RoutePlaceholder title="How It Works" />} />
                    <Route path="/about" element={<RoutePlaceholder title="About" />} />
                    <Route path="/login" element={<AuthPage mode="login" />} />
                    <Route path="/signup" element={<AuthPage mode="register" />} />
                </Route>
                <Route path="/community" element={<CommunityRoute />} />
                <Route element={<AuthenticatedLayout />}>
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/browse" element={<BrowsePage />} />
                    <Route path="/ai-assistant" element={<AIAssistantPage />} />
                    <Route path="/scenario-comparison" element={<ScenarioComparisonPage />} />
                    <Route path="/item/:id" element={<ItemDetailsPage />} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    {authenticatedRoutes.filter((route) => !['/dashboard', '/browse'].includes(route.path)).map((route) => <Route key={route.path} path={route.path} element={<ProtectedRoute><RoutePlaceholder title={route.title} /></ProtectedRoute>} />)}
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
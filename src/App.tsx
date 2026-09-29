import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { CommunityRoute } from './pages/CommunityRoute';
import { RoutePlaceholder } from './pages/RoutePlaceholder';
import { HomePage } from './pages/HomePage';
import { LiveDashboardPage as DashboardPage } from './pages/LiveDashboardPage';
import { BrowsePage } from './pages/BrowsePage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ScenarioComparisonPage } from './pages/ScenarioComparisonPage';
import { AuthPage } from './pages/AuthPage';
import { OtpVerificationPage } from './pages/OtpVerificationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProtectedRoute } from './components/navigation/ProtectedRoute';
import { LiveAddItemPage as AddItemPage } from './pages/LiveAddItemPage';
import { LiveMyListingsPage as MyListingsPage } from './pages/LiveMyListingsPage';
import { LiveListingDetailsPage as ListingDetailsPage } from './pages/LiveListingDetailsPage';
import { RequestAccessPage } from './pages/RequestAccessPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { ReceivedRequestsPage } from './pages/ReceivedRequestsPage';
import { RequestDetailsPage } from './pages/RequestDetailsPage';
import { ExchangeDetailsPage } from './pages/ExchangeDetailsPage';

const authenticatedRoutes = [
    { path: '/dashboard', title: 'Dashboard' },
    { path: '/browse', title: 'Browse' },
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
                    <Route path="/verify-otp" element={<OtpVerificationPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>
                <Route path="/community" element={<CommunityRoute />} />
                <Route element={<AuthenticatedLayout />}>
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/browse" element={<BrowsePage />} />
                    <Route path="/ai-assistant" element={<AIAssistantPage />} />
                    <Route path="/scenario-comparison" element={<ScenarioComparisonPage />} />
                    <Route path="/item/:id" element={<ListingDetailsPage />} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/add-item" element={<ProtectedRoute><AddItemPage /></ProtectedRoute>} />
                    <Route path="/listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
                    <Route path="/listings/:id/edit" element={<ProtectedRoute><AddItemPage /></ProtectedRoute>} />
                    <Route path="/listing/:id" element={<ListingDetailsPage />} />
                    <Route path="/request-access/:listingId" element={<ProtectedRoute><RequestAccessPage /></ProtectedRoute>} />
                    <Route path="/requests/received" element={<ProtectedRoute><ReceivedRequestsPage /></ProtectedRoute>} />
                    <Route path="/requests/:id" element={<ProtectedRoute><RequestDetailsPage /></ProtectedRoute>} />
                    <Route path="/requests" element={<ProtectedRoute><MyRequestsPage /></ProtectedRoute>} />
                    <Route path="/exchanges/:id" element={<ProtectedRoute><ExchangeDetailsPage /></ProtectedRoute>} />
                    {authenticatedRoutes.filter((route) => !['/dashboard', '/browse', '/listings', '/requests'].includes(route.path)).map((route) => <Route key={route.path} path={route.path} element={<ProtectedRoute><RoutePlaceholder title={route.title} /></ProtectedRoute>} />)}
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
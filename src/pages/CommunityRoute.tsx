import { AuthenticatedLayout } from '../components/layout/AuthenticatedLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ProtectedRoute } from '../components/navigation/ProtectedRoute';
import { RoutePlaceholder } from './RoutePlaceholder';
import { useAuth } from '../context/AuthContext';

export function CommunityRoute() {
    const { isAuthenticated, user } = useAuth();
    const page = <RoutePlaceholder title="Community" description="Find useful things and thoughtful people close to home." eyebrow="Shared access" />;

    if (isAuthenticated) return <AuthenticatedLayout>{page}</AuthenticatedLayout>;
    if (user) return <ProtectedRoute><AuthenticatedLayout>{page}</AuthenticatedLayout></ProtectedRoute>;
    return <PublicLayout>{page}</PublicLayout>;
}
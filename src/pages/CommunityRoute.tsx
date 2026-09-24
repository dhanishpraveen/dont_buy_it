import { useLocation } from 'react-router-dom';
import { AuthenticatedLayout } from '../components/layout/AuthenticatedLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { RoutePlaceholder } from './RoutePlaceholder';

export function CommunityRoute() {
    const location = useLocation();
    const authenticated = Boolean(location.state && typeof location.state === 'object' && 'authenticated' in location.state);
    const page = <RoutePlaceholder title="Community" description="Find useful things and thoughtful people close to home." eyebrow="Shared access" />;

    return authenticated ? <AuthenticatedLayout>{page}</AuthenticatedLayout> : <PublicLayout>{page}</PublicLayout>;
}
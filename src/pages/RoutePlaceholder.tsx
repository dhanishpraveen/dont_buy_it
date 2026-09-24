import { PageHeader } from '../components/ui/PageHeader';

type RoutePlaceholderProps = {
    title: string;
    description?: string;
    eyebrow?: string;
};

export function RoutePlaceholder({ title, description = 'This screen is reserved for the next product phase.', eyebrow = 'Coming next' }: RoutePlaceholderProps) {
    return <PageHeader title={title} description={description} eyebrow={eyebrow} />;
}
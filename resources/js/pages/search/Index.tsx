import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { SearchField } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';

interface SearchResult {
    id: number;
    title: string;
    subtitle: string;
    url: string;
}

type ResultGroup = 'products' | 'variants' | 'sales' | 'purchases' | 'customers' | 'suppliers' | 'expenses' | 'rents';

interface SearchProps {
    query: string;
    results: Record<ResultGroup, SearchResult[]>;
}

const SECTIONS: { key: ResultGroup; label: string }[] = [
    { key: 'products', label: 'search.products' },
    { key: 'variants', label: 'search.variants' },
    { key: 'sales', label: 'search.sales' },
    { key: 'purchases', label: 'search.purchases' },
    { key: 'customers', label: 'search.customers' },
    { key: 'suppliers', label: 'search.suppliers' },
    { key: 'expenses', label: 'search.expenses' },
    { key: 'rents', label: 'search.rents' },
];

export default function SearchIndex({ query, results }: SearchProps) {
    const { t } = useTranslation();
    const hasQuery = query.trim().length >= 2;
    const visibleSections = hasQuery ? SECTIONS.filter((section) => (results[section.key] ?? []).length > 0) : [];

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('search.title')}
                subtitle={hasQuery ? t('search.results_for', { q: query }) : undefined}
            />

            <SearchField param="q" placeholder={t('search.placeholder')} width="w-full" />

            {!hasQuery ? (
                <EmptyState title={t('search.start')} />
            ) : visibleSections.length === 0 ? (
                <EmptyState title={t('search.no_results', { q: query })} />
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {visibleSections.map((section) => {
                        const items = results[section.key] ?? [];
                        return (
                            <Card key={section.key} className="animate-slide-up">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t(section.label)}</p>
                                    <Badge tone="bg-slate-100 text-slate-500">{items.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <Link
                                            key={`${section.key}-${item.id}`}
                                            href={item.url}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/50"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                                                <p className="truncate text-xs text-slate-400">{item.subtitle}</p>
                                            </div>
                                            <ChevronRight size={16} className="shrink-0 text-slate-300" />
                                        </Link>
                                    ))}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

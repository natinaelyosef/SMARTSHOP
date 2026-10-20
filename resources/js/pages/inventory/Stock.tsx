import { Link, usePage } from '@inertiajs/react';
import { PackageSearch } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Pagination, StatusBadge, cn } from '@/components/ui';
import { FilterBar, ResetButton, ResultCount, SearchField, useFilters } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface StockVariant {
    id: number;
    product: string | null;
    name: string;
    sku: string;
    barcode: string | null;
    unit: string | null;
    stock: number;
    min_stock: number;
    cost: number;
    selling_price: number;
    stock_value: number;
    margin: number;
    status: 'out' | 'low' | 'ok';
    losing: boolean;
}

interface ExpiringBatch {
    id: number;
    variant: string;
    batch_number: string | null;
    quantity: number;
    expires_at: string;
    state: 'expired' | 'critical' | 'soon' | 'watch';
}

interface InventoryStockProps {
    variants: Paginated<StockVariant>;
    expiring: ExpiringBatch[];
    stockValue: number;
    filters: {
        q?: string;
        filter?: string;
    };
}

const EXPIRY_TONES: Record<ExpiringBatch['state'], string> = {
    expired: 'bg-rose-100 text-rose-700',
    critical: 'bg-amber-100 text-amber-700',
    soon: 'bg-amber-500 text-white',
    watch: 'bg-slate-100 text-slate-600',
};

const CHIPS = [
    { key: 'low', label: 'inv.low', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
    { key: 'out', label: 'inv.out', tone: 'border-rose-300 bg-rose-50 text-rose-700' },
    { key: 'losing', label: 'inv.losing', tone: 'border-orange-300 bg-orange-50 text-orange-700' },
    { key: '', label: 'inv.ok', tone: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
];

export default function InventoryStock({ variants, expiring, stockValue }: InventoryStockProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const { params, update } = useFilters();

    const activeFilter = params.filter ?? '';

    const onChip = (key: string) => {
        if (key === '') {
            update({ filter: null });
            return;
        }
        update({ filter: activeFilter === key ? null : key });
    };

    return (
        <div className="space-y-4">
            <PageHeader title={t('inv.stock_levels')} subtitle={t('common.total_records', { count: variants.total })} />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="animate-slide-up lg:col-span-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {CHIPS.map((chip) => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={() => onChip(chip.key)}
                                    aria-pressed={activeFilter === chip.key}
                                    className={cn(
                                        'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                                        activeFilter === chip.key
                                            ? chip.tone
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                                    )}
                                >
                                    {t(chip.label)}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                            <SearchField placeholder={t('products.search_ph')} width="w-full sm:w-64" />
                            <ResetButton />
                        </div>
                    </div>
                </Card>

                <Card className="animate-slide-up border-brand-200 bg-brand-50/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('inv.total_stock_value')}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatMoney(stockValue, symbol)}</p>
                </Card>
            </div>

            {expiring.length > 0 && (
                <Card className="animate-slide-up">
                    <CardHeader
                        title={t('inv.expiring')}
                        subtitle={t('common.total_records', { count: expiring.length })}
                        action={<Badge tone="bg-amber-100 text-amber-700">{expiring.length}</Badge>}
                    />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {expiring.map((batch) => (
                            <div
                                key={batch.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-700">{batch.variant}</p>
                                    <p className="text-xs text-slate-400">
                                        {t('inv.batch')} {batch.batch_number ?? '—'} · {formatNumber(batch.quantity)}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <Badge tone={EXPIRY_TONES[batch.state]}>
                                        {batch.state === 'expired'
                                            ? t('status.expired')
                                            : batch.state === 'critical'
                                              ? t('status.critical')
                                              : batch.state === 'soon'
                                                ? t('status.soon')
                                                : t('status.watch')}
                                    </Badge>
                                    <span className="text-xs tabular-nums text-slate-500">{batch.expires_at}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="animate-slide-up">
                <CardHeader title={t('inv.stock_levels')} action={<ResultCount total={variants.total} />} />

                {variants.data.length === 0 ? (
                    <EmptyState title={t('common.no_results')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-2 pb-2.5 font-semibold">{t('products.product')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('products.sku')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.status')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.cost')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('products.selling_price')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('inv.stock_value')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('products.margin')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('inv.losing')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.data.map((variant) => (
                                    <tr key={variant.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="relative px-2 py-3">
                                            <span className="block truncate font-medium text-slate-800">
                                                {variant.product ? `${variant.product} — ${variant.name}` : variant.name}
                                            </span>
                                            <span className="block text-xs text-slate-400">{variant.unit ?? ''}</span>
                                            <Link
                                                href={`/inventory/variants/${variant.id}`}
                                                aria-label={variant.product ? `${variant.product} — ${variant.name}` : variant.name}
                                                className="absolute inset-0 rounded-lg focus:ring-2 focus:ring-brand-500"
                                            />
                                        </td>
                                        <td className="px-2 py-3 text-slate-500">{variant.sku}</td>
                                        <td className="px-2 py-3">
                                            <StatusBadge status={variant.status} label={t(`status.${variant.status}`)} />
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-700">
                                            <span className="font-semibold">{formatNumber(variant.stock)}</span>
                                            <span className="ml-1 text-xs text-slate-400">
                                                / {t('products.min_stock')} {formatNumber(variant.min_stock)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatMoney(variant.cost, symbol)}</td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(variant.selling_price, symbol)}
                                        </td>
                                        <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                                            {formatMoney(variant.stock_value, symbol)}
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-600">{variant.margin}%</td>
                                        <td className="px-2 py-3">
                                            {variant.losing ? <Badge tone="bg-rose-100 text-rose-700">{t('inv.losing')}</Badge> : <span className="text-slate-300">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4">
                    <Pagination links={variants.links} />
                </div>
            </Card>

            <div className="flex justify-end">
                <Link
                    href="/inventory"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                >
                    <PackageSearch size={14} />
                    {t('inv.movements')}
                </Link>
            </div>
        </div>
    );
}

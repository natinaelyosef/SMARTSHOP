import { Link, usePage } from '@inertiajs/react';
import { History } from 'lucide-react';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Pagination, cn } from '@/components/ui';
import { DateField, FilterBar, ResetButton, ResultCount, SearchField, SelectFilter } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface MovementVariant {
    id: number;
    name: string;
    sku: string;
    stock: number;
    product: { id: number; name: string };
}

interface Movement {
    id: number;
    product_variant_id: number;
    movement_type: string;
    quantity: number;
    unit_cost: number;
    previous_stock: number;
    new_stock: number;
    reference_type: string | null;
    reference_id: number | null;
    user_id: number | null;
    reason: string | null;
    created_at: string;
    variant: MovementVariant;
    user: { id: number; name: string } | null;
}

interface InventoryIndexProps {
    movements: Paginated<Movement>;
    types: Record<string, string>;
    filters: {
        q?: string;
        variant?: string;
        type?: string;
        from?: string;
        to?: string;
    };
}

const TYPE_TONES: Record<string, string> = {
    purchase: 'bg-emerald-100 text-emerald-700',
    sale: 'bg-sky-100 text-sky-700',
    sale_return: 'bg-amber-100 text-amber-700',
    purchase_return: 'bg-orange-100 text-orange-700',
    damaged: 'bg-rose-100 text-rose-700',
    expired: 'bg-rose-100 text-rose-700',
    adjustment: 'bg-violet-100 text-violet-700',
    transfer: 'bg-indigo-100 text-indigo-700',
    initial_stock: 'bg-teal-100 text-teal-700',
};

export default function InventoryIndex({ movements, types }: InventoryIndexProps) {
    const { t, locale } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    const typeOptions = Object.keys(types).map((key) => ({ value: key, label: t(`inv.${key}`) }));

    const referenceHref = (movement: Movement): string | null => {
        if (!movement.reference_type || !movement.reference_id) return null;
        if (movement.reference_type.includes('Sale')) return `/sales/${movement.reference_id}`;
        if (movement.reference_type.includes('Purchase')) return `/purchases/${movement.reference_id}`;
        return null;
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title={t('inv.movements')}
                subtitle={t('common.total_records', { count: movements.total })}
                actions={
                    <LinkButton href="/inventory/stock" variant="outline" icon={<History size={16} />}>
                        {t('inv.stock_levels')}
                    </LinkButton>
                }
            />

            <Card className="animate-slide-up">
                <FilterBar right={<ResultCount total={movements.total} />}>
                    <SearchField placeholder={t('products.search_ph')} />
                    <SelectFilter param="type" label={t('inv.movement_type')} options={typeOptions} />
                    <DateField param="from" />
                    <DateField param="to" />
                    <ResetButton />
                </FilterBar>

                {movements.data.length === 0 ? (
                    <EmptyState
                        title={t('common.no_results')}
                        action={
                            <LinkButton href="/inventory/stock" variant="outline">
                                {t('inv.stock_levels')}
                            </LinkButton>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-2 pb-2.5 font-semibold">{t('inv.date')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('products.product')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('inv.movement_type')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('inv.previous_stock')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('inv.new_stock')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.cost')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('inv.user')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('inv.reference')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('inv.reason')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.data.map((movement) => {
                                    const href = referenceHref(movement);
                                    return (
                                        <tr key={movement.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="px-2 py-3 whitespace-nowrap text-slate-500">
                                                {formatDateTime(movement.created_at, locale)}
                                            </td>
                                            <td className="px-2 py-3">
                                                <Link
                                                    href={`/inventory/variants/${movement.variant.id}`}
                                                    className="font-medium text-brand-600 hover:underline"
                                                >
                                                    {movement.variant.product.name} — {movement.variant.name}
                                                </Link>
                                                <span className="ml-1.5 text-xs text-slate-400">{movement.variant.sku}</span>
                                            </td>
                                            <td className="px-2 py-3">
                                                <Badge tone={TYPE_TONES[movement.movement_type] ?? 'bg-slate-100 text-slate-600'}>
                                                    {t(`inv.${movement.movement_type}`)}
                                                </Badge>
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-2 py-3 text-right font-semibold tabular-nums',
                                                    movement.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                                )}
                                            >
                                                {movement.quantity >= 0 ? '+' : '−'}
                                                {formatNumber(Math.abs(movement.quantity))}
                                            </td>
                                            <td className="px-2 py-3 text-right tabular-nums text-slate-500">
                                                {formatNumber(movement.previous_stock)}
                                            </td>
                                            <td className="px-2 py-3 text-right font-medium tabular-nums text-slate-700">
                                                {formatNumber(movement.new_stock)}
                                            </td>
                                            <td className="px-2 py-3 text-right tabular-nums text-slate-500">
                                                {formatMoney(movement.unit_cost, symbol)}
                                            </td>
                                            <td className="px-2 py-3 text-slate-600">{movement.user?.name ?? '—'}</td>
                                            <td className="px-2 py-3">
                                                {href ? (
                                                    <Link href={href} className="font-medium text-brand-600 hover:underline">
                                                        {movement.reference_type?.split('\\').pop()} #{movement.reference_id}
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-3 text-slate-500">{movement.reason ?? '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4">
                    <Pagination links={movements.links} />
                </div>
            </Card>
        </div>
    );
}

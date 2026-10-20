import { useEffect, useState, type FormEvent } from 'react';
import { usePage, useForm } from '@inertiajs/react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import {
    Badge, Button, Card, CardHeader, EmptyState, Field, Input, LinkButton, Modal, Select, StatusBadge, Tabs, Textarea, cn, useToast,
} from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface VariantInfo {
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
    status: string;
    margin: number;
    losing: boolean;
    created_at: string;
}

interface VariantMovement {
    id: number;
    date: string;
    time: string;
    type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    unit_cost: number;
    user: string | null;
    reference: string | null;
    reason: string | null;
}

interface PriceHistoryEntry {
    id: number;
    old_price: number;
    new_price: number;
    cost_at_time: number;
    reason: string | null;
    user: string | null;
    effective_at: string;
}

interface PurchaseHistoryEntry {
    date: string | null;
    supplier: string | null;
    purchase_number: string | null;
    quantity: number;
    unit_cost: number;
    total: number;
    batch_number: string | null;
    expires_at: string | null;
}

interface StockBatch {
    id: number;
    batch_number: string | null;
    quantity: number;
    remaining: number;
    unit_cost: number;
    expires_at: string | null;
    supplier: string | null;
}

interface Profitability {
    quantity_sold: number;
    revenue: number;
    cogs: number;
    profit: number;
    stock_value: number;
}

interface InventoryVariantProps {
    variant: VariantInfo;
    movements: VariantMovement[];
    priceHistory: PriceHistoryEntry[];
    purchaseHistory: PurchaseHistoryEntry[];
    batches: StockBatch[];
    profitability: Profitability;
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

const ADJUST_TYPES = ['damaged', 'expired', 'adjustment', 'transfer', 'initial_stock', 'purchase_return'];

export default function InventoryVariant({
    variant,
    movements,
    priceHistory,
    purchaseHistory,
    batches,
    profitability,
}: InventoryVariantProps) {
    const { t } = useTranslation();
    const { push } = useToast();
    const { shop, auth, flash } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const [tab, setTab] = useState('movements');
    const [adjustOpen, setAdjustOpen] = useState(false);

    const permissions = auth.user?.permissions ?? [];
    const canAdjust = permissions.includes('*') || permissions.includes('inventory.manage');

    const { data, setData, post, processing, errors, reset } = useForm({
        product_variant_id: variant.id,
        movement_type: 'adjustment' as string,
        quantity: '',
        reason: '',
    });

    const formErrors = errors as unknown as Record<string, string | undefined>;

    useEffect(() => {
        if (flash?.success) push(flash.success, 'success');
        if (flash?.error) push(flash.error, 'error');
    }, [flash?.success, flash?.error, push]);

    const stockStatus = variant.stock <= 0 ? 'out' : variant.stock <= variant.min_stock ? 'low' : 'ok';

    const tabs = [
        { key: 'movements', label: t('inv.movements') },
        { key: 'batches', label: t('inv.batches') },
        { key: 'prices', label: t('products.price_history') },
        { key: 'purchases', label: t('products.purchase_history') },
    ];

    const submitAdjust = (e: FormEvent) => {
        e.preventDefault();
        post('/inventory/adjust', {
            preserveScroll: true,
            onSuccess: () => {
                setAdjustOpen(false);
                reset();
            },
        });
    };

    const stats = [
        { label: t('inv.quantity_sold'), value: formatNumber(profitability.quantity_sold), money: false },
        { label: t('inv.revenue'), value: formatMoney(profitability.revenue, symbol), money: true },
        { label: t('finance.cogs'), value: formatMoney(profitability.cogs, symbol), money: true },
        { label: t('common.profit'), value: formatMoney(profitability.profit, symbol), money: true, tone: profitability.profit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
        { label: t('inv.stock_value'), value: formatMoney(profitability.stock_value, symbol), money: true },
    ];

    return (
        <div className="space-y-4">
            <LinkButton href="/inventory/stock" variant="ghost" icon={<ArrowLeft size={15} />}>
                {t('common.back')}
            </LinkButton>

            <Card className="animate-slide-up">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            {variant.product ? `${variant.product} — ${variant.name}` : variant.name}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone="bg-slate-100 text-slate-600">
                                {t('products.sku')}: {variant.sku}
                            </Badge>
                            {variant.barcode && (
                                <Badge tone="bg-slate-100 text-slate-600">
                                    {t('products.barcode')}: {variant.barcode}
                                </Badge>
                            )}
                            {variant.unit && (
                                <Badge tone="bg-slate-100 text-slate-600">
                                    {t('products.unit')}: {variant.unit}
                                </Badge>
                            )}
                            <span className="text-xs text-slate-400">
                                {t('common.date')}: {variant.created_at}
                            </span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={stockStatus} label={t(`status.${stockStatus}`)} />
                        {canAdjust && (
                            <Button variant="outline" icon={<Settings2 size={16} />} onClick={() => setAdjustOpen(true)}>
                                {t('inv.adjust')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('common.stock')}</p>
                        <p className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg">{formatNumber(variant.stock)}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('products.min_stock')}</p>
                        <p className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg">{formatNumber(variant.min_stock)}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('common.cost')}</p>
                        <p className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg">{formatMoney(variant.cost, symbol)}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('products.selling_price')}</p>
                        <p className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg">{formatMoney(variant.selling_price, symbol)}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('products.margin')}</p>
                        <p className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg">{variant.margin}%</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('inv.stock_value')}</p>
                        <p className="mt-1 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg">
                            {formatMoney(variant.stock * variant.cost, symbol)}
                        </p>
                    </div>
                </div>

                {variant.losing && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 animate-fade-in">
                        {t('products.loss_warning')}
                    </div>
                )}
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('inv.profitability')} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {stats.map((stat) => (
                        <div key={stat.label} className="min-w-0 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                            <p className={cn('mt-1.5 break-words text-sm font-bold leading-tight tabular-nums text-slate-900 sm:text-base lg:text-lg', stat.tone)}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="space-y-4">
                <Tabs tabs={tabs} active={tab} onChange={setTab} />

                {tab === 'movements' &&
                    (movements.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                            <th className="px-2 pb-2.5 font-semibold">{t('inv.date')}</th>
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
                                        {movements.map((movement) => (
                                            <tr key={movement.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                                <td className="px-2 py-3 whitespace-nowrap text-slate-500">
                                                    {movement.date} <span className="text-slate-400">{movement.time}</span>
                                                </td>
                                                <td className="px-2 py-3">
                                                    <Badge tone={TYPE_TONES[movement.type] ?? 'bg-slate-100 text-slate-600'}>
                                                        {t(`inv.${movement.type}`)}
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
                                                <td className="px-2 py-3 text-slate-600">{movement.user ?? '—'}</td>
                                                <td className="px-2 py-3 text-slate-500">{movement.reference ?? '—'}</td>
                                                <td className="px-2 py-3 text-slate-500">{movement.reason ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))}

                {tab === 'batches' &&
                    (batches.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                            <th className="px-2 pb-2.5 font-semibold">{t('inv.batch')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('inv.remaining')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('purchases.unit_cost')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('purchases.expires_at')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('inv.supplier')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batches.map((batch) => (
                                            <tr key={batch.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                                <td className="px-2 py-3 font-medium text-slate-700">{batch.batch_number ?? '—'}</td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatNumber(batch.quantity)}</td>
                                                <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                                                    {formatNumber(batch.remaining)}
                                                </td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-600">
                                                    {formatMoney(batch.unit_cost, symbol)}
                                                </td>
                                                <td className="px-2 py-3 whitespace-nowrap text-slate-500">{batch.expires_at ?? '—'}</td>
                                                <td className="px-2 py-3 text-slate-600">{batch.supplier ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))}

                {tab === 'prices' &&
                    (priceHistory.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                            <th className="px-2 pb-2.5 font-semibold">{t('common.date')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('common.price')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('products.estimated_cost')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('common.reason')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('common.user')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceHistory.map((entry) => (
                                            <tr key={entry.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                                <td className="px-2 py-3 whitespace-nowrap text-slate-500">{entry.effective_at}</td>
                                                <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                                                    <span className="text-slate-400 line-through">{formatMoney(entry.old_price, symbol)}</span>
                                                    <span className="ml-2 text-emerald-600">{formatMoney(entry.new_price, symbol)}</span>
                                                </td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-500">
                                                    {formatMoney(entry.cost_at_time, symbol)}
                                                </td>
                                                <td className="px-2 py-3 text-slate-500">{entry.reason ?? '—'}</td>
                                                <td className="px-2 py-3 text-slate-600">{entry.user ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))}

                {tab === 'purchases' &&
                    (purchaseHistory.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[860px] text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                            <th className="px-2 pb-2.5 font-semibold">{t('common.date')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('purchases.purchase_number')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('purchases.supplier')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('purchases.unit_cost')}</th>
                                            <th className="px-2 pb-2.5 text-right font-semibold">{t('common.total')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('inv.batch')}</th>
                                            <th className="px-2 pb-2.5 font-semibold">{t('purchases.expires_at')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchaseHistory.map((entry, index) => (
                                            <tr key={`${entry.purchase_number ?? 'row'}-${index}`} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                                <td className="px-2 py-3 whitespace-nowrap text-slate-500">{entry.date ?? '—'}</td>
                                                <td className="px-2 py-3 font-medium text-slate-700">{entry.purchase_number ?? '—'}</td>
                                                <td className="px-2 py-3 text-slate-600">{entry.supplier ?? '—'}</td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatNumber(entry.quantity)}</td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-600">
                                                    {formatMoney(entry.unit_cost, symbol)}
                                                </td>
                                                <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                                                    {formatMoney(entry.total, symbol)}
                                                </td>
                                                <td className="px-2 py-3 text-slate-500">{entry.batch_number ?? '—'}</td>
                                                <td className="px-2 py-3 whitespace-nowrap text-slate-500">{entry.expires_at ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))}
            </div>

            <Modal
                open={adjustOpen}
                onClose={() => setAdjustOpen(false)}
                title={t('inv.adjust_title')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setAdjustOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" form="adjust-stock-form" loading={processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="adjust-stock-form" onSubmit={submitAdjust} className="space-y-4">
                    <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                        {variant.product ? `${variant.product} — ${variant.name}` : variant.name}
                        <span className="ml-2 font-semibold text-slate-800">
                            {t('common.stock')}: {formatNumber(variant.stock)}
                        </span>
                    </p>

                    {formErrors.quantity && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 animate-fade-in">
                            {formErrors.quantity}
                        </div>
                    )}

                    <Field label={t('inv.movement_type')} error={formErrors.movement_type} required>
                        <Select value={data.movement_type} onChange={(e) => setData('movement_type', e.target.value)}>
                            {ADJUST_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {t(`inv.${type}`)}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field
                        label={t('common.quantity')}
                        error={formErrors.quantity}
                        hint={t('inv.adjust_hint')}
                        required
                    >
                        <Input
                            type="number"
                            step="any"
                            value={data.quantity}
                            onChange={(e) => setData('quantity', e.target.value)}
                            placeholder="0"
                            className="text-right"
                        />
                    </Field>

                    <Field label={t('inv.reason')} error={formErrors.reason} required>
                        <Textarea
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            placeholder={t('common.reason')}
                            className="min-h-[70px]"
                        />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

import { type FormEvent, useMemo, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Archive, History, Trash2 } from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardHeader,
    EmptyState,
    Field,
    Input,
    Modal,
    PageHeader,
    StatusBadge,
    Tabs,
    Textarea,
} from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface PriceHistoryItem {
    id: number;
    old_price: number;
    new_price: number;
    cost_at_time: number;
    reason: string | null;
    user: string | null;
    effective_at: string;
}

interface Variant {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    unit: string | null;
    cost: number;
    selling_price: number;
    stock: number;
    min_stock: number;
    status: string;
    margin: number;
    losing: boolean;
    low_stock: boolean;
    price_history: PriceHistoryItem[];
}

interface ProductShowProps {
    product: {
        id: number;
        name: string;
        sku: string;
        barcode: string | null;
        qr_code: string | null;
        brand: string | null;
        description: string | null;
        status: string;
        category: string | null;
        unit: string | null;
        created_at: string;
        updated_at: string;
        variants: Variant[];
    };
    purchaseHistory: {
        variant: string;
        date: string;
        quantity: number;
        unit_cost: number;
        total: number;
        supplier: string | null;
    }[];
    settings: { currency_symbol: string };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function ProductsShow({ product, purchaseHistory, settings }: ProductShowProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedProps>().props;
    const symbol = settings.currency_symbol;
    const permissions = auth.user?.permissions;
    const canManage = Boolean(permissions && (permissions.includes('*') || permissions.includes('products.manage')));

    const [tab, setTab] = useState('variants');
    const [priceVariant, setPriceVariant] = useState<Variant | null>(null);

    const priceForm = useForm({ selling_price: '', reason: '' });

    const priceHistory = useMemo(
        () =>
            product.variants.flatMap((v) => v.price_history.map((h) => ({ ...h, variant: v.name }))),
        [product.variants],
    );

    const details = [
        { label: t('products.category'), value: product.category },
        { label: t('products.unit'), value: product.unit },
        { label: t('products.brand'), value: product.brand },
        { label: t('products.sku'), value: product.sku },
        { label: t('products.barcode'), value: product.barcode },
        { label: t('products.qr_code'), value: product.qr_code },
        { label: t('common.created'), value: product.created_at },
        { label: t('common.updated'), value: product.updated_at },
    ];

    const openPrice = (variant: Variant) => {
        priceForm.setData('selling_price', String(variant.selling_price));
        priceForm.setData('reason', '');
        priceForm.clearErrors();
        setPriceVariant(variant);
    };

    const submitPrice = (e: FormEvent) => {
        e.preventDefault();
        if (!priceVariant) return;
        priceForm.transform((d) => ({
            selling_price: d.selling_price === '' ? null : Number(d.selling_price),
            reason: d.reason || null,
        }));
        priceForm.post(`/variants/${priceVariant.id}/price`, {
            onSuccess: () => setPriceVariant(null),
        });
    };

    const archive = () => {
        if (confirm(t('products.archive_confirm'))) {
            router.delete(`/products/${product.id}/archive`);
        }
    };

    const remove = () => {
        if (confirm(t('products.remove_confirm'))) {
            router.delete(`/products/${product.id}`);
        }
    };

    const tabs = [
        { key: 'variants', label: t('products.variants') },
        { key: 'price_history', label: t('products.price_history') },
        { key: 'purchase_history', label: t('products.purchase_history') },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={product.name}
                subtitle={product.sku}
                actions={
                    <>
                        <StatusBadge status={product.status} label={t(`status.${product.status}`)} />
                        {canManage && product.status !== 'archived' && (
                            <Button variant="outline" onClick={archive} icon={<Archive size={15} />}>
                                {t('common.archive')}
                            </Button>
                        )}
                        {canManage && product.status !== 'deleted' && (
                            <Button variant="danger" onClick={remove} icon={<Trash2 size={15} />}>
                                {t('common.remove')}
                            </Button>
                        )}
                    </>
                }
            />

            {product.status === 'archived' && (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 animate-fade-in">
                    <Archive size={16} className="shrink-0" />
                    {t('products.archived_note')}
                </div>
            )}

            <Card className="animate-slide-up">
                {product.description && <p className="mb-4 text-sm text-slate-600">{product.description}</p>}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                    {details.map((item) => (
                        <div key={item.label} className="min-w-0">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</dt>
                            <dd className="mt-0.5 break-words font-medium text-slate-700">{item.value || '—'}</dd>
                        </div>
                    ))}
                </dl>
            </Card>

            <Tabs tabs={tabs} active={tab} onChange={setTab} />

            {tab === 'variants' && (
                <Card className="animate-slide-up">
                    <CardHeader title={t('products.variants')} subtitle={String(product.variants.length)} />
                    {product.variants.length === 0 ? (
                        <EmptyState title={t('products.variants')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 font-semibold">{t('common.name')}</th>
                                        <th className="pb-2 font-semibold">{t('products.sku')}</th>
                                        <th className="pb-2 font-semibold">{t('products.barcode')}</th>
                                        <th className="pb-2 font-semibold">{t('products.unit')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.cost')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('products.selling_price')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.stock')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('products.margin')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {product.variants.map((v) => (
                                        <tr key={v.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="py-2.5 pr-3 font-semibold text-slate-800">{v.name}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{v.sku || '—'}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{v.barcode || '—'}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{v.unit || '—'}</td>
                                            <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                                {formatMoney(v.cost, symbol)}
                                            </td>
                                            <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">
                                                {formatMoney(v.selling_price, symbol)}
                                            </td>
                                            <td className="py-2.5 pr-3 text-right">
                                                <span className="tabular-nums text-slate-700">{formatNumber(v.stock)}</span>
                                                {v.stock <= 0 ? (
                                                    <Badge tone="bg-rose-100 text-rose-700" className="ml-2">
                                                        {t('inv.out')}
                                                    </Badge>
                                                ) : (
                                                    v.low_stock && (
                                                        <Badge tone="bg-amber-100 text-amber-700" className="ml-2">
                                                            {t('inv.low')}
                                                        </Badge>
                                                    )
                                                )}
                                            </td>
                                            <td className="py-2.5 pr-3 text-right">
                                                <span className="tabular-nums text-slate-700">{v.margin}%</span>
                                                {v.losing && (
                                                    <Badge tone="bg-rose-100 text-rose-700" className="ml-2">
                                                        {t('inv.losing')}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <Button
                                                    variant="outline"
                                                    className="px-3 py-1.5 text-xs"
                                                    onClick={() => openPrice(v)}
                                                    icon={<History size={13} />}
                                                >
                                                    {t('products.change_price')}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {tab === 'price_history' && (
                <Card className="animate-slide-up">
                    <CardHeader title={t('products.price_history')} subtitle={String(priceHistory.length)} />
                    {priceHistory.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 font-semibold">{t('products.variant')}</th>
                                        <th className="pb-2 font-semibold">{t('common.price')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.cost')}</th>
                                        <th className="pb-2 font-semibold">{t('common.reason')}</th>
                                        <th className="pb-2 font-semibold">{t('common.user')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.date')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priceHistory.map((h) => (
                                        <tr key={h.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="py-2.5 pr-3 font-medium text-slate-700">{h.variant}</td>
                                            <td className="py-2.5 pr-3 tabular-nums text-slate-700">
                                                {formatMoney(h.old_price, symbol)}
                                                <span className="mx-1 text-slate-400">→</span>
                                                <span className="font-semibold text-slate-800">{formatMoney(h.new_price, symbol)}</span>
                                            </td>
                                            <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">
                                                {formatMoney(h.cost_at_time, symbol)}
                                            </td>
                                            <td className="py-2.5 pr-3 text-slate-500">{h.reason || '—'}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{h.user || '—'}</td>
                                            <td className="py-2.5 text-right text-slate-500">{h.effective_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {tab === 'purchase_history' && (
                <Card className="animate-slide-up">
                    <CardHeader title={t('products.purchase_history')} subtitle={String(purchaseHistory.length)} />
                    {purchaseHistory.length === 0 ? (
                        <EmptyState title={t('purchases.empty')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 font-semibold">{t('products.variant')}</th>
                                        <th className="pb-2 font-semibold">{t('common.date')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.quantity')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('purchases.unit_cost')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.total')}</th>
                                        <th className="pb-2 font-semibold">{t('purchases.supplier')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseHistory.map((row, index) => (
                                        <tr key={index} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="py-2.5 pr-3 font-medium text-slate-700">{row.variant}</td>
                                            <td className="py-2.5 pr-3 text-slate-500">{row.date}</td>
                                            <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                                                {formatNumber(row.quantity)}
                                            </td>
                                            <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                                {formatMoney(row.unit_cost, symbol)}
                                            </td>
                                            <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">
                                                {formatMoney(row.total, symbol)}
                                            </td>
                                            <td className="py-2.5 text-slate-500">{row.supplier || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            <Modal
                open={priceVariant !== null}
                onClose={() => setPriceVariant(null)}
                title={t('products.change_price')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPriceVariant(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="price-form" type="submit" loading={priceForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="price-form" onSubmit={submitPrice} className="space-y-4">
                    {priceVariant && (
                        <p className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">{priceVariant.name}</span>
                            {' · '}
                            {t('products.current_price')}: {formatMoney(priceVariant.selling_price, symbol)}
                        </p>
                    )}
                    <Field
                        label={t('products.selling_price')}
                        required
                        error={fieldError(priceForm.errors, 'selling_price')}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={priceForm.data.selling_price}
                            onChange={(e) => priceForm.setData('selling_price', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <Field label={t('common.reason')} error={fieldError(priceForm.errors, 'reason')}>
                        <Textarea
                            value={priceForm.data.reason}
                            onChange={(e) => priceForm.setData('reason', e.target.value)}
                        />
                    </Field>
                    {fieldError(priceForm.errors, 'error') && (
                        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
                            {fieldError(priceForm.errors, 'error')}
                        </p>
                    )}
                </form>
            </Modal>
        </div>
    );
}

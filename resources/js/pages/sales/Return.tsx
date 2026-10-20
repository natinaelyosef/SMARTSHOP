import { useMemo, useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { RotateCcw } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';

interface ReturnItem {
    id: number;
    name: string;
    quantity: number;
    returned_quantity: number;
    returnable: number;
    unit_price: number;
}

interface ReturnSale {
    id: number;
    sale_number: string;
    sold_at: string;
    customer: string | null;
    total: number;
    items: ReturnItem[];
}

interface SalesReturnProps {
    sale: ReturnSale;
    settings: { currency_symbol: string };
}

const METHODS = ['cash', 'bank', 'mobile', 'credit'] as const;

export default function SalesReturn({ sale, settings }: SalesReturnProps) {
    const { t } = useTranslation();
    const symbol = settings.currency_symbol;

    const [quantities, setQuantities] = useState<Record<number, number>>(() =>
        Object.fromEntries(sale.items.map((item) => [item.id, 0])),
    );

    const { data, setData, post, processing, errors, transform } = useForm({
        reason: '',
        payment_method: 'cash' as string,
    });

    const formErrors = errors as unknown as Record<string, string | undefined>;

    const refund = useMemo(
        () =>
            sale.items.reduce((sum, item) => {
                const qty = quantities[item.id] ?? 0;
                return sum + qty * item.unit_price;
            }, 0),
        [quantities, sale.items],
    );

    const selectedCount = sale.items.reduce((sum, item) => sum + (quantities[item.id] ?? 0), 0);

    const setQuantity = (id: number, value: number, max: number) => {
        const next = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), max);
        setQuantities((prev) => ({ ...prev, [id]: next }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => ({
            items: sale.items
                .filter((item) => (quantities[item.id] ?? 0) > 0)
                .map((item) => ({ sale_item_id: item.id, quantity: quantities[item.id] ?? 0 })),
            reason: d.reason.trim() ? d.reason.trim() : null,
            payment_method: d.payment_method,
        }));
        post(`/sales/${sale.id}/return`);
    };

    const returnableItems = sale.items.filter((item) => item.returnable > 0);

    return (
        <div className="space-y-4">
            <PageHeader
                title={t('sales.return')}
                subtitle={`${t('sales.sale_number')} ${sale.sale_number} · ${sale.sold_at}`}
            />

            <Card className="animate-slide-up">
                <CardHeader title={t('sales.items')} subtitle={`${t('pos.customer')}: ${sale.customer ?? t('pos.walk_in')}`} />

                {returnableItems.length === 0 ? (
                    <EmptyState title={t('sales.no_sales')} description={t('sales.returnable')} />
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        {formErrors.items && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 animate-fade-in">
                                {formErrors.items}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-2 pb-2.5 font-semibold">{t('products.product')}</th>
                                        <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                        <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.returned')}</th>
                                        <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.returnable')}</th>
                                        <th className="px-2 pb-2.5 text-right font-semibold">{t('common.price')}</th>
                                        <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.refund')}</th>
                                        <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.return_qty')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.items.map((item) => {
                                        const qty = quantities[item.id] ?? 0;
                                        const disabled = item.returnable <= 0;
                                        return (
                                            <tr key={item.id} className={cn('border-b border-slate-50', disabled && 'opacity-60')}>
                                                <td className="px-2 py-3 text-slate-700">{item.name}</td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatNumber(item.quantity)}</td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-500">{formatNumber(item.returned_quantity)}</td>
                                                <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-700">
                                                    {formatNumber(item.returnable)}
                                                </td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatMoney(item.unit_price, symbol)}</td>
                                                <td className="px-2 py-3 text-right tabular-nums text-slate-700">{formatMoney(qty * item.unit_price, symbol)}</td>
                                                <td className="px-2 py-3 text-right">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={item.returnable}
                                                        step="any"
                                                        disabled={disabled}
                                                        value={qty}
                                                        onChange={(e) => setQuantity(item.id, Number(e.target.value), item.returnable)}
                                                        aria-label={`${t('sales.return_qty')} — ${item.name}`}
                                                        className="w-24 py-1.5 text-right"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('sales.return_reason')} error={formErrors.reason}>
                                <Input
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder={t('common.reason')}
                                />
                            </Field>
                            <fieldset>
                                <legend className="mb-1.5 text-sm font-medium text-slate-700">{t('common.payment_method')}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {METHODS.map((method) => (
                                        <label
                                            key={method}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition',
                                                data.payment_method === method
                                                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="payment_method"
                                                value={method}
                                                checked={data.payment_method === method}
                                                onChange={() => setData('payment_method', method)}
                                                className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            {t(`method.${method}`)}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('sales.refund')}</p>
                                <p className="text-xl font-bold tabular-nums text-slate-900">{formatMoney(refund, symbol)}</p>
                            </div>
                            <Button type="submit" loading={processing} disabled={selectedCount <= 0} icon={<RotateCcw size={16} />}>
                                {t('sales.process_return')}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>

            <p className="text-xs text-slate-400">
                {t('sales.sale_details')}: {t('common.total')} {formatMoney(sale.total, symbol)}
            </p>
        </div>
    );
}

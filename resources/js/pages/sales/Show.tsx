import { useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { Printer, RotateCcw, Wallet } from 'lucide-react';
import {
    Badge, Button, Card, CardHeader, EmptyState, Field, Input, LinkButton, Modal, PageHeader, StatusBadge, Textarea, cn,
} from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';

interface SaleItem {
    id: number;
    variant_id: number;
    name: string;
    quantity: number;
    returned_quantity: number;
    unit_price: number;
    unit_cost: number;
    total_price: number;
    profit: number;
}

interface SalePayment {
    id: number;
    amount: number;
    method: string;
    paid_at: string;
    user: string | null;
}

interface SaleReturn {
    id: number;
    return_number: string;
    refund_amount: number;
    reason: string | null;
    returned_at: string;
    user: string | null;
}

interface SaleDetail {
    id: number;
    sale_number: string;
    sold_at: string;
    cashier: string | null;
    customer: string | null;
    customer_id: number | null;
    subtotal: number;
    discount: number;
    tax_amount: number;
    total: number;
    cost_of_goods: number;
    profit: number;
    paid_amount: number;
    remaining_amount: number;
    payment_method: string;
    payment_status: string;
    notes: string | null;
    items: SaleItem[];
    payments: SalePayment[];
    returns: SaleReturn[];
}

interface SaleShop {
    name: string;
    address: string | null;
    phone: string | null;
    currency_symbol: string;
}

interface SalesShowProps {
    sale: SaleDetail;
    shop: SaleShop;
}

const METHODS = ['cash', 'bank', 'mobile'] as const;

export default function SalesShow({ sale, shop }: SalesShowProps) {
    const { t } = useTranslation();
    const symbol = shop.currency_symbol;
    const [payOpen, setPayOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        payment_method: 'cash' as string,
        notes: '',
    });

    const formErrors = errors as unknown as Record<string, string | undefined>;

    const submitPayment = (e: FormEvent) => {
        e.preventDefault();
        post(`/sales/${sale.id}/pay`, {
            preserveScroll: true,
            onSuccess: () => {
                setPayOpen(false);
                reset();
            },
        });
    };

    const summary = [
        { label: t('common.subtotal'), value: sale.subtotal, tone: '' },
        { label: t('common.discount'), value: sale.discount, tone: '' },
        { label: t('common.tax'), value: sale.tax_amount, tone: '' },
        { label: t('common.total'), value: sale.total, tone: 'text-slate-900' },
        { label: t('sales.cost'), value: sale.cost_of_goods, tone: '' },
        { label: t('common.profit'), value: sale.profit, tone: sale.profit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
        { label: t('common.paid_amount'), value: sale.paid_amount, tone: '' },
        { label: t('sales.remaining'), value: sale.remaining_amount, tone: sale.remaining_amount > 0 ? 'text-rose-600' : '' },
    ];

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <PageHeader
                    title={`${t('sales.sale_number')} ${sale.sale_number}`}
                    subtitle={`${sale.sold_at} · ${sale.customer ?? t('pos.walk_in')}`}
                    actions={
                        <>
                            <StatusBadge status={sale.payment_status} label={t(`status.${sale.payment_status}`)} />
                            {sale.remaining_amount > 0 && (
                                <>
                                    <Button variant="outline" icon={<Wallet size={16} />} onClick={() => setPayOpen(true)}>
                                        {t('sales.record_payment')}
                                    </Button>
                                    <LinkButton href={`/sales/${sale.id}/return`} variant="outline" icon={<RotateCcw size={16} />}>
                                        {t('sales.return')}
                                    </LinkButton>
                                </>
                            )}
                            <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
                                {t('common.print')}
                            </Button>
                        </>
                    }
                />
            </div>

            <Card className="print:border-0 print:p-0 print:shadow-none">
                <div className="border-b border-dashed border-slate-200 pb-4 text-center">
                    <h2 className="text-lg font-bold text-slate-900">{shop.name}</h2>
                    {shop.address && <p className="text-sm text-slate-500">{shop.address}</p>}
                    {shop.phone && <p className="text-sm text-slate-500">{shop.phone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-200 py-4 text-sm">
                    <div>
                        <span className="text-slate-400">{t('sales.sale_number')}</span>
                        <p className="font-semibold text-slate-800">{sale.sale_number}</p>
                    </div>
                    <div>
                        <span className="text-slate-400">{t('common.date')}</span>
                        <p className="font-semibold text-slate-800">{sale.sold_at}</p>
                    </div>
                    <div>
                        <span className="text-slate-400">{t('sales.cashier')}</span>
                        <p className="font-semibold text-slate-800">{sale.cashier ?? '—'}</p>
                    </div>
                    <div>
                        <span className="text-slate-400">{t('pos.customer')}</span>
                        <p className="font-semibold text-slate-800">{sale.customer ?? t('pos.walk_in')}</p>
                    </div>
                </div>
                <div className="overflow-x-auto py-3">
                    <table className="w-full min-w-[420px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="pb-2 pr-2 font-semibold">{t('products.product')}</th>
                                <th className="pb-2 pr-2 text-right font-semibold">{t('common.quantity')}</th>
                                <th className="pb-2 pr-2 text-right font-semibold">{t('common.price')}</th>
                                <th className="pb-2 text-right font-semibold">{t('common.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50">
                                    <td className="py-2 pr-2 text-slate-700">{item.name}</td>
                                    <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{item.quantity}</td>
                                    <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{formatMoney(item.unit_price, symbol)}</td>
                                    <td className="py-2 text-right font-semibold tabular-nums text-slate-800">{formatMoney(item.total_price, symbol)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-4 text-sm">
                    <div className="flex justify-between text-slate-500">
                        <span>{t('pos.subtotal')}</span>
                        <span className="tabular-nums">{formatMoney(sale.subtotal, symbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <span>{t('common.discount')}</span>
                        <span className="tabular-nums">{formatMoney(sale.discount, symbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <span>{t('common.tax')}</span>
                        <span className="tabular-nums">{formatMoney(sale.tax_amount, symbol)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                        <span>{t('common.total')}</span>
                        <span className="tabular-nums">{formatMoney(sale.total, symbol)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                        <span>{t('common.payment_method')}</span>
                        <span>{t(`method.${sale.payment_method}`)}</span>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
                {summary.map((card) => (
                    <div key={card.label} className="card p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className={cn('mt-1.5 text-lg font-bold tabular-nums text-slate-900', card.tone)}>
                            {formatMoney(card.value, symbol)}
                        </p>
                    </div>
                ))}
            </div>

            <Card className="print:hidden">
                <CardHeader title={t('sales.items')} />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="px-2 pb-2.5 font-semibold">{t('products.product')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.returned')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.price')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.cost')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.total')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.profit')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                    <td className="px-2 py-3 text-slate-700">{item.name}</td>
                                    <td className="px-2 py-3 text-right tabular-nums text-slate-600">{item.quantity}</td>
                                    <td className="px-2 py-3 text-right tabular-nums text-slate-500">{item.returned_quantity}</td>
                                    <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatMoney(item.unit_price, symbol)}</td>
                                    <td className="px-2 py-3 text-right tabular-nums text-slate-500">{formatMoney(item.unit_cost, symbol)}</td>
                                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">{formatMoney(item.total_price, symbol)}</td>
                                    <td
                                        className={cn(
                                            'px-2 py-3 text-right tabular-nums',
                                            item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                        )}
                                    >
                                        {formatMoney(item.profit, symbol)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {sale.notes && (
                    <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                        <span className="font-semibold text-slate-500">{t('common.notes')}: </span>
                        {sale.notes}
                    </p>
                )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2 print:hidden">
                <Card>
                    <CardHeader
                        title={t('sales.payments')}
                        action={
                            sale.remaining_amount > 0 ? (
                                <Button variant="outline" onClick={() => setPayOpen(true)} className="px-3 py-1.5 text-xs">
                                    {t('sales.record_payment')}
                                </Button>
                            ) : undefined
                        }
                    />
                    {sale.payments.length === 0 ? (
                        <EmptyState title={t('sales.no_payments')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[420px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 pr-2 font-semibold">{t('common.date')}</th>
                                        <th className="pb-2 pr-2 font-semibold">{t('common.payment_method')}</th>
                                        <th className="pb-2 pr-2 font-semibold">{t('common.user')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.amount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.payments.map((payment) => (
                                        <tr key={payment.id} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-2 whitespace-nowrap text-slate-500">{payment.paid_at}</td>
                                            <td className="py-2.5 pr-2">
                                                <Badge tone="bg-slate-100 text-slate-600">{t(`method.${payment.method}`)}</Badge>
                                            </td>
                                            <td className="py-2.5 pr-2 text-slate-600">{payment.user ?? '—'}</td>
                                            <td className="py-2.5 text-right font-semibold tabular-nums text-slate-800">
                                                {formatMoney(payment.amount, symbol)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card>
                    <CardHeader title={t('sales.returns')} />
                    {sale.returns.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[420px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 pr-2 font-semibold">{t('sales.sale_number')}</th>
                                        <th className="pb-2 pr-2 font-semibold">{t('common.reason')}</th>
                                        <th className="pb-2 pr-2 font-semibold">{t('common.date')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('sales.refund')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.returns.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-2 font-semibold text-slate-700">{item.return_number}</td>
                                            <td className="py-2.5 pr-2 text-slate-500">{item.reason ?? '—'}</td>
                                            <td className="py-2.5 pr-2 whitespace-nowrap text-slate-500">{item.returned_at}</td>
                                            <td className="py-2.5 text-right font-semibold tabular-nums text-rose-600">
                                                {formatMoney(item.refund_amount, symbol)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            <Modal
                open={payOpen}
                onClose={() => setPayOpen(false)}
                title={t('sales.record_payment')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setPayOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" form="sale-pay-form" loading={processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="sale-pay-form" onSubmit={submitPayment} className="space-y-4">
                    <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                        {t('sales.remaining')}: {formatMoney(sale.remaining_amount, symbol)}
                    </p>
                    <Field label={t('common.amount')} error={formErrors.amount} required>
                        <Input
                            type="number"
                            min={0.01}
                            step="any"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            placeholder={t('common.amount')}
                            autoFocus
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
                    <Field label={t('common.notes')} error={formErrors.notes}>
                        <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder={t('common.notes')} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

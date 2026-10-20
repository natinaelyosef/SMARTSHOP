import { useState, type FormEvent } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Printer, Wallet } from 'lucide-react';
import {
    Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, StatusBadge, Textarea, cn,
} from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface PurchaseItem {
    id: number;
    variant: string;
    sku: string | null;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    batch_number: string | null;
    expires_at: string | null;
}

interface PurchasePayment {
    id: number;
    amount: number;
    method: string;
    paid_at: string;
    user: string | null;
    reference: string | null;
}

interface PurchaseDetail {
    id: number;
    purchase_number: string;
    invoice_number: string | null;
    purchased_at: string;
    supplier: string | null;
    supplier_id: number | null;
    user: string | null;
    subtotal: number;
    discount: number;
    tax_amount: number;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    payment_status: string;
    notes: string | null;
    items: PurchaseItem[];
    payments: PurchasePayment[];
}

interface PurchasesShowProps {
    purchase: PurchaseDetail;
}

const METHODS = ['cash', 'bank', 'mobile'] as const;

export default function PurchasesShow({ purchase }: PurchasesShowProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const [payOpen, setPayOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        payment_method: 'cash' as string,
        reference: '',
        notes: '',
    });

    const formErrors = errors as unknown as Record<string, string | undefined>;

    const submitPayment = (e: FormEvent) => {
        e.preventDefault();
        post(`/purchases/${purchase.id}/pay`, {
            preserveScroll: true,
            onSuccess: () => {
                setPayOpen(false);
                reset();
            },
        });
    };

    const summary = [
        { label: t('common.subtotal'), value: purchase.subtotal, tone: '' },
        { label: t('common.discount'), value: purchase.discount, tone: '' },
        { label: t('common.tax'), value: purchase.tax_amount, tone: '' },
        { label: t('common.total'), value: purchase.total, tone: 'text-slate-900' },
        { label: t('purchases.paid_amount'), value: purchase.paid_amount, tone: '' },
        {
            label: t('purchases.remaining'),
            value: purchase.remaining_amount,
            tone: purchase.remaining_amount > 0 ? 'text-rose-600' : 'text-emerald-600',
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${t('purchases.purchase_number')} ${purchase.purchase_number}`}
                subtitle={`${purchase.purchased_at} · ${purchase.supplier ?? '—'}`}
                actions={
                    <>
                        <StatusBadge status={purchase.payment_status} label={t(`status.${purchase.payment_status}`)} />
                        {purchase.remaining_amount > 0 && (
                            <Button variant="outline" icon={<Wallet size={16} />} onClick={() => setPayOpen(true)}>
                                {t('purchases.record_payment')}
                            </Button>
                        )}
                        <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
                            {t('common.print')}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {summary.map((card) => (
                    <div key={card.label} className="card min-w-0 p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className={cn('mt-1.5 break-words text-sm font-bold tabular-nums text-slate-900 sm:text-base lg:text-lg', card.tone)}>
                            {formatMoney(card.value, symbol)}
                        </p>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader title={t('purchases.items')} subtitle={purchase.invoice_number ? `${t('purchases.invoice')} ${purchase.invoice_number}` : undefined} />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="px-2 pb-2.5 font-semibold">{t('purchases.product')}</th>
                                <th className="px-2 pb-2.5 font-semibold">{t('products.sku')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.quantity')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('purchases.unit_cost')}</th>
                                <th className="px-2 pb-2.5 text-right font-semibold">{t('common.total')}</th>
                                <th className="px-2 pb-2.5 font-semibold">{t('purchases.batch_number')}</th>
                                <th className="px-2 pb-2.5 font-semibold">{t('purchases.expires_at')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchase.items.map((item) => (
                                <tr key={item.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                    <td className="px-2 py-3 text-slate-700">{item.variant}</td>
                                    <td className="px-2 py-3 text-slate-500">{item.sku ?? '—'}</td>
                                    <td className="px-2 py-3 text-right tabular-nums text-slate-600">{item.quantity}</td>
                                    <td className="px-2 py-3 text-right tabular-nums text-slate-600">{formatMoney(item.unit_cost, symbol)}</td>
                                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                                        {formatMoney(item.total_cost, symbol)}
                                    </td>
                                    <td className="px-2 py-3 text-slate-500">{item.batch_number ?? '—'}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-slate-500">{item.expires_at ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {purchase.notes && (
                    <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                        <span className="font-semibold text-slate-500">{t('common.notes')}: </span>
                        {purchase.notes}
                    </p>
                )}
            </Card>

            <Card>
                <CardHeader
                    title={t('purchases.payments')}
                    action={
                        purchase.remaining_amount > 0 ? (
                            <Button variant="outline" onClick={() => setPayOpen(true)} className="px-3 py-1.5 text-xs">
                                {t('purchases.record_payment')}
                            </Button>
                        ) : undefined
                    }
                />
                {purchase.payments.length === 0 ? (
                    <EmptyState title={t('purchases.no_payments')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.date')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.payment_method')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('expenses.reference')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.user')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchase.payments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="px-2 py-3 whitespace-nowrap text-slate-500">{payment.paid_at}</td>
                                        <td className="px-2 py-3">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                                {t(`method.${payment.method}`)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-slate-500">{payment.reference ?? '—'}</td>
                                        <td className="px-2 py-3 text-slate-600">{payment.user ?? '—'}</td>
                                        <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-800">
                                            {formatMoney(payment.amount, symbol)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={payOpen}
                onClose={() => setPayOpen(false)}
                title={t('purchases.record_payment')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setPayOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" form="purchase-pay-form" loading={processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="purchase-pay-form" onSubmit={submitPayment} className="space-y-4">
                    <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                        {t('purchases.remaining')}: {formatMoney(purchase.remaining_amount, symbol)}
                    </p>
                    {formErrors.amount && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 animate-fade-in">
                            {formErrors.amount}
                        </div>
                    )}
                    <Field label={t('common.amount')} required>
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
                    <Field label={t('expenses.reference')} error={formErrors.reference}>
                        <Input
                            value={data.reference}
                            onChange={(e) => setData('reference', e.target.value)}
                            placeholder={t('expenses.reference')}
                        />
                    </Field>
                    <Field label={t('common.notes')} error={formErrors.notes}>
                        <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder={t('common.notes')} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

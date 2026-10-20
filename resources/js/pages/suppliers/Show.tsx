import { type FormEvent, useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Pencil, Wallet } from 'lucide-react';
import {
    Button,
    Card,
    CardHeader,
    EmptyState,
    Field,
    Input,
    LinkButton,
    Modal,
    PageHeader,
    Pagination,
    Select,
    StatusBadge,
    Textarea,
} from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface PurchaseRow {
    id: number;
    purchase_number: string;
    purchased_at: string;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    payment_status: string;
    user: string | null;
}

interface PaymentRow {
    id: number;
    purchase: string | null;
    amount: number;
    method: string;
    paid_at: string;
    user: string | null;
}

interface SupplierShowProps {
    supplier: {
        id: number;
        name: string;
        company: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        tax_id: string | null;
        notes: string | null;
        balance: number;
        status: string;
        created_at: string;
    };
    purchases: Paginated<PurchaseRow>;
    payments: PaymentRow[];
    productsSupplied: { variant: string; quantity: string | number; avg_cost: number }[];
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function SuppliersShow({ supplier, purchases, payments, productsSupplied }: SupplierShowProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    const [editOpen, setEditOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);

    const unpaidPurchases = purchases.data.filter((p) => p.remaining_amount > 0);
    const totalPurchased = purchases.data.reduce((sum, p) => sum + p.total, 0);

    const editForm = useForm({
        name: supplier.name,
        company: supplier.company ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
        tax_id: supplier.tax_id ?? '',
        notes: supplier.notes ?? '',
        status: supplier.status,
    });
    const payForm = useForm({
        purchase_id: unpaidPurchases[0] ? String(unpaidPurchases[0].id) : '',
        amount: unpaidPurchases[0] ? String(unpaidPurchases[0].remaining_amount) : '',
        payment_method: 'cash',
        reference: '',
        notes: '',
    });

    const openEdit = () => {
        editForm.setData({
            name: supplier.name,
            company: supplier.company ?? '',
            phone: supplier.phone ?? '',
            email: supplier.email ?? '',
            address: supplier.address ?? '',
            tax_id: supplier.tax_id ?? '',
            notes: supplier.notes ?? '',
            status: supplier.status,
        });
        editForm.clearErrors();
        setEditOpen(true);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        editForm.transform((d) => ({
            name: d.name,
            company: d.company || null,
            phone: d.phone || null,
            email: d.email || null,
            address: d.address || null,
            tax_id: d.tax_id || null,
            notes: d.notes || null,
            status: d.status,
        }));
        editForm.put(`/suppliers/${supplier.id}`, {
            onSuccess: () => setEditOpen(false),
        });
    };

    const openPay = () => {
        const first = unpaidPurchases[0];
        payForm.setData({
            purchase_id: first ? String(first.id) : '',
            amount: first ? String(first.remaining_amount) : '',
            payment_method: 'cash',
            reference: '',
            notes: '',
        });
        payForm.clearErrors();
        setPayOpen(true);
    };

    const selectPurchase = (id: string) => {
        const purchase = purchases.data.find((p) => String(p.id) === id);
        payForm.setData('purchase_id', id);
        payForm.setData('amount', purchase ? String(purchase.remaining_amount) : '');
    };

    const submitPay = (e: FormEvent) => {
        e.preventDefault();
        if (!payForm.data.purchase_id) return;
        payForm.transform((d) => ({
            amount: d.amount === '' ? null : Number(d.amount),
            payment_method: d.payment_method,
            reference: d.reference || null,
            notes: d.notes || null,
        }));
        payForm.post(`/purchases/${payForm.data.purchase_id}/pay`, {
            onSuccess: () => {
                payForm.reset();
                setPayOpen(false);
            },
        });
    };

    const stats = [
        { label: t('suppliers.total_purchased'), value: formatMoney(totalPurchased, symbol), accent: 'text-slate-900' },
        {
            label: t('suppliers.balance'),
            value: formatMoney(supplier.balance, symbol),
            accent: supplier.balance > 0 ? 'text-rose-600' : 'text-slate-900',
        },
        { label: t('suppliers.purchases'), value: formatNumber(purchases.total), accent: 'text-slate-900' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={supplier.name}
                subtitle={supplier.company ?? supplier.phone ?? undefined}
                actions={
                    <>
                        <Button variant="outline" onClick={openEdit} icon={<Pencil size={15} />}>
                            {t('common.edit')}
                        </Button>
                        <Button variant="success" onClick={openPay} icon={<Wallet size={15} />}>
                            {t('suppliers.pay')}
                        </Button>
                    </>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="animate-slide-up">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                        <p className={`mt-1.5 text-2xl font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
                    </Card>
                ))}
                <Card className="animate-slide-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('common.status')}</p>
                    <div className="mt-2.5">
                        <StatusBadge status={supplier.status} label={t(`status.${supplier.status}`)} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                        {t('common.created')}: {supplier.created_at}
                    </p>
                </Card>
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('suppliers.purchases')} subtitle={t('common.total_records', { count: purchases.total })} />
                {purchases.data.length === 0 ? (
                    <EmptyState
                        title={t('purchases.empty')}
                        action={<LinkButton href="/purchases/create" variant="outline">{t('purchases.new')}</LinkButton>}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('purchases.purchase_number')}</th>
                                    <th className="pb-2 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.total')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('purchases.paid_amount')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('purchases.remaining')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 font-semibold">{t('common.user')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.data.map((purchase) => (
                                    <tr key={purchase.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <Link
                                                href={`/purchases/${purchase.id}`}
                                                className="font-semibold text-brand-600 hover:underline"
                                            >
                                                {purchase.purchase_number}
                                            </Link>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{purchase.purchased_at}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">
                                            {formatMoney(purchase.total, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(purchase.paid_amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(purchase.remaining_amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge
                                                status={purchase.payment_status}
                                                label={t(`status.${purchase.payment_status}`)}
                                            />
                                        </td>
                                        <td className="py-2.5 text-slate-500">{purchase.user || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-4">
                    <Pagination links={purchases.links} />
                </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="animate-slide-up">
                    <CardHeader title={t('purchases.supplier_payment')} subtitle={t('common.history')} />
                    {payments.length === 0 ? (
                        <EmptyState title={t('purchases.no_payments')} />
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {payments.map((payment) => (
                                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-700">
                                            {payment.purchase
                                                ? `${t('purchases.purchase_number')} ${payment.purchase}`
                                                : t('common.payment_method')}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {payment.paid_at} · {t(`method.${payment.method}`)} · {payment.user ?? '—'}
                                        </p>
                                    </div>
                                    <span className="font-semibold tabular-nums text-slate-800">
                                        {formatMoney(payment.amount, symbol)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('suppliers.products_supplied')} />
                    {productsSupplied.length === 0 ? (
                        <EmptyState title={t('common.no_results')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[360px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 font-semibold">{t('purchases.product')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('common.quantity')}</th>
                                        <th className="pb-2 text-right font-semibold">{t('suppliers.avg_cost')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productsSupplied.map((item, index) => (
                                        <tr key={index} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-3 font-medium text-slate-700">{item.variant}</td>
                                            <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                                {formatNumber(item.quantity)}
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums text-slate-700">
                                                {formatMoney(item.avg_cost, symbol)}
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
                title={t('suppliers.pay')}
                footer={
                    unpaidPurchases.length === 0 ? (
                        <Button variant="outline" onClick={() => setPayOpen(false)}>
                            {t('common.close')}
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setPayOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button form="supplier-pay-form" type="submit" loading={payForm.processing}>
                                {t('common.save')}
                            </Button>
                        </>
                    )
                }
            >
                {unpaidPurchases.length === 0 ? (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-slate-500">{t('suppliers.no_unpaid')}</p>
                        <LinkButton href="/purchases" variant="outline">
                            {t('purchases.title')}
                        </LinkButton>
                    </div>
                ) : (
                    <form id="supplier-pay-form" onSubmit={submitPay} className="space-y-4">
                        {fieldError(payForm.errors, 'amount') && (
                            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 animate-fade-in">
                                {fieldError(payForm.errors, 'amount')}
                            </p>
                        )}
                        <Field label={t('purchases.title')} required error={fieldError(payForm.errors, 'purchase_id')}>
                            <Select value={payForm.data.purchase_id} onChange={(e) => selectPurchase(e.target.value)}>
                                {unpaidPurchases.map((purchase) => (
                                    <option key={purchase.id} value={String(purchase.id)}>
                                        {purchase.purchase_number} · {formatMoney(purchase.remaining_amount, symbol)}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={t('common.amount')} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={payForm.data.amount}
                                onChange={(e) => payForm.setData('amount', e.target.value)}
                                autoFocus
                            />
                        </Field>
                        <Field label={t('common.payment_method')} required error={fieldError(payForm.errors, 'payment_method')}>
                            <Select
                                value={payForm.data.payment_method}
                                onChange={(e) => payForm.setData('payment_method', e.target.value)}
                            >
                                <option value="cash">{t('method.cash')}</option>
                                <option value="bank">{t('method.bank')}</option>
                                <option value="mobile">{t('method.mobile')}</option>
                            </Select>
                        </Field>
                        <Field label={t('inv.reference')} error={fieldError(payForm.errors, 'reference')}>
                            <Input
                                value={payForm.data.reference}
                                onChange={(e) => payForm.setData('reference', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.notes')} error={fieldError(payForm.errors, 'notes')}>
                            <Textarea value={payForm.data.notes} onChange={(e) => payForm.setData('notes', e.target.value)} />
                        </Field>
                    </form>
                )}
            </Modal>

            <Modal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title={t('suppliers.details')}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="supplier-edit-form" type="submit" loading={editForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="supplier-edit-form" onSubmit={submitEdit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.name')} required error={fieldError(editForm.errors, 'name')}>
                            <Input
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                autoFocus
                            />
                        </Field>
                        <Field label={t('suppliers.company')} error={fieldError(editForm.errors, 'company')}>
                            <Input
                                value={editForm.data.company}
                                onChange={(e) => editForm.setData('company', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.phone')} error={fieldError(editForm.errors, 'phone')}>
                            <Input value={editForm.data.phone} onChange={(e) => editForm.setData('phone', e.target.value)} />
                        </Field>
                        <Field label={t('common.email')} error={fieldError(editForm.errors, 'email')}>
                            <Input
                                type="email"
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.address')} error={fieldError(editForm.errors, 'address')}>
                            <Input
                                value={editForm.data.address}
                                onChange={(e) => editForm.setData('address', e.target.value)}
                            />
                        </Field>
                        <Field label={t('suppliers.tax_id')} error={fieldError(editForm.errors, 'tax_id')}>
                            <Input value={editForm.data.tax_id} onChange={(e) => editForm.setData('tax_id', e.target.value)} />
                        </Field>
                    </div>
                    <Field label={t('common.notes')} error={fieldError(editForm.errors, 'notes')}>
                        <Textarea value={editForm.data.notes} onChange={(e) => editForm.setData('notes', e.target.value)} />
                    </Field>
                    <Field label={t('common.status')} required error={fieldError(editForm.errors, 'status')}>
                        <Select value={editForm.data.status} onChange={(e) => editForm.setData('status', e.target.value)}>
                            <option value="active">{t('status.active')}</option>
                            <option value="archived">{t('status.archived')}</option>
                        </Select>
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

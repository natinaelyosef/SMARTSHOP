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

interface SaleRow {
    id: number;
    sale_number: string;
    sold_at: string;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    payment_status: string;
    cashier: string | null;
}

interface PaymentRow {
    id: number;
    sale: string | null;
    amount: number;
    method: string;
    paid_at: string;
    user: string | null;
}

interface CustomerShowProps {
    customer: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        notes: string | null;
        balance: number;
        status: string;
        total_spent: number;
        created_at: string;
    };
    sales: Paginated<SaleRow>;
    payments: PaymentRow[];
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function CustomersShow({ customer, sales, payments }: CustomerShowProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    const [editOpen, setEditOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);

    const editForm = useForm({
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
        status: customer.status,
    });
    const payForm = useForm({ amount: '', payment_method: 'cash', notes: '' });

    const openEdit = () => {
        editForm.setData({
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            address: customer.address ?? '',
            notes: customer.notes ?? '',
            status: customer.status,
        });
        editForm.clearErrors();
        setEditOpen(true);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        editForm.put(`/customers/${customer.id}`, {
            onSuccess: () => setEditOpen(false),
        });
    };

    const openPay = () => {
        payForm.reset();
        payForm.clearErrors();
        setPayOpen(true);
    };

    const submitPay = (e: FormEvent) => {
        e.preventDefault();
        payForm.transform((d) => ({
            amount: d.amount === '' ? null : Number(d.amount),
            payment_method: d.payment_method,
            notes: d.notes || null,
        }));
        payForm.post(`/customers/${customer.id}/pay`, {
            onSuccess: () => {
                payForm.reset();
                setPayOpen(false);
            },
        });
    };

    const stats = [
        { label: t('customers.total_spent'), value: formatMoney(customer.total_spent, symbol), accent: 'text-slate-900' },
        { label: t('customers.balance'), value: formatMoney(customer.balance, symbol), accent: customer.balance > 0 ? 'text-rose-600' : 'text-slate-900' },
        { label: t('customers.sales_count'), value: formatNumber(sales.total), accent: 'text-slate-900' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={customer.name}
                subtitle={customer.phone ?? customer.email ?? undefined}
                actions={
                    <>
                        <Button variant="outline" onClick={openEdit} icon={<Pencil size={15} />}>
                            {t('common.edit')}
                        </Button>
                        <Button variant="success" onClick={openPay} icon={<Wallet size={15} />}>
                            {t('customers.record_payment')}
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
                        <StatusBadge status={customer.status} label={t(`status.${customer.status}`)} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                        {t('common.created')}: {customer.created_at}
                    </p>
                </Card>
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('sales.title')} subtitle={t('common.total_records', { count: sales.total })} />
                {sales.data.length === 0 ? (
                    <EmptyState title={t('sales.no_sales')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('sales.sale_number')}</th>
                                    <th className="pb-2 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.total')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.paid')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('sales.remaining')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 font-semibold">{t('sales.cashier')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.map((sale) => (
                                    <tr key={sale.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <Link href={`/sales/${sale.id}`} className="font-semibold text-brand-600 hover:underline">
                                                {sale.sale_number}
                                            </Link>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{sale.sold_at}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">
                                            {formatMoney(sale.total, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(sale.paid_amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(sale.remaining_amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={sale.payment_status} label={t(`status.${sale.payment_status}`)} />
                                        </td>
                                        <td className="py-2.5 text-slate-500">{sale.cashier || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-4">
                    <Pagination links={sales.links} />
                </div>
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('customers.payments')} />
                {payments.length === 0 ? (
                    <EmptyState title={t('customers.no_payments')} />
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {payments.map((payment) => (
                            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-700">
                                        {payment.sale ? `${t('sales.sale_number')} ${payment.sale}` : t('common.payment_method')}
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

            <Modal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title={t('customers.details')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="customer-edit-form" type="submit" loading={editForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="customer-edit-form" onSubmit={submitEdit} className="space-y-4">
                    <Field label={t('common.name')} required error={fieldError(editForm.errors, 'name')}>
                        <Input
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    </div>
                    <Field label={t('common.address')} error={fieldError(editForm.errors, 'address')}>
                        <Input value={editForm.data.address} onChange={(e) => editForm.setData('address', e.target.value)} />
                    </Field>
                    <Field label={t('common.notes')} error={fieldError(editForm.errors, 'notes')}>
                        <Textarea value={editForm.data.notes} onChange={(e) => editForm.setData('notes', e.target.value)} />
                    </Field>
                    <Field label={t('common.status')} required error={fieldError(editForm.errors, 'status')}>
                        <Select
                            value={editForm.data.status}
                            onChange={(e) => editForm.setData('status', e.target.value)}
                        >
                            <option value="active">{t('status.active')}</option>
                            <option value="archived">{t('status.archived')}</option>
                        </Select>
                    </Field>
                </form>
            </Modal>

            <Modal
                open={payOpen}
                onClose={() => setPayOpen(false)}
                title={t('customers.record_payment')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPayOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="customer-show-pay-form" type="submit" loading={payForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="customer-show-pay-form" onSubmit={submitPay} className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                            <span className="font-semibold text-slate-700">{t('customers.balance')}</span>
                        <span className="font-semibold tabular-nums text-rose-600">{formatMoney(customer.balance, symbol)}</span>
                    </div>
                    {fieldError(payForm.errors, 'amount') && (
                        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 animate-fade-in">
                            {fieldError(payForm.errors, 'amount')}
                        </p>
                    )}
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
                    <Field label={t('common.notes')} error={fieldError(payForm.errors, 'notes')}>
                        <Textarea value={payForm.data.notes} onChange={(e) => payForm.setData('notes', e.target.value)} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

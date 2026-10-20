import { type FormEvent, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Home, Pencil, Plus, Wallet } from 'lucide-react';
import {
    Button,
    Card,
    CardHeader,
    EmptyState,
    Field,
    Input,
    Modal,
    PageHeader,
    Select,
    StatusBadge,
    Textarea,
} from '@/components/ui';
import { useFilters } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface RentRow {
    id: number;
    shop_name: string;
    landlord_name: string | null;
    landlord_phone: string | null;
    monthly_amount: number;
    due_day: number;
    start_date: string;
    status: 'active' | 'ended';
    notes: string | null;
}

interface RentPaymentRow {
    id: number;
    rent_id: number;
    shop: string | null;
    period: string;
    period_start: string;
    amount_due: number;
    amount_paid: number;
    remaining: number;
    due_date: string;
    paid_at: string | null;
    payment_method: string | null;
    receipt_number: string | null;
    status: 'unpaid' | 'partial' | 'paid';
    user: string | null;
    notes: string | null;
}

interface RentIndexProps {
    rents: RentRow[];
    payments: RentPaymentRow[];
    summary: { year: number; due: number; paid: number; outstanding: number; overdue: number };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

function today(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function RentIndex({ rents, payments, summary }: RentIndexProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const { update } = useFilters();

    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<RentRow | null>(null);
    const [payTarget, setPayTarget] = useState<RentPaymentRow | null>(null);

    const contractForm = useForm({
        shop_name: '',
        landlord_name: '',
        landlord_phone: '',
        monthly_amount: '',
        due_day: '1',
        start_date: today(),
        status: 'active',
        notes: '',
    });
    const payForm = useForm({
        amount: '',
        payment_method: 'cash',
        paid_at: today(),
        receipt_number: '',
        notes: '',
    });

    const years = [summary.year - 2, summary.year - 1, summary.year, summary.year + 1];

    const openCreate = () => {
        contractForm.reset();
        contractForm.setData('start_date', today());
        contractForm.clearErrors();
        setCreateOpen(true);
    };

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        contractForm.transform((d) => ({
            shop_name: d.shop_name,
            landlord_name: d.landlord_name || null,
            landlord_phone: d.landlord_phone || null,
            monthly_amount: d.monthly_amount === '' ? null : Number(d.monthly_amount),
            due_day: Number(d.due_day),
            start_date: d.start_date,
            notes: d.notes || null,
        }));
        contractForm.post('/rent', {
            onSuccess: () => {
                contractForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const openEdit = (rent: RentRow) => {
        contractForm.setData({
            shop_name: rent.shop_name,
            landlord_name: rent.landlord_name ?? '',
            landlord_phone: rent.landlord_phone ?? '',
            monthly_amount: String(rent.monthly_amount),
            due_day: String(rent.due_day),
            start_date: rent.start_date,
            status: rent.status,
            notes: rent.notes ?? '',
        });
        contractForm.clearErrors();
        setEditing(rent);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        contractForm.transform((d) => ({
            shop_name: d.shop_name,
            landlord_name: d.landlord_name || null,
            landlord_phone: d.landlord_phone || null,
            monthly_amount: d.monthly_amount === '' ? null : Number(d.monthly_amount),
            due_day: Number(d.due_day),
            status: d.status,
            notes: d.notes || null,
        }));
        contractForm.put(`/rent/${editing.id}`, {
            onSuccess: () => {
                contractForm.reset();
                setEditing(null);
            },
        });
    };

    const openPay = (payment: RentPaymentRow) => {
        payForm.setData({
            amount: String(payment.remaining),
            payment_method: 'cash',
            paid_at: today(),
            receipt_number: payment.receipt_number ?? '',
            notes: '',
        });
        payForm.clearErrors();
        setPayTarget(payment);
    };

    const submitPay = (e: FormEvent) => {
        e.preventDefault();
        if (!payTarget) return;
        payForm.transform((d) => ({
            amount: d.amount === '' ? null : Number(d.amount),
            payment_method: d.payment_method,
            paid_at: d.paid_at || null,
            receipt_number: d.receipt_number || null,
            notes: d.notes || null,
        }));
        payForm.post(`/rent/payments/${payTarget.id}`, {
            onSuccess: () => {
                payForm.reset();
                setPayTarget(null);
            },
        });
    };

    const stats = [
        { label: t('rent.due'), value: summary.due, accent: 'text-slate-900' },
        { label: t('rent.paid'), value: summary.paid, accent: 'text-emerald-600' },
        { label: t('rent.outstanding'), value: summary.outstanding, accent: 'text-slate-900' },
        { label: t('rent.overdue'), value: summary.overdue, accent: 'text-rose-600' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('rent.title')}
                actions={
                    <>
                        <Select
                            value={String(summary.year)}
                            onChange={(e) => update({ year: e.target.value })}
                            aria-label={t('rent.year')}
                            className="w-auto py-2.5"
                        >
                            {years.map((year) => (
                                <option key={year} value={String(year)}>
                                    {year}
                                </option>
                            ))}
                        </Select>
                        <Button onClick={openCreate} icon={<Plus size={16} />}>
                            {t('rent.new')}
                        </Button>
                    </>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="animate-slide-up">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                        <p className={`mt-1.5 text-2xl font-bold tabular-nums ${stat.accent}`}>
                            {formatMoney(stat.value, symbol)}
                        </p>
                    </Card>
                ))}
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('rent.contracts')} action={
                    <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={openCreate} icon={<Plus size={13} />}>
                        {t('rent.new')}
                    </Button>
                } />
                {rents.length === 0 ? (
                    <EmptyState
                        title={t('rent.title')}
                        action={
                            <Button onClick={openCreate} icon={<Plus size={16} />}>
                                {t('rent.new')}
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('rent.shop')}</th>
                                    <th className="pb-2 font-semibold">{t('rent.landlord')}</th>
                                    <th className="pb-2 font-semibold">{t('common.phone')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('rent.monthly_amount')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('rent.due_date')}</th>
                                    <th className="pb-2 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 font-semibold">{t('rent.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rents.map((rent) => (
                                    <tr key={rent.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <span className="font-semibold text-slate-800">{rent.shop_name}</span>
                                            {rent.notes && <span className="block text-xs text-slate-400">{rent.notes}</span>}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-600">{rent.landlord_name || '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{rent.landlord_phone || '—'}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">
                                            {formatMoney(rent.monthly_amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{rent.due_day}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{rent.start_date}</td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={rent.status} label={t(`status.${rent.status}`)} />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <Button
                                                variant="outline"
                                                className="px-3 py-1.5 text-xs"
                                                onClick={() => openEdit(rent)}
                                                icon={<Pencil size={13} />}
                                            >
                                                {t('common.edit')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('rent.schedule')} subtitle={String(summary.year)} />
                {payments.length === 0 ? (
                    <EmptyState
                        title={t('rent.schedule')}
                        action={
                            <Button onClick={openCreate} icon={<Plus size={16} />}>
                                {t('rent.new')}
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('rent.period')}</th>
                                    <th className="pb-2 font-semibold">{t('rent.shop')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('rent.amount_due')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('rent.paid')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('rent.remaining')}</th>
                                    <th className="pb-2 font-semibold">{t('rent.due_date')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 font-medium text-slate-700">{payment.period}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{payment.shop || '—'}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                                            {formatMoney(payment.amount_due, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">
                                            {formatMoney(payment.amount_paid, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                                            {formatMoney(payment.remaining, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{payment.due_date}</td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={payment.status} label={t(`status.${payment.status}`)} />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            {(payment.status === 'unpaid' || payment.status === 'partial') && (
                                                <Button
                                                    variant="success"
                                                    className="px-3 py-1.5 text-xs"
                                                    onClick={() => openPay(payment)}
                                                    icon={<Wallet size={13} />}
                                                >
                                                    {t('rent.pay')}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('rent.new')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="rent-create-form" type="submit" loading={contractForm.processing}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form id="rent-create-form" onSubmit={submitCreate} className="space-y-4">
                    <Field label={t('rent.shop')} required error={fieldError(contractForm.errors, 'shop_name')}>
                        <Input
                            value={contractForm.data.shop_name}
                            onChange={(e) => contractForm.setData('shop_name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('rent.landlord')} error={fieldError(contractForm.errors, 'landlord_name')}>
                            <Input
                                value={contractForm.data.landlord_name}
                                onChange={(e) => contractForm.setData('landlord_name', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.phone')} error={fieldError(contractForm.errors, 'landlord_phone')}>
                            <Input
                                value={contractForm.data.landlord_phone}
                                onChange={(e) => contractForm.setData('landlord_phone', e.target.value)}
                            />
                        </Field>
                        <Field
                            label={t('rent.monthly_amount')}
                            required
                            error={fieldError(contractForm.errors, 'monthly_amount')}
                        >
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={contractForm.data.monthly_amount}
                                onChange={(e) => contractForm.setData('monthly_amount', e.target.value)}
                            />
                        </Field>
                        <Field label={t('rent.due_date')} required error={fieldError(contractForm.errors, 'due_day')}>
                            <Input
                                type="number"
                                min="1"
                                max="28"
                                value={contractForm.data.due_day}
                                onChange={(e) => contractForm.setData('due_day', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.date')} required error={fieldError(contractForm.errors, 'start_date')}>
                            <Input
                                type="date"
                                value={contractForm.data.start_date}
                                onChange={(e) => contractForm.setData('start_date', e.target.value)}
                            />
                        </Field>
                    </div>
                    <Field label={t('common.notes')} error={fieldError(contractForm.errors, 'notes')}>
                        <Textarea
                            value={contractForm.data.notes}
                            onChange={(e) => contractForm.setData('notes', e.target.value)}
                        />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('rent.edit')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="rent-edit-form" type="submit" loading={contractForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="rent-edit-form" onSubmit={submitEdit} className="space-y-4">
                    <Field label={t('rent.shop')} required error={fieldError(contractForm.errors, 'shop_name')}>
                        <Input
                            value={contractForm.data.shop_name}
                            onChange={(e) => contractForm.setData('shop_name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('rent.landlord')} error={fieldError(contractForm.errors, 'landlord_name')}>
                            <Input
                                value={contractForm.data.landlord_name}
                                onChange={(e) => contractForm.setData('landlord_name', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.phone')} error={fieldError(contractForm.errors, 'landlord_phone')}>
                            <Input
                                value={contractForm.data.landlord_phone}
                                onChange={(e) => contractForm.setData('landlord_phone', e.target.value)}
                            />
                        </Field>
                        <Field
                            label={t('rent.monthly_amount')}
                            required
                            error={fieldError(contractForm.errors, 'monthly_amount')}
                        >
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={contractForm.data.monthly_amount}
                                onChange={(e) => contractForm.setData('monthly_amount', e.target.value)}
                            />
                        </Field>
                        <Field label={t('rent.due_date')} required error={fieldError(contractForm.errors, 'due_day')}>
                            <Input
                                type="number"
                                min="1"
                                max="28"
                                value={contractForm.data.due_day}
                                onChange={(e) => contractForm.setData('due_day', e.target.value)}
                            />
                        </Field>
                        <Field label={t('rent.status')} required error={fieldError(contractForm.errors, 'status')}>
                            <Select
                                value={contractForm.data.status}
                                onChange={(e) => contractForm.setData('status', e.target.value)}
                            >
                                <option value="active">{t('status.active')}</option>
                                <option value="ended">{t('status.ended')}</option>
                            </Select>
                        </Field>
                    </div>
                    <Field label={t('common.notes')} error={fieldError(contractForm.errors, 'notes')}>
                        <Textarea
                            value={contractForm.data.notes}
                            onChange={(e) => contractForm.setData('notes', e.target.value)}
                        />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={payTarget !== null}
                onClose={() => setPayTarget(null)}
                title={t('rent.pay')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPayTarget(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="rent-pay-form" type="submit" loading={payForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="rent-pay-form" onSubmit={submitPay} className="space-y-4">
                    {payTarget && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                            <span className="font-semibold text-slate-700">
                                <Home size={14} className="mr-1.5 inline align-middle text-slate-400" />
                                {payTarget.period}
                            </span>
                            <span className="font-semibold tabular-nums text-rose-600">
                                {t('rent.remaining')}: {formatMoney(payTarget.remaining, symbol)}
                            </span>
                        </div>
                    )}
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
                    <div className="grid gap-4 sm:grid-cols-2">
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
                        <Field label={t('rent.paid_at')} error={fieldError(payForm.errors, 'paid_at')}>
                            <Input
                                type="date"
                                value={payForm.data.paid_at}
                                onChange={(e) => payForm.setData('paid_at', e.target.value)}
                            />
                        </Field>
                        <Field label={t('rent.receipt')} error={fieldError(payForm.errors, 'receipt_number')}>
                            <Input
                                value={payForm.data.receipt_number}
                                onChange={(e) => payForm.setData('receipt_number', e.target.value)}
                            />
                        </Field>
                    </div>
                    <Field label={t('common.notes')} error={fieldError(payForm.errors, 'notes')}>
                        <Textarea value={payForm.data.notes} onChange={(e) => payForm.setData('notes', e.target.value)} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

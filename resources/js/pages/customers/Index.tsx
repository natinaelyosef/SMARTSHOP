import { type FormEvent, useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Plus, Wallet } from 'lucide-react';
import {
    Button,
    Card,
    Checkbox,
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
import { FilterBar, ResetButton, ResultCount, SearchField, useFilters } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface CustomerRow {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    balance: number;
    status: string;
    sales_count: number;
    total_spent: number;
}

interface CustomersIndexProps {
    customers: Paginated<CustomerRow>;
    filters: { q?: string; debtor?: string };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function CustomersIndex({ customers }: CustomersIndexProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const { params, update } = useFilters();

    const [createOpen, setCreateOpen] = useState(false);
    const [payTarget, setPayTarget] = useState<CustomerRow | null>(null);

    const createForm = useForm({ name: '', phone: '', email: '', address: '', notes: '' });
    const payForm = useForm({ amount: '', payment_method: 'cash', notes: '' });

    const debtors = customers.data.filter((c) => c.balance > 0);
    const debtorCount = debtors.length;
    const debtorSum = debtors.reduce((sum, c) => sum + c.balance, 0);

    const openCreate = () => {
        createForm.reset();
        setCreateOpen(true);
    };

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/customers', {
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const openPay = (customer: CustomerRow) => {
        payForm.reset();
        payForm.clearErrors();
        setPayTarget(customer);
    };

    const submitPay = (e: FormEvent) => {
        e.preventDefault();
        if (!payTarget) return;
        payForm.transform((d) => ({
            amount: d.amount === '' ? null : Number(d.amount),
            payment_method: d.payment_method,
            notes: d.notes || null,
        }));
        payForm.post(`/customers/${payTarget.id}/pay`, {
            onSuccess: () => {
                payForm.reset();
                setPayTarget(null);
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('customers.title')}
                actions={
                    <Button onClick={openCreate} icon={<Plus size={16} />}>
                        {t('customers.new')}
                    </Button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <Card className="animate-slide-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('customers.title')}</p>
                    <p className="mt-1.5 break-words text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{formatNumber(customers.total)}</p>
                </Card>
                <Card className="animate-slide-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('customers.debtors')}</p>
                    <p className="mt-1.5 break-words text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{formatNumber(debtorCount)}</p>
                </Card>
                <Card className="animate-slide-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('customers.balance')}</p>
                    <p className="mt-1.5 break-words text-xl font-bold tabular-nums text-rose-600 sm:text-2xl">{formatMoney(debtorSum, symbol)}</p>
                </Card>
            </div>

            <FilterBar right={<ResetButton />}>
                <SearchField />
                <Checkbox
                    label={t('filter.debtor')}
                    checked={params.debtor === '1'}
                    onChange={(e) => update({ debtor: e.target.checked ? '1' : null })}
                />
                <ResultCount total={customers.total} />
            </FilterBar>

            <Card className="animate-slide-up">
                {customers.data.length === 0 ? (
                    <EmptyState
                        title={t('common.no_results')}
                        action={
                            <Button onClick={openCreate} icon={<Plus size={16} />}>
                                {t('customers.new')}
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('common.name')}</th>
                                    <th className="pb-2 font-semibold">{t('common.phone')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('customers.sales_count')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('customers.total_spent')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('customers.balance')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.map((customer) => (
                                    <tr key={customer.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <Link
                                                href={`/customers/${customer.id}`}
                                                className="font-semibold text-brand-600 hover:underline"
                                            >
                                                {customer.name}
                                            </Link>
                                            {customer.address && (
                                                <span className="block text-xs text-slate-400">{customer.address}</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{customer.phone || '—'}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatNumber(customer.sales_count)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                                            {formatMoney(customer.total_spent, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right">
                                            <span
                                                className={
                                                    customer.balance > 0
                                                        ? 'font-semibold tabular-nums text-rose-600'
                                                        : 'tabular-nums text-slate-600'
                                                }
                                            >
                                                {formatMoney(customer.balance, symbol)}
                                            </span>
                                            {customer.balance > 0 && (
                                                <span className="ml-1.5 text-xs font-medium text-rose-500">
                                                    {t('customers.owe')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={customer.status} label={t(`status.${customer.status}`)} />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <Button
                                                variant="success"
                                                className="px-3 py-1.5 text-xs"
                                                onClick={() => openPay(customer)}
                                                icon={<Wallet size={13} />}
                                            >
                                                {t('customers.pay')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Pagination links={customers.links} />

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('customers.new')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="customer-create-form" type="submit" loading={createForm.processing}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form id="customer-create-form" onSubmit={submitCreate} className="space-y-4">
                    <Field label={t('common.name')} required error={fieldError(createForm.errors, 'name')}>
                        <Input
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <Field label={t('common.phone')} error={fieldError(createForm.errors, 'phone')}>
                        <Input value={createForm.data.phone} onChange={(e) => createForm.setData('phone', e.target.value)} />
                    </Field>
                    <Field label={t('common.email')} error={fieldError(createForm.errors, 'email')}>
                        <Input
                            type="email"
                            value={createForm.data.email}
                            onChange={(e) => createForm.setData('email', e.target.value)}
                        />
                    </Field>
                    <Field label={t('common.address')} error={fieldError(createForm.errors, 'address')}>
                        <Input
                            value={createForm.data.address}
                            onChange={(e) => createForm.setData('address', e.target.value)}
                        />
                    </Field>
                    <Field label={t('common.notes')} error={fieldError(createForm.errors, 'notes')}>
                        <Textarea value={createForm.data.notes} onChange={(e) => createForm.setData('notes', e.target.value)} />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={payTarget !== null}
                onClose={() => setPayTarget(null)}
                title={t('customers.record_payment')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPayTarget(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="customer-pay-form" type="submit" loading={payForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="customer-pay-form" onSubmit={submitPay} className="space-y-4">
                    {payTarget && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                            <span className="min-w-0 truncate font-semibold text-slate-700">{payTarget.name}</span>
                            <span className="font-semibold tabular-nums text-rose-600">
                                {t('customers.balance')}: {formatMoney(payTarget.balance, symbol)}
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

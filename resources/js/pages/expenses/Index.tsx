import { type FormEvent, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { DateField, FilterBar, ResetButton, ResultCount, SelectFilter, useFilters } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface ExpenseRow {
    id: number;
    date: string;
    category: string | null;
    amount: number;
    paid_amount: number;
    is_paid: boolean;
    payment_method: string;
    description: string | null;
    receipt_reference: string | null;
    user: string | null;
}

interface ExpensesIndexProps {
    expenses: Paginated<ExpenseRow>;
    categories: { id: number; name: string; slug: string }[];
    summary: { month_total: number; unpaid: number };
    filters: { category?: string; from?: string; to?: string; unpaid?: string };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

function toInputDate(value: string): string {
    const match = /^([A-Za-z]{3})\s+(\d{2}),\s+(\d{4})$/.exec(value);
    if (!match) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months.indexOf(match[1]) + 1;
    if (month < 1) return '';
    return `${match[3]}-${String(month).padStart(2, '0')}-${match[2]}`;
}

function today(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ExpensesIndex({ expenses, categories, summary }: ExpensesIndexProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const { params, update } = useFilters();

    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseRow | null>(null);

    const createForm = useForm({
        expense_category_id: '',
        amount: '',
        expense_date: today(),
        payment_method: 'cash',
        is_paid: false,
        paid_amount: '',
        description: '',
        receipt_reference: '',
    });
    const editForm = useForm({
        amount: '',
        expense_date: '',
        is_paid: false,
        paid_amount: '',
        description: '',
    });

    const openCreate = () => {
        createForm.reset();
        createForm.setData('expense_date', today());
        createForm.clearErrors();
        setCreateOpen(true);
    };

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.transform((d) => ({
            expense_category_id: d.expense_category_id ? Number(d.expense_category_id) : null,
            amount: d.amount === '' ? null : Number(d.amount),
            expense_date: d.expense_date,
            payment_method: d.payment_method,
            is_paid: d.is_paid,
            paid_amount: d.paid_amount === '' ? null : Number(d.paid_amount),
            description: d.description || null,
            receipt_reference: d.receipt_reference || null,
        }));
        createForm.post('/expenses', {
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const openEdit = (expense: ExpenseRow) => {
        editForm.setData({
            amount: String(expense.amount),
            expense_date: toInputDate(expense.date),
            is_paid: expense.is_paid,
            paid_amount: String(expense.paid_amount),
            description: expense.description ?? '',
        });
        editForm.clearErrors();
        setEditing(expense);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.transform((d) => ({
            amount: d.amount === '' ? null : Number(d.amount),
            expense_date: d.expense_date,
            is_paid: d.is_paid,
            paid_amount: d.paid_amount === '' ? null : Number(d.paid_amount),
            description: d.description || null,
        }));
        editForm.put(`/expenses/${editing.id}`, {
            onSuccess: () => {
                editForm.reset();
                setEditing(null);
            },
        });
    };

    const remove = (expense: ExpenseRow) => {
        if (confirm(t('expenses.delete_confirm'))) {
            router.delete(`/expenses/${expense.id}`);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('expenses.title')}
                actions={
                    <Button onClick={openCreate} icon={<Plus size={16} />}>
                        {t('expenses.new')}
                    </Button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2">
                <Card className="animate-slide-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('expenses.month_total')}</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                        {formatMoney(summary.month_total, symbol)}
                    </p>
                </Card>
                <Card className="animate-slide-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('expenses.unpaid')}</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-rose-600">{formatMoney(summary.unpaid, symbol)}</p>
                </Card>
            </div>

            <FilterBar right={<ResetButton />}>
                <SelectFilter
                    param="category"
                    label={t('expenses.category')}
                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                />
                <DateField param="from" />
                <DateField param="to" />
                <Checkbox
                    label={t('filter.unpaid_only')}
                    checked={params.unpaid === '1'}
                    onChange={(e) => update({ unpaid: e.target.checked ? '1' : null })}
                />
                <ResultCount total={expenses.total} />
            </FilterBar>

            <Card className="animate-slide-up">
                {expenses.data.length === 0 ? (
                    <EmptyState
                        title={t('expenses.empty')}
                        action={
                            <Button onClick={openCreate} icon={<Plus size={16} />}>
                                {t('expenses.new')}
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 font-semibold">{t('expenses.category')}</th>
                                    <th className="pb-2 font-semibold">{t('expenses.description')}</th>
                                    <th className="pb-2 font-semibold">{t('expenses.method')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('expenses.amount')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('expenses.paid')}</th>
                                    <th className="pb-2 font-semibold">{t('expenses.is_paid')}</th>
                                    <th className="pb-2 font-semibold">{t('common.user')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.data.map((expense) => (
                                    <tr key={expense.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 text-slate-600">{expense.date}</td>
                                        <td className="py-2.5 pr-3 text-slate-700">{expense.category || '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{expense.description || '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{t(`method.${expense.payment_method}`)}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-slate-800">
                                            {formatMoney(expense.amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(expense.paid_amount, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge
                                                status={expense.is_paid ? 'paid' : 'unpaid'}
                                                label={expense.is_paid ? t('status.paid') : t('status.unpaid')}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{expense.user || '—'}</td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    className="px-3 py-1.5 text-xs"
                                                    onClick={() => openEdit(expense)}
                                                    icon={<Pencil size={13} />}
                                                >
                                                    {t('common.edit')}
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    className="px-3 py-1.5 text-xs"
                                                    onClick={() => remove(expense)}
                                                    icon={<Trash2 size={13} />}
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Pagination links={expenses.links} />

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('expenses.new')}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="expense-create-form" type="submit" loading={createForm.processing}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form id="expense-create-form" onSubmit={submitCreate} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label={t('expenses.category')}
                            required
                            error={fieldError(createForm.errors, 'expense_category_id')}
                        >
                            <Select
                                value={createForm.data.expense_category_id}
                                onChange={(e) => createForm.setData('expense_category_id', e.target.value)}
                            >
                                <option value="">{t('common.select')}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={t('expenses.amount')} required error={fieldError(createForm.errors, 'amount')}>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={createForm.data.amount}
                                onChange={(e) => createForm.setData('amount', e.target.value)}
                            />
                        </Field>
                        <Field label={t('common.date')} required error={fieldError(createForm.errors, 'expense_date')}>
                            <Input
                                type="date"
                                value={createForm.data.expense_date}
                                onChange={(e) => createForm.setData('expense_date', e.target.value)}
                            />
                        </Field>
                        <Field
                            label={t('common.payment_method')}
                            required
                            error={fieldError(createForm.errors, 'payment_method')}
                        >
                            <Select
                                value={createForm.data.payment_method}
                                onChange={(e) => createForm.setData('payment_method', e.target.value)}
                            >
                                <option value="cash">{t('method.cash')}</option>
                                <option value="bank">{t('method.bank')}</option>
                                <option value="mobile">{t('method.mobile')}</option>
                            </Select>
                        </Field>
                        <Field label={t('expenses.paid_amount')} error={fieldError(createForm.errors, 'paid_amount')}>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={createForm.data.paid_amount}
                                onChange={(e) => createForm.setData('paid_amount', e.target.value)}
                            />
                        </Field>
                        <Field label={t('expenses.reference')} error={fieldError(createForm.errors, 'receipt_reference')}>
                            <Input
                                value={createForm.data.receipt_reference}
                                onChange={(e) => createForm.setData('receipt_reference', e.target.value)}
                            />
                        </Field>
                    </div>
                    <Field label={t('expenses.description')} error={fieldError(createForm.errors, 'description')}>
                        <Textarea
                            value={createForm.data.description}
                            onChange={(e) => createForm.setData('description', e.target.value)}
                        />
                    </Field>
                    <Checkbox
                        label={t('expenses.is_paid')}
                        checked={createForm.data.is_paid}
                        onChange={(e) => createForm.setData('is_paid', e.target.checked)}
                    />
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('expenses.edit')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="expense-edit-form" type="submit" loading={editForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="expense-edit-form" onSubmit={submitEdit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('expenses.amount')} required error={fieldError(editForm.errors, 'amount')}>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={editForm.data.amount}
                                onChange={(e) => editForm.setData('amount', e.target.value)}
                                autoFocus
                            />
                        </Field>
                        <Field label={t('common.date')} required error={fieldError(editForm.errors, 'expense_date')}>
                            <Input
                                type="date"
                                value={editForm.data.expense_date}
                                onChange={(e) => editForm.setData('expense_date', e.target.value)}
                            />
                        </Field>
                        <Field label={t('expenses.paid_amount')} error={fieldError(editForm.errors, 'paid_amount')}>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editForm.data.paid_amount}
                                onChange={(e) => editForm.setData('paid_amount', e.target.value)}
                            />
                        </Field>
                    </div>
                    <Field label={t('expenses.description')} error={fieldError(editForm.errors, 'description')}>
                        <Textarea
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                        />
                    </Field>
                    <Checkbox
                        label={t('expenses.is_paid')}
                        checked={editForm.data.is_paid}
                        onChange={(e) => editForm.setData('is_paid', e.target.checked)}
                    />
                </form>
            </Modal>
        </div>
    );
}

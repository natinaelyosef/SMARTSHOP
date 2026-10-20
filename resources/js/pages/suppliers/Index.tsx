import { type FormEvent, useState } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import {
    Button,
    Card,
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
import { FilterBar, ResetButton, ResultCount, SearchField } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface SupplierRow {
    id: number;
    name: string;
    company: string | null;
    phone: string | null;
    address: string | null;
    balance: number;
    status: string;
    purchases_count: number;
    total_purchased: number;
    last_purchase: Record<string, never>;
}

interface SuppliersIndexProps {
    suppliers: Paginated<SupplierRow>;
    filters: { q?: string };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function SuppliersIndex({ suppliers }: SuppliersIndexProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<SupplierRow | null>(null);

    const createForm = useForm({
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        tax_id: '',
        notes: '',
    });
    const editForm = useForm({
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        tax_id: '',
        notes: '',
        status: 'active',
    });

    const openCreate = () => {
        createForm.reset();
        setCreateOpen(true);
    };

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/suppliers', {
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const openEdit = (supplier: SupplierRow) => {
        editForm.setData({
            name: supplier.name,
            company: supplier.company ?? '',
            phone: supplier.phone ?? '',
            email: '',
            address: supplier.address ?? '',
            tax_id: '',
            notes: '',
            status: supplier.status,
        });
        editForm.clearErrors();
        setEditing(supplier);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.transform((d) => {
            const payload: Record<string, string | null> = {
                name: d.name,
                company: d.company || null,
                phone: d.phone || null,
                address: d.address || null,
                status: d.status,
            };
            if (d.email) payload.email = d.email;
            if (d.tax_id) payload.tax_id = d.tax_id;
            if (d.notes) payload.notes = d.notes;
            return payload;
        });
        editForm.put(`/suppliers/${editing.id}`, {
            onSuccess: () => {
                editForm.reset();
                setEditing(null);
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('suppliers.title')}
                actions={
                    <Button onClick={openCreate} icon={<Plus size={16} />}>
                        {t('suppliers.new')}
                    </Button>
                }
            />

            <FilterBar right={<ResultCount total={suppliers.total} />}>
                <SearchField />
                <ResetButton />
            </FilterBar>

            <Card className="animate-slide-up">
                {suppliers.data.length === 0 ? (
                    <EmptyState
                        title={t('common.no_results')}
                        action={
                            <Button onClick={openCreate} icon={<Plus size={16} />}>
                                {t('suppliers.new')}
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('common.name')}</th>
                                    <th className="pb-2 font-semibold">{t('suppliers.company')}</th>
                                    <th className="pb-2 font-semibold">{t('common.phone')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('suppliers.purchases')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('suppliers.total_purchased')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('suppliers.balance')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.data.map((supplier) => (
                                    <tr key={supplier.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <Link
                                                href={`/suppliers/${supplier.id}`}
                                                className="font-semibold text-brand-600 hover:underline"
                                            >
                                                {supplier.name}
                                            </Link>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{supplier.company || '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{supplier.phone || '—'}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatNumber(supplier.purchases_count)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">
                                            {formatMoney(supplier.total_purchased, symbol)}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right">
                                            <span
                                                className={
                                                    supplier.balance > 0
                                                        ? 'font-semibold tabular-nums text-rose-600'
                                                        : 'tabular-nums text-slate-600'
                                                }
                                            >
                                                {formatMoney(supplier.balance, symbol)}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={supplier.status} label={t(`status.${supplier.status}`)} />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <Button
                                                variant="outline"
                                                className="px-3 py-1.5 text-xs"
                                                onClick={() => openEdit(supplier)}
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

            <Pagination links={suppliers.links} />

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('suppliers.new')}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="supplier-create-form" type="submit" loading={createForm.processing}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form id="supplier-create-form" onSubmit={submitCreate} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.name')} required error={fieldError(createForm.errors, 'name')}>
                            <Input
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                autoFocus
                            />
                        </Field>
                        <Field label={t('suppliers.company')} error={fieldError(createForm.errors, 'company')}>
                            <Input
                                value={createForm.data.company}
                                onChange={(e) => createForm.setData('company', e.target.value)}
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
                        <Field label={t('suppliers.tax_id')} error={fieldError(createForm.errors, 'tax_id')}>
                            <Input value={createForm.data.tax_id} onChange={(e) => createForm.setData('tax_id', e.target.value)} />
                        </Field>
                    </div>
                    <Field label={t('common.notes')} error={fieldError(createForm.errors, 'notes')}>
                        <Textarea value={createForm.data.notes} onChange={(e) => createForm.setData('notes', e.target.value)} />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('suppliers.details')}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditing(null)}>
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

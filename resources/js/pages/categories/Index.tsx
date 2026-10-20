import { type FormEvent, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, StatusBadge } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    status: string;
    products_count: number;
}

interface CategoriesIndexProps {
    categories: CategoryRow[];
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function CategoriesIndex({ categories }: CategoriesIndexProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedProps>().props;
    const permissions = auth.user?.permissions;
    const canManage = Boolean(
        permissions &&
            (permissions.includes('*') || permissions.includes('products.manage') || permissions.includes('categories.manage')),
    );
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryRow | null>(null);

    const createForm = useForm({ name: '' });
    const editForm = useForm({ name: '', status: 'active' });

    const openCreate = () => {
        createForm.reset();
        setCreateOpen(true);
    };

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/categories', {
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const openEdit = (category: CategoryRow) => {
        editForm.setData('name', category.name);
        editForm.setData('status', category.status);
        editForm.clearErrors();
        setEditing(category);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.put(`/categories/${editing.id}`, {
            onSuccess: () => {
                editForm.reset();
                setEditing(null);
            },
        });
    };

    const remove = (category: CategoryRow) => {
        if (confirm(t('categories.delete_confirm', { count: category.products_count }))) {
            router.delete(`/categories/${category.id}`);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('categories.title')}
                actions={
                    canManage ? (
                        <Button onClick={openCreate} icon={<Plus size={16} />}>
                            {t('categories.new')}
                        </Button>
                    ) : undefined
                }
            />

            <Card className="animate-slide-up">
                {categories.length === 0 ? (
                    <EmptyState
                        title={t('categories.empty')}
                        action={
                            canManage ? (
                                <Button onClick={openCreate} icon={<Plus size={16} />}>
                                    {t('categories.new')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('common.name')}</th>
                                    <th className="pb-2 font-semibold">{t('categories.slug')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('categories.products')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 font-semibold text-slate-800">{category.name}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{category.slug}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                                            {formatNumber(category.products_count)}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={category.status} label={t(`status.${category.status}`)} />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            {canManage && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="px-3 py-1.5 text-xs"
                                                        onClick={() => openEdit(category)}
                                                        icon={<Pencil size={13} />}
                                                    >
                                                        {t('common.edit')}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="px-3 py-1.5 text-xs"
                                                        onClick={() => remove(category)}
                                                        icon={<Trash2 size={13} />}
                                                    >
                                                        {t('common.delete')}
                                                    </Button>
                                                </div>
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
                title={t('categories.new')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="category-create-form" type="submit" loading={createForm.processing}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form id="category-create-form" onSubmit={submitCreate}>
                    <Field label={t('common.name')} required error={fieldError(createForm.errors, 'name')}>
                        <Input
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('common.edit')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="category-edit-form" type="submit" loading={editForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="category-edit-form" onSubmit={submitEdit} className="space-y-4">
                    <Field label={t('common.name')} required error={fieldError(editForm.errors, 'name')}>
                        <Input
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
                            autoFocus
                        />
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
        </div>
    );
}

import { useState, type FormEvent } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { BarChart3, Pencil, Plus, ShieldAlert, UserRound, UsersRound } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, StatusBadge } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import type { BranchOption, DataScope } from '@/types';

interface UserRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string | null;
    role_id: number | null;
    branch: string | null;
    branch_id: number | null;
    data_scope: DataScope;
    is_owner: boolean;
    status: 'active' | 'inactive';
    must_change_password: boolean;
    last_login_at: string | null;
}

interface RoleOption {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    permissions_count: number;
}

interface ScopeOption {
    value: DataScope;
    label: string;
}

interface UsersProps {
    users: UserRow[];
    roles: RoleOption[];
    branches: BranchOption[];
    scopes: ScopeOption[];
    team_mode: 'single' | 'team';
    current_user_id: number;
    active_branch_id: number | null;
}

const EMPTY_FORM = {
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    role_id: '',
    branch_id: '',
    data_scope: 'branch' as DataScope,
    status: 'active' as 'active' | 'inactive',
};

export default function UsersIndex({ users, roles, branches, scopes, team_mode, current_user_id, active_branch_id }: UsersProps) {
    const { t, locale } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);

    const scopeLabel = (scope: DataScope) => scopes.find((s) => s.value === scope)?.label ?? scope;

    const createForm = useForm({ ...EMPTY_FORM });
    const editForm = useForm({ ...EMPTY_FORM });

    const submitCreate = () => {
        createForm.post('/users', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const submitEdit = () => {
        if (!editing) return;
        editForm.transform((data) => {
            if (data.password) return data;
            const { password, password_confirmation, ...rest } = data;
            return rest as typeof data;
        });
        editForm.put(`/users/${editing.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditing(null);
                editForm.reset();
            },
        });
    };

const openEdit = (user: UserRow) => {
        editForm.reset();
        editForm.clearErrors();
        editForm.setData({
            name: user.name,
            email: user.email,
            phone: user.phone ?? '',
            password: '',
            password_confirmation: '',
            role_id: user.role_id ? String(user.role_id) : '',
            branch_id: user.branch_id ? String(user.branch_id) : '',
            data_scope: user.data_scope,
            status: user.status,
        });
        setEditing(user);
    };

    const rolePicker = (value: string, onChange: (next: string) => void, error?: string) => (
        <Field label={t('users.role')} error={error} required>
            <div className="grid gap-2" role="radiogroup" aria-label={t('users.role')}>
                {roles.map((role) => {
                    const selected = value === String(role.id);
                    return (
                        <button
                            key={role.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(String(role.id))}
                            className={
                                'rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ' +
                                (selected
                                    ? 'border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-600/10'
                                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')
                            }
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className={
                                        'flex h-5 w-5 items-center justify-center rounded-full border-2 transition ' +
                                        (selected ? 'border-brand-600' : 'border-slate-300 dark:border-slate-600')
                                    }
                                >
                                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                                </span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{role.name}</span>
                                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {role.permissions_count}
                                </span>
                            </span>
                            {role.description && (
                                <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{role.description}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </Field>
    );

    const branchPicker = (value: string, onChange: (next: string) => void, error?: string, required?: boolean) => (
        <Field label={t('users.branch')} error={error} required={required}>
            <Select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
                <option value="">{t('users.no_branch')}</option>
                {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                        {branch.name}{branch.code ? ` (${branch.code})` : ''}
                    </option>
                ))}
            </Select>
        </Field>
    );

    /**
     * How much of the business this employee may see. Owners always see
     * everything, so the picker is disabled for them.
     */
    const scopePicker = (value: DataScope, onChange: (next: DataScope) => void, error?: string) => (
        <Field label={t('users.data_scope')} error={error}>
            <div className="grid gap-2" role="radiogroup" aria-label={t('users.data_scope')}>
                {scopes.map((scope) => {
                    const selected = value === scope.value;
                    return (
                        <button
                            key={scope.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(scope.value)}
                            className={
                                'flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ' +
                                (selected
                                    ? 'border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-600/10'
                                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')
                            }
                        >
                            <span
                                className={
                                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ' +
                                    (selected ? 'border-brand-600' : 'border-slate-300 dark:border-slate-600')
                                }
                            >
                                {selected && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                            </span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{scope.label}</span>
                        </button>
                    );
                })}
            </div>
        </Field>
    );

    const statusSelect = (
        value: UserRow['status'],
        onChange: (next: UserRow['status']) => void,
        error?: string,
        required?: boolean,
    ) => (
        <Field label={t('users.status')} error={error} required={required}>
            <Select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
                <option value="active">{t('status.active')}</option>
                <option value="inactive">{t('status.inactive')}</option>
            </Select>
        </Field>
    );

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('users.title')}
                subtitle={t('common.total_records', { count: users.length })}
actions={
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/staff"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <BarChart3 size={16} />
                            {t('staff.title')}
                        </Link>
                        <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                            {t('users.new')}
                        </Button>
                    </div>
                }
            />

            {team_mode === 'single' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4 animate-slide-up sm:flex-row sm:items-center dark:border-brand-500/30 dark:from-brand-600/10 dark:to-transparent">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                        <UserRound size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t('team.solo_t')}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('team.solo_d')}</p>
                    </div>
                    <Button onClick={() => router.post('/settings/team-mode', { team_mode: 'team' }, { preserveScroll: true })} className="shrink-0">
                        {t('team.enable')}
                    </Button>
                </div>
            )}

            <Card className="animate-slide-up">
                <CardHeader title={t('team.jobs_t')} subtitle={t('team.jobs_d')} />
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <div key={role.id} className="rounded-2xl border border-slate-200 p-3.5 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700">
                            <p className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                                <UsersRound size={15} className="text-brand-500" />
                                {role.name}
                                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {role.permissions_count}
                                </span>
                            </p>
                            {role.description && (
                                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{role.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('users.title')} />
                {users.length === 0 ? (
                    <EmptyState title={t('common.no_results')} action={<Button onClick={() => setCreateOpen(true)}>{t('users.new')}</Button>} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('common.name')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('users.role')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('users.branch')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('users.status')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('users.last_login')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
<td className="py-2.5 pr-3">
                                            <p className="flex items-center gap-2 font-semibold text-slate-800">
                                                {user.name}
                                                {user.id === current_user_id && (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                        {t('team.you')}
                                                    </span>
                                                )}
                                                {user.is_owner && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                        {t('users.owner')}
                                                    </span>
                                                )}
                                                {user.must_change_password && (
                                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                                                        {t('users.must_change')}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-400">{user.email}</p>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            {user.role ? <Badge tone="bg-brand-100 text-brand-700">{user.role}</Badge> : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <p className="text-slate-600">{user.branch ?? '—'}</p>
                                            <p className="text-[11px] text-slate-400">{scopeLabel(user.data_scope)}</p>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={user.status} label={t(`status.${user.status}`)} />
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{formatDateTime(user.last_login_at, locale)}</td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <Link
                                                    href={`/staff/${user.id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    <BarChart3 size={13} />
                                                    {t('staff.performance')}
                                                </Link>
                                                <Button variant="outline" className="px-3 py-1.5 text-xs" icon={<Pencil size={13} />} onClick={() => openEdit(user)}>
                                                    {t('common.edit')}
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

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('users.new')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={createForm.processing} onClick={submitCreate}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitCreate(); }} className="space-y-4">
                    <Field label={t('common.name')} error={createForm.errors.name} required>
                        <Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} required autoComplete="name" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('users.email')} error={createForm.errors.email} required>
                            <Input
                                type="email"
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </Field>
                        <Field label={t('common.phone')} error={createForm.errors.phone}>
                            <Input value={createForm.data.phone} onChange={(e) => createForm.setData('phone', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('users.password')} error={createForm.errors.password} required>
                            <Input
                                type="password"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </Field>
                        <Field label={t('users.confirm_password')} error={createForm.errors.password_confirmation} required>
                            <Input
                                type="password"
                                value={createForm.data.password_confirmation}
                                onChange={(e) => createForm.setData('password_confirmation', e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                        </Field>
                    </div>

                    {rolePicker(createForm.data.role_id, (next) => createForm.setData('role_id', next), createForm.errors.role_id)}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {branchPicker(
                            createForm.data.branch_id,
                            (next) => createForm.setData('branch_id', next),
                            createForm.errors.branch_id,
                            true,
                        )}
                        {scopePicker(
                            createForm.data.data_scope,
                            (next) => createForm.setData('data_scope', next),
                            createForm.errors.data_scope,
                        )}
                    </div>

                    {statusSelect(createForm.data.status, (next) => createForm.setData('status', next), createForm.errors.status, true)}

                    <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                        <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                        {t('users.temp_password_hint')}
                    </p>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('users.edit')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={editForm.processing} onClick={submitEdit}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitEdit(); }} className="space-y-4">
                    <Field label={t('common.name')} error={editForm.errors.name} required>
                        <Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} required autoComplete="name" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('users.email')} error={editForm.errors.email} required>
                            <Input
                                type="email"
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </Field>
                        <Field label={t('common.phone')} error={editForm.errors.phone}>
                            <Input value={editForm.data.phone} onChange={(e) => editForm.setData('phone', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('users.password')} error={editForm.errors.password} hint={t('users.password_optional')}>
                            <Input
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                autoComplete="new-password"
                            />
                        </Field>
                        <Field label={t('users.confirm_password')} error={editForm.errors.password_confirmation}>
                            <Input
                                type="password"
                                value={editForm.data.password_confirmation}
                                onChange={(e) => editForm.setData('password_confirmation', e.target.value)}
                                autoComplete="new-password"
                            />
                        </Field>
                    </div>

{rolePicker(editForm.data.role_id, (next) => editForm.setData('role_id', next), editForm.errors.role_id)}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {branchPicker(editForm.data.branch_id, (next) => editForm.setData('branch_id', next), editForm.errors.branch_id, true)}
                        {scopePicker(editForm.data.data_scope, (next) => editForm.setData('data_scope', next), editForm.errors.data_scope)}
                    </div>

                    {statusSelect(editForm.data.status, (next) => editForm.setData('status', next), editForm.errors.status, true)}

                    <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                        {t('users.reset_password_hint')}
                    </p>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
    );
}

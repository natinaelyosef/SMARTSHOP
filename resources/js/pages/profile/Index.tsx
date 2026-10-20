import { Head, useForm, usePage } from '@inertiajs/react';
import { KeyRound, Mail, Phone, Store, UserRound } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import type { SharedProps } from '@/types';

interface ProfileProps {
    owner: {
        name: string;
        email: string;
        phone?: string | null;
        role?: string | null;
        branch?: string | null;
        language?: string | null;
        last_login_at?: string | null;
    };
    shop: {
        name: string;
        address?: string | null;
        phone?: string | null;
        currency: string;
        currency_symbol: string;
    };
}

export default function ProfileIndex({ owner, shop }: ProfileProps) {
    const { t, locale } = useTranslation();
    const { auth } = usePage<SharedProps>().props;

    const form = useForm({
        name: owner.name ?? '',
        email: owner.email ?? '',
        phone: owner.phone ?? '',
        language: owner.language ?? locale,
    });

    const passForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const profileErrors = form.errors as unknown as Record<string, string | undefined>;
    const passErrors = passForm.errors as unknown as Record<string, string | undefined>;

    return (
        <div className="mx-auto max-w-4xl space-y-4">
            <Head title={t('profile.title')} />
            <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
                {/* Summary */}
                <Card className="h-fit animate-slide-up">
                    <div className="flex flex-col items-center py-2 text-center">
                        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-3xl font-bold text-white shadow-lg shadow-brand-600/25">
                            {(owner.name || auth.user?.name || '?').charAt(0).toUpperCase()}
                        </span>
                        <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{owner.name}</h2>
                        {owner.role && <Badge tone="bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300" className="mt-1.5">{owner.role}</Badge>}
                        <dl className="mt-4 w-full space-y-2.5 text-left text-sm">
                            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                <Mail size={15} className="shrink-0 text-slate-400" />
                                <span className="truncate">{owner.email}</span>
                            </div>
                            {owner.phone && (
                                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                    <Phone size={15} className="shrink-0 text-slate-400" />
                                    <span>{owner.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                                <Store size={15} className="shrink-0 text-slate-400" />
                                <span className="truncate">{shop.name} · {shop.currency_symbol}</span>
                            </div>
                            {owner.last_login_at && (
                                <p className="pt-1 text-xs text-slate-400">{t('profile.last_login')}: {owner.last_login_at}</p>
                            )}
                        </dl>
                    </div>
                </Card>

                <div className="space-y-4">
                    {/* Edit profile */}
                    <Card className="animate-slide-up">
                        <CardHeader title={t('profile.edit_profile')} />
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.put('/profile', { preserveScroll: true });
                            }}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            <Field label={t('auth.full_name')} error={profileErrors.name} required>
                                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                            </Field>
                            <Field label={t('auth.email')} error={profileErrors.email} required>
                                <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                            </Field>
                            <Field label={t('common.phone')} error={profileErrors.phone}>
                                <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                            </Field>
                            <Field label={t('profile.language')} error={profileErrors.language} required>
                                <Select value={form.data.language} onChange={(e) => form.setData('language', e.target.value)}>
                                    <option value="en">English</option>
                                    <option value="am">አማርኛ</option>
                                </Select>
                            </Field>
                            <div className="sm:col-span-2">
                                <Button type="submit" loading={form.processing} icon={<UserRound size={16} />}>
                                    {t('profile.save_profile')}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Change password */}
                    <Card className="animate-slide-up">
                        <CardHeader title={t('profile.change_password')} />
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                passForm.put('/profile/password', {
                                    preserveScroll: true,
                                    onSuccess: () => passForm.reset(),
                                });
                            }}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            <Field label={t('profile.current_password')} error={passErrors.current_password} required className="sm:col-span-2">
                                <Input type="password" value={passForm.data.current_password} onChange={(e) => passForm.setData('current_password', e.target.value)} required autoComplete="current-password" />
                            </Field>
                            <Field label={t('auth.new_password')} error={passErrors.password} required>
                                <Input type="password" value={passForm.data.password} onChange={(e) => passForm.setData('password', e.target.value)} required autoComplete="new-password" />
                            </Field>
                            <Field label={t('users.confirm_password')} required>
                                <Input type="password" value={passForm.data.password_confirmation} onChange={(e) => passForm.setData('password_confirmation', e.target.value)} required autoComplete="new-password" />
                            </Field>
                            <div className="sm:col-span-2">
                                <Button type="submit" loading={passForm.processing} variant="secondary" icon={<KeyRound size={16} />}>
                                    {t('profile.save_password')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}

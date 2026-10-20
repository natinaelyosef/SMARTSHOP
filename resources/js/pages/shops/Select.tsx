import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Building2, Store, Users } from 'lucide-react';
import { Badge, Button, Card, PageHeader } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface ShopOption {
    id: number;
    name: string;
    phone: string | null;
    currency_symbol: string;
    branches: number;
    users: number;
    active: boolean;
}

export default function ShopsSelect() {
    const { t } = useTranslation();
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    const { shops } = usePage<{ shops: ShopOption[] }>().props;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950">
            <div className="mx-auto max-w-3xl">
                <div className="mb-8 text-center">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
                        <Building2 size={26} />
                    </span>
                    <PageHeader
                        title={t('shops.select_title')}
                        subtitle={t('shops.select_subtitle')}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {shops.map((shop) => (
                        <Card key={shop.id} className="animate-slide-up">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
                                    <Store size={20} />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                        <span className="truncate">{shop.name}</span>
                                        {shop.active && (
                                            <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                {t('shops.current')}
                                            </Badge>
                                        )}
                                    </p>
                                    {shop.phone && <p className="truncate text-xs text-slate-400">{shop.phone}</p>}
                                </div>
                            </div>

                            <p className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Store size={12} />
                                    {t('common.total_records', { count: shop.branches })}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users size={12} />
                                    {t('common.total_records', { count: shop.users })}
                                </span>
                            </p>

                            <Link href={`/shops/${shop.id}/enter`} method="post" as="button" className="mt-4 block w-full">
                                <Button className="w-full" icon={<ArrowRight size={16} />}>
                                    {shop.active ? t('shops.continue') : t('shops.enter')}
                                </Button>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
import { useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    TrendingUp, Wallet, CalendarDays, ChartPie, AlertTriangle, PackageX, Users, Truck,
    Plus, ScanBarcode, PackagePlus, Receipt, Home, UserCircle, Banknote, ArrowRight, X, Sparkles,
} from 'lucide-react';
import { Card, CardHeader, LinkButton, StatusBadge, EmptyState, Badge, cn, PageHeader } from '@/components/ui';
import { CountUp } from '@/components/CountUp';
import { DonutChart, GroupedBarChart, HorizontalBarChart, ProfitTrendChart, TrendAreaChart } from '@/components/Charts';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface Kpis {
    today_sales: number;
    today_profit: number;
    today_profit_before_rent: number;
    month_sales: number;
    month_profit_before_rent: number;
    month_rent: number;
    month_profit_after_rent: number;
    year_sales: number;
    year_profit: number;
    stock_value: number;
    low_stock: number;
    out_of_stock: number;
    customer_credit: number;
    supplier_debt: number;
    symbol: string;
}

interface RecentSale {
    id: number;
    sale_number: string;
    total: number;
    profit: number;
    payment_method: string;
    payment_status: string;
    cashier?: string;
    customer?: string;
    time: string;
}

interface DashboardProps {
    kpis: Kpis;
    charts: {
        daily: { label: string; sales: number; profit: number }[];
        monthly: { label: string; sales: number }[];
        profitTrend: { label: string; before_rent: number; after_rent: number; expenses: number; rent: number }[];
        salesByCategory: { label: string; value: number }[];
        topProducts: { label: string; value: number }[];
        profitableProducts: { label: string; value: number }[];
        losingProducts: { label: string; value: number; cost: number; price: number }[];
        expenseBreakdown: { label: string; value: number }[];
    };
    recentSales: RecentSale[];
    alerts: { danger: number; warning: number; info: number; total: number };
}

function StatCard({
    title,
    value,
    symbol,
    icon,
    accent,
    money = true,
    decimals = 0,
    href,
}: {
    title: string;
    value: number;
    symbol?: string;
    icon: React.ReactNode;
    accent: string;
    money?: boolean;
    decimals?: number;
    href?: string;
}) {
    const { locale } = useTranslation();
    const body = (
        <div className="group flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
                <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {money && <span className="mr-1 text-base font-semibold text-slate-400">{symbol}</span>}
                    <CountUp value={value} decimals={decimals} />
                </p>
            </div>
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-11 sm:w-11', accent)}>
                {icon}
            </span>
        </div>
    );

    const className = 'card block overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5';

    return href ? (
        <Link href={href} className={className} aria-label={title}>
            {body}
        </Link>
    ) : (
        <div className={className} role="group" aria-label={title}>
            {body}
        </div>
    );
}

export default function Dashboard({ kpis, charts, recentSales, alerts }: DashboardProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const [onboardingDismissed, setOnboardingDismissed] = useState(false);
    const symbol = kpis.symbol || shop.currency_symbol;

    const quickActions = useMemo(
        () => [
            { label: t('quick.new_sale'), href: '/pos', icon: <ScanBarcode size={16} />, variant: 'primary' as const },
            { label: t('quick.add_product'), href: '/products/create', icon: <PackagePlus size={16} />, variant: 'outline' as const },
            { label: t('quick.new_purchase'), href: '/purchases/create', icon: <Truck size={16} />, variant: 'outline' as const },
            { label: t('quick.add_expense'), href: '/expenses', icon: <Receipt size={16} />, variant: 'outline' as const },
            { label: t('quick.pay_rent'), href: '/rent', icon: <Home size={16} />, variant: 'outline' as const },
            { label: t('quick.customer_payment'), href: '/customers?debtor=1', icon: <UserCircle size={16} />, variant: 'outline' as const },
            { label: t('quick.supplier_payment'), href: '/suppliers', icon: <Banknote size={16} />, variant: 'outline' as const },
        ],
        [t],
    );

    return (
        <div className="space-y-6">
            {shop.onboarding_completed === false && !onboardingDismissed && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-brand-50 to-white px-5 py-4 shadow-sm animate-slide-up sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
                            <Sparkles size={18} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{t('onboarding.title')}</p>
                            <p className="mt-0.5 text-sm text-slate-600">{t('onboarding.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <LinkButton href="/onboarding" variant="outline" className="border-amber-300 bg-white text-brand-700 hover:bg-amber-50">
                            {t('settings.onboarding')}
                        </LinkButton>
                        <button
                            type="button"
                            onClick={() => setOnboardingDismissed(true)}
                            aria-label={t('common.close')}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <PageHeader
                title={t('dash.title')}
                subtitle={t('dash.greeting')}
                actions={
                    <LinkButton href="/pos" icon={<ScanBarcode size={16} />}>
                        {t('quick.new_sale')}
                    </LinkButton>
                }
            />

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StatCard title={t('dash.today_sales')} value={kpis.today_sales} symbol={symbol} icon={<Wallet size={20} />} accent="bg-brand-50 text-brand-600" href="/reports?type=daily&period=today" />
                <StatCard title={t('dash.today_profit')} value={kpis.today_profit} symbol={symbol} icon={<TrendingUp size={20} />} accent="bg-emerald-50 text-emerald-600" href="/finance" />
                <StatCard title={t('dash.month_sales')} value={kpis.month_sales} symbol={symbol} icon={<CalendarDays size={20} />} accent="bg-sky-50 text-sky-600" href="/reports?type=monthly" />
                <StatCard title={t('dash.month_profit_before_rent')} value={kpis.month_profit_before_rent} symbol={symbol} icon={<ChartPie size={20} />} accent="bg-violet-50 text-violet-600" href="/finance" />
                <StatCard title={t('dash.month_rent')} value={kpis.month_rent} symbol={symbol} icon={<Home size={20} />} accent="bg-amber-50 text-amber-600" href="/rent" />
                <StatCard title={t('dash.month_profit_after_rent')} value={kpis.month_profit_after_rent} symbol={symbol} icon={<TrendingUp size={20} />} accent="bg-emerald-50 text-emerald-600" href="/finance" />
                <StatCard title={t('dash.year_sales')} value={kpis.year_sales} symbol={symbol} icon={<ChartPie size={20} />} accent="bg-indigo-50 text-indigo-600" href="/reports?type=yearly" />
                <StatCard title={t('dash.year_profit')} value={kpis.year_profit} symbol={symbol} icon={<Wallet size={20} />} accent="bg-teal-50 text-teal-600" href="/finance" />
                <StatCard title={t('dash.stock_value')} value={kpis.stock_value} symbol={symbol} icon={<PackagePlus size={20} />} accent="bg-slate-100 text-slate-600" href="/inventory/stock" />
                <StatCard title={t('dash.low_stock')} value={kpis.low_stock} money={false} icon={<AlertTriangle size={20} />} accent="bg-amber-50 text-amber-600" href="/inventory/stock?filter=low" />
                <StatCard title={t('dash.out_of_stock')} value={kpis.out_of_stock} money={false} icon={<PackageX size={20} />} accent="bg-rose-50 text-rose-600" href="/inventory/stock?filter=out" />
                <StatCard title={t('dash.customer_credit')} value={kpis.customer_credit} symbol={symbol} icon={<Users size={20} />} accent="bg-sky-50 text-sky-600" href="/customers?debtor=1" />
                <StatCard title={t('dash.supplier_debt')} value={kpis.supplier_debt} symbol={symbol} icon={<Truck size={20} />} accent="bg-orange-50 text-orange-600" href="/suppliers" />
            </div>

            {/* Quick actions */}
            <Card className="animate-slide-up">
                <CardHeader title={t('dash.quick_actions')} />
                <div className="flex flex-wrap gap-2">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-95',
                                action.variant === 'primary'
                                    ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700',
                            )}
                        >
                            {action.icon}
                            {action.label}
                        </Link>
                    ))}
                </div>
            </Card>

            {/* Main charts */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 animate-slide-up">
                    <CardHeader
                        title={t('dash.daily_sales')}
                        subtitle="Last 30 days"
                        action={<Link href="/reports?type=daily" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">{t('common.view')} <ArrowRight size={12} /></Link>}
                    />
                    <TrendAreaChart data={charts.daily} dataKey="sales" label={t('dash.daily_sales')} symbol={symbol} height={280} />
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.sales_by_category')} subtitle={t('common.this_month')} />
                    {charts.salesByCategory.length ? (
                        <DonutChart data={charts.salesByCategory} symbol={symbol} height={280} />
                    ) : (
                        <EmptyState title={t('common.no_results')} />
                    )}
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.monthly_sales')} subtitle="Last 12 months" />
                    <TrendAreaChart data={charts.monthly} dataKey="sales" label={t('dash.monthly_sales')} symbol={symbol} color="#0ea5e9" height={260} />
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.profit_trend')} subtitle="Last 6 months" />
                    <ProfitTrendChart data={charts.profitTrend} symbol={symbol} />
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.top_products')} subtitle={t('common.this_month')} />
                    {charts.topProducts.length ? (
                        <HorizontalBarChart data={charts.topProducts} symbol={symbol} height={260} yAxisWidth={104} />
                    ) : (
                        <EmptyState title={t('dash.no_sales')} />
                    )}
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.profitable_products')} subtitle={t('common.this_month')} />
                    {charts.profitableProducts.length ? (
                        <HorizontalBarChart data={charts.profitableProducts} color="#10b981" symbol={symbol} height={260} yAxisWidth={104} />
                    ) : (
                        <EmptyState title={t('dash.no_sales')} />
                    )}
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.expense_breakdown')} subtitle={t('common.this_month')} />
                    {charts.expenseBreakdown.length ? (
                        <DonutChart data={charts.expenseBreakdown} symbol={symbol} height={260} />
                    ) : (
                        <EmptyState title={t('common.no_results')} />
                    )}
                </Card>
            </div>

            {charts.losingProducts.length > 0 && (
                <Card className="border-rose-200 bg-rose-50/40 animate-slide-up">
                    <CardHeader
                        title={<span className="text-rose-700">{t('dash.losing_products')}</span>}
                        action={<Badge tone="bg-rose-100 text-rose-700">{charts.losingProducts.length}</Badge>}
                    />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {charts.losingProducts.map((p) => (
                            <div key={p.label} className="flex items-center justify-between rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm">
                                <span className="truncate font-medium text-slate-700">{p.label}</span>
                                <span className="ml-2 shrink-0 font-semibold text-rose-600">
                                    {formatMoney(p.price, symbol)} &lt; {formatMoney(p.cost, symbol)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 animate-slide-up">
                    <CardHeader
                        title={t('dash.recent_sales')}
                        action={<Link href="/sales" className="text-xs font-semibold text-brand-600 hover:underline">{t('common.view')}</Link>}
                    />
                    {recentSales.length === 0 ? (
                        <EmptyState title={t('dash.no_sales')} action={<LinkButton href="/pos">{t('dash.create_first_sale')}</LinkButton>} />
                    ) : (
                        <div className="overflow-x-auto -mx-1">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="pb-2 px-1 font-semibold">{t('sales.sale_number')}</th>
                                        <th className="pb-2 px-1 font-semibold">{t('common.time')}</th>
                                        <th className="pb-2 px-1 font-semibold">{t('sales.cashier')}</th>
                                        <th className="pb-2 px-1 text-right font-semibold">{t('common.total')}</th>
                                        <th className="pb-2 px-1 text-right font-semibold">{t('common.profit')}</th>
                                        <th className="pb-2 px-1 text-right font-semibold">{t('common.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSales.map((sale) => (
                                        <tr key={sale.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="px-1 py-2.5">
                                                <Link href={`/sales/${sale.id}`} className="font-semibold text-brand-600 hover:underline">
                                                    {sale.sale_number}
                                                </Link>
                                            </td>
                                            <td className="px-1 py-2.5 text-slate-500">{sale.time}</td>
                                            <td className="px-1 py-2.5 text-slate-600">{sale.cashier}</td>
                                            <td className="px-1 py-2.5 text-right font-semibold tabular-nums text-slate-800">{formatMoney(sale.total, symbol)}</td>
                                            <td className={cn('px-1 py-2.5 text-right tabular-nums', sale.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                                {formatMoney(sale.profit, symbol)}
                                            </td>
                                            <td className="px-1 py-2.5 text-right">
                                                <StatusBadge status={sale.payment_status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('dash.alerts')} />
                    <div className="space-y-2">
                        {alerts.danger > 0 && (
                            <Link href="/inventory/stock?filter=out" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm transition hover:bg-rose-100">
                                <span className="font-medium text-rose-700">{t('dash.out_of_stock')}</span>
                                <Badge tone="bg-rose-600 text-white">{alerts.danger}</Badge>
                            </Link>
                        )}
                        {alerts.warning > 0 && (
                            <Link href="/inventory/stock?filter=low" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm transition hover:bg-amber-100">
                                <span className="font-medium text-amber-700">{t('dash.low_stock')}</span>
                                <Badge tone="bg-amber-500 text-white">{alerts.warning}</Badge>
                            </Link>
                        )}
                        <Link href="/rent" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm transition hover:border-brand-300">
                            <span className="font-medium text-slate-600">{t('rent.outstanding')}</span>
                            <span className="font-semibold tabular-nums text-slate-800">{formatMoney(kpis.month_rent, symbol)}</span>
                        </Link>
                        <Link href="/customers?debtor=1" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm transition hover:border-brand-300">
                            <span className="font-medium text-slate-600">{t('dash.customer_credit')}</span>
                            <span className="font-semibold tabular-nums text-slate-800">{formatMoney(kpis.customer_credit, symbol)}</span>
                        </Link>
                        <Link href="/suppliers" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm transition hover:border-brand-300">
                            <span className="font-medium text-slate-600">{t('dash.supplier_debt')}</span>
                            <span className="font-semibold tabular-nums text-slate-800">{formatMoney(kpis.supplier_debt, symbol)}</span>
                        </Link>
                        <Link href="/insights" className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm transition hover:bg-brand-100">
                            <span className="font-medium text-brand-700">{t('nav.insights')}</span>
                            <ArrowRight size={16} className="text-brand-500" />
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}

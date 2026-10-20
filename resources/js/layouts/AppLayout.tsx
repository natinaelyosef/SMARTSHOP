import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import {
    LayoutDashboard, ShoppingCart, ScanBarcode, Package, Boxes, Truck, Users, Wallet,
    Receipt, Home, BarChart3, Sparkles, Bell, History, Settings as SettingsIcon, Search,
    LogOut, Menu, X, CircleDollarSign, FileText, ShieldCheck, ChevronDown, Languages, MenuSquare, UserRound, Tag,
    Building2, ArrowLeftRight, Clock, ClipboardCheck, Store,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button, Modal, ToastProvider, useToast, cn } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import type { BranchOption, NotificationItem, SharedProps } from '@/types';

interface NavItem {
    label: string;
    href: string;
    icon: ReactNode;
    permission?: string;
    section?: string;
}

const NAV: NavItem[] = [
    { label: 'nav.pos', href: '/pos', icon: <ScanBarcode size={18} />, permission: 'sales.create' },
    { label: 'nav.dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'nav.sales', href: '/sales', icon: <ShoppingCart size={18} />, permission: 'sales.view', section: 'sales' },
    { label: 'nav.products', href: '/products', icon: <Package size={18} />, permission: 'products.view', section: 'catalog' },
    { label: 'nav.categories', href: '/categories', icon: <Tag size={18} />, permission: 'products.view', section: 'catalog' },
    { label: 'nav.stock', href: '/inventory/stock', icon: <Boxes size={18} />, permission: 'inventory.view', section: 'catalog' },
    { label: 'nav.movements', href: '/inventory', icon: <History size={18} />, permission: 'inventory.view', section: 'catalog' },
    { label: 'nav.transfers', href: '/transfers', icon: <ArrowLeftRight size={18} />, permission: 'inventory.transfer', section: 'catalog' },
    { label: 'nav.purchases', href: '/purchases', icon: <Truck size={18} />, permission: 'purchases.view', section: 'partners' },
    { label: 'nav.suppliers', href: '/suppliers', icon: <Truck size={18} />, permission: 'suppliers.view', section: 'partners' },
    { label: 'nav.customers', href: '/customers', icon: <Users size={18} />, permission: 'customers.view', section: 'partners' },
    { label: 'nav.expenses', href: '/expenses', icon: <Receipt size={18} />, permission: 'expenses.view', section: 'finance' },
    { label: 'nav.rent', href: '/rent', icon: <Home size={18} />, permission: 'rent.view', section: 'finance' },
    { label: 'nav.finance', href: '/finance', icon: <CircleDollarSign size={18} />, permission: 'finance.view', section: 'finance' },
    { label: 'nav.tax', href: '/tax', icon: <FileText size={18} />, permission: 'tax.view', section: 'finance' },
    { label: 'nav.reports', href: '/reports', icon: <BarChart3 size={18} />, permission: 'reports.view', section: 'insights' },
    { label: 'nav.insights', href: '/insights', icon: <Sparkles size={18} />, permission: 'insights.view', section: 'insights' },
    { label: 'nav.shifts', href: '/shifts', icon: <Clock size={18} />, permission: 'shifts.view', section: 'staff' },
    { label: 'nav.approvals', href: '/approvals', icon: <ClipboardCheck size={18} />, permission: 'approvals.view', section: 'staff' },
    { label: 'nav.staff', href: '/staff', icon: <UserRound size={18} />, permission: 'staff.view', section: 'staff' },
    { label: 'nav.branches', href: '/branches', icon: <Store size={18} />, permission: 'branches.view', section: 'admin' },
    { label: 'nav.audit', href: '/audit', icon: <ShieldCheck size={18} />, permission: 'audit.view', section: 'admin' },
    { label: 'nav.users', href: '/users', icon: <Users size={18} />, permission: 'users.manage', section: 'admin' },
    { label: 'nav.roles', href: '/roles', icon: <ShieldCheck size={18} />, permission: 'roles.manage', section: 'admin' },
    { label: 'nav.settings', href: '/settings', icon: <SettingsIcon size={18} />, permission: 'settings.view', section: 'admin' },
];

const SECTIONS: { key: string; label: string }[] = [
    { key: 'sales', label: 'nav.sales' },
    { key: 'catalog', label: 'nav.products' },
    { key: 'partners', label: 'nav.customers' },
    { key: 'finance', label: 'nav.finance' },
    { key: 'insights', label: 'nav.reports' },
    { key: 'staff', label: 'nav.staff' },
    { key: 'admin', label: 'nav.users' },
];

function can(permissions: string[] | undefined, permission?: string): boolean {
    if (!permission) return true;
    if (!permissions) return false;
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
}

function SidebarContent({ open, onClose }: { open: boolean; onClose?: () => void }) {
    const { t } = useTranslation();
    const { auth, shop, branch, branches } = usePage<SharedProps>().props;
    const permissions = auth.user?.permissions;
    const url = usePage().url;
    const businessName = shop?.name ?? 'SmartShop';

    const grouped = useMemo(() => {
        const visible = NAV.filter((item) => can(permissions, item.permission));
        const main = visible.filter((item) => !item.section);
        const sections = SECTIONS.map((section) => ({
            ...section,
            items: visible.filter((item) => item.section === section.key),
        })).filter((section) => section.items.length > 0);
        return { main, sections };
    }, [permissions]);

    return (
        <div className="flex h-full flex-col bg-sidebar text-slate-300">
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
                <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={onClose}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                        <ShoppingCart size={18} />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[15px] font-bold leading-tight tracking-tight text-white">
                            {businessName}
                        </span>
                        {branch && <span className="block truncate text-[11px] leading-tight text-slate-400">{branch.name}</span>}
                    </span>
                </Link>
                {onClose && (
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Close menu">
                        <X size={18} />
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin" aria-label="Main navigation">
                {grouped.main.map((item) => (
                    <NavLink key={item.href} item={item} active={url.startsWith(item.href)} onClick={onClose} />
                ))}

                {grouped.sections.map((section) => (
                    <div key={section.key} className="mt-5">
                        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t(section.label)}</p>
                        {section.items.map((item) => (
                            <NavLink key={item.href} item={item} active={url.startsWith(item.href)} onClick={onClose} />
                        ))}
                    </div>
                ))}
            </nav>

            <div className="border-t border-white/5 p-3">
                <ShopAndBranchSwitcher shop={shop} branch={branch} branches={branches ?? []} onNavigate={onClose} />

                <Link
                    href="/notifications"
                    onClick={onClose}
                    className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/5"
                >
                    <Bell size={18} />
                    <span className="flex-1">{t('nav.notifications')}</span>
                </Link>
                <Link
                    href="/settings/backup"
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/5"
                >
                    <MenuSquare size={18} />
                    <span className="flex-1">{t('nav.backup')}</span>
                </Link>
            </div>
        </div>
    );
}

/**
 * Lets a manager move between branches, and a platform administrator
 * between businesses. Employees locked to one branch see it read-only.
 */
function ShopAndBranchSwitcher({
    shop,
    branch,
    branches,
    onNavigate,
}: {
    shop: SharedProps['shop'];
    branch: SharedProps['branch'];
    branches: BranchOption[];
    onNavigate?: () => void;
}) {
    const { auth } = usePage<SharedProps>().props;
    const isPlatformAdmin = auth.user?.is_platform_admin ?? false;
    const canSwitchBranch = (branches?.length ?? 0) > 1;

    return (
        <div className="mb-1 space-y-1">
            {isPlatformAdmin && (
                <Link
                    href="/shops/select"
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/5"
                >
                    <Building2 size={18} />
                    <span className="flex-1 truncate">Switch business</span>
                </Link>
            )}

            {branch && canSwitchBranch && (
                <div className="px-3 py-2">
                    <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <Store size={12} />
                        Branch
                    </p>
                    <BranchSelect current={branch} branches={branches} />
                </div>
            )}
        </div>
    );
}

function BranchSelect({ current, branches }: { current: NonNullable<SharedProps['branch']>; branches: BranchOption[] }) {
    const [pending, setPending] = useState(false);

    const switchTo = (branchId: number) => {
        if (branchId === current.id) return;

        setPending(true);
        router.post('/branches/switch', { branch_id: branchId }, {
            preserveScroll: false,
            onFinish: () => setPending(false),
        });
    };

    return (
        <div className="space-y-1" role="group" aria-label="Working branch">
            {branches.map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => switchTo(option.id)}
                    disabled={pending}
                    aria-current={option.id === current.id ? 'true' : undefined}
                    className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition disabled:opacity-60',
                        option.id === current.id
                            ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    )}
                >
                    <span className="flex-1 truncate">{option.name}</span>
                    {option.code && (
                        <span className={cn('text-[10px] font-semibold uppercase', option.id === current.id ? 'text-brand-100' : 'text-slate-500')}>
                            {option.code}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
    const { t } = useTranslation();
    return (
        <Link
            href={item.href}
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
            )}
        >
            <span className={cn('transition-transform', active ? 'text-white' : 'text-slate-400 group-hover:scale-110')}>{item.icon}</span>
            <span className="truncate">{t(item.label)}</span>
        </Link>
    );
}

function NotificationCenter() {
    const { t } = useTranslation();
    const { alerts, notifications } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const count = alerts?.total ?? 0;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={t('nav.notifications')}
                className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
                <Bell size={19} />
                {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white animate-scale-in">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <span className="text-sm font-semibold text-slate-800">{t('nav.notifications')}</span>
                            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-brand-600 hover:underline">
                                {t('notifications.view_all')}
                            </Link>
                        </div>
                        <div className="max-h-80 overflow-y-auto scrollbar-thin">
                            {(notifications ?? []).length === 0 && (
                                <p className="px-4 py-6 text-center text-sm text-slate-400">{t('notifications.empty')}</p>
                            )}
                            {(notifications ?? []).map((n: NotificationItem) => (
                                <Link
                                    key={n.id}
                                    href={n.link ?? '/notifications'}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'flex gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50',
                                        !n.read_at && 'bg-slate-50/60 dark:bg-slate-800/60',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                            n.level === 'danger' && 'bg-rose-500',
                                            n.level === 'warning' && 'bg-amber-500',
                                            n.level === 'info' && 'bg-sky-500',
                                            n.level === 'success' && 'bg-emerald-500',
                                        )}
                                    />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-slate-800">{n.title}</span>
                                        <span className="block truncate text-xs text-slate-500">{n.message}</span>
                                        <span className="block text-[11px] text-slate-400">{n.created_at}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function LanguageSwitcher() {
    const { locale, setLocale } = useTranslation();
    return (
        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
            <button
                type="button"
                onClick={() => setLocale('en')}
                aria-pressed={locale === 'en'}
                className={cn('rounded-lg px-2.5 py-1.5 transition', locale === 'en' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500')}
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLocale('am')}
                aria-pressed={locale === 'am'}
                className={cn('rounded-lg px-2.5 py-1.5 transition', locale === 'am' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500')}
            >
                አማ
            </button>
        </div>
    );
}

function FlashToasts() {
    const { flash } = usePage<SharedProps>().props;
    const { push } = useToast();

    useEffect(() => {
        if (flash?.success) push(flash.success, 'success');
        if (flash?.error) push(flash.error, 'error');
    }, [flash?.success, flash?.error, push]);

    return null;
}

const MOBILE_NAV = [
    { href: '/pos', icon: <ScanBarcode size={20} />, key: 'nav.pos' },
    { href: '/dashboard', icon: <LayoutDashboard size={20} />, key: 'nav.dashboard' },
    { href: '/sales', icon: <ShoppingCart size={20} />, key: 'nav.sales' },
    { href: '/inventory/stock', icon: <Boxes size={20} />, key: 'nav.stock' },
    { href: '/reports', icon: <BarChart3 size={20} />, key: 'nav.reports' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
    const { t, locale, setLocale } = useTranslation();
    const { auth, shop, sidebarOpen } = usePage<SharedProps>().props;
    const url = usePage().url;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        setMobileOpen(false);
        setSearchOpen(false);
    }, [url]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (!searchOpen) return;
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) router.get('/search', { q: query }, { preserveState: true, preserveScroll: true });
        }, 350);
        return () => clearTimeout(timer);
    }, [query, searchOpen]);

    const userMenu = (
        <div className="relative group">
            <button type="button" className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                    {auth.user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </span>
                <span className="hidden text-left sm:block">
                    <span className="block max-w-[120px] truncate text-sm font-semibold text-slate-700">{auth.user?.name}</span>
                    <span className="block text-[11px] text-slate-400">{auth.user?.role}</span>
                </span>
                <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 w-52 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <UserRound size={15} /> {t('nav.profile')}
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <SettingsIcon size={15} /> {t('nav.settings')}
                    </Link>
                    <Link href="/settings/backup" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        <MenuSquare size={15} /> {t('nav.backup')}
                    </Link>
                    <button
                        type="button"
                        onClick={() => setLogoutOpen(true)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                        <LogOut size={15} /> {t('nav.logout')}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <ToastProvider>
            <FlashToasts />
            <div className="min-h-screen">
                {/* Desktop sidebar */}
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block print:hidden">
                    <SidebarContent open={false} />
                </aside>

                {/* Mobile drawer */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden print:hidden">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                        <aside className="absolute inset-y-0 left-0 w-[280px] animate-slide-in-right">
                            <SidebarContent open onClose={() => setMobileOpen(false)} />
                        </aside>
                    </div>
                )}

                <div className="lg:pl-64">
                    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 print:hidden dark:border-slate-800 dark:bg-slate-950/90">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open menu"
                            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <Menu size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="hidden max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white md:flex dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <Search size={16} />
                            <span className="flex-1 text-left">{t('search.placeholder')}</span>
                            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Ctrl K</kbd>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label={t('common.search')}
                            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            <Search size={19} />
                        </button>

                        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                            <LanguageSwitcher />
                            <ThemeToggle />
                            <NotificationCenter />
                            <div className="hidden sm:block">{userMenu}</div>
                            <div className="sm:hidden">{userMenu}</div>
                        </div>
                    </header>

                    <main className="px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
                        <div className="mx-auto max-w-[1400px] animate-fade-in">{children}</div>
                    </main>
                </div>

                {/* Mobile bottom navigation */}
                <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden print:hidden dark:border-slate-800 dark:bg-slate-950/95" aria-label="Mobile navigation">
                    <div className="mx-auto flex max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
                        {MOBILE_NAV.map((item) => {
                            const active = url.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition',
                                        active ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600',
                                    )}
                                >
                                    <span className={cn('transition-transform', active && '-translate-y-0.5')}>{item.icon}</span>
                                    {t(item.key)}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Search overlay */}
                {searchOpen && (
                    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
                        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (query.trim()) {
                                        router.get('/search', { q: query });
                                        setSearchOpen(false);
                                    }
                                }}
                                className="flex items-center gap-3 border-b border-slate-100 px-4"
                            >
                                <Search size={18} className="text-slate-400" />
                                <input
                                    autoFocus
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t('search.placeholder')}
                                    className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-slate-400"
                                />
                                <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Esc</kbd>
                            </form>
                            <div className="px-4 py-3 text-xs text-slate-400">
                                {t('search.start')} <span className="mx-1">·</span> {shop.name}
                            </div>
                        </div>
                    </div>
                )}

                {/* Logout confirmation */}
                <Modal
                    open={logoutOpen}
                    onClose={() => setLogoutOpen(false)}
                    title={t('nav.logout')}
                    size="sm"
                    footer={
                        <>
                            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button variant="danger" onClick={() => router.post('/logout')}>
                                {t('common.confirm')}
                            </Button>
                        </>
                    }
                >
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('nav.logout_confirm')}</p>
                </Modal>
            </div>
        </ToastProvider>
    );
}

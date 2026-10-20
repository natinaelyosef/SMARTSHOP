export type PermissionBag = string[];

export type DataScope = 'own' | 'branch' | 'all';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    role?: string | null;
    role_slug?: string | null;
    branch?: string | null;
    branch_id?: number | null;
    language?: string;
    is_owner: boolean;
    is_platform_admin: boolean;
    data_scope: DataScope;
    must_change_password: boolean;
    permissions: PermissionBag;
}

export interface ShopInfo {
    id: number;
    name: string;
    logo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    currency: string;
    currency_symbol: string;
    language: string;
    costing_method: string;
    low_stock_threshold: number;
    default_payment_method: string;
    allow_negative_stock: boolean;
    onboarding_completed: boolean;
    team_mode: 'single' | 'team';
}

/** The branch currently being worked at. */
export interface BranchInfo {
    id: number;
    name: string;
    code?: string | null;
    opening_float?: number;
    is_primary?: boolean;
}

export interface BranchOption {
    id: number;
    name: string;
    code?: string | null;
    is_primary?: boolean;
}

export interface AlertCounts {
    danger: number;
    warning: number;
    info: number;
    total: number;
}

export interface NotificationItem {
    id: number;
    type: string;
    level: 'danger' | 'warning' | 'info' | 'success';
    title: string;
    message?: string | null;
    link?: string | null;
    read_at?: string | null;
    created_at: string;
}

export interface SharedProps {
    auth: { user: AuthUser | null };
    /**
     * The business being worked in. Every page in the app is behind the
     * `shop.selected` middleware, so this is always present in practice;
     * the one exception is the platform admin's business picker, which
     * renders without the app layout and does not read it.
     */
    shop: ShopInfo;
    branch?: BranchInfo | null;
    branches?: BranchOption[];
    locale: string;
    flash: { success?: string | null; error?: string | null };
    alerts?: AlertCounts;
    notifications?: NotificationItem[];
    sidebarOpen?: boolean;
    [key: string]: unknown;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface ProfitSummary {
    from: string;
    to: string;
    sales_count: number;
    gross_sales: number;
    returns_total: number;
    net_sales: number;
    discounts: number;
    cogs: number;
    gross_profit: number;
    other_expenses: number;
    profit_before_rent: number;
    rent: number;
    rent_paid: number;
    rent_outstanding: number;
    profit_after_rent: number;
    tax_rate: number;
    estimated_tax: number;
    net_profit: number;
    purchases: number;
}

export interface CashFlow {
    cash_from_sales: number;
    supplier_payments: number;
    expense_payments: number;
    rent_payments: number;
    tax_payments: number;
    total_inflow: number;
    total_outflow: number;
    net_cash_movement: number;
}

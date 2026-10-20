<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InsightsController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\RegisterController;
use App\Http\Controllers\RentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\StaffReportController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TaxController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('pos');
    }

    return Inertia::render('Home');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::get('/register', [RegisterController::class, 'show'])->name('register');
    Route::post('/register', [RegisterController::class, 'store'])->middleware('throttle:10,1');

    Route::get('/forgot-password', [AuthController::class, 'showForgot'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'sendLink'])->middleware('throttle:5,1')->name('password.email');
    Route::get('/reset-password/{token}', [AuthController::class, 'showReset'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'reset'])->middleware('throttle:5,1')->name('password.update');
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

Route::middleware(['auth', 'active.user'])->group(function () {
    // Forced password change for freshly invited employees.
    Route::put('/settings/password', [ProfileController::class, 'forcePassword'])
        ->name('password.force');

    // Platform administration: pick which business to work in.
    Route::get('/shops/select', [ShopController::class, 'select'])->name('shops.select');
    Route::post('/shops/{shop}/enter', [ShopController::class, 'enter'])->name('shops.enter');
    Route::post('/shops/clear', [ShopController::class, 'clear'])->name('shops.clear');
});

Route::middleware(['auth', 'active.user', 'shop.selected', 'branch.selected'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/search', [SearchController::class, 'index'])->name('search');

    Route::get('/onboarding', [OnboardingController::class, 'index'])->name('onboarding.index');

    // Branches — a business may trade from several locations at once
    Route::get('/branches', [BranchController::class, 'index'])
        ->middleware('permission:branches.view')->name('branches.index');
    Route::post('/branches', [BranchController::class, 'store'])
        ->middleware('permission:branches.manage')->name('branches.store');
    Route::put('/branches/{branch}', [BranchController::class, 'update'])
        ->middleware('permission:branches.manage')->name('branches.update');
    Route::post('/branches/switch', [BranchController::class, 'switch'])->name('branches.switch');
    Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])
        ->middleware('permission:branches.manage')->name('branches.destroy');

    // Cash-drawer shifts
    Route::get('/shifts', [ShiftController::class, 'index'])
        ->middleware('permission:shifts.view')->name('shifts.index');
    Route::post('/shifts', [ShiftController::class, 'store'])
        ->middleware('permission:shifts.manage')->name('shifts.store');
    Route::post('/shifts/{shift}/close', [ShiftController::class, 'close'])
        ->middleware('permission:shifts.manage')->name('shifts.close');
    Route::get('/shifts/{shift}/report', [ShiftController::class, 'report'])
        ->middleware('permission:shifts.view')->name('shifts.report');

    // Four-eyes approvals
    Route::get('/approvals', [ApprovalController::class, 'index'])
        ->middleware('permission:approvals.view,approvals.review')->name('approvals.index');
    Route::post('/approvals', [ApprovalController::class, 'store'])
        ->middleware('permission:price.manage,inventory.manage,approvals.review')->name('approvals.store');
    Route::post('/approvals/{approval}/review', [ApprovalController::class, 'review'])
        ->middleware('permission:approvals.review')->name('approvals.review');

    // Stock transfers between branches
    Route::get('/transfers', [StockTransferController::class, 'index'])
        ->middleware('permission:inventory.view')->name('transfers.index');
    Route::get('/transfers/source', [StockTransferController::class, 'sourceStock'])
        ->middleware('permission:inventory.view')->name('transfers.source');
    Route::post('/transfers', [StockTransferController::class, 'store'])
        ->middleware('permission:inventory.transfer')->name('transfers.store');
    Route::delete('/transfers/{transfer}', [StockTransferController::class, 'destroy'])
        ->middleware('permission:inventory.transfer')->name('transfers.destroy');

    // Employee performance
    Route::get('/staff', [StaffReportController::class, 'index'])
        ->middleware('permission:staff.view')->name('staff.index');
    Route::get('/staff/{user}', [StaffReportController::class, 'show'])
        ->middleware('permission:staff.view')->name('staff.show');

    // Products & catalog
    Route::get('/products', [ProductController::class, 'index'])
        ->middleware('permission:products.view')->name('products.index');
    Route::get('/products/create', [ProductController::class, 'create'])
        ->middleware('permission:products.manage')->name('products.create');
    Route::post('/products', [ProductController::class, 'store'])
        ->middleware('permission:products.manage')->name('products.store');
    Route::get('/products/{product}', [ProductController::class, 'show'])
        ->middleware('permission:products.view')->name('products.show');
    Route::put('/products/{product}', [ProductController::class, 'update'])
        ->middleware('permission:products.manage')->name('products.update');
    Route::delete('/products/{product}/archive', [ProductController::class, 'archive'])
        ->middleware('permission:products.manage')->name('products.archive');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])
        ->middleware('permission:products.manage')->name('products.destroy');
    Route::post('/variants/{variant}/price', [ProductController::class, 'updatePrice'])
        ->middleware('permission:products.manage,price.manage')->name('variants.price');

    Route::get('/categories', [CategoryController::class, 'index'])
        ->middleware('permission:products.view')->name('categories.index');
    Route::post('/categories', [CategoryController::class, 'store'])
        ->middleware('permission:products.manage,categories.manage')->name('categories.store');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])
        ->middleware('permission:products.manage,categories.manage')->name('categories.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
        ->middleware('permission:products.manage,categories.manage')->name('categories.destroy');

    Route::get('/units', [UnitController::class, 'index'])
        ->middleware('permission:products.view')->name('units.index');
    Route::post('/units', [UnitController::class, 'store'])
        ->middleware('permission:settings.manage,units.manage')->name('units.store');
    Route::put('/units/{unit}', [UnitController::class, 'update'])
        ->middleware('permission:settings.manage,units.manage')->name('units.update');

    // Inventory
    Route::get('/inventory', [InventoryController::class, 'index'])
        ->middleware('permission:inventory.view')->name('inventory.index');
    Route::get('/inventory/stock', [InventoryController::class, 'stock'])
        ->middleware('permission:inventory.view')->name('inventory.stock');
    Route::post('/inventory/adjust', [InventoryController::class, 'adjust'])
        ->middleware('permission:inventory.manage')->name('inventory.adjust');
    Route::get('/inventory/variants/{variant}', [InventoryController::class, 'variant'])
        ->middleware('permission:inventory.view,products.view')->name('inventory.variant');

    // Suppliers & purchases
    Route::get('/suppliers', [SupplierController::class, 'index'])
        ->middleware('permission:suppliers.view')->name('suppliers.index');
    Route::post('/suppliers', [SupplierController::class, 'store'])
        ->middleware('permission:suppliers.manage')->name('suppliers.store');
    Route::get('/suppliers/{supplier}', [SupplierController::class, 'show'])
        ->middleware('permission:suppliers.view')->name('suppliers.show');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])
        ->middleware('permission:suppliers.manage')->name('suppliers.update');

    Route::get('/purchases', [PurchaseController::class, 'index'])
        ->middleware('permission:purchases.view')->name('purchases.index');
    Route::get('/purchases/create', [PurchaseController::class, 'create'])
        ->middleware('permission:purchases.manage')->name('purchases.create');
    Route::post('/purchases', [PurchaseController::class, 'store'])
        ->middleware('permission:purchases.manage')->name('purchases.store');
    Route::get('/purchases/{purchase}', [PurchaseController::class, 'show'])
        ->middleware('permission:purchases.view')->name('purchases.show');
    Route::post('/purchases/{purchase}/pay', [PurchaseController::class, 'pay'])
        ->middleware('permission:purchases.manage,finance.manage')->name('purchases.pay');

    // Customers & sales
    Route::get('/customers', [CustomerController::class, 'index'])
        ->middleware('permission:customers.view')->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])
        ->middleware('permission:customers.manage,sales.create')->name('customers.store');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])
        ->middleware('permission:customers.view')->name('customers.show');
    Route::put('/customers/{customer}', [CustomerController::class, 'update'])
        ->middleware('permission:customers.manage')->name('customers.update');
    Route::post('/customers/{customer}/pay', [CustomerController::class, 'pay'])
        ->middleware('permission:customers.manage,sales.manage,finance.manage')->name('customers.pay');

    Route::get('/pos', [SalesController::class, 'pos'])
        ->middleware('permission:sales.create')->name('pos');
    Route::post('/sales', [SalesController::class, 'store'])
        ->middleware('permission:sales.create')->name('sales.store');
    Route::get('/sales', [SalesController::class, 'index'])
        ->middleware('permission:sales.view')->name('sales.index');
    Route::get('/sales/{sale}', [SalesController::class, 'show'])
        ->middleware('permission:sales.view')->name('sales.show');
    Route::post('/sales/{sale}/pay', [SalesController::class, 'pay'])
        ->middleware('permission:sales.manage,finance.manage')->name('sales.pay');
    Route::get('/sales/{sale}/return', [SalesController::class, 'returnForm'])
        ->middleware('permission:sales.manage')->name('sales.return');
    Route::post('/sales/{sale}/return', [SalesController::class, 'returnItems'])
        ->middleware('permission:sales.manage')->name('sales.return.store');

    // Expenses
    Route::get('/expenses', [ExpenseController::class, 'index'])
        ->middleware('permission:expenses.view')->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])
        ->middleware('permission:expenses.manage')->name('expenses.store');
    Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])
        ->middleware('permission:expenses.manage')->name('expenses.update');
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])
        ->middleware('permission:expenses.manage')->name('expenses.destroy');

    // Rent
    Route::get('/rent', [RentController::class, 'index'])
        ->middleware('permission:rent.view')->name('rent.index');
    Route::post('/rent', [RentController::class, 'store'])
        ->middleware('permission:rent.manage')->name('rent.store');
    Route::put('/rent/{rent}', [RentController::class, 'update'])
        ->middleware('permission:rent.manage')->name('rent.update');
    Route::post('/rent/payments/{payment}', [RentController::class, 'pay'])
        ->middleware('permission:rent.manage')->name('rent.pay');

    // Finance, reports, tax
    Route::get('/finance', [FinanceController::class, 'index'])
        ->middleware('permission:finance.view,reports.view')->name('finance.index');
    Route::get('/reports', [ReportController::class, 'index'])
        ->middleware('permission:reports.view')->name('reports.index');
    Route::get('/reports/export', [ReportController::class, 'export'])
        ->middleware('permission:reports.view,reports.export')->name('reports.export');
    Route::get('/tax', [TaxController::class, 'index'])
        ->middleware('permission:tax.view')->name('tax.index');
    Route::post('/tax/rules', [TaxController::class, 'storeRule'])
        ->middleware('permission:tax.manage')->name('tax.rules.store');
    Route::post('/tax/periods', [TaxController::class, 'storePeriod'])
        ->middleware('permission:tax.manage')->name('tax.periods.store');
    Route::post('/tax/periods/{period}/pay', [TaxController::class, 'pay'])
        ->middleware('permission:tax.manage')->name('tax.pay');

    // Intelligence
    Route::get('/insights', [InsightsController::class, 'index'])
        ->middleware('permission:insights.view')->name('insights.index');
    Route::post('/insights/ask', [InsightsController::class, 'ask'])
        ->middleware('permission:insights.view')->name('insights.ask');

    // Notifications & audit
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->middleware('permission:notifications.view')->name('notifications.index');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->middleware('permission:notifications.view')->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])
        ->middleware('permission:notifications.view')->name('notifications.read-all');
    Route::get('/audit', [AuditLogController::class, 'index'])
        ->middleware('permission:audit.view')->name('audit.index');

    // Users, roles, settings, backup
    Route::get('/users', [UserController::class, 'index'])
        ->middleware('permission:users.manage')->name('users.index');
    Route::post('/users', [UserController::class, 'store'])
        ->middleware('permission:users.manage')->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])
        ->middleware('permission:users.manage')->name('users.update');
    Route::get('/roles', [RoleController::class, 'index'])
        ->middleware('permission:roles.manage')->name('roles.index');
    Route::put('/roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission:roles.manage')->name('roles.update');

    Route::get('/settings', [SettingController::class, 'index'])
        ->middleware('permission:settings.view,settings.manage')->name('settings.index');
    Route::put('/settings', [SettingController::class, 'update'])
        ->middleware('permission:settings.manage')->name('settings.update');
    Route::post('/settings/team-mode', [SettingController::class, 'teamMode'])
        ->middleware('permission:settings.manage')->name('settings.team-mode');
    Route::post('/settings/language', [SettingController::class, 'language'])->name('settings.language');
    Route::post('/settings/onboarding/complete', [SettingController::class, 'completeOnboarding'])->name('settings.onboarding.complete');
    Route::post('/settings/expense-categories', [SettingController::class, 'storeExpenseCategory'])
        ->middleware('permission:settings.manage,expenses.manage')->name('settings.expense-categories.store');
    Route::post('/settings/units', [SettingController::class, 'storeUnit'])
        ->middleware('permission:settings.manage,units.manage')->name('settings.units.store');
    Route::post('/settings/option', [SettingController::class, 'setOption'])
        ->middleware('permission:settings.manage')->name('settings.option');

    Route::get('/settings/backup', [BackupController::class, 'index'])
        ->middleware('permission:backup.manage')->name('backup.index');
    Route::post('/settings/backup', [BackupController::class, 'create'])
        ->middleware('permission:backup.manage')->name('backup.create');
    Route::get('/settings/backup/{file}/download', [BackupController::class, 'download'])
        ->middleware('permission:backup.manage')->name('backup.download');
    Route::delete('/settings/backup/{file}', [BackupController::class, 'destroy'])
        ->middleware('permission:backup.manage')->name('backup.destroy');
});

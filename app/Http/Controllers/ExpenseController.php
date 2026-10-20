<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Expense::with(['category:id,name,slug', 'user:id,name']);

        if ($request->filled('category')) {
            $query->where('expense_category_id', $request->integer('category'));
        }

        if ($request->filled('from')) {
            $query->whereDate('expense_date', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('expense_date', '<=', $request->string('to'));
        }

        if ($request->boolean('unpaid')) {
            $query->where('is_paid', false);
        }

        $expenses = $query->latest('expense_date')->latest('id')->paginate(15)->withQueryString();

        $total = (float) Expense::whereDate('expense_date', '>=', now()->startOfMonth())->sum('amount');
        $unpaid = (float) Expense::where('is_paid', false)->sum(DB::raw('amount - paid_amount'));

        return Inertia::render('expenses/Index', [
            'expenses' => $expenses->through(fn ($e) => [
                'id' => $e->id,
                'date' => $e->expense_date->format('M d, Y'),
                'category' => $e->category?->name,
                'amount' => $e->amount,
                'paid_amount' => $e->paid_amount,
                'is_paid' => $e->is_paid,
                'payment_method' => $e->payment_method,
                'description' => $e->description,
                'receipt_reference' => $e->receipt_reference,
                'user' => $e->user?->name,
            ]),
            'categories' => ExpenseCategory::where('status', 'active')->orderBy('name')->get(['id', 'name', 'slug']),
            'summary' => [
                'month_total' => $total,
                'unpaid' => $unpaid,
            ],
            'filters' => $request->only(['category', 'from', 'to', 'unpaid']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'expense_category_id' => ['required', 'exists:expense_categories,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'payment_method' => ['required', 'in:cash,bank,mobile'],
            'is_paid' => ['required', 'boolean'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:255'],
            'receipt_reference' => ['nullable', 'string', 'max:100'],
        ]);

        $paid = $data['is_paid']
            ? (float) ($data['paid_amount'] ?? $data['amount'])
            : (float) ($data['paid_amount'] ?? 0);

        $expense = Expense::create([
            ...$data,
            'paid_amount' => min($paid, (float) $data['amount']),
            'user_id' => $request->user()->id,
        ]);

        AuditLogger::log('expense.created', Expense::class, $expense->id, 'Expense of '.$expense->amount.' recorded', null, $data);

        return back()->with('success', 'Expense recorded.');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'is_paid' => ['required', 'boolean'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $previous = $expense->only(array_keys($data));
        $expense->fill([
            ...$data,
            'paid_amount' => min((float) ($data['paid_amount'] ?? $expense->paid_amount), (float) $data['amount']),
        ])->save();

        AuditLogger::log('expense.updated', Expense::class, $expense->id, 'Expense updated', $previous, $data);

        return back()->with('success', 'Expense updated.');
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        AuditLogger::log('expense.deleted', Expense::class, $expense->id, 'Expense of '.$expense->amount.' deleted', $expense->toArray(), null);
        $expense->delete();

        return back()->with('success', 'Expense deleted.');
    }
}

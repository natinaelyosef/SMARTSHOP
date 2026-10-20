<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AuditLog::with('user:id,name,email');

        if ($search = $request->string('q')->toString()) {
            $query->where(fn ($q) => $q->where('action', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('user')) {
            $query->where('user_id', $request->integer('user'));
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->string('to'));
        }

        return Inertia::render('audit/Index', [
            'logs' => $query->latest()->paginate(20)->withQueryString(),
            'actions' => AuditLog::select('action')->distinct()->orderBy('action')->pluck('action'),
            'filters' => $request->only(['q', 'action', 'user', 'from', 'to']),
        ]);
    }
}

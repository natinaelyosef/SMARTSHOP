<?php

namespace App\Http\Controllers;

use App\Models\ApprovalRequest;
use App\Models\Branch;
use App\Services\ApprovalService;
use App\Services\BranchContext;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function __construct(
        private ApprovalService $approvals,
        private NotificationService $notifications,
    ) {}

    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString() ?: ApprovalRequest::STATUS_PENDING;

        $branchId = BranchContext::idFor($request->user(), $request->filled('branch_id') ? $request->integer('branch_id') : null);

        $requests = ApprovalRequest::with(['requester:id,name', 'reviewer:id,name', 'branch:id,name'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (ApprovalRequest $r) => [
                'id' => $r->id,
                'type' => $r->type,
                'status' => $r->status,
                'requester' => $r->requester?->name,
                'reviewer' => $r->reviewer?->name,
                'branch' => $r->branch?->name,
                'reason' => $r->reason,
                'review_note' => $r->review_note,
                'payload' => $r->payload,
                'requested_at' => $r->created_at?->diffForHumans(),
                'reviewed_at' => $r->reviewed_at?->diffForHumans(),
            ]);

        return Inertia::render('approvals/Index', [
            'requests' => $requests,
            'status' => $status,
            'pending_count' => $this->approvals->pendingCount($branchId),
            'can_review' => $request->user()->hasPermission('approvals.review'),
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name'])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in([
                ApprovalRequest::TYPE_PRICE_CHANGE,
                ApprovalRequest::TYPE_STOCK_ADJUSTMENT,
                ApprovalRequest::TYPE_DISCOUNT,
                ApprovalRequest::TYPE_SALE,
            ])],
            'branch_id' => ['nullable', 'integer'],
            'reason' => ['required', 'string', 'max:500'],
            'payload' => ['required', 'array'],
        ]);

        $this->approvals->request(
            $request->user(),
            $data['type'],
            $data['payload'],
            $data['reason'],
            $data['branch_id'] ?? BranchContext::id()
        );

        return back()->with('success', 'Sent for approval.');
    }

    public function review(Request $request, ApprovalRequest $approval): RedirectResponse
    {
        abort_unless($request->user()->hasPermission('approvals.review'), 403);

        $data = $request->validate([
            'approve' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $this->approvals->review(
            $approval,
            $request->user(),
            (bool) $data['approve'],
            $data['note'] ?? null
        );

        $this->notifications->notifyApprovalDecision($approval->refresh());

        return back()->with('success', $data['approve'] ? 'Approved and applied.' : 'Request rejected.');
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $service) {}

    public function index(Request $request): Response
    {
        $this->service->refresh();

        $notifications = Notification::orderByDesc('created_at')->paginate(20);

        return Inertia::render('notifications/Index', [
            'notifications' => $notifications->through(fn ($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'level' => $n->level,
                'title' => $n->title,
                'message' => $n->message,
                'link' => $n->data['link'] ?? null,
                'read_at' => $n->read_at?->format('M d, Y H:i'),
                'created_at' => $n->created_at->format('M d, Y H:i'),
            ]),
            'counts' => $this->service->counts(),
        ]);
    }

    public function markRead(Request $request, Notification $notification): RedirectResponse
    {
        $notification->update(['read_at' => now()]);

        return back()->with('success', 'Notification marked as read.');
    }

    public function markAllRead(): RedirectResponse
    {
        Notification::whereNull('read_at')->update(['read_at' => now()]);

        return back()->with('success', 'All notifications marked as read.');
    }
}

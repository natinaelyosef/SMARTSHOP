<?php

namespace App\Http\Controllers;

use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    private string $directory;

    public function __construct()
    {
        $this->directory = storage_path('app/backups');
    }

    public function index(): Response
    {
        $backups = $this->files();

        return Inertia::render('settings/Backup', [
            'backups' => $backups,
            'lastBackup' => $backups[0]['name'] ?? null,
        ]);
    }

    public function create(): RedirectResponse
    {
        if (! is_dir($this->directory)) {
            mkdir($this->directory, 0755, true);
        }

        $filename = 'backup-'.now()->format('Ymd-His').'.sql';
        $path = $this->directory.DIRECTORY_SEPARATOR.$filename;

        $db = config('database.connections.mysql');

        $args = sprintf(
            '--host=%s --port=%s --user=%s --single-transaction --no-tablespaces --routines --triggers --result-file="%s" %s',
            $db['host'],
            $db['port'],
            $db['username'],
            $path,
            escapeshellarg($db['database'])
        );

        if ($db['password'] !== '') {
            $args = '--password='.escapeshellarg($db['password']).' '.$args;
        }

        $command = sprintf('"%s" %s 2>&1', $this->mysqldumpPath(), $args);
        $output = [];
        $exitCode = 0;
        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || ! file_exists($path) || filesize($path) === 0) {
            @unlink($path);

            return back()->with('error', 'Backup failed: '.substr(implode(' ', $output), 0, 300));
        }

        AuditLogger::log('backup.created', null, null, 'Database backup created: '.$filename);

        return back()->with('success', 'Backup created successfully: '.$filename);
    }

    public function download(string $file): BinaryFileResponse
    {
        $path = $this->directory.DIRECTORY_SEPARATOR.basename($file);

        abort_unless(str_ends_with($path, '.sql') && file_exists($path), 404);

        return response()->download($path, basename($path));
    }

    public function destroy(string $file): RedirectResponse
    {
        $path = $this->directory.DIRECTORY_SEPARATOR.basename($file);

        if (str_ends_with($path, '.sql') && file_exists($path)) {
            unlink($path);
            AuditLogger::log('backup.deleted', null, null, 'Backup deleted: '.basename($file));

            return back()->with('success', 'Backup deleted.');
        }

        return back()->with('error', 'Backup not found.');
    }

    private function files(): array
    {
        if (! is_dir($this->directory)) {
            return [];
        }

        $files = glob($this->directory.DIRECTORY_SEPARATOR.'backup-*.sql') ?: [];
        rsort($files);

        return array_map(fn ($f) => [
            'name' => basename($f),
            'size' => round(filesize($f) / 1024, 1).' KB',
            'created_at' => date('M d, Y — h:i A', filemtime($f)),
        ], $files);
    }

    private function mysqldumpPath(): string
    {
        $candidates = [
            base_path('mysql-dump/mysql.exe'),
            'C:/xampp/mysql/bin/mysqldump.exe',
            'mysqldump',
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === 'mysqldump' || file_exists($candidate)) {
                return $candidate;
            }
        }

        return 'mysqldump';
    }
}

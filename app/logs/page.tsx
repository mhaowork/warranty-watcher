import { LogViewer } from '@/components/LogViewer';

export default function LogsPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">
            Real-time application logs including warranty lookups, database operations, and API calls.
          </p>
        </div>
        <LogViewer />
      </div>
    </div>
  );
}
type DashboardShellProps = {
  preferredName: string;
};

export function DashboardShell({ preferredName }: DashboardShellProps) {
  return (
    <main>
      <header>
        <p>Playground</p>
        <h1>{preferredName}, your dashboard is ready</h1>
      </header>
      <p>Connect your provider to continue</p>
      <p>Bot access stays locked until provider validation succeeds.</p>
    </main>
  );
}

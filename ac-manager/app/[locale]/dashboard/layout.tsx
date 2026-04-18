import { Sidebar } from "@/components/layout/sidebar";
import { ServerStatusBar } from "@/components/layout/server-status-bar";
import { AuthProvider } from "@/lib/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex bg-background text-foreground">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0">
          <ServerStatusBar />

          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}

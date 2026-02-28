export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-background noise-overlay">
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

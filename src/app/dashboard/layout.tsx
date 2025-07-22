import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - PileTrackerPro",
  description: "Manage your piles and organize your life with PileTrackerPro",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 min-h-screen w-full">
      {children}
    </div>
  );
} 
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - PileTrackerPro",
  description: "Login or register for PileTrackerPro - Track your piles, organize your life",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-slate-100">
      {children}
    </div>
  );
} 
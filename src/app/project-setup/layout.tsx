import { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Project Setup - PileTrackerPro',
  description: 'Set up your project tracking details',
};

export default function ProjectSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
        {children}
      </div>
    </AuthProvider>
  );
} 
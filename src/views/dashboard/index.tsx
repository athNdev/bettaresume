'use client';

import { Suspense } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useHashRouter } from '@/lib/hash-router';
import dynamic from 'next/dynamic';
import { SplashScreen } from '@/components/splash-screen';

const DashboardFeature = dynamic(() => import('./components/dashboard-main').then(m => ({ default: m.DashboardMain })), { 
  loading: () => <SplashScreen message="Loading dashboard..." />
});
const TasksFeature = dynamic(() => import('@/views/tasks').then(m => ({ default: m.Tasks })), { 
  loading: () => <SplashScreen message="Loading tasks..." />
});
const AppsFeature = dynamic(() => import('@/views/apps').then(m => ({ default: m.Apps })), { 
  loading: () => <SplashScreen message="Loading apps..." />
});
const UsersFeature = dynamic(() => import('@/views/users').then(m => ({ default: m.Users })), { 
  loading: () => <SplashScreen message="Loading users..." />
});
const SettingsFeature = dynamic(() => import('@/views/settings').then(m => ({ default: m.Settings })), { 
  loading: () => <SplashScreen message="Loading settings..." />
});
const ChatsFeature = dynamic(() => import('@/views/chats').then(m => ({ default: m.Chats })), { 
  loading: () => <SplashScreen message="Loading chats..." />
});

export function Dashboard() {
  const { path } = useHashRouter();

  const renderFeature = () => {
    if (path === '/tasks') return <TasksFeature />;
    if (path === '/apps') return <AppsFeature />;
    if (path === '/chats') return <ChatsFeature />;
    if (path === '/users') return <UsersFeature />;
    if (path.startsWith('/settings')) return <SettingsFeature />;
    return <DashboardFeature />;
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <Suspense fallback={<DashboardLoading />}>
          {renderFeature()}
        </Suspense>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

export default Dashboard;

function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Keep the topNav constant if needed by other components, although it's better defined in the specific view
export const topNav = [
  {
    title: 'Overview',
    href: '/dashboard',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Customers',
    href: '/dashboard/customers',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Products',
    href: '/dashboard/products',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Settings',
    href: '/settings',
    isActive: false,
    disabled: true,
  },
]


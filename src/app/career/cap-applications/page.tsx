'use client';

import { Suspense } from 'react';
import SidebarLayout from '../../sidebar-layout';
import { CareerApplicationsPanel } from '@/components/career/CareerApplicationsPanel';

export default function CapApplicationsPage() {
  return (
    <SidebarLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        }
      >
        <CareerApplicationsPanel scope="cap" />
      </Suspense>
    </SidebarLayout>
  );
}

import { Outlet } from 'react-router-dom';
import { SidebarLayout } from '@/components/layout/SidebarLayout';

export default function AccountLayout() {
  return (
    <SidebarLayout>
      <div className="container py-8">
        <Outlet />
      </div>
    </SidebarLayout>
  );
}

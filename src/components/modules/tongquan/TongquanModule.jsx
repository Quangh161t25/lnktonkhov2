import React from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { HomeAnalyticsChart } from '../home/HomeAnalyticsChart';
import { BarChart3, ArrowLeft } from 'lucide-react';

export function TongquanModule({ onNavigate }) {
  const { nhapData, xuatData, productData, fetchModule } = useData();
  const { usersData } = useAuth();

  // Load fresh reporting data when Tongquan is opened
  React.useEffect(() => {
    fetchModule('nhap');
    fetchModule('xuat');
    fetchModule('sanpham');
  }, [fetchModule]);

  return (
    <div className="space-y-4">
      {/* Analytics & Reporting Suite */}
      <HomeAnalyticsChart
        xuatData={xuatData}
        nhapData={nhapData}
        productData={productData}
        usersData={usersData}
        onNavigate={onNavigate}
      />
    </div>
  );
}

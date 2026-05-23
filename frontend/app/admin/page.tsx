"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, DollarSign, Package, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const routes = data?.routes || [];
  return (
    <AppShell
      title="Phân tích vận hành"
      subtitle="Quản trị người dùng, đơn hàng, tuyến vận chuyển và báo cáo vận hành."
    >
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Người dùng"
            value="63"
            caption="Chủ hàng, chủ xe, quản trị"
            icon={Users}
          />
          <MetricCard
            title="Đơn hàng"
            value="30"
            caption="Dữ liệu vận hành"
            icon={Package}
          />
          <MetricCard
            title="Doanh thu"
            value={`${Math.round(data.revenue / 1e6)}M`}
            caption="VND GMV"
            icon={DollarSign}
          />
          <MetricCard
            title="Báo cáo"
            value="7"
            caption="Cần xử lý"
            icon={BarChart3}
          />
        </div>
      )}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất tuyến</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routes}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="from" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="utilization"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quản lý báo cáo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Cảnh báo nhiệt độ trên xe 51C-78001",
              "Xe chậm 20 phút tuyến Cần Thơ",
              "Đơn SHP-1025 đang thương lượng quá 2 giờ",
            ].map((item) => (
              <div key={item} className="rounded-md border p-3 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

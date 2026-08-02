import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Package, RotateCcw, Truck, AlertTriangle, Link2, Copy, Check } from "lucide-react";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ReportDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        // Total Sales (All time)
        const { data: allSales } = await supabase
          .from("orders")
          .select("total")
          .eq("status", "completed");

        const totalSales = allSales?.reduce((s, o) => s + (o.total || 0), 0) || 0;
        const totalSalesCount = allSales?.length || 0;

        // Fetch orders for today and this month specifically for breakdown
        const { data: monthSales } = await supabase
          .from("orders")
          .select("total, created_at")
          .eq("status", "completed")
          .gte("created_at", startOfMonth);

        const monthlySales = monthSales?.reduce((s, o) => s + (o.total || 0), 0) || 0;
        const monthlyCount = monthSales?.length || 0;
        
        const todaySalesData = monthSales?.filter(o => o.created_at >= startOfToday) || [];
        const todaySales = todaySalesData.reduce((s, o) => s + (o.total || 0), 0) || 0;
        const todayCount = todaySalesData.length || 0;

        // Returns
        const { count: returnsCount } = await supabase
          .from("product_returns")
          .select("*", { count: "exact", head: true });

        // Pending deliveries
        const { count: pendingDeliveries } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["processing", "ready", "out_for_delivery"]);

        // Stock levels
        const { data: lowStock } = await supabase
          .from("products")
          .select("id")
          .lt("stock_quantity", 5);

        setData({
          totalSales,
          totalSalesCount,
          monthlySales,
          monthlyCount,
          todaySales,
          todayCount,
          returnsCount: returnsCount || 0,
          pendingDeliveries: pendingDeliveries || 0,
          lowStock: lowStock?.length || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  const stats = [
    { title: "Өнөөдрийн борлуулалт", value: formatPrice(data.todaySales), count: data.todayCount, icon: TrendingUp, color: "text-green-600" },
    { title: "Энэ сарын борлуулалт", value: formatPrice(data.monthlySales), count: data.monthlyCount, icon: TrendingUp, color: "text-blue-600" },
    { title: "Нийт борлуулалт (₮)", value: formatPrice(data.totalSales), count: data.totalSalesCount, icon: TrendingUp },
    { title: "Буцаалт", value: data.returnsCount, icon: RotateCcw },
    { title: "Хүргэгдээгүй", value: data.pendingDeliveries, icon: Truck },
    { title: "Барааны нөөц бага", value: data.lowStock, icon: AlertTriangle, color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
            <s.icon className={`h-4 w-4 ${s.color || "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
            {s.count !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                {s.count} захиалга
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReportDashboard;

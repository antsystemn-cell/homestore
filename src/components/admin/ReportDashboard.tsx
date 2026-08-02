import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Package, RotateCcw, Truck, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/data/products";

const ReportDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Sales total and count
        const { data: sales } = await supabase
          .from("orders")
          .select("total, status")
          .eq("status", "completed");

        const totalSales = sales?.reduce((s, o) => s + (o.total || 0), 0) || 0;
        const salesCount = sales?.length || 0;

        // Returns
        const { count: returnsCount } = await supabase
          .from("product_returns")
          .select("*", { count: "exact", head: true });

        // Pending deliveries (not delivered)
        const { count: pendingDeliveries } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["processing", "ready", "out_for_delivery"]);

        // Stock levels (Low stock < 5)
        const { data: lowStock } = await supabase
          .from("products")
          .select("id")
          .lt("stock_quantity", 5);

        setData({
          totalSales,
          salesCount,
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
    { title: "Борлуулалт (₮)", value: formatPrice(data.totalSales), icon: TrendingUp },
    { title: "Захиалгын тоо", value: data.salesCount, icon: Package },
    { title: "Буцаалт", value: data.returnsCount, icon: RotateCcw },
    { title: "Хүргэгдээгүй", value: data.pendingDeliveries, icon: Truck },
    { title: "Барааны нөөц бага", value: data.lowStock, icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReportDashboard;

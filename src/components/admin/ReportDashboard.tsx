import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Package, RotateCcw, Truck, AlertTriangle, Link2, Copy, Check, Lock, History } from "lucide-react";
import { formatPrice } from "@/data/products";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ReportDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [lastSettlements, setLastSettlements] = useState<any[]>([]);

  const reportUrl = `${window.location.origin}/admin/report`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    toast.success("URL хууллаа");
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // History (get latest to determine the start of current period)
      const { data: history } = await supabase
        .from("daily_settlements" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const latestSettlement = history && history.length > 0 ? history[0] : null;
      const periodStart = latestSettlement ? latestSettlement.created_at : new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Total Sales (All time completed)
      const { data: allSales } = await supabase
        .from("orders")
        .select("total")
        .eq("status", "completed");

      const totalSales = allSales?.reduce((s, o) => s + (o.total || 0), 0) || 0;
      const totalSalesCount = allSales?.length || 0;

      // Month Sales
      const { data: monthSales } = await supabase
        .from("orders")
        .select("total, created_at")
        .eq("status", "completed")
        .gte("created_at", startOfMonth);

      const monthlySales = monthSales?.reduce((s, o) => s + (o.total || 0), 0) || 0;
      const monthlyCount = monthSales?.length || 0;
      
      // Current Period Sales (since last settlement)
      const { data: periodSalesData } = await supabase
        .from("orders")
        .select("total, created_at")
        .eq("status", "completed")
        .gt("created_at", periodStart);

      const todaySales = periodSalesData?.reduce((s, o) => s + (o.total || 0), 0) || 0;
      const todayCount = periodSalesData?.length || 0;

      // Check if already settled today (calendar date check for the button state)
      const todayStr = now.toISOString().split('T')[0];
      const isSettledToday = latestSettlement && latestSettlement.settlement_date === todayStr;

      // Returns & Pending & Stock
      const [
        { count: returnsCount },
        { count: pendingDeliveries },
        { data: lowStock }
      ] = await Promise.all([
        supabase.from("product_returns").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["processing", "ready", "out_for_delivery"]),
        supabase.from("products").select("id").lt("stock_quantity", 5)
      ]);

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
        isSettled: !!isSettledToday,
        todayStr
      });
      setLastSettlements(history || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettlement = async () => {
    if (data.isSettled) return;
    setIsSettling(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("daily_settlements" as any)
        .insert({
          settlement_date: data.todayStr,
          total_sales: data.todaySales,
          order_count: data.todayCount,
          closed_by: userData.user?.id
        } as any);

      if (error) throw error;
      toast.success("Өнөөдрийн борлуулалтыг амжилттай хаалаа");
      fetchData();
    } catch (e: any) {
      toast.error("Алдаа гарлаа: " + e.message);
    } finally {
      setIsSettling(false);
    }
  };

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Тайлан & Статистик</h2>
          <p className="text-muted-foreground text-sm">Борлуулалт болон хүргэлтийн нэгдсэн мэдээлэл</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-md">
            Өнөөдрийн хаасан гүйлгээ, маргаашийн хаасан гүйлгээ хүртэл бүх борлуулалтыг тооцож нэг өдрийн борлуулалтанд тооцно
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                Түүх
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Хаасан борлуулалтын түүх</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {lastSettlements.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Түүх одоогоор байхгүй байна.</p>
                ) : (
                  lastSettlements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div className="text-sm font-medium">{s.settlement_date}</div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatPrice(s.total_sales)}</div>
                        <div className="text-[10px] text-muted-foreground">{s.order_count} захиалга</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant={data.isSettled ? "secondary" : "default"}
            disabled={data.isSettled || isSettling}
            onClick={handleSettlement}
            className="gap-2"
            size="sm"
          >
            <Lock className="h-4 w-4" />
            {data.isSettled ? "Өнөөдөр хаагдсан" : "Борлуулалт хаах"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div className="space-y-1">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Тайлангийн шууд холбоос
          </h3>
          <p className="text-xs text-muted-foreground">
            Энэ холбоосоор шууд тайлангийн хэсэг рүү нэвтрэх боломжтой
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-background border px-3 py-2 rounded-lg flex-1 sm:flex-none truncate max-w-[240px]">
            {reportUrl}
          </code>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

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
    </div>
  );
};

export default ReportDashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, ChevronRight, Package, Clock, CheckCircle2, Truck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/data/products";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Уншиж байна...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending": return { label: "Хүлээгдэж буй", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "confirmed": return { label: "Баталгаажсан", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" };
      case "preparing": return { label: "Бэлтгэгдэж буй", icon: Package, color: "text-indigo-500", bg: "bg-indigo-500/10" };
      case "delivering": return { label: "Хүргэлтэнд гарсан", icon: Truck, color: "text-purple-500", bg: "bg-purple-500/10" };
      case "completed": return { label: "Хүргэгдсэн", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" };
      case "cancelled": return { label: "Цуцлагдсан", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" };
      default: return { label: status, icon: Clock, color: "text-muted-foreground", bg: "bg-secondary" };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border md:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Захиалгын түүх</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Захиалгын түүх</h1>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold mb-2">Танд одоогоор захиалга алга</h2>
            <p className="text-sm text-muted-foreground mb-6">Та манай дэлгүүрээс хүссэн бараагаа сонгон захиалга өгөөрэй.</p>
            <button 
              onClick={() => navigate("/")}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Дэлгүүр хэсэх
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = getStatusInfo(order.status);
              const items = Array.isArray(order.items) ? order.items : [];
              const firstItem = items[0];
              
              return (
                <div 
                  key={order.id}
                  onClick={() => navigate(`/checkout?orderId=${order.id}`)}
                  className="group bg-card border border-border rounded-3xl p-5 hover:border-primary/30 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Захиалгын №: {order.order_ref || order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("mn-MN")} {new Date(order.created_at).toLocaleTimeString("mn-MN", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.color}`}>
                      <status.icon className="h-3 w-3" />
                      {status.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-2 border-y border-border/50 my-2">
                    <div className="h-16 w-16 bg-secondary rounded-2xl overflow-hidden flex-shrink-0 border border-border/50">
                      {firstItem?.image ? (
                        <img src={firstItem.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-full w-full p-4 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {firstItem?.name || "Барааны нэр тодорхойгүй"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {items.length > 1 ? `болон өөр ${items.length - 1} бараа` : `1 ширхэг`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-foreground">
                        {formatPrice(order.total || 0)}
                      </p>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/track/${order.id}`);
                        }}
                        className="flex items-center justify-end gap-1 text-[10px] text-primary font-bold mt-1 group-hover:translate-x-1 transition-transform cursor-pointer"
                      >
                        Захиалга хянах <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default OrderHistoryPage;

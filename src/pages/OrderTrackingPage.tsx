import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import Header from "@/components/store/Header";
import BottomNav from "@/components/store/BottomNav";

const OrderTrackingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setOrder(data);
      setLoading(false);
    };
    fetchOrder();

    // Real-time subscription
    const channel = supabase
      .channel('order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Уншиж байна...</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center">Захиалга олдсонгүй</div>;

  const steps = [
    { key: "pending", label: "Захиалга хүлээн авсан", icon: Clock },
    { key: "confirmed", label: "Баталгаажсан", icon: CheckCircle2 },
    { key: "preparing", label: "Бэлтгэгдэж буй", icon: Package },
    { key: "delivering", label: "Хүргэлтэнд гарсан", icon: Truck },
    { key: "completed", label: "Хүргэгдсэн", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-secondary pb-20 md:pb-0">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Буцах
        </button>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold mb-1">Захиалга №{order.order_ref || order.id.slice(0,8)}</h1>
              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right text-primary font-bold">{formatPrice(order.total)}</div>
          </div>

          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
            {steps.map((step, idx) => {
              const isPast = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex gap-4 relative">
                  <div className={`z-10 h-10 w-10 rounded-full flex items-center justify-center border-4 border-card ${isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="pt-2">
                    <p className={`text-sm font-bold ${isPast ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                    {isCurrent && <p className="text-[10px] text-primary font-medium">Одоогийн статус</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Хүргэлтийн мэдээлэл
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Утас:</span>
              <span className="font-medium">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Хаяг:</span>
              <span className="font-medium text-right ml-4">{order.shipping_address}</span>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default OrderTrackingPage;

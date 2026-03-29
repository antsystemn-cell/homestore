import { useNavigate } from "react-router-dom";

const paymentProviders = [
  { name: "Golomt Bank", color: "bg-blue-500", icon: "🏦" },
  { name: "Pocket", color: "bg-red-500", icon: "💳" },
  { name: "Store Pay", color: "bg-teal-500", icon: "🛒" },
  { name: "DigiPay", color: "bg-green-500", icon: "💰" },
  { name: "HiPay", color: "bg-purple-500", icon: "📱" },
  { name: "MonPay", color: "bg-cyan-500", icon: "🔄" },
];

const PromoBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(265,80%,45%)] via-[hsl(270,75%,40%)] to-[hsl(280,70%,30%)] p-6 md:p-10 min-h-[220px] md:min-h-[280px]">
          {/* Decorative swirl lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-96 h-40 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-purple-300/10 blur-2xl" />
          </div>

          <div className="relative z-10 flex flex-col justify-center h-full">
            <h2 className="text-white text-2xl md:text-4xl font-extrabold leading-tight">
              1КГ тутамд -1$
            </h2>
            <p className="text-white/80 text-sm md:text-base mt-1.5">
              Тээврийн зардал хямдарлаа!
            </p>
            <button
              onClick={() => navigate("/shop")}
              className="mt-4 w-fit px-5 py-2 rounded-full bg-white text-foreground text-sm font-semibold hover:bg-white/90 transition-colors shadow-md"
            >
              Бүтээгдхүүн үзэх
            </button>
          </div>
        </div>

        {/* Payment Providers */}
        <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {paymentProviders.map((p) => (
            <div
              key={p.name}
              className="flex flex-col items-center gap-1.5 bg-secondary rounded-xl p-3 md:p-4 transition-all duration-200 hover:bg-primary/10 hover:shadow-md hover:scale-[1.03] cursor-pointer"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${p.color} flex items-center justify-center text-white text-base md:text-lg flex-shrink-0`}>
                {p.icon}
              </div>
              <span className="text-[11px] md:text-xs font-medium text-foreground text-center leading-tight">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;

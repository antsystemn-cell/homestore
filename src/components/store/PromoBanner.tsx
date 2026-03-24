import promoBanner from "@/assets/promo-banner.webp";

const PromoBanner = () => {
  return (
    <div className="relative mx-4 mt-3 rounded-xl overflow-hidden">
      <img
        src={promoBanner}
        alt="Урамшуулал"
        className="w-full h-36 object-cover"
        loading="lazy"
        decoding="async"
        width={1200}
        height={144}
      />
      <div className="absolute inset-0 flex items-center justify-end pr-6">
        <div className="text-right">
          <p className="text-primary-foreground text-xs font-medium opacity-90">Шинэ хэрэглэгчдэд</p>
          <p className="text-primary-foreground text-xl font-bold">Хямдрал</p>
          <p className="text-primary-foreground text-xs mt-1 opacity-80">30% хүртэл хөнгөлөлт</p>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;

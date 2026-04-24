import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

// Maintenance mode — set to true to block public access
const MAINTENANCE_MODE = false;

// Eagerly load Index (critical landing page)
import Index from "./pages/Index";
import MaintenancePage from "./components/MaintenancePage";

// Retry wrapper for lazy imports (handles stale chunk hashes after redeploy)
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
): Promise<T> {
  return factory().catch((err) => {
    // Reload once to get fresh asset manifest
    const key = "chunk-retry";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
    throw err;
  });
}

// Lazy-load all secondary routes
const ShopPage = lazy(() => lazyRetry(() => import("./pages/ShopPage")));
const SalesPage = lazy(() => lazyRetry(() => import("./pages/SalesPage")));
const CartPage = lazy(() => lazyRetry(() => import("./pages/CartPage")));
const CheckoutPage = lazy(() => lazyRetry(() => import("./pages/CheckoutPage")));
const ProductPage = lazy(() => lazyRetry(() => import("./pages/ProductPage")));
const ProfilePage = lazy(() => lazyRetry(() => import("./pages/ProfilePage")));
const WishlistPage = lazy(() => lazyRetry(() => import("./pages/WishlistPage")));
const AuthPage = lazy(() => lazyRetry(() => import("./pages/AuthPage")));
const ResetPasswordPage = lazy(() => lazyRetry(() => import("./pages/ResetPasswordPage")));
const AdminPage = lazy(() => lazyRetry(() => import("./pages/AdminPage")));
const NotFound = lazy(() => lazyRetry(() => import("./pages/NotFound")));
const CollectionPage = lazy(() => lazyRetry(() => import("./pages/CollectionPage")));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 10 * 60 * 1000, // 10 min
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="h-14 md:h-16 border-b border-border bg-card animate-pulse" />
    {/* Content skeleton grid */}
    <div className="max-w-6xl mx-auto md:px-8 md:py-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 md:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-2 md:p-0">
            <div className="bg-card rounded-xl md:rounded-2xl border border-border overflow-hidden">
              <div className="w-full aspect-square bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {MAINTENANCE_MODE ? (
                  <>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="*" element={<MaintenancePage />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<Index />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/:brandName" element={<ShopPage />} />
                    <Route path="/sales" element={<SalesPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/product/:slug" element={<ProductPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<NotFound />} />
                  </>
                )}
              </Routes>
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

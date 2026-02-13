import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TouristLayout from "./pages/tourist/TouristLayout";
import TastingPage from "./pages/tourist/TastingPage";
import RestaurantPage from "./pages/tourist/RestaurantPage";
import ShopPage from "./pages/tourist/ShopPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminWinesPage from "./pages/admin/AdminWinesPage";
import AdminPackagesPage from "./pages/admin/AdminPackagesPage";
import AdminMenuPage from "./pages/admin/AdminMenuPage";
import AdminLeadsPage from "./pages/admin/AdminLeadsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Tourist routes */}
          <Route path="/app/:slug" element={<TouristLayout />}>
            <Route index element={<TastingPage />} />
            <Route path="restaurant" element={<RestaurantPage />} />
            <Route path="shop" element={<ShopPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/:slug" element={<AdminLayout />}>
            <Route index element={<AdminWinesPage />} />
            <Route path="packages" element={<AdminPackagesPage />} />
            <Route path="menu" element={<AdminMenuPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

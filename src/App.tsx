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
import JourneyPage from "./pages/tourist/JourneyPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminWinesPage from "./pages/admin/AdminWinesPage";
import AdminPackagesPage from "./pages/admin/AdminPackagesPage";
import AdminMenuPage from "./pages/admin/AdminMenuPage";
import AdminLeadsPage from "./pages/admin/AdminLeadsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminTrainingPage from "./pages/admin/AdminTrainingPage";
import AdminLocationsPage from "./pages/admin/AdminLocationsPage";
import MasterLayout from "./pages/master/MasterLayout";
import MasterDashboardPage from "./pages/master/MasterDashboardPage";
import MasterWineriesPage from "./pages/master/MasterWineriesPage";
import MasterAdminsPage from "./pages/master/MasterAdminsPage";
import MasterReportsPage from "./pages/master/MasterReportsPage";
import MasterImportPage from "./pages/master/MasterImportPage";
import PrivacyPage from "./pages/PrivacyPage";

const queryClient = new QueryClient();

const App = () => {
  if (typeof window !== "undefined") {
    document.documentElement.classList.remove("dark");
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* SSO Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Tourist routes */}
          <Route path="/app/:slug" element={<TouristLayout />}>
            <Route index element={<TastingPage />} />
            <Route path="restaurant" element={<RestaurantPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="journey" element={<JourneyPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/:slug" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="wines" element={<AdminWinesPage />} />
            <Route path="packages" element={<AdminPackagesPage />} />
            <Route path="menu" element={<AdminMenuPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="staff" element={<AdminStaffPage />} />
            <Route path="locations" element={<AdminLocationsPage />} />
            <Route path="training" element={<AdminTrainingPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Privacy */}
          <Route path="/privacidade" element={<PrivacyPage />} />

          {/* Master Admin routes */}
          <Route path="/master" element={<MasterLayout />}>
            <Route index element={<MasterDashboardPage />} />
            <Route path="wineries" element={<MasterWineriesPage />} />
            <Route path="admins" element={<MasterAdminsPage />} />
            <Route path="reports" element={<MasterReportsPage />} />
            <Route path="import" element={<MasterImportPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

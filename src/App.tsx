import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
const WineryListPage = lazy(() => import("./pages/WineryListPage"));

// Lazy-loaded tourist routes
const TouristLayout = lazy(() => import("./pages/tourist/TouristLayout"));
const TastingPage = lazy(() => import("./pages/tourist/TastingPage"));
const RestaurantPage = lazy(() => import("./pages/tourist/RestaurantPage"));
const ShopPage = lazy(() => import("./pages/tourist/ShopPage"));
const JourneyPage = lazy(() => import("./pages/tourist/JourneyPage"));

// Lazy-loaded misc routes
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));

// Lazy-loaded admin routes
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminWinesPage = lazy(() => import("./pages/admin/AdminWinesPage"));
const AdminPackagesPage = lazy(() => import("./pages/admin/AdminPackagesPage"));
const AdminMenuPage = lazy(() => import("./pages/admin/AdminMenuPage"));
const AdminLeadsPage = lazy(() => import("./pages/admin/AdminLeadsPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminStaffPage = lazy(() => import("./pages/admin/AdminStaffPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminTrainingPage = lazy(() => import("./pages/admin/AdminTrainingPage"));
const AdminLocationsPage = lazy(() => import("./pages/admin/AdminLocationsPage"));
const AdminStaffPerformancePage = lazy(() => import("./pages/admin/AdminStaffPerformancePage"));
const AdminCampaignsPage = lazy(() => import("./pages/admin/AdminCampaignsPage"));

// Lazy-loaded master routes
const MasterLayout = lazy(() => import("./pages/master/MasterLayout"));
const MasterDashboardPage = lazy(() => import("./pages/master/MasterDashboardPage"));
const MasterWineriesPage = lazy(() => import("./pages/master/MasterWineriesPage"));
const MasterPlansPage = lazy(() => import("./pages/master/MasterPlansPage"));
const MasterAdminsPage = lazy(() => import("./pages/master/MasterAdminsPage"));
const MasterReportsPage = lazy(() => import("./pages/master/MasterReportsPage"));
const MasterImportPage = lazy(() => import("./pages/master/MasterImportPage"));
const MasterWineryContentPage = lazy(() => import("./pages/master/MasterWineryContentPage"));
const MasterLeadsPage = lazy(() => import("./pages/master/MasterLeadsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — avoid refetching on every mount
      gcTime: 10 * 60 * 1000,   // 10 min garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

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
        <ErrorBoundary fallbackTitle="Erro no aplicativo">
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/wineries" element={<WineryListPage />} />

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
                <Route path="performance" element={<AdminStaffPerformancePage />} />
                <Route path="training" element={<AdminTrainingPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="campaigns" element={<AdminCampaignsPage />} />
              </Route>

              {/* Privacy */}
              <Route path="/privacidade" element={<PrivacyPage />} />

              {/* Master Admin routes */}
              <Route path="/master" element={<MasterLayout />}>
                <Route index element={<MasterDashboardPage />} />
                <Route path="wineries" element={<MasterWineriesPage />} />
                <Route path="wineries/:wineryId" element={<MasterWineryContentPage />} />
                <Route path="plans" element={<MasterPlansPage />} />
                <Route path="admins" element={<MasterAdminsPage />} />
                <Route path="reports" element={<MasterReportsPage />} />
                <Route path="import" element={<MasterImportPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

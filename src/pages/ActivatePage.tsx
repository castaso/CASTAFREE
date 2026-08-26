import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { BrandMark } from "@/components/BrandMark";
import { LoaderScreen } from "@/components/LoaderScreen";
import {
  activationParamsFromSearch,
  saveActivationPrefill,
} from "@/lib/activationPrefill";

export function ActivatePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const prefill = activationParamsFromSearch(location.search);
    if (prefill) {
      saveActivationPrefill(prefill);
      // Strip the key from the address bar/history so it doesn't leak
      // through shared or bookmarked URLs.
      navigate("/activate", { replace: true });
    }
  }, [location.search, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-4 font-body text-ink">
        <div className="flex flex-col items-center gap-4">
          <BrandMark className="h-12 w-12" />
          <LoaderScreen label="Ngecek sesi aktivasi..." />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Logged in — the dashboard activation form picks up the saved prefill.
    return <Navigate to="/dashboard" replace />;
  }

  // Not logged in yet — sign in first, then come back here to get forwarded.
  return <Navigate to="/auth?returnTo=/activate" replace />;
}

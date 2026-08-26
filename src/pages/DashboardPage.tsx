import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  Coins,
  GraduationCap,
  History,
  House,
  Images,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { HomePage } from "@/pages/dashboard/HomePage";
import { ProductsPage } from "@/pages/dashboard/ProductsPage";
import { ProductDetailPage } from "@/pages/dashboard/ProductDetailPage";
import { RisetPage } from "@/pages/dashboard/RisetPage";
import { GalleryPage } from "@/pages/dashboard/GalleryPage";
import { AvatarsPage } from "@/pages/dashboard/AvatarsPage";
import { MentorPage } from "@/pages/dashboard/MentorPage";
import { PipelinePage } from "@/pages/dashboard/PipelinePage";
import { RunsPage } from "@/pages/dashboard/RunsPage";
import { CostPage } from "@/pages/dashboard/CostPage";
import { SettingsPage } from "@/pages/dashboard/SettingsPage";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Beranda", icon: House, end: true },
  { to: "/dashboard/riset", label: "Riset", icon: Search, end: false },
  { to: "/dashboard/products", label: "Produk", icon: Boxes, end: true },
  { to: "/dashboard/gallery", label: "Galeri", icon: Images, end: true },
  { to: "/dashboard/avatars", label: "Avatar", icon: Users, end: true },
  { to: "/dashboard/mentor", label: "AI Mentor", icon: GraduationCap, end: true },
  { to: "/dashboard/pipeline", label: "Pipeline", icon: Sparkles, end: true },
  { to: "/dashboard/runs", label: "Riwayat Run", icon: History, end: true },
  { to: "/dashboard/cost", label: "Biaya", icon: Coins, end: true },
  { to: "/dashboard/settings", label: "Pengaturan", icon: Settings, end: true },
];

const SIDEBAR_KEY = "ld-sidebar-expanded";

export function DashboardPage() {
  const { signOut } = useAuthActions();
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      return stored === null ? true : stored === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, expanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [expanded]);

  function toggleSidebar() {
    setExpanded((prev) => !prev);
  }

  return (
    <div className="flex min-h-screen bg-app font-body text-ink">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-overlay flex flex-col overflow-hidden bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-[width] duration-300 ease-[cubic-bezier(.16,1,.3,1)]",
          expanded ? "w-56" : "w-[4.5rem]"
        )}
        aria-label="Navigasi utama"
      >
        <Link
          to="/dashboard"
          className="mb-6 flex items-center gap-3 px-5 pt-5"
        >
          <BrandMark className="h-10 w-10 shrink-0" />
          {expanded && (
            <span className="whitespace-nowrap text-sm font-bold text-white">
              CAST/|FREE
            </span>
          )}
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    "relative mx-2.5 flex h-10 items-center gap-3 rounded-[10px] px-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#FAA61A]/15 text-[#FAA61A]"
                      : "hover:bg-white/8 hover:text-white",
                    !expanded && "justify-center px-0"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#FAA61A]" />
                    )}
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {expanded && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="pb-5">
          <button
            type="button"
            onClick={() => void signOut()}
            title="Keluar"
            className={cn(
              "mx-2.5 flex h-10 w-[calc(100%-1.25rem)] items-center gap-3 rounded-[10px] px-2.5 text-sm font-medium text-[var(--sidebar-text-dim)] transition-colors hover:bg-white/8 hover:text-white",
              !expanded && "justify-center px-0"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {expanded && <span className="whitespace-nowrap">Keluar</span>}
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={expanded ? "Ciutkan sidebar" : "Perluas sidebar"}
            title={expanded ? "Ciutkan" : "Perluas"}
            className="mx-2.5 flex h-10 w-[calc(100%-1.25rem)] items-center gap-3 rounded-[10px] px-2.5 text-sm font-medium text-[var(--sidebar-text-dim)] transition-colors hover:bg-white/8 hover:text-white"
          >
            {expanded ? (
              <>
                <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                <span className="whitespace-nowrap">Ciutkan</span>
              </>
            ) : (
              <ChevronsRight className="mx-auto h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main
        className={cn(
          "min-w-0 flex-1 transition-[margin-left] duration-300 ease-[cubic-bezier(.16,1,.3,1)]",
          expanded ? "ml-56" : "ml-[4.5rem]"
        )}
      >
        <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="riset" element={<RisetPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="avatars" element={<AvatarsPage />} />
            <Route path="mentor" element={<MentorPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="cost" element={<CostPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

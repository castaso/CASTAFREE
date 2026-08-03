export type Agent = {
  id: string;
  name: string;
  role: string;
  color: string;
  description: string;
  status: "active" | "beta";
};

export const AGENTS: Agent[] = [
  {
    id: "maya",
    name: "Maya",
    role: "Research Analyst",
    color: "#8B5CF6",
    description: "Riset pasar, niche, dan kompetitor dengan data terkini.",
    status: "active",
  },
  {
    id: "reza",
    name: "Reza",
    role: "Copywriter",
    color: "#EF4444",
    description: "Nulis copy iklan, email, dan konten yang bikin konversi.",
    status: "active",
  },
  {
    id: "dimas",
    name: "Dimas",
    role: "Product Builder",
    color: "#F97316",
    description: "Ngebangun produk digital dari konsep sampai siap jual.",
    status: "active",
  },
  {
    id: "sari",
    name: "Sari",
    role: "Web Designer",
    color: "#16A34A",
    description: "Desain landing page dan visual yang clean dan konversif.",
    status: "active",
  },
  {
    id: "bayu",
    name: "Bayu",
    role: "Video Producer",
    color: "#3B82F6",
    description: "Produksi script dan storyboard video iklan & konten.",
    status: "beta",
  },
];

export const AGENT_COLORS: Record<string, string> = {
  maya: "#8B5CF6",
  reza: "#EF4444",
  dimas: "#F97316",
  sari: "#16A34A",
  bayu: "#3B82F6",
};

export const PRODUCT_STATUS_COLORS: Record<
  string,
  { badge: string; dot: string }
> = {
  published: { badge: "bg-success-bg text-success", dot: "#16A34A" },
  draft: { badge: "bg-warning-bg text-warning", dot: "#F59E0B" },
  processing: { badge: "bg-info-bg text-info", dot: "#3B82F6" },
};

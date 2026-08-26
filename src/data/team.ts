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
    description: "Riset & validasi pasar jadi 5 konsep produk + brief + brand guide (BVI).",
    status: "active",
  },
  {
    id: "reza",
    name: "Reza",
    role: "Copywriter",
    color: "#EF4444",
    description: "5 script UGC, 5 image ad, dan caption Meta Ads siap tempel.",
    status: "active",
  },
  {
    id: "dimas",
    name: "Dimas",
    role: "Product Builder",
    color: "#F97316",
    description: "Nulis 3 ebook lengkap yang langsung ke-render jadi PDF siap jual.",
    status: "active",
  },
  {
    id: "sari",
    name: "Sari",
    role: "Web Designer",
    color: "#16A34A",
    description: "Landing page 14-section dalam satu file HTML siap upload.",
    status: "active",
  },
  {
    id: "bayu",
    name: "Bayu",
    role: "Video Producer",
    color: "#3B82F6",
    description: "Setting image KIE + prompt video VEO breakdown per scene.",
    status: "active",
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

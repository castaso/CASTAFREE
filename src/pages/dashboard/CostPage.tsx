import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROWS = [
  { agent: "Maya", task: "Research & Analysis", range: "$0.50 - $2.00", status: "Termasuk", variant: "success" as const },
  { agent: "Reza", task: "Copywriting", range: "$0.30 - $1.50", status: "Termasuk", variant: "success" as const },
  { agent: "Dimas", task: "Product Building", range: "$0.80 - $3.00", status: "Termasuk", variant: "success" as const },
  { agent: "Sari", task: "Web Design", range: "$0.60 - $2.50", status: "Termasuk", variant: "success" as const },
  { agent: "Bayu", task: "Video Production", range: "$1.00 - $4.00", status: "Beta", variant: "info" as const },
];

const AGENT_COLORS: Record<string, string> = {
  Maya: "#8B5CF6",
  Reza: "#EF4444",
  Dimas: "#F97316",
  Sari: "#16A34A",
  Bayu: "#3B82F6",
};

export function CostPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Biaya</h1>
        <p className="mt-1 text-ink-2">
          Estimasi biaya penggunaan AI untuk setiap produk yang lu buat.
        </p>
      </header>
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-d">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Agent
                  </th>
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Task
                  </th>
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Estimasi Biaya
                  </th>
                  <th className="py-3 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {ROWS.map((row) => (
                  <tr key={row.agent} className="border-b border-border-d last:border-0">
                    <td className="py-3 pr-4">
                      <span className="font-semibold" style={{ color: AGENT_COLORS[row.agent] }}>
                        {row.agent}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-ink-2">{row.task}</td>
                    <td className="py-3 pr-4 font-mono text-ink">{row.range}</td>
                    <td className="py-3">
                      <Badge variant={row.variant}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

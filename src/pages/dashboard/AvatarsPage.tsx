import {
  Boxes,
  Clapperboard,
  Palette,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGENTS } from "@/data/team";

const AGENT_ICONS: Record<string, typeof Search> = {
  maya: Search,
  reza: PenLine,
  dimas: Boxes,
  sari: Palette,
  bayu: Clapperboard,
};

export function AvatarsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Avatar</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
        <p className="mt-3 text-ink-2">
          AI Avatar team yang siap bantu bikin konten digital lu.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {AGENTS.map((agent) => {
          const Icon = AGENT_ICONS[agent.id] ?? Sparkles;
          return (
            <Card
              key={agent.id}
              className="text-center transition-all hover:-translate-y-0.5 hover:shadow-pop"
            >
              <CardContent className="p-6">
                <span
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-110"
                  style={{ background: agent.color }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </span>
                <h3 className="font-display text-lg font-bold text-ink">
                  {agent.name}
                </h3>
                <p className="text-sm text-ink-2">{agent.role}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-2">
                  {agent.description}
                </p>
                <Badge
                  variant={agent.status === "active" ? "success" : "info"}
                  className="mt-3"
                >
                  {agent.status}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

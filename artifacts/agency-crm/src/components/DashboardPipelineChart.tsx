import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PipelineSummary } from "@workspace/api-client-react";

interface DashboardPipelineChartProps {
  pipeline: PipelineSummary;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0]?.value ?? 0} prospek</p>
    </div>
  );
}

export function DashboardPipelineChart({ pipeline }: DashboardPipelineChartProps) {
  const chartData = [
    { label: "Belum Dihubungi", value: pipeline.belumDihubungi },
    { label: "Dihubungi", value: pipeline.dihubungi },
    { label: "Demo", value: pipeline.demo },
    { label: "Deal", value: pipeline.deal },
    { label: "Invoice", value: pipeline.invoice },
    { label: "Selesai", value: pipeline.selesai },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval={0}
          height={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.08)" }} />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

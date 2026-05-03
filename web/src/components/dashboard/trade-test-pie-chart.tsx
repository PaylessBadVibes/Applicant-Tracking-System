"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  Pass: "#059669",
  Fail: "#e11d48",
  "No Show": "#d97706",
  Pending: "#7c3aed",
};

export function TradeTestPieChart({
  pass,
  fail,
  noShow,
  pending,
}: {
  pass: number;
  fail: number;
  noShow: number;
  pending: number;
}) {
  const data = [
    { name: "Pass", value: pass },
    { name: "Fail", value: fail },
    { name: "No Show", value: noShow },
    { name: "Pending", value: pending },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trade Test Outcomes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data in the selected range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="circle"
                  formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

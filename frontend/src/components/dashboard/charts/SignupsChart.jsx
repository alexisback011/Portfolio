import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const DAY = 86400000;

const buildSeries = (users, days = 30) => {
  const map = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    map[new Date(now - i * DAY).toISOString().slice(0, 10)] = 0;
  }
  users.forEach((u) => {
    const key = String(u.created_at || "").slice(0, 10);
    if (key in map) map[key] += 1;
  });
  return Object.keys(map).map((date) => ({ date, signups: map[date] }));
};

const tooltipStyle = {
  background: "hsl(0 0% 8%)",
  border: "1px solid hsl(0 0% 17%)",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(0 0% 98%)",
};

const SignupsChart = ({ users }) => {
  const data = buildSeries(users);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF0059" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF0059" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(0 0% 20%)" }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "hsl(0 0% 68%)", marginBottom: 4 }}
            labelFormatter={(v) => {
              const [y, m, d] = v.split("-");
              return new Date(y, m - 1, d).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
            }}
            formatter={(value) => [`${value} signup${value === 1 ? "" : "s"}`, "Signups"]}
          />
          <Area
            type="monotone"
            dataKey="signups"
            stroke="#FF0059"
            strokeWidth={2}
            fill="url(#signupsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SignupsChart;

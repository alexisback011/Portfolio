import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const tooltipStyle = {
  background: "hsl(0 0% 8%)",
  border: "1px solid hsl(0 0% 17%)",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(0 0% 98%)",
};

const RatingsChart = ({ reviews }) => {
  const data = [1, 2, 3, 4, 5].map((rating) => ({
    rating: `${rating}★`,
    count: reviews.filter((r) => Number(r.rating) === rating).length,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
          <XAxis
            dataKey="rating"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(0 0% 20%)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: "hsl(0 0% 98%)" }}
            labelStyle={{ color: "hsl(0 0% 68%)", marginBottom: 4 }}
            formatter={(value, name, props) => [`${value} review${value === 1 ? "" : "s"}`, props.payload.rating]}
            cursor={{ fill: "hsl(0 0% 10%)" }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
            {data.map((d, i) => (
              <Cell
                key={d.rating}
                fill={d.count === 0 ? "hsl(0 84% 60%)" : i === 4 ? "#FF0059" : "hsl(0 0% 45%)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RatingsChart;

export default function DailySpendLineChart({ data }) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
        <h2 className="text-lg font-bold mb-3">Daily Spend (Last 30 Days)</h2>
        <LineChart width={800} height={300} data={data}>
          <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
        </LineChart>
      </div>
    );
  }
  
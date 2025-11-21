export default function PaymentMethodBreakdownPie({ data }) {
    return (
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow w-full">
        <h2 className="text-lg font-bold mb-2">Payment Method Breakdown</h2>
        <PieChart width={350} height={300}>
          <Pie data={data} dataKey="value" nameKey="method" outerRadius={100} label />
          <Tooltip />
        </PieChart>
      </div>
    );
  }
  
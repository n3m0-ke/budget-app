export default function CategorySpendingBar({ data }) {
    return (
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
        <h2 className="text-lg font-bold mb-3">Category Spending</h2>
        <BarChart width={500} height={300} data={data}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#22c55e" />
        </BarChart>
      </div>
    );
  }
  
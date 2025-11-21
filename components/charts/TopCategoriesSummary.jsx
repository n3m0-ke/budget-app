export default function TopCategoriesSummary({ byAmount, byFrequency }) {
    return (
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow w-full">
        <h2 className="text-lg font-bold mb-3">Top Spending Categories</h2>
  
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">By Total Amount</h3>
            <ul className="space-y-1">
              {byAmount.map((c, i) => (
                <li key={i}>{c.category}: {c.total} KES</li>
              ))}
            </ul>
          </div>
  
          <div>
            <h3 className="font-semibold mb-2">By Frequency</h3>
            <ul className="space-y-1">
              {byFrequency.map((c, i) => (
                <li key={i}>{c.category}: {c.count} times</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
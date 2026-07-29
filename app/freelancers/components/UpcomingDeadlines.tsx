export default function UpcomingDeadlines() {
    const deadlines = [
      {
        title: "Fintech Dashboard UI",
        date: "29 Temmuz",
        status: "Teslim Bekliyor",
      },
      {
        title: "Mobile App Design",
        date: "3 Ağustos",
        status: "Revize",
      },
      {
        title: "Landing Page",
        date: "8 Ağustos",
        status: "Başlanmadı",
      },
    ];
  
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold">
            Yaklaşan Teslimler
          </h3>
        </div>
  
        <div className="space-y-4">
          {deadlines.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center border-b pb-3 last:border-none"
            >
              <div>
                <p className="font-medium">
                  {item.title}
                </p>
  
                <p className="text-sm text-gray-500">
                  {item.status}
                </p>
              </div>
  
              <span className="text-sm font-medium">
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
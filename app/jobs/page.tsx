const jobs = [
    {
      title: "UI/UX Designer Needed for Mobile App",
      company: "Tech Startup",
      budget: "$800 - $1500",
      type: "Remote",
      skills: ["Figma", "Mobile Design", "Prototype"],
      time: "2 hours ago",
    },
    {
      title: "Landing Page Redesign",
      company: "SaaS Company",
      budget: "$500 - $1000",
      type: "Remote",
      skills: ["UI Design", "Web Design", "UX"],
      time: "5 hours ago",
    },
    {
      title: "Design System Creation",
      company: "Digital Agency",
      budget: "$1500 - $3000",
      type: "Hybrid",
      skills: ["Design System", "Figma", "Components"],
      time: "1 day ago",
    },
  ];
  
  
  export default function JobsPage() {
  
    return (
      <main className="min-h-screen bg-[var(--color-canvas)] px-6 py-10">
  
  
        <div className="max-w-6xl mx-auto">
  
  
          {/* Header */}
  
          <div className="mb-8">
  
            <h1 className="text-4xl font-bold">
              Find Projects
            </h1>
  
            <p className="text-gray-500 mt-2">
              Discover freelance opportunities that match your skills.
            </p>
  
          </div>
  
  
  
  
          <div className="grid md:grid-cols-4 gap-6">
  
  
            {/* Filters */}
  
            <aside className="bg-white rounded-xl p-5 h-fit shadow-sm">
  
  
              <h2 className="font-bold text-lg mb-5">
                Filters
              </h2>
  
  
              <div className="space-y-5">
  
  
                <div>
  
                  <label className="text-sm text-gray-500">
                    Category
                  </label>
  
                  <select className="w-full mt-2 border rounded-xl p-3">
  
                    <option>All</option>
                    <option>UI/UX Design</option>
                    <option>Development</option>
                    <option>3D Design</option>
  
                  </select>
  
                </div>
  
  
  
                <div>
  
                  <label className="text-sm text-gray-500">
                    Budget
                  </label>
  
                  <select className="w-full mt-2 border rounded-xl p-3">
  
                    <option>Any Budget</option>
                    <option>$0 - $500</option>
                    <option>$500 - $1000</option>
                    <option>$1000+</option>
  
                  </select>
  
                </div>
  
  
  
  
                <div>
  
                  <label className="text-sm text-gray-500">
                    Project Type
                  </label>
  
                  <select className="w-full mt-2 border rounded-xl p-3">
  
                    <option>All</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
  
                  </select>
  
                </div>
  
  
              </div>
  
  
            </aside>
  
  
  
  
  
  
            {/* Jobs */}
  
            <section className="md:col-span-3 space-y-5">
  
  
              {jobs.map((job)=> (
  
                <div
                  key={job.title}
                  className="bg-white rounded-xl p-7 shadow-sm hover:shadow-md transition"
                >
  
  
                  <div className="flex justify-between">
  
  
                    <div>
  
                      <h2 className="text-xl font-bold">
                        {job.title}
                      </h2>
  
  
                      <p className="text-gray-500 mt-1">
                        {job.company}
                      </p>
  
  
                    </div>
  
  
                    <span className="bg-[var(--color-primary-600)] text-white px-4 py-2 rounded-lg text-sm h-fit">
                      {job.type}
                    </span>
  
  
                  </div>
  
  
  
  
  
                  <div className="flex gap-3 mt-5 flex-wrap">
  
  
                    {job.skills.map(skill => (
  
                      <span
                        key={skill}
                        className="bg-gray-100 px-4 py-2 rounded-lg text-sm"
                      >
                        {skill}
                      </span>
  
                    ))}
  
  
                  </div>
  
  
  
  
  
                  <div className="flex justify-between items-center mt-6">
  
  
                    <div>
  
                      <p className="text-sm text-gray-500">
                        Budget
                      </p>
  
                      <p className="font-bold">
                        {job.budget}
                      </p>
  
                    </div>
  
  
  
                    <div className="text-right">
  
                      <p className="text-sm text-gray-500">
                        {job.time}
                      </p>
  
  
                      <button className="mt-2 bg-[var(--color-primary-600)] text-white px-6 py-3 rounded-xl">
                        View Project
                      </button>
  
  
                    </div>
  
  
  
                  </div>
  
  
  
                </div>
  
  
              ))}
  
  
            </section>
  
  
  
          </div>
  
  
  
        </div>
  
  
      </main>
    );
  }
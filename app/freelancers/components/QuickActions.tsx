"use client";

const actions = [
  {
    title: "Browse Projects",
    description: "Find new freelance opportunities",
    icon: "🔍",
  },
  {
    title: "Create Portfolio",
    description: "Showcase your best work",
    icon: "🎨",
  },
  {
    title: "Update Profile",
    description: "Improve your freelancer profile",
    icon: "👤",
  },
  {
    title: "Messages",
    description: "Check client conversations",
    icon: "💬",
  },
];

export default function QuickActions() {
  return (
    <div className="space-y-4">

      <h2 className="text-xl font-semibold">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 gap-4">

        {actions.map((action, index) => (
          <button
            key={index}
            className="
              text-left
              rounded-2xl
              border
              bg-white
              p-5
              transition
              hover:shadow-md
            "
          >

            <div className="text-2xl mb-3">
              {action.icon}
            </div>

            <h3 className="font-medium">
              {action.title}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {action.description}
            </p>

          </button>
        ))}

      </div>

    </div>
  );
}
"use client";

const notifications = [
  {
    title: "New project match",
    text: "A UI/UX project fits your profile.",
    time: "5 min ago",
  },
  {
    title: "Proposal accepted",
    text: "Your proposal has been accepted.",
    time: "2 hours ago",
  },
  {
    title: "New message",
    text: "You received a message from client.",
    time: "Yesterday",
  },
];

export default function NotificationPanel() {
  return (
    <div
      className="
        absolute
        right-0
        top-12
        w-80
        rounded-2xl
        border
        bg-white
        shadow-lg
        overflow-hidden
        z-50
      "
    >

      <div className="flex items-center justify-between p-4 border-b">

        <h3 className="font-semibold">
          Notifications
        </h3>

        <span className="text-xs bg-black text-white px-2 py-1 rounded-full">
          3
        </span>

      </div>


      <div>

        {notifications.map((item, index) => (

          <div
            key={index}
            className="
              p-4
              border-b
              hover:bg-gray-50
              cursor-pointer
            "
          >

            <h4 className="text-sm font-medium">
              {item.title}
            </h4>

            <p className="text-xs text-gray-500 mt-1">
              {item.text}
            </p>

            <span className="text-xs text-gray-400 block mt-2">
              {item.time}
            </span>

          </div>

        ))}

      </div>


      <button
        className="
          w-full
          py-3
          text-sm
          font-medium
          hover:bg-gray-50
        "
      >
        View all notifications
      </button>


    </div>
  );
}
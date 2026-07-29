import Link from "next/link";

export default function FreelancerProfilePage({
  params,
}: {
  params: { username: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="max-w-5xl mx-auto">

        {/* Profile Header */}
        <div className="bg-white rounded-3xl border p-8">

          <div className="flex items-center gap-6">

            <div className="
              w-24
              h-24
              rounded-full
              bg-gray-200
              flex
              items-center
              justify-center
              text-3xl
            ">
              👤
            </div>


            <div>

              <h1 className="text-3xl font-semibold">
                {params.username}
              </h1>

              <p className="text-gray-500 mt-2">
                UI/UX Designer
              </p>

              <div className="flex gap-3 mt-4">

                <span className="
                  px-3
                  py-1
                  rounded-full
                  bg-gray-100
                  text-sm
                ">
                  Figma
                </span>

                <span className="
                  px-3
                  py-1
                  rounded-full
                  bg-gray-100
                  text-sm
                ">
                  Product Design
                </span>

              </div>

            </div>

          </div>


        </div>


        {/* Stats */}

        <div className="
          grid
          grid-cols-3
          gap-4
          mt-6
        ">

          <div className="bg-white border rounded-2xl p-5">
            <p className="text-gray-500 text-sm">
              Projects
            </p>
            <h2 className="text-2xl font-semibold mt-2">
              24
            </h2>
          </div>


          <div className="bg-white border rounded-2xl p-5">
            <p className="text-gray-500 text-sm">
              Rating
            </p>
            <h2 className="text-2xl font-semibold mt-2">
              4.9 ⭐
            </h2>
          </div>


          <div className="bg-white border rounded-2xl p-5">
            <p className="text-gray-500 text-sm">
              Earnings
            </p>
            <h2 className="text-2xl font-semibold mt-2">
              $12k
            </h2>
          </div>

        </div>


        {/* Portfolio */}

        <div className="
          bg-white
          border
          rounded-3xl
          p-8
          mt-6
        ">

          <h2 className="text-xl font-semibold">
            Portfolio
          </h2>

          <p className="text-gray-500 mt-3">
            Freelancer projects will appear here.
          </p>

        </div>


        <Link
          href="/dashboard"
          className="
            inline-block
            mt-6
            text-sm
            text-gray-500
          "
        >
          ← Back to Dashboard
        </Link>


      </div>

    </div>
  );
}
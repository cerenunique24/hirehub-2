export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Project</h1>
      <p className="mt-2 text-sm text-gray-500">
        Project ID: {id}
      </p>
    </main>
  );
}

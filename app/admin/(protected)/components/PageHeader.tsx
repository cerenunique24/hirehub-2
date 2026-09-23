type PageHeaderProps = {
  title: string;
  description?: string;
};

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#111111]">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-[#6b7280]">{description}</p>}
    </div>
  );
}

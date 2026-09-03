"use client";

import type { ProjectAnalysis } from "@/types/ai";

interface ProjectReviewEditorProps {
  analysis: ProjectAnalysis;
  onChange: (analysis: ProjectAnalysis) => void;
}

export default function ProjectReviewEditor({
  analysis,
  onChange,
}: ProjectReviewEditorProps) {
  function updateField<K extends keyof ProjectAnalysis>(
    field: K,
    value: ProjectAnalysis[K]
  ) {
    onChange({ ...analysis, [field]: value });
  }

  function updateListItem(
    field: "requiredSkills" | "requiredRoles" | "deliverables" | "keyRequirements",
    index: number,
    value: string
  ) {
    const list = [...analysis[field]];
    list[index] = value;
    updateField(field, list);
  }

  function removeListItem(
    field: "requiredSkills" | "requiredRoles" | "deliverables" | "keyRequirements",
    index: number
  ) {
    updateField(
      field,
      analysis[field].filter((_, i) => i !== index)
    );
  }

  function addListItem(
    field: "requiredSkills" | "requiredRoles" | "deliverables" | "keyRequirements"
  ) {
    updateField(field, [...analysis[field], ""]);
  }

  return (
    <div className="space-y-6">
      <Field
        label="Project summary"
        value={analysis.summary}
        onChange={(value) => updateField("summary", value)}
        multiline
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Estimated timeline"
          value={analysis.estimatedTimeline}
          onChange={(value) => updateField("estimatedTimeline", value)}
        />
        <Field
          label="Estimated budget"
          value={analysis.estimatedBudget}
          onChange={(value) => updateField("estimatedBudget", value)}
        />
      </div>

      <EditableList
        label="Required skills"
        items={analysis.requiredSkills}
        onChange={(index, value) => updateListItem("requiredSkills", index, value)}
        onRemove={(index) => removeListItem("requiredSkills", index)}
        onAdd={() => addListItem("requiredSkills")}
      />

      <EditableList
        label="Required roles"
        items={analysis.requiredRoles}
        onChange={(index, value) => updateListItem("requiredRoles", index, value)}
        onRemove={(index) => removeListItem("requiredRoles", index)}
        onAdd={() => addListItem("requiredRoles")}
      />

      <EditableList
        label="Deliverables"
        items={analysis.deliverables}
        onChange={(index, value) => updateListItem("deliverables", index, value)}
        onRemove={(index) => removeListItem("deliverables", index)}
        onAdd={() => addListItem("deliverables")}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-800">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none focus:border-neutral-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none focus:border-neutral-500"
        />
      )}
    </div>
  );
}

function EditableList({
  label,
  items,
  onChange,
  onRemove,
  onAdd,
}: {
  label: string;
  items: string[];
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900">{label}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm font-medium text-neutral-600 hover:text-black"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-xl border border-neutral-200 px-3 text-sm text-neutral-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import Checkbox from "@/components/ui/Checkbox";

interface Props {
  checked: boolean;
  setChecked: (value: boolean) => void;
}

export default function RememberSection({ checked, setChecked }: Props) {
  return (
    <div className="flex items-center justify-between">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>Beni hatırla</span>
      </label>

      <button
        type="button"
        className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary-600)] hover:underline"
      >
        Şifremi unuttum
      </button>
    </div>
  );
}

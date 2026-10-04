"use client";

import { ClipboardCheck } from "lucide-react";

/**
 * Proje başlamadan önce client'ın "gereksinimler hazır" onayı.
 *
 * Freelancer'ın işe başlayabilmesi için gereken brief, dosya ve bilgilerin
 * sağlandığı bu adımda onaylanır. Onay ve not `projects.requirements_confirmed_at`
 * / `requirements_note` alanlarına yazılır; veritabanı, onay olmadan projenin
 * `in_progress` durumuna geçmesini reddeder (bkz. enforce_project_status_transition).
 * Durum akışı: ready_to_start (gereksinimler bekleniyor) → onay → in_progress.
 */
export default function RequirementsConfirmation({
  ready,
  note,
  onReadyChange,
  onNoteChange,
}: {
  ready: boolean;
  note: string;
  onReadyChange: (value: boolean) => void;
  onNoteChange: (value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-900">
        <ClipboardCheck size={18} />
        <h2 className="font-semibold">Gereksinimler</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Freelancer&apos;ın işe başlayabilmesi için gerekli brief, dosya ve bilgileri Dosyalar sekmesinden yükle.
        Hazır olduğunda aşağıdaki onayı ver; proje bundan sonra başlatılabilir.
      </p>

      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Ekibe iletmek istediğin başlangıç notu (opsiyonel)"
        className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
      />

      <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={ready}
          onChange={(e) => onReadyChange(e.target.checked)}
          className="mt-0.5"
        />
        Gerekli dosya, brief ve bilgileri sağladım; ekip işe başlayabilir.
      </label>
    </section>
  );
}

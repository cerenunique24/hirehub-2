import parts from "@/public/images/mascots/analysis-rig/parts.json";
import styles from "./AnalysisMascot.module.css";

/** Each numbered illustration is an independent, rigid sprite viewport. */
export function MascotPart({ id, className }: { id: number; className?: string }) {
  const part = parts.parts.find(part => part.id === id);
  if (!part) return null;
  return <svg className={className} viewBox={`${part.x} ${part.y} ${part.width} ${part.height}`} preserveAspectRatio="xMidYMid meet" overflow="hidden" aria-hidden="true" focusable="false" data-mascot-part={id}>
    <image href={`/images/mascots/analysis-rig/${"source" in part ? part.source : parts.sheet}`} width={parts.width} height={parts.height}/>
  </svg>;
}

/** Decorative loop only: expressions never represent completion of an AI request. */
export function AnalysisMascot() {
  return <div className={styles.rig} aria-hidden="true">
    <div className={styles.character}>
      <MascotPart id={5} className={styles.leftFoot}/>
      <MascotPart id={6} className={styles.rightFoot}/>
      <MascotPart id={2} className={styles.leftArm}/>
      <div className={styles.body}>
        <MascotPart id={8} className={styles.neutral}/>
        <MascotPart id={13} className={styles.blink}/>
        <MascotPart id={10} className={styles.found}/>
      </div>
      <div className={styles.rightAssembly}>
        <MascotPart id={4} className={styles.magnifier}/>
        <MascotPart id={3} className={styles.rightArm}/>
      </div>
      <MascotPart id={7} className={styles.reaction}/>
    </div>
  </div>;
}

"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PROJECT_CREATION_STEPS, creationStepState, projectCreationMascots, type CreationMascotAssets, type CreationStep } from "./creationPresentation";
import styles from "./ProjectCreation.module.css";

export function ProjectCreationHero({onBack,disabled=false,mascots=projectCreationMascots}:{onBack:()=>void;disabled?:boolean;mascots?:CreationMascotAssets}) {
  return <header className={styles.hero}>
    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onBack}><ArrowLeft size={16}/>Geri</Button>
    <div className={styles.heroBody}><PageHeader title="Yeni proje oluştur" description="İhtiyacını birkaç adımda tanımla, doğru freelancer veya ekiple eşleşmeye hazır hale getir."/>
      {mascots.hero&&<Image src={mascots.hero} width={80} height={80} alt="" className={styles.heroMascot}/>}</div>
  </header>;
}
export function ProjectCreationStepper({step,mascots=projectCreationMascots}:{step:CreationStep;mascots?:CreationMascotAssets}) {
  const index=PROJECT_CREATION_STEPS.findIndex(item=>item.id===step);
  const previousIndex=useRef(index);
  const desktopArt=useRef<HTMLSpanElement>(null);
  const mobileArt=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const previous=previousIndex.current;
    previousIndex.current=index;
    if(previous===index || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const direction=index>previous?1:-1;
    const frames=[
      {transform:"translateY(0) rotate(0deg)"},
      {transform:`translateY(-1px) rotate(${direction*3}deg)`,offset:.2},
      {transform:`translateY(0) rotate(${direction*-2}deg)`,offset:.4},
      {transform:`translateY(-1px) rotate(${direction*3}deg)`,offset:.6},
      {transform:`translateY(0) rotate(${direction*-2}deg)`,offset:.8},
      {transform:"translateY(0) rotate(0deg)"},
    ];
    const animations=[desktopArt.current,mobileArt.current].flatMap(node=>node&&typeof node.animate==="function"?[node.animate(frames,{duration:240,easing:"linear",iterations:1})]:[]);
    return ()=>animations.forEach(animation=>animation.cancel());
  },[index]);
  const activeStyle={"--creation-step-index":index,"--creation-step-count":PROJECT_CREATION_STEPS.length} as CSSProperties;
  return <nav className={styles.stepper} aria-label="Proje oluşturma adımları" style={activeStyle}>
    <div className={styles.desktop}>
      <div className={styles.connector} aria-hidden="true"><span style={{width:(index/(PROJECT_CREATION_STEPS.length-1)*100)+"%"}}/></div>
      <span className={styles.activeCharacter} aria-hidden="true"><span ref={desktopArt} className={styles.characterArt}>{mascots.active?<Image src={mascots.active} width={40} height={40} alt=""/>:<span className={styles.activeMarker}/>}</span></span>
      <ol className={styles.steps}>{PROJECT_CREATION_STEPS.map((item,i)=>{const state=creationStepState(i,index);const src=state==="completed"?mascots.completed:state==="upcoming"?mascots.neutral:undefined;return <li key={item.id} data-state={state} aria-current={state==="active"?"step":undefined}>
        <span className={styles.anchor} aria-hidden="true">{src?<Image src={src} width={32} height={32} alt=""/>:state==="completed"?<Check size={16}/>:<span className={styles.marker}/>}</span>
        <span>{item.label}</span><span className="sr-only">{state==="active"?"Mevcut adım":state==="completed"?"Tamamlandı":"Sıradaki adım"}</span>
      </li>;})}</ol>
    </div>
    <div className={styles.mobile} aria-current="step"><span ref={mobileArt} className={styles.characterArt} aria-hidden="true">{mascots.active?<Image src={mascots.active} width={40} height={40} alt=""/>:<span className={styles.activeMarker}/>}</span><div aria-live="polite"><p className="cc-body-sm">Adım {index+1} / {PROJECT_CREATION_STEPS.length}</p><strong>{PROJECT_CREATION_STEPS[index].label}</strong></div></div>
  </nav>;
}

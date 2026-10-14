"use client";
import {Button} from "./Button";
export function FilterBar({items,value,onChange,label}:{items:{value:string;label:string;count?:number}[];value:string;onChange:(value:string)=>void;label:string}){return <div className="mb-[var(--space-6)] flex flex-wrap gap-[var(--space-2)]" role="group" aria-label={label}>{items.map(item=><Button key={item.value} size="md" variant={item.value===value?"primary":"secondary"} aria-pressed={item.value===value} onClick={()=>onChange(item.value)}>{item.label}{typeof item.count==="number"&&<span>{item.count}</span>}</Button>)}</div>;}

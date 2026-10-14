"use client";
import {Button} from "./Button";
import styles from "./Pagination.module.css";
import {paginationPageNumbers} from "./paginationPresentation";

export function Pagination({page,totalPages,onChange,label="Sonuç sayfaları"}:{page:number;totalPages:number;onChange:(page:number)=>void;label?:string}){if(totalPages<=1)return null;return <nav className={styles.root} aria-label={label}><Button variant="secondary" size="sm" disabled={page===1} aria-label="Önceki sayfa" onClick={()=>onChange(page-1)}>←</Button>{paginationPageNumbers(page,totalPages).map((number,index)=>typeof number==="number"?<Button key={number} variant={number===page?"primary":"secondary"} size="sm" aria-current={number===page?"page":undefined} aria-label={number+". sayfa"} onClick={()=>onChange(number)}>{number}</Button>:<span key={"gap"+index} aria-hidden="true">{number}</span>)}<Button variant="secondary" size="sm" disabled={page===totalPages} aria-label="Sonraki sayfa" onClick={()=>onChange(page+1)}>→</Button></nav>;}

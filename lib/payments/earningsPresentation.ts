import {paymentStatusLabel} from "./status";
export type EarningsTone="neutral"|"success"|"warning"|"info"|"danger";
export function earningsPaymentPresentation(status:string|null|undefined):{label:string;tone:EarningsTone} {
 const payment=status??"pending";
 if(payment==="held")return {label:"Güvence altında",tone:"info"};
 if(payment==="payout_pending")return {label:"Aktarım hazırlanıyor",tone:"info"};
 if(payment==="paid_out")return {label:"Aktarıldı",tone:"success"};
 if(["payment_failed","cancelled","refund_pending","refunded","partially_refunded"].includes(payment))return {label:paymentStatusLabel(payment),tone:"danger"};
 if(payment==="paid")return {label:paymentStatusLabel(payment),tone:"info"};
 if(payment==="pending"||payment==="payment_initiated")return {label:paymentStatusLabel(payment),tone:"warning"};
 return {label:"Durum doğrulanamadı",tone:"neutral"};
}
export function earningWorkLabel(status:string|null) {
 return ({approved:"Aşama onaylandı",submitted:"İnceleme bekliyor",in_review:"İnceleme bekliyor",revision:"Revizyon bekliyor",active:"Çalışma sürüyor",pending:"Aşama bekliyor"} as Record<string,string>)[status??""]??"Aşama durumu bilinmiyor";
}
export function financialAmount(value:unknown):number|null {
 if(value===null||value===undefined||value==="")return null;
 const amount=Number(value);return Number.isFinite(amount)&&amount>=0?amount:null;
}
export function approvedInMonth<T extends {status:string|null;approvedAt:string|null;net:number|null}>(movements:T[],now=new Date()):number|null {
 const start=new Date(now.getFullYear(),now.getMonth(),1).getTime(),end=new Date(now.getFullYear(),now.getMonth()+1,1).getTime();
 let sum=0;
 for(const row of movements){if(row.status!=="approved")continue;if(!row.approvedAt||!Number.isFinite(Date.parse(row.approvedAt)))return null;const time=Date.parse(row.approvedAt);if(time>=start&&time<end){if(row.net===null)return null;sum+=row.net;}}
 return Math.round(sum*100)/100;
}

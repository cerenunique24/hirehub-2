export type BudgetAllocationRole = { id:string; name:string; memberCount:number; budgetPerPerson:number; duration:string };
/** Reuse the established quantity × per-person amount; durations are not added. */
export function roleBudgetPlan(roles:BudgetAllocationRole[],team:boolean) {
  const rows=roles.map(role=>({roleId:role.id,memberCount:team?Math.max(1,Math.floor(role.memberCount||1)):1,budgetPerPerson:role.budgetPerPerson,duration:role.duration})).map(row=>({...row,budget:row.memberCount*row.budgetPerPerson}));
  const total=rows.reduce((sum,row)=>sum+(Number.isSafeInteger(row.budget)&&row.budget>0?row.budget:0),0);
  const ready=rows.length>0&&Number.isSafeInteger(total)&&total>0&&rows.every(row=>Number.isSafeInteger(row.memberCount)&&Number.isSafeInteger(row.budgetPerPerson)&&row.budgetPerPerson>0&&Number.isSafeInteger(row.budget)&&row.duration.trim().length>0);
  return {rows,total,ready};
}
export function roleBudgetMoney(roles:BudgetAllocationRole[],total:number,team:boolean) {
  const plan=roleBudgetPlan(roles,team);
  if(!plan.ready||plan.total!==total)throw new Error("Her rol için geçerli bir bütçe ve çalışma süresi belirleyin.");
  return plan.rows;
}

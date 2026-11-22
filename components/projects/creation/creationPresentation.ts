export const PROJECT_CREATION_STEPS = [
  {id:"project",label:"Proje"},
  {id:"needs",label:"İhtiyaçlar"},
  {id:"analysis",label:"Eşleşmeler"},
  {id:"budget",label:"Bütçe & Yayınla"},
] as const;
export type CreationStep = typeof PROJECT_CREATION_STEPS[number]["id"];
export type CreationMascotAssets = {active?:string;neutral?:string;completed?:string;hero?:string};
/** User-selected mascot files can be wired here without changing the form flow. */
export const projectCreationMascots: CreationMascotAssets = {
  active:"/images/mascots/project-creation-active.png",
  neutral:"/images/mascots/project-creation-neutral.png",
  completed:"/images/mascots/project-creation-neutral.png",
};
export function creationStepState(index:number,current:number) {
  return index===current?"active":index<current?"completed":"upcoming";
}

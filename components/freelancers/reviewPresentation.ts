export type ProfileReview={id:string;project_id:string;reviewer_id:string;rating:number;comment:string|null;created_at:string;reviewerName?:string|null;reviewerAvatar?:string|null;projectTitle?:string|null};
export type ProfileRating={average:number;count:number};
export function parseProfileRating(data:unknown):ProfileRating|null {
 const row=Array.isArray(data)?data[0]:data;
 if(!row || typeof row!=="object")return null;
 const count=Number((row as Record<string,unknown>).rating_count),average=Number((row as Record<string,unknown>).rating_avg);
 return Number.isInteger(count)&&count>0&&Number.isFinite(average)&&average>=1&&average<=5 ? {average,count} : null;
}

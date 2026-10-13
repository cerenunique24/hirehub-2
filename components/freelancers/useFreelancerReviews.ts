"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {publicDisplayName} from "@/lib/utils/displayName";
import {parseProfileRating,type ProfileReview,type ProfileRating} from "./reviewPresentation";
const PAGE_SIZE=3;
export function useFreelancerReviews(userId:string|null) {
 const supabase=useMemo(()=>createClient(),[]);
 const [request,setRequest]=useState({userId,page:0});
 const page=request.userId===userId?request.page:0;
 const [state,setState]=useState<{userId:string|null;reviews:ProfileReview[];rating:ProfileRating|null;loading:boolean;failed:boolean;hasMore:boolean}>({userId:null,reviews:[],rating:null,loading:true,failed:false,hasMore:false});
 useEffect(()=>{
  if(!userId)return;
  let active=true;
  async function load(){
   setState(previous=>({...previous,loading:true,failed:false}));
   const offset=page*PAGE_SIZE;
   const [rowsResult,summaryResult]=await Promise.all([
    supabase.from("reviews").select("id,project_id,reviewer_id,rating,comment,created_at",{count:"exact"}).eq("reviewee_id",userId).eq("is_hidden",false).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+PAGE_SIZE-1),
    supabase.rpc("get_rating_summary",{p_user_id:userId}),
   ]);
   if(!active)return;
   if(rowsResult.error || summaryResult.error){setState(previous=>({...previous,userId,loading:false,failed:true}));return;}
   const rows=(rowsResult.data??[]) as ProfileReview[];
   const ids=[...new Set(rows.map(row=>row.reviewer_id))],projects=[...new Set(rows.map(row=>row.project_id))];
   const [namesResult,projectsResult]=await Promise.all([
    ids.length ? supabase.from("profiles").select("id,first_name,avatar_url").in("id",ids) : Promise.resolve({data:[]}),
    projects.length ? supabase.from("projects").select("id,title").in("id",projects) : Promise.resolve({data:[]}),
   ]);
   if(!active)return;
   const reviews=rows.map(row=>({...row,reviewerName:publicDisplayName(namesResult.data?.find(item=>item.id===row.reviewer_id),"Değerlendiren kullanıcı"),reviewerAvatar:namesResult.data?.find(item=>item.id===row.reviewer_id)?.avatar_url??null,projectTitle:projectsResult.data?.find(item=>item.id===row.project_id)?.title??null}));
   setState(previous=>({userId,reviews:page>0&&previous.userId===userId?[...previous.reviews,...reviews]:reviews,rating:parseProfileRating(summaryResult.data),loading:false,failed:false,hasMore:offset+rows.length<(rowsResult.count??0)}));
  }
  void load();return ()=>{active=false;};
 },[supabase,userId,page]);
 return {...(state.userId===userId?state:{userId,reviews:[],rating:null,loading:true,failed:false,hasMore:false}),loadMore:()=>setRequest(previous=>({userId,page:previous.userId===userId?previous.page+1:1}))};
}

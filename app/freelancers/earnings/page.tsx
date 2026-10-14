"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {getFreelancerEarningsSummary,type FreelancerEarningsSummary} from "@/lib/financials";
import {EarningsView} from "@/components/earnings/EarningsView";
export default function EarningsPage(){
 const supabase=useMemo(()=>createClient(),[]);
 const [summary,setSummary]=useState<FreelancerEarningsSummary|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reload,setReload]=useState(0);
 useEffect(()=>{
  let active=true;
  async function load(){
   setLoading(true);setError("");
   try {const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error("Kazançlarını görüntülemek için giriş yapman gerekiyor.");
    const data=await getFreelancerEarningsSummary(supabase,user.id);if(active)setSummary(data);
   }catch(err){if(active){setSummary(null);setError(err instanceof Error?err.message:"Kazançlar yüklenemedi.");}}
   finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[supabase,reload]);
 return <EarningsView summary={summary} loading={loading} error={error} onRetry={()=>setReload(value=>value+1)}/>;
}

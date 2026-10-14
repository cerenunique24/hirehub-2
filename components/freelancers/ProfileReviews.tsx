"use client";
import {useEffect,useRef,useState} from "react";
import {ProfileAvatar} from "./ProfileAvatar";
import type {ProfileRating,ProfileReview} from "./reviewPresentation";
import styles from "./FreelancerProfile.module.css";

function ReviewStars({rating}:{rating:number}) {
 return <span className={styles.reviewStars} role="img" aria-label={`${rating} / 5 yıldız`}><span aria-hidden="true">★★★★★</span><span aria-hidden="true" className={styles.reviewStarsFill} style={{width:`${Math.max(0,Math.min(5,rating))*20}%`}}>★★★★★</span></span>;
}
function ReviewComment({comment}:{comment:string}) {
 const [expanded,setExpanded]=useState(false);
 const [overflow,setOverflow]=useState(comment.length>240 || comment.split("\n").length>4);
 const ref=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{
  if(expanded || !ref.current)return;
  const element=ref.current;
  const measure=()=>setOverflow(element.scrollHeight>element.clientHeight+1);
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(element);
  return ()=>observer.disconnect();
 },[comment,expanded]);
 return <><p ref={ref} className={[styles.reviewComment,!expanded ? styles.reviewCollapsed : ""].join(" ")}>{comment}</p>{(overflow || expanded) && <button type="button" className={styles.textAction} aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded ? "Yorumu kısalt" : "Devamını göster"}</button>}</>;
}
function ReviewSkeleton() {
 return <div className={styles.reviewLoading} role="status"><span className="sr-only">Değerlendirmeler yükleniyor…</span><div aria-hidden="true" className={styles.reviewSkeletonSummary}/>{[0,1,2].map(index=><div key={index} className={styles.reviewSkeletonCard} aria-hidden="true"><div className={styles.reviewSkeletonIdentity}><span/><div><i/><i/></div></div><i/><i/></div>)}</div>;
}
export function ProfileReviews({reviews,rating,failed,loading,hasMore,onLoadMore}:{reviews:ProfileReview[];rating:ProfileRating|null;failed:boolean;loading:boolean;hasMore:boolean;onLoadMore:()=>void}) {
 return <section id="reviews" className={styles.section} aria-busy={loading} aria-labelledby="reviews-heading">
  <h2 id="reviews-heading">Değerlendirmeler</h2>
  {rating && <div className={styles.reviewSummary}><strong className={styles.reviewAverage}>{rating.average.toFixed(1)}</strong><div><ReviewStars rating={rating.average}/><p>{rating.count} değerlendirme</p></div></div>}
  {failed ? <p role="alert" className={styles.muted}>Değerlendirmeler yüklenemedi.</p>
  : loading && reviews.length===0 ? <ReviewSkeleton/>
  : reviews.length===0 ? <div className={styles.reviewEmpty}><p>Henüz değerlendirme yok</p><p className={styles.muted}>Tamamlanan projelerden sonra alınan değerlendirmeler burada görünür.</p></div>
  : <ul className={styles.reviews}>{reviews.map(review=>{
   const name=review.reviewerName || "Değerlendiren kullanıcı";
   return <li key={review.id} className={styles.reviewCard}><div className={styles.reviewHeading}>
    <div className={styles.reviewIdentity}><ProfileAvatar src={review.reviewerAvatar} name={name} className={styles.reviewAvatar}/><div><strong>{name}</strong>{review.projectTitle && <p className={styles.reviewProject}>{review.projectTitle}</p>}<span className={styles.reviewMeta}>{review.reviewer_role==="client"?"Client · ":review.reviewer_role==="freelancer"?"Freelancer · ":""}<time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}</time></span></div></div>
    <div className={styles.reviewScore}><ReviewStars rating={review.rating}/><strong aria-label={`${review.rating} / 5 puan`}>{review.rating.toFixed(1)}</strong></div>
   </div>{review.comment ? <ReviewComment comment={review.comment}/> : <p className={styles.muted}>Yazılı yorum eklenmemiş.</p>}</li>;
  })}</ul>}
  {hasMore && !failed && <button type="button" disabled={loading} className={styles.textAction} onClick={onLoadMore}>{loading ? "Yükleniyor…" : "Daha fazla değerlendirme göster"}</button>}
 </section>;
}

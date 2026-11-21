"use client";
import type { ReactNode } from "react";
import PublicFreelancerProfile from "./PublicFreelancerProfile";
import type { ProfileRating, ProfileReview } from "./reviewPresentation";
export type ProfileData = {
    id: string;
    first_name: string | null;
    avatar_url: string | null;
    title: string | null;
    bio: string | null;
    expertise: string | null;
    skills: string[] | null;
    availability_status: string | null;
    availability_note?: string | null;
    available_from?: string | null;
    experience: string | null;
    hourly_rate: number | null;
    city: string | null;
    work_types?: string[] | null;
    languages?: string[] | null;
};
export type ProfilePortfolio = {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    image_url: string | null;
    project_url: string | null;
    skills?: string[] | null;
};
export type ProfileExperience = {
    id: string;
    company_name: string | null;
    position: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current?: boolean | null;
    description: string | null;
};
export function FreelancerProfileView({viewerRole = "freelancer", profile, portfolio, experiences, portfolioError, experienceError, returnTo, inviteAction, messageHref, reviewState = {reviews:[],rating:null,failed:false,loading:false,hasMore:false,loadMore:()=>{}}}: {
  viewerRole?: "client" | "freelancer"; profile: ProfileData; portfolio: ProfilePortfolio[]; experiences: ProfileExperience[]; portfolioError: boolean; experienceError: boolean; returnTo: string; inviteAction?: ReactNode; messageHref?: string | null;
  reviewState?: {reviews:ProfileReview[];rating:ProfileRating|null;failed:boolean;loading:boolean;hasMore:boolean;loadMore:()=>void};
}) {
  return <PublicFreelancerProfile viewerRole={viewerRole} profile={profile} portfolio={portfolio} experiences={experiences} portfolioError={portfolioError} experienceError={experienceError} returnTo={returnTo} reviewState={reviewState} inviteAction={viewerRole === "client" ? inviteAction : undefined} messageHref={viewerRole === "client" ? messageHref : undefined}/>;
}

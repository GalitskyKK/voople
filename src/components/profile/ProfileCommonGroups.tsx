"use client";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import { trpc } from "@/lib/trpc/client";
import { ProfileCommonGroupsView } from "./ProfileCommonGroupsView";
export function ProfileCommonGroups({userId,isOwner,onNavigate}: {userId:string;isOwner:boolean;onNavigate?:(href:string)=>void}) {
 const {authenticated}=useAuthGate();
 const query=trpc.profile.commonGroups.useQuery({userId},{enabled:authenticated});
 if(!authenticated)return null;
 return <ProfileCommonGroupsView isOwner={isOwner} groups={query.data?.groups??[]} count={query.data?.count??0} loading={query.isLoading} error={Boolean(query.error)} onNavigate={onNavigate}/>;
}

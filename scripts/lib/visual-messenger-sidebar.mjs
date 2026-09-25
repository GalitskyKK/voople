// Shared visual fixture composition: use the same sidebar components as the
// authenticated web shell, with inert data and destinations.
export const visualMessengerSidebarFixture = `
  import {AppSidebarVisual} from '@/components/layout/AppNavigationVisual';
  import {MessengerSidebarView} from '@/components/layout/MessengerSidebarView';
  import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
  const sidebarGroup={id:'fixture-group',type:'group',name:'DRG',groupIcon:'D',groupAvatarUrl:null,groupAccentColor:'#7697b2',memberCount:6,unreadCount:0,otherUser:null,lastMessage:null,parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',favoritePosition:1,groupBannerUrl:null,groupTag:null,boostCount:0,boostedByMe:false,viewerRole:'member',channels:[]};
  const fixtureSidebar=(pathname)=><AppSidebarVisual pathname={pathname} collapsed={false} renderDestination={renderDestination} primaryNavigation={<MessengerSidebarView pathname={pathname} chats={[sidebarGroup]} loading={false} onlineUserIds={new Set()} liveByGroup={new Map()} createGroupAction={<button type="button" aria-label="Создать группу">+</button>} renderDestination={renderDestination} onRetry={()=>{}}/>} accountNavigation={<button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left"><ProfileAvatar displayName="Yozhik" size="sm" shape="square" isOnline/><span className="text-xs">Yozhik</span></button>}/>;
`;

import { voiceRoomModelFixture } from './visual-voice-room-model.mjs';
// Synthetic presentation data, never an authenticated media/runtime claim.
export const groupVoiceFixture = `
import {useState} from 'react';
import {AppPreferencesProvider, useAppPreferences} from '@/components/settings/AppPreferencesProvider';
import {InterfaceDesignSettings} from '@/components/settings/InterfaceDesignSettings';
import {useIsLgViewport} from '@/hooks/useIsLgViewport';
import {useSidebarPreference} from '@/hooks/useSidebarPreference';
import {GroupNowRoomCreateDialog} from '@/components/chat/GroupNowRoomCreateDialog';
import {Sheet} from '@/components/ui/Sheet';
import {createRoot} from 'react-dom/client';
import {Smile} from 'lucide-react';
import {AppSettingsView} from '@/components/settings/AppSettingsView';
import {AppPageContent} from '@/components/layout/AppPageContent';
import {ChatListView} from '@/components/chat/ChatListView';
import {ProfileCommonGroupsView} from '@/components/profile/ProfileCommonGroupsView';
import {ProfilePageView} from '@/components/profile/ProfilePageView';
import {ProfileCardView} from '@/components/profile/ProfileCardView';
import {resolveCustomization} from '@/lib/customization/resolve';
import {MessagesLayoutView} from '@/components/chat/MessagesLayoutView';
import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
import {TRPCReactProvider} from '@/lib/trpc/client';
import {AppSidebarVisual,AppBottomNavigationVisual} from '@/components/layout/AppNavigationVisual';
import {AppShellFrame} from '@/components/layout/AppShellFrame';
import {AccountMenuVisual} from '@/components/layout/AccountMenuVisual';
import {MessengerSidebarView} from '@/components/layout/MessengerSidebarView';
import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
import {GroupWorkspaceView} from '@/components/chat/GroupWorkspaceView';
import {GroupInfoDrawerView} from '@/components/chat/GroupInfoDrawerView';
import {ChatThreadFrameView} from '@/components/chat/ChatThreadFrameView';
import {ChatComposerFormView} from '@/components/chat/ChatComposerFormView';
import {ChatSectionsBarView} from '@/components/chat/ChatSectionsBarView';
import {GroupNowPanelView} from '@/components/chat/GroupNowPanelView';
import {GroupPeoplePanelView} from '@/components/chat/GroupPeoplePanelView';
import {VoiceRoomMainSurface} from '@/components/chat/voice/VoiceRoomMainSurface';
import {VoiceSessionDock} from '@/components/chat/voice/VoiceSessionDock';
import {GroupTopChromeSlotContext} from '@/components/chat/GroupTopChromeSlotContext';
import {DesktopTitleBar} from './desktop/src/shell/DesktopTitleBar';
const params=new URLSearchParams(location.search);
const desktopHost=params.get('host')==='desktop';
const searchFixture=params.get('search')==='1';
const count=Number(params.get('count')||8);
const names=['Yozhik','Biba','Аня','Миша','Катя','Саша','Дима','Гость'];
const person=(index)=>({id:'user-'+index,username:'user'+index,displayName:names[index]||'Участник '+(index+1),avatarUrl:null,isMe:index===0,guest:index===7,micMuted:true,cameraEnabled:true,screenSharing:true});
const lobby=Array.from({length:count},(_,index)=>person(index));
const foreign=Array.from({length:3},(_,index)=>person(index+count));
const temporary=Array.from({length:2},(_,index)=>person(index+count+3));
const available=Array.from({length:4},(_,index)=>person(index+count+5));
const makeRoom=(id,kind,name,participants,screen=false)=>({id,kind,name,canManage:params.has('orbit-test'),joinTarget:{kind:'room',roomId:id},state:participants.length?'active':'idle',liveSessionId:participants.length?'session-'+id:null,startedAt:null,startedBy:null,participantCount:participants.length,hasScreenShare:screen,participants});
// Deliberately interleave source data: UI must separate temp and preserve pinned order.
const rooms=[makeRoom('drg','pinned','DRG',foreign,true),makeRoom('temp','temporary','Поговорить',temporary),makeRoom('lobby','lobby','Лобби',lobby),makeRoom('empty','pinned','После работы',[]),makeRoom('hidden-temp','temporary','Пустая временная',[]),...(params.has('orbit-test')?[makeRoom('music','pinned','Музыка',[]),makeRoom('cinema','pinned','Смотрим кино',[person(100)]),makeRoom('evening','pinned','На вечер',[])]:[])];
const members=[...lobby,...foreign,...temporary,...available,person(100)].filter(u=>!u.guest).map(u=>({...u,type:'user',bio:null,role:u.isMe?'owner':'member',roleColor:null,activeRoom:null}));
const chat={id:'group-1',type:'group',name:'VOICEKK',groupIcon:'V',groupAvatarUrl:null,groupAccentColor:'#7697b2',memberCount:members.length,unreadCount:5,otherUser:null,lastMessage:null,parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',favoritePosition:1,groupBannerUrl:null,groupTag:'KK',boostCount:0,boostedByMe:false,viewerRole:'owner',channels:[]};
const direct={...chat,id:'direct-biba',type:'direct',name:null,otherUser:{id:'user-biba',displayName:'Biba',username:'biba',avatarUrl:null},groupTag:null,groupIcon:null,groupAccentColor:null};
const sidebarChats=searchFixture?[chat,direct,...Array.from({length:24},(_,index)=>({...chat,id:'group-extra-'+index,name:'Компания '+(index+1)}))]:[chat];
const railCase=params.get('rail-case');
const railChats=railCase==='few'?[chat,direct]:railCase==='empty'?[]:railCase==='many'?[...sidebarChats.map((item,index)=>index===0?{...item,name:'Очень длинное название компании друзей для проверки панели'}:item),...Array.from({length:12},(_,index)=>({...direct,id:'direct-extra-'+index,unreadCount:250,otherUser:{...direct.otherUser,id:'person-'+index,displayName:'Очень длинное имя собеседника '+index}}))]:sidebarChats;
const renderDestination=({href,label,className,children,onNavigate,active})=><button type="button" aria-label={label} aria-current={active?'page':undefined} className={className} onClick={()=>{onNavigate?.();window.fixture.navigate?.(href);window.fixture.event='navigate:'+href}}>{children}</button>;
${voiceRoomModelFixture}
function Demo(){
 const large = useIsLgViewport();
 const {preferences}=useAppPreferences();
 const [pathname,setPathname]=useState(params.has('settings-test')?'/settings':params.has('profile-test')?'/me':params.has('dm-test')?'/messages/direct-biba':'/messages/group-1');const dm=pathname.startsWith('/messages/direct');const inbox=pathname==='/messages';const utility=pathname==='/settings'||pathname==='/me';
 const [roomOpen,setRoomOpen]=useState(false);
 const [speakerIndex,setSpeakerIndex]=useState(1);
 const [text,setText]=useState('Привет!');const [banner,setBanner]=useState(null);const [sectionId,setSection]=useState('group-1');
 const {collapsed,setCollapsed}=useSidebarPreference({forceExpanded:preferences.interfaceDesign!=='orbit'});
 const [settingsOpen,setSettingsOpen]=useState(false);const [creating,setCreating]=useState(false);const [callVisible,setCallVisible]=useState(!params.has('no-call'));
 const [chromeSlot,setChromeSlot]=useState(null);
 const [tab,setTab]=useState('now');const [volumes,setVolumes]=useState({});const [pending,setPending]=useState(null);const [error,setError]=useState(null);const [move,setMove]=useState(false);const [openInfo,setOpenInfo]=useState(false);const [mic,setMic]=useState(true);const [audio,setAudio]=useState(false);const [camera,setCamera]=useState(false);const [share,setShare]=useState(false);
 window.fixture={event:window.fixture?.event,draft:window.fixture?.draft,setPending,setError,setTab,setCallVisible,setBanner,setSection,setSpeakerIndex,setRoomOpen,setCamera,setShare,navigate:setPathname,volumes};
 const details={sessionId:'session-lobby',participants:Object.fromEntries(lobby.map(u=>[u.id,{isMe:u.isMe,muted:u.isMe&&mic,camera:false,speaking:u.isMe?!mic:u.id==='user-1',volume:volumes[u.id]??1}])),setParticipantVolume:(id,v)=>setVolumes(old=>({...old,[id]:v}))};
 const value={groupId:'group-1',groupName:'VOICEKK',rooms,onlineOutsideRooms:available,visibleOnlineCount:count+9,currentUserRoomId:'lobby'};
 const sidebar=<AppSidebarVisual accountPlacement={preferences.interfaceDesign==='orbit'?'dock':'sidebar'} pathname={pathname} collapsed={collapsed} onCollapsedChange={params.has('orbit-test')?setCollapsed:undefined} renderDestination={renderDestination} primaryNavigation={<MessengerSidebarView pathname={pathname} chats={railChats} loading={railCase==='loading'} error={railCase==='error'?'Пробная ошибка загрузки':null} onlineUserIds={new Set()} liveByGroup={new Map([['group-1',{groupId:'group-1',participantCount:count+5,roomCount:3,hasScreenShare:true}]])} renderDestination={renderDestination} onNavigate={setPathname} onOpenCompactSearch={()=>window.fixture.event='navigate:/search'} onRetry={()=>window.fixture.event='retry'}/>} accountNavigation={<AccountMenuVisual variant={preferences.interfaceDesign==='orbit'?'dock':'menu'} displayName="Yozhik" username="yozhik" compact={collapsed&&preferences.interfaceDesign!=='orbit'} avatar={<ProfileAvatar displayName="Yozhik" size="sm"/>} onOpenProfile={()=>window.fixture.event='navigate:/me'} onOpenSettings={()=>window.fixture.event='navigate:/settings'} onOpenHelp={()=>window.fixture.event='navigate:/help'} onLogout={()=>window.fixture.event='logout'}/>}/>;
 const surface=<>
 {params.has('orbit-test')?<button type="button" aria-label="Оформление" onClick={()=>setSettingsOpen(true)} style={{position:'fixed',top:desktopHost?40:8,right:12,zIndex:90,fontSize:11}}>Демо · Оформление</button>:null}
 {settingsOpen?<Sheet open onClose={()=>setSettingsOpen(false)} ariaLabel="Оформление"><InterfaceDesignSettings/></Sheet>:null}
 <GroupNowRoomCreateDialog open={creating} confirmation={null} pending={false} error={null} onClose={()=>setCreating(false)} onBack={()=>{}} onConfirm={()=>{}} onSubmit={draft=>{window.fixture.draft=draft;setCreating(false)}}/>
 <AppShellFrame routeKind={pathname==='/me'?'profile':utility?'standard':'messages'} navigationKind="messenger" fixedViewport sidebar={sidebar}>
 {utility?<div className="voople-shell__scroll voople-scroll flex min-h-0 flex-1 flex-col overflow-y-auto"><AppPageContent className="flex min-h-0 flex-1 flex-col">{pathname==='/settings'?<AppSettingsView renderDestination={({href,className,children})=><button className={className} onClick={()=>setPathname(href)}>{children}</button>} accountDataSettings={<div className="settings-section"><p>Данные аккаунта</p><button type="button">Скачать данные</button></div>}/>:<ProfilePageView telemetryKey="fixture-profile" card={<ProfileCardView profile={{id:'fixture',username:'yozhik',displayName:'Yozhik',createdAt:'2026-01-01',bio:'Тестовая карточка профиля',customization:{...resolveCustomization(),bannerValue:{}},stats:{posts:0,followers:0,following:0,views:0},status:{}}} shareAction={<button type="button">Поделиться образом</button>}/>} context={<ProfileCommonGroupsView isOwner groups={[{id:chat.id,name:chat.name,tag:chat.groupTag}]} count={1} loading={false} error={false} onNavigate={setPathname}/>}/>}</AppPageContent></div>:inbox?<MessagesLayoutView isThread={false} thread={null} list={<ChatListView chats={[chat,direct]} renderDestination={({chat:row,className,children})=><button className={className} onClick={()=>setPathname('/messages/'+row.id)}>{children}</button>} renderAvatar={(row,title)=><ProfileAvatar displayName={title} size="sm"/>}/>}/>:dm?<ChatThreadFrameView workspace="direct" header={<header className="voople-panel-header"><strong>Biba</strong></header>} timeline={[]} messagesRef={()=>{}} messagesContentRef={()=>{}} renderMessage={()=>null} emptyState={<p>До встречи вечером!</p>} composer={<div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-4 lg:pb-3"><ChatComposerFormView textLength={text.length} onSubmit={()=>{window.fixture.event='send';setText('')}} input={{focusKey:'direct-biba',text,canSend:!!text.trim(),sending:false,busy:false,hasAttachment:false,editing:false,onTextChange:setText,onSubmit:()=>{},onImageSelected:()=>{},onAudioSelected:()=>{},onPastedFile:()=>{},onVoiceRecorded:()=>{},onError:()=>{}}}/></div>}/>:<GroupWorkspaceView groupId="group-1" combineHeader activeTab={tab} onTabChange={setTab}
  header={<header className="voople-panel-header voople-chat-window__header--group"><div className="voople-panel-header__content flex h-full items-center gap-3"><GroupInfoDrawerView open={openInfo} chatName="VOICEKK" memberCount={members.length} groupIcon="V" groupAvatarUrl={null} groupBannerUrl={banner} groupAccentColor="#7697b2" groupTag="KK" canManage members={members} now={value} onOpenChange={setOpenInfo} onManage={()=>{}} onInvite={()=>{}} onOpenProfile={()=>{}}/></div></header>}
  live={<GroupNowPanelView mode="ready" value={value} sessionDetails={details} pendingRoomId={pending} actionError={error} onJoinRoom={room=>{window.fixture.event='join:'+room.id;setPending(room.id)}} onExpandCurrent={()=>{window.fixture.event='full';if(params.has('room-stage-test'))setRoomOpen(true)}} onOpenProfile={user=>window.fixture.event='profile:'+user.id} onCreateSplit={()=>{window.fixture.event='split';setMove(true)}} onVoop={user=>{window.fixture.event='voop:'+user.id;setMove(true)}} splitPending={move} moveStatus={move?<p className="px-3 py-2" role="status">Ждём согласия<button onClick={()=>setMove(false)}>Отменить</button></p>:null} onCreateRoom={()=>{window.fixture.event='create';setCreating(true)}}/>}
  chat={<><ChatSectionsBarView rootChat={{...chat,topicsEnabled:params.has('section-test'),channels:[{...chat,id:'section-plans',name:'Планы',parentChatId:chat.id,favoritePosition:null},{...chat,id:'section-long',name:'Очень длинное название раздела для обсуждения планов на выходные',parentChatId:chat.id,favoritePosition:null}]}} activeChatId={sectionId} renderDestination={(section,className,children,onNavigate)=><button key={section.id} type="button" className={className} onClick={()=>{setSection(section.id);onNavigate?.()}}>{children}</button>}/><div className="voople-chat-window__messages voople-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6"><p className="mb-6 text-center text-xs text-[var(--app-muted)]">Сегодня</p><div className="space-y-5"><p className="text-sm"><strong>Biba</strong><span className="ml-2 text-xs text-[var(--app-muted)]">12:24</span><span className="mt-1 block">Во сколько собираемся сегодня?</span></p><p className="text-sm"><strong>Аня</strong><span className="ml-2 text-xs text-[var(--app-muted)]">12:26</span><span className="mt-1 block">После восьми буду. DRG уже готова 👀</span></p><p className="text-sm"><strong>Yozhik</strong><span className="ml-2 text-xs text-[var(--app-muted)]">12:29</span><span className="mt-1 block">Я в Лобби, заходите.</span></p></div></div><div className="px-2 pb-2"><div className="voople-chat-composer relative z-10 shrink-0 py-1.5"><div className="voople-glass-object voople-chat-composer__surface relative flex items-end gap-1.5 rounded-2xl p-1.5"><input className="min-h-10 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none" aria-label="Сообщение группе" placeholder="Сообщение VOICEKK…"/><button type="button" className="grid h-10 w-10 shrink-0 place-items-center" aria-label="Эмодзи"><Smile className="h-5 w-5"/></button></div></div></div></>}
  renderPeople={()=> <GroupPeoplePanelView members={members} now={value} onlineUserIds={new Set(available.map(u=>u.id))} currentParticipantIds={new Set(lobby.filter(u=>!u.guest).map(u=>u.id))} currentUserId="user-0" onRetry={()=>{}} onOpenProfile={()=>{}}/>}
 />}</AppShellFrame>
 <AppBottomNavigationVisual pathname={pathname} renderDestination={renderDestination}/>
 {params.has('room-stage-test')?<VoiceRoomMainSurface {...roomModel({open:roomOpen,close:()=>setRoomOpen(false),participants:lobby,mic,audio,camera,share,setMic,setAudio,setCamera,setShare,volumes,setVolumes,leave:()=>{setRoomOpen(false);setCallVisible(false)}})}/>:null}
 {callVisible&&(!roomOpen||large&&preferences.interfaceDesign==='orbit')?<VoiceSessionDock mode="compact" onModeChange={()=>{}} chatName="VOICEKK / Лобби" participantCount={count} activeSpeakerName={names[speakerIndex]} speaker={person(speakerIndex)} durationLabel={null} mediaStatus="connected" connectionLabel={null} connectionQuality="excellent" micMuted={mic} localSpeaking={!mic} outputMuted={audio} cameraEnabled={camera} screenSharing={share} mediaActionPending={false} cameraPending={false} screenSharePending={false} leavePending={false} onOpen={()=>{window.fixture.event='full';if(params.has('room-stage-test'))setRoomOpen(true)}} onToggleMic={()=>setMic(v=>!v)} onToggleOutput={()=>setAudio(v=>!v)} onToggleCamera={()=>setCamera(v=>!v)} onToggleScreenShare={()=>setShare(v=>!v)} onLeave={()=>{window.fixture.event='leave';setCallVisible(false)}}/>:null}
 </>;
 return <GroupTopChromeSlotContext.Provider value={chromeSlot}>{desktopHost
   ? <div className="desktop-window-frame"><DesktopTitleBar onGroupChromeSlotChange={setChromeSlot}/><div className="desktop-window-content">{surface}</div></div>
   : surface}</GroupTopChromeSlotContext.Provider>;
}
createRoot(document.getElementById('root')).render(<TRPCReactProvider><AppThemeProvider><AppPreferencesProvider><Demo/></AppPreferencesProvider></AppThemeProvider></TRPCReactProvider>);
`;

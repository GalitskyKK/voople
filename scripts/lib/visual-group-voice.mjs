// Synthetic presentation data, never an authenticated media/runtime claim.
export const groupVoiceFixture = `
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Smile} from 'lucide-react';
import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
import {AppSidebarVisual,AppBottomNavigationVisual} from '@/components/layout/AppNavigationVisual';
import {AppShellFrame} from '@/components/layout/AppShellFrame';
import {MessengerSidebarView} from '@/components/layout/MessengerSidebarView';
import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
import {GroupWorkspaceView} from '@/components/chat/GroupWorkspaceView';
import {GroupInfoDrawerView} from '@/components/chat/GroupInfoDrawerView';
import {GroupNowPanelView} from '@/components/chat/GroupNowPanelView';
import {GroupPeoplePanelView} from '@/components/chat/GroupPeoplePanelView';
import {VoiceSessionDock} from '@/components/chat/voice/VoiceSessionDock';
const params=new URLSearchParams(location.search);
const count=Number(params.get('count')||8);
const names=['Yozhik','Biba','Аня','Миша','Катя','Саша','Дима','Гость'];
const person=(index)=>({id:'user-'+index,username:'user'+index,displayName:names[index]||'Участник '+(index+1),avatarUrl:null,isMe:index===0,guest:index===7,micMuted:true,cameraEnabled:true,screenSharing:true});
const lobby=Array.from({length:count},(_,index)=>person(index));
const foreign=Array.from({length:3},(_,index)=>person(index+count));
const temporary=Array.from({length:2},(_,index)=>person(index+count+3));
const available=Array.from({length:4},(_,index)=>person(index+count+5));
const makeRoom=(id,kind,name,participants,screen=false)=>({id,kind,name,joinTarget:{kind:'room',roomId:id},state:participants.length?'active':'idle',liveSessionId:participants.length?'session-'+id:null,startedAt:null,startedBy:null,participantCount:participants.length,hasScreenShare:screen,participants});
// Deliberately interleave source data: UI must separate temp and preserve pinned order.
const rooms=[makeRoom('drg','pinned','DRG',foreign,true),makeRoom('temp','temporary','Поговорить',temporary),makeRoom('lobby','lobby','Лобби',lobby),makeRoom('empty','pinned','После работы',[]),makeRoom('hidden-temp','temporary','Пустая временная',[])];
const members=[...lobby,...foreign,...temporary,...available,person(100)].filter(u=>!u.guest).map(u=>({...u,type:'user',bio:null,role:u.isMe?'owner':'member',roleColor:null,activeRoom:null}));
const chat={id:'group-1',type:'group',name:'VOICEKK',groupIcon:'V',groupAvatarUrl:null,groupAccentColor:'#7697b2',memberCount:members.length,unreadCount:5,otherUser:null,lastMessage:null,parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',favoritePosition:1,groupBannerUrl:null,groupTag:'KK',boostCount:0,boostedByMe:false,viewerRole:'owner',channels:[]};
const renderDestination=({href,label,className,children})=><button type="button" aria-label={label} className={className} onClick={()=>window.fixture.event='navigate:'+href}>{children}</button>;
function Demo(){
 const [tab,setTab]=useState('now');const [volumes,setVolumes]=useState({});const [pending,setPending]=useState(null);const [error,setError]=useState(null);const [move,setMove]=useState(false);const [openInfo,setOpenInfo]=useState(false);const [mic,setMic]=useState(true);const [audio,setAudio]=useState(false);const [camera,setCamera]=useState(false);const [share,setShare]=useState(false);
 window.fixture={event:window.fixture?.event,setPending,setError,setTab,volumes};
 const details={sessionId:'session-lobby',participants:Object.fromEntries(lobby.map(u=>[u.id,{isMe:u.isMe,muted:u.isMe&&mic,camera:false,speaking:false,volume:volumes[u.id]??1}])),setParticipantVolume:(id,v)=>setVolumes(old=>({...old,[id]:v}))};
 const value={groupId:'group-1',groupName:'VOICEKK',rooms,onlineOutsideRooms:available,visibleOnlineCount:count+9,currentUserRoomId:'lobby'};
 const sidebar=<AppSidebarVisual pathname="/messages/group-1" collapsed={false} renderDestination={renderDestination} primaryNavigation={<MessengerSidebarView pathname="/messages/group-1" chats={[chat]} loading={false} onlineUserIds={new Set()} liveByGroup={new Map([['group-1',{groupId:'group-1',participantCount:count+5,roomCount:3,hasScreenShare:true}]])} renderDestination={renderDestination} onRetry={()=>{}}/>} accountNavigation={<button className="flex w-full items-center gap-2 text-left"><ProfileAvatar displayName="Yozhik" size="sm"/><span className="text-xs">Yozhik</span></button>}/>;
 return <><AppShellFrame routeKind="messages" navigationKind="messenger" fixedViewport sidebar={sidebar}>
 <GroupWorkspaceView combineHeader activeTab={tab} onTabChange={setTab}
  header={<header className="voople-panel-header voople-chat-window__header--group"><div className="voople-panel-header__content flex h-full items-center gap-3"><GroupInfoDrawerView open={openInfo} chatName="VOICEKK" memberCount={members.length} groupIcon="V" groupAvatarUrl={null} groupBannerUrl={null} groupAccentColor="#7697b2" groupTag="KK" canManage members={members} now={value} onOpenChange={setOpenInfo} onManage={()=>{}} onInvite={()=>{}} onOpenProfile={()=>{}}/></div></header>}
  live={<GroupNowPanelView mode="ready" value={value} sessionDetails={details} pendingRoomId={pending} actionError={error} onJoinRoom={room=>{window.fixture.event='join:'+room.id;setPending(room.id)}} onExpandCurrent={()=>window.fixture.event='full'} onOpenProfile={user=>window.fixture.event='profile:'+user.id} onCreateSplit={()=>{window.fixture.event='split';setMove(true)}} onVoop={user=>{window.fixture.event='voop:'+user.id;setMove(true)}} splitPending={move} moveStatus={move?<p className="px-3 py-2" role="status">Ждём согласия<button onClick={()=>setMove(false)}>Отменить</button></p>:null} onCreateRoom={()=>window.fixture.event='create'}/>}
  chat={<><div className="voople-chat-window__messages voople-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6"><p className="mb-6 text-center text-xs text-[var(--app-muted)]">Сегодня</p><div className="space-y-5"><p className="text-sm"><strong>Biba</strong><span className="ml-2 text-xs text-[var(--app-muted)]">12:24</span><span className="mt-1 block">Во сколько собираемся сегодня?</span></p><p className="text-sm"><strong>Аня</strong><span className="ml-2 text-xs text-[var(--app-muted)]">12:26</span><span className="mt-1 block">После восьми буду. DRG уже готова 👀</span></p><p className="text-sm"><strong>Yozhik</strong><span className="ml-2 text-xs text-[var(--app-muted)]">12:29</span><span className="mt-1 block">Я в Лобби, заходите.</span></p></div></div><div className="px-2 pb-2"><div className="voople-chat-composer relative z-10 shrink-0 py-1.5"><div className="voople-glass-object voople-chat-composer__surface relative flex items-end gap-1.5 rounded-2xl p-1.5"><input className="min-h-10 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none" aria-label="Сообщение группе" placeholder="Сообщение VOICEKK…"/><button type="button" className="grid h-10 w-10 shrink-0 place-items-center" aria-label="Эмодзи"><Smile className="h-5 w-5"/></button></div></div></div></>}
  renderPeople={()=> <GroupPeoplePanelView members={members} now={value} onlineUserIds={new Set(available.map(u=>u.id))} currentParticipantIds={new Set(lobby.filter(u=>!u.guest).map(u=>u.id))} currentUserId="user-0" onRetry={()=>{}} onOpenProfile={()=>{}}/>}
 /></AppShellFrame>
 <AppBottomNavigationVisual pathname="/messages/group-1" renderDestination={renderDestination}/>
 <VoiceSessionDock mode="compact" onModeChange={()=>{}} chatName="VOICEKK / Лобби" participantCount={count} activeSpeakerName={null} durationLabel={null} mediaStatus="connected" connectionLabel={null} connectionQuality="excellent" micMuted={mic} localSpeaking={!mic} outputMuted={audio} cameraEnabled={camera} screenSharing={share} mediaActionPending={false} cameraPending={false} screenSharePending={false} leavePending={false} onOpen={()=>window.fixture.event='full'} onToggleMic={()=>setMic(v=>!v)} onToggleOutput={()=>setAudio(v=>!v)} onToggleCamera={()=>setCamera(v=>!v)} onToggleScreenShare={()=>setShare(v=>!v)} onLeave={()=>window.fixture.event='leave'}/>
 </>;
}
createRoot(document.getElementById('root')).render(<AppThemeProvider><Demo/></AppThemeProvider>);
`;

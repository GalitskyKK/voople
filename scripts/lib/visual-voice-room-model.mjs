// Synthetic props for the real Room presentation; this does not start media.
export const voiceRoomModelFixture = `
const fixtureVideos=new Map();
function bindFixtureVideo(kind,id,element){
 if(!element)return;
 const key=kind+id;let video=fixtureVideos.get(key);
 if(!video){video=document.createElement('video');video.dataset.fixtureVideo=key;video.muted=true;video.playsInline=true;video.poster='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#20354a"/><text x="320" y="190" text-anchor="middle" fill="#dbe8f4" font-size="32">'+(kind==='screen'?'Screen fixture':'Camera fixture')+'</text></svg>');video.style.cssText='width:100%;height:100%;object-fit:contain';fixtureVideos.set(key,video);}
 element.replaceChildren(video);
}
function roomModel({open,close,participants,mic,audio,camera,share,setMic,setAudio,setCamera,setShare,leave,volumes,setVolumes}) {
 const noop=()=>{};
 return {
  overlay:{open,onCloseToMini:close,onCloseToCompact:close},
  identity:{groupId:'group-1',isDirect:false,callPhase:null,chatName:'Лобби',active:true,durationLabel:null},
  connection:{label:null,status:'connected',quality:'excellent',audioBlocked:false,errorMessage:null,onResumeAudio:noop},
  stage:{screenContainerRef:element=>bindFixtureVideo('screen','fixture',element),screenShareOwner:share?'Ваш экран':null,screenShareAvailable:share?'Ваш экран':null,screenShareTrackId:share?'screen-fixture':null,screenShareIsLocal:share,watchingScreenShare:share,screenShareVolume:1,participants,groupSounds:[],participantVolumes:volumes,remoteMicMutedById:{},activeSpeakerIds:new Set(['user-1']),cameraParticipantIds:camera?new Set(participants.slice(0,2).map(p=>p.id)):new Set(),onCameraContainerChange:(id,element)=>bindFixtureVideo('camera',id,element),onParticipantVolumeChange:(id,value)=>setVolumes(old=>({...old,[id]:value})),onScreenShareVolumeChange:noop,onGroupSoundPlay:noop,onWatchScreenShare:noop,onStopWatchingScreenShare:noop},
  controls:{micMuted:mic,localSpeaking:!mic,outputMuted:audio,mediaActionPending:false,screenSharePending:false,screenSharing:share,screenShareHasAudio:false,cameraEnabled:camera,cameraPending:false,onMicToggle:()=>setMic(v=>!v),onOutputToggle:()=>setAudio(v=>!v),onScreenShareToggle:()=>setShare(v=>!v),onCameraToggle:()=>setCamera(v=>!v)},
  access:{canManage:false,mode:'open',pending:false,onToggle:noop},
  session:{phase:'inside',inside:true,leavePending:false,onLeave:leave,connectPending:false,connectDisabled:false,onConnect:noop,connectLabel:'Войти',retryLabel:'Повторить',retryPending:false,onRetry:noop},
  roomSwitcher:{rooms,currentRoomId:'lobby',pendingRoomId:null,errorMessage:null,refreshing:false,onSelect:noop,onRetry:noop,management:null},roomRename:null,messages:{chatId:'group-1',groupId:'group-1',roomId:'lobby',liveSessionId:'session-lobby',roomName:'Лобби',roomKind:'lobby'},invite:null,settingsPanel:<p>Настройки звука</p>
 };
}
`;

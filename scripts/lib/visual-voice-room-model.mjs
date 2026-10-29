// Synthetic props for the real Room presentation; this does not start media.
export const voiceRoomModelFixture = `
function roomModel({open,close,participants,mic,audio,camera,share,setMic,setAudio,setCamera,setShare,leave,volumes,setVolumes}) {
 const noop=()=>{};
 return {
  overlay:{open,onCloseToMini:close,onCloseToCompact:close},
  identity:{groupId:'group-1',isDirect:false,callPhase:null,chatName:'Лобби',active:true,durationLabel:null},
  connection:{label:null,status:'connected',quality:'excellent',audioBlocked:false,errorMessage:null,onResumeAudio:noop},
  stage:{screenContainerRef:noop,screenShareOwner:null,screenShareAvailable:null,screenShareTrackId:null,screenShareIsLocal:false,watchingScreenShare:false,screenShareVolume:1,participants,groupSounds:[],participantVolumes:volumes,remoteMicMutedById:{},activeSpeakerIds:new Set(['user-1']),cameraParticipantIds:new Set(),onCameraContainerChange:noop,onParticipantVolumeChange:(id,value)=>setVolumes(old=>({...old,[id]:value})),onScreenShareVolumeChange:noop,onGroupSoundPlay:noop,onWatchScreenShare:noop,onStopWatchingScreenShare:noop},
  controls:{micMuted:mic,localSpeaking:!mic,outputMuted:audio,mediaActionPending:false,screenSharePending:false,screenSharing:share,screenShareHasAudio:false,cameraEnabled:camera,cameraPending:false,onMicToggle:()=>setMic(v=>!v),onOutputToggle:()=>setAudio(v=>!v),onScreenShareToggle:()=>setShare(v=>!v),onCameraToggle:()=>setCamera(v=>!v)},
  access:{canManage:false,mode:'open',pending:false,onToggle:noop},
  session:{phase:'inside',inside:true,leavePending:false,onLeave:leave,connectPending:false,connectDisabled:false,onConnect:noop,connectLabel:'Войти',retryLabel:'Повторить',retryPending:false,onRetry:noop},
  roomSwitcher:{rooms,currentRoomId:'lobby',pendingRoomId:null,errorMessage:null,refreshing:false,onSelect:noop,onRetry:noop,management:null},roomRename:null,messages:{chatId:'group-1',groupId:'group-1',roomId:'lobby',liveSessionId:'session-lobby',roomName:'Лобби',roomKind:'lobby'},invite:null,settingsPanel:<p>Настройки звука</p>
 };
}
`;

"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from "lucide-react";

interface VideoCallModalProps {
  currentUser: any;
  targetFriend: any;
  isCaller: boolean;
  onClose: () => void;
}

export default function VideoCallModal({ currentUser, targetFriend, isCaller, onClose }: VideoCallModalProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<string>(isCaller ? "Calling..." : "Incoming Call...");
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const roomCallId = [currentUser.id, targetFriend.id].sort().join("_");
  const roomChannel = `call_${roomCallId}`;

  const servers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    const channel = supabase.channel(roomChannel, {
      config: { broadcast: { self: false } }
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        if (payload.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          
          // Process queued ICE candidates once remote description is set
          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            try {
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            } catch (e) {
              console.error("Error adding queued ICE candidate", e);
            }
          }

          if (payload.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({ type: "broadcast", event: "signal", payload: { sdp: pc.localDescription } });
          }
        } else if (payload.iceCandidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.iceCandidate));
            } else {
              iceCandidateQueue.current.push(payload.iceCandidate);
            }
          } catch (e) {
            console.error("Error adding received ICE candidate", e);
          }
        }
      })
      .on("broadcast", { event: "hangup" }, () => {
        cleanupAndClose();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await setupWebRTC();
          if (isCaller) {
            startCall();
          }
        }
      });

    return () => {
      cleanupAndClose();
    };
  }, []);

  const setupWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallStatus("Connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: { iceCandidate: event.candidate },
          });
        }
      };
    } catch (error) {
      alert("Could not access camera/microphone. Check permissions.");
      onClose();
    }
  };

  const startCall = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload: { sdp: pc.localDescription },
      });
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  const stopScreenShare = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      setIsScreenSharing(false);
    }
  };

  const hangUp = () => {
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "hangup", payload: {} });
    }
    cleanupAndClose();
  };

  const cleanupAndClose = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 text-emerald-400 font-mono text-xs bg-emerald-950/80 px-3 py-1 rounded border border-emerald-500/40">
        SECURE CHANNEL // STATUS: {callStatus} ({targetFriend.username})
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl h-[65vh] mb-4">
        {/* Remote Video (Friend) */}
        <div className="relative bg-[#040f05] rounded-xl border border-emerald-500/40 overflow-hidden flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {!remoteStream && (
            <div className="absolute text-emerald-400/60 font-mono text-xs animate-pulse">
              Waiting for @{targetFriend.username} video feed...
            </div>
          )}
          <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300">
            @{targetFriend.username}
          </span>
        </div>

        {/* Local Video (You) */}
        <div className="relative bg-[#040f05] rounded-xl border border-emerald-500/40 overflow-hidden flex items-center justify-center">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300">
            You {isScreenSharing && "(Screen Sharing)"}
          </span>
        </div>
      </div>

      {/* Call Controls Toolbar */}
      <div className="flex items-center gap-4 bg-[#030d04] border border-emerald-500/40 px-6 py-3 rounded-full shadow-2xl">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full cursor-pointer ${isMuted ? "bg-red-600 text-white" : "bg-emerald-950 text-emerald-300 hover:bg-emerald-900"} border border-emerald-500/30`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full cursor-pointer ${isVideoOff ? "bg-red-600 text-white" : "bg-emerald-950 text-emerald-300 hover:bg-emerald-900"} border border-emerald-500/30`}
          title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full cursor-pointer ${isScreenSharing ? "bg-emerald-500 text-black font-bold" : "bg-emerald-950 text-emerald-300 hover:bg-emerald-900"} border border-emerald-500/30`}
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        <button
          onClick={hangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-lg"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

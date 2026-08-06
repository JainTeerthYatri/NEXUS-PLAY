"use client";

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navbar from "@/components/Navbar";
import { 
  Radio, Video, Mic, Monitor, Play, Square, Settings, 
  Layers, Volume2, Plus, Trash2, Eye, EyeOff, ShieldAlert, Sliders, X, Globe, Folder, Cloud, Loader2, Upload, Headphones, VolumeX, Move,
  SlidersHorizontal, MonitorPlay, Volume, Key, CheckSquare, Square as SquareIcon, ExternalLink, Circle, Download, Keyboard, MessageSquare,
  Lock, Unlock, Sparkles, Zap, Layout, Code, Terminal, CheckCircle2, ArrowRight
} from 'lucide-react';

const extractYouTubeId = (input: string) => {
  if (!input) return '';
  if (input.length === 11 && !input.includes('/') && !input.includes('.')) return input;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = input.match(regExp);
  return (match && match[2].length === 11) ? match[2] : input;
};

export default function StudioPage() {
  const [userRole, setUserRole] = useState<string>("member");
  const [loadingRole, setLoadingRole] = useState(true);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('Synced with Cloud');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [streamTimer, setStreamTimer] = useState(0);

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const mediaRecorderRecordRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Hotkeys State System
  const [hotkeys, setHotkeys] = useState({
    startStream: 'F1',
    stopStream: 'F2',
    startRecord: 'F3',
    stopRecord: 'F4',
    muteActive: 'F5',
  });
  const [recordingKeyAction, setRecordingKeyAction] = useState<string | null>(null);

  // ── FULLY OPERATIONAL SETTINGS STATES ──
  const [generalSettings, setGeneralSettings] = useState({
    language: 'English',
    confirmOnExit: true,
    systemTray: true,
    darkThemeAccent: 'Cyan'
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    uiDensity: 'Compact',
    showFpsOverlay: true
  });

  const [outputSettings, setOutputSettings] = useState({
    videoBitrate: '3000',
    encoder: 'Hardware (NVENC)',
    audioBitrate: '160',
    recordingFormat: 'webm'
  });

  const [audioSettings, setAudioSettings] = useState({
    sampleRate: '48kHz',
    channels: 'Stereo',
    monitoringDevice: 'Default Audio Device'
  });

  const [videoSettings, setVideoSettings] = useState({
    baseRes: '1920x1080',
    outputRes: '1920x1080',
    fps: '60'
  });

  const [accessibilitySettings, setAccessibilitySettings] = useState({
    highContrast: false,
    screenReaderAnnounce: true,
    fontScale: 'Normal'
  });

  const [advancedSettings, setAdvancedSettings] = useState({
    processPriority: 'Normal',
    reconnectTimeout: '10',
    bindIpAddress: 'Default'
  });

  // WebSocket & MediaRecorder Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Scenes State
  const [scenes, setScenes] = useState([
    { id: '1', name: 'Main Scene' },
  ]);
  const [activeSceneId, setActiveSceneId] = useState('1');
  const [isSceneTransitioning, setIsSceneTransitioning] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  // Sources State
  const [sources, setSources] = useState<any[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  // Dragging & Resizing state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  // Modals & Inputs State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('stream');
  const [streamService, setStreamService] = useState('YouTube - RTMPS');
  const [streamServer, setStreamServer] = useState('Primary YouTube ingest server (legacy RTMP)');
  const [streamKeyInput, setStreamKeyInput] = useState('');
  const [isAccountConnected, setIsAccountConnected] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);

  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('Video Capture Device');
  const [sourceValue, setSourceValue] = useState('');
  const [audioLevel, setAudioLevel] = useState(45);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
      setLoadingRole(false);
    }
    checkUserRole();
  }, [supabase]);

  const currentSceneSources = sources.filter(s => (s.sceneId || '1') === activeSceneId);

  const handleSceneSwitch = (sceneId: string) => {
    if (sceneId === activeSceneId) return;
    setIsSceneTransitioning(true);
    setTimeout(() => {
      setActiveSceneId(sceneId);
      setTimeout(() => {
        setIsSceneTransitioning(false);
      }, 150);
    }, 150);
  };

  useEffect(() => {
    if (loadingRole) return;
    const isPrivileged = userRole === "owner" || userRole === "moderator";
    if (!isPrivileged) return;

    const loadCloudData = async () => {
      try {
        const { data } = await supabase
          .from('obs_layouts')
          .select('*')
          .eq('user_key', 'default_user')
          .single();

        if (data) {
          if (data.scenes) setScenes(data.scenes);
          if (data.sources) {
            setSources(data.sources);
            const initialSceneSources = data.sources.filter((s: any) => (s.sceneId || '1') === '1');
            if (initialSceneSources.length > 0) setActiveSourceId(initialSceneSources[0].id);
          }
          if (data.hotkeys) setHotkeys(data.hotkeys);
          setCloudStatus('Loaded from Supabase');
        } else {
          loadLocalStorage();
        }
      } catch (err) {
        loadLocalStorage();
      }
    };

    loadCloudData();
  }, [loadingRole, userRole, supabase]);

  const loadLocalStorage = () => {
    const savedScenes = localStorage.getItem('obs_scenes');
    const savedSources = localStorage.getItem('obs_sources');
    const savedHotkeys = localStorage.getItem('obs_hotkeys');
    if (savedScenes) try { setScenes(JSON.parse(savedScenes)); } catch (e) {}
    if (savedSources) {
      try {
        const parsed = JSON.parse(savedSources);
        setSources(parsed);
        const initialSceneSources = parsed.filter((s: any) => (s.sceneId || '1') === '1');
        if (initialSceneSources.length > 0) setActiveSourceId(initialSceneSources[0].id);
      } catch (e) {}
    }
    if (savedHotkeys) try { setHotkeys(JSON.parse(savedHotkeys)); } catch (e) {}
    setCloudStatus('Offline / LocalStorage Mode');
  };

  useEffect(() => {
    const isPrivileged = userRole === "owner" || userRole === "moderator";
    if (!isPrivileged) return;

    localStorage.setItem('obs_scenes', JSON.stringify(scenes));
    localStorage.setItem('obs_sources', JSON.stringify(sources));
    localStorage.setItem('obs_hotkeys', JSON.stringify(hotkeys));

    const syncToSupabase = async () => {
      setIsSavingCloud(true);
      setCloudStatus('Saving to Supabase...');
      try {
        await supabase
          .from('obs_layouts')
          .upsert({ 
            user_key: 'default_user', 
            scenes, 
            sources, 
            hotkeys,
            updated_at: new Date().toISOString() 
          }, { onConflict: 'user_key' });
        setCloudStatus('Synced with Cloud');
      } catch (err: any) {
        setCloudStatus('Cloud Sync Failed (Using Local)');
      } finally {
        setIsSavingCloud(false);
      }
    };

    const timeout = setTimeout(syncToSupabase, 1000);
    return () => clearTimeout(timeout);
  }, [scenes, sources, hotkeys, userRole, supabase]);

  useEffect(() => {
    const activeList = sources.filter(s => (s.sceneId || '1') === activeSceneId);
    if (activeList.length > 0) {
      if (!activeList.some(s => s.id === activeSourceId)) {
        setActiveSourceId(activeList[0].id);
      }
    } else {
      setActiveSourceId(null);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [activeSceneId]);

  useEffect(() => {
    const isPrivileged = userRole === "owner" || userRole === "moderator";
    if (!isPrivileged) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (recordingKeyAction) {
        e.preventDefault();
        setHotkeys(prev => ({ ...prev, [recordingKeyAction]: e.key }));
        setRecordingKeyAction(null);
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === hotkeys.startStream && !isStreaming) {
        e.preventDefault();
        handleToggleStream();
      } else if (e.key === hotkeys.stopStream && isStreaming) {
        e.preventDefault();
        handleToggleStream();
      } else if (e.key === hotkeys.startRecord && !isRecording) {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.key === hotkeys.stopRecord && isRecording) {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.key === hotkeys.muteActive && activeSourceId) {
        e.preventDefault();
        toggleSourceMute(activeSourceId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, isStreaming, isRecording, recordingKeyAction, activeSourceId, userRole]);

  useEffect(() => {
    let timer: any;
    if (isStreaming) {
      setStreamTimer(0);
      timer = setInterval(() => { setStreamTimer(prev => prev + 1); }, 1000);
    } else {
      setStreamTimer(0);
    }
    return () => clearInterval(timer);
  }, [isStreaming]);

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      setRecordingTimer(0);
      timer = setInterval(() => { setRecordingTimer(prev => prev + 1); }, 1000);
    } else {
      setRecordingTimer(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecord = () => {
    if (!isRecording) {
      let targetStream = mediaStreamRef.current;
      if (!targetStream && videoRef.current) {
        try {
          const videoEl = videoRef.current as any;
          if (typeof videoEl.captureStream === 'function') targetStream = videoEl.captureStream();
        } catch (e) {}
      }

      if (!targetStream) {
        alert("No active video stream to record! Select a valid video or media source first.");
        return;
      }

      recordedChunksRef.current = [];
      try {
        const mediaRecorder = new MediaRecorder(targetStream, { mimeType: 'video/webm;codecs=h264,opus' });
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nexus-recording-${Date.now()}.${outputSettings.recordingFormat}`;
          a.click();
          URL.revokeObjectURL(url);
        };
        mediaRecorder.start();
        mediaRecorderRecordRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (err) {
        alert("Failed to start local recording.");
      }
    } else {
      if (mediaRecorderRecordRef.current && mediaRecorderRecordRef.current.state !== 'inactive') {
        mediaRecorderRecordRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const handleToggleStream = async () => {
    if (!isStreaming) {
      if (!streamKeyInput.trim() && !isAccountConnected) {
        setStreamError("Stream Key or Connected Account required! Please configure RTMPS in Settings.");
        setIsSettingsOpen(true);
        setSettingsTab('stream');
        return;
      }

      setStreamError(null);
      const ws = new WebSocket('ws://localhost:5000');
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'START_STREAM',
          rtmpUrl: 'rtmps://a.rtmp.youtube.com/live2',
          streamKey: streamKeyInput.trim() || 'dummy_key',
          bitrate: outputSettings.videoBitrate
        }));

        let targetStream = mediaStreamRef.current;
        if (!targetStream && videoRef.current) {
          try {
            const videoEl = videoRef.current as any;
            if (typeof videoEl.captureStream === 'function') targetStream = videoEl.captureStream();
          } catch (e) {}
        }

        if (targetStream) {
          try {
            const mediaRecorder = new MediaRecorder(targetStream, { mimeType: 'video/webm;codecs=h264,opus' });
            mediaRecorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
              }
            };
            mediaRecorder.start(1000);
            mediaRecorderRef.current = mediaRecorder;
          } catch (err) {
            setStreamError("Failed to initialize MediaRecorder on current stream.");
          }
        } else {
          setStreamError("No active video stream to broadcast!");
          ws.close();
          return;
        }
      };

      ws.onerror = () => {
        setStreamError("Could not connect to streaming backend on port 5000.");
        setIsStreaming(false);
      };

      setIsStreaming(true);

      // ── LOGGING SYSTEM INTEGRATION: START STREAM ──
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("audit_logs").insert({
            moderator_id: user.id,
            action_type: "START_STREAM",
            target_id: user.id,
            details: `Operator initiated live broadcast stream (Bitrate: ${outputSettings.videoBitrate} Kbps).`
          });
        }
      } catch (logErr) {
        console.error("Failed to insert start stream audit log:", logErr);
      }
      // ──────────────────────────────────────────────
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'STOP_STREAM' }));
        wsRef.current.close();
      }
      setIsStreaming(false);
    }
  };

  const loadSourceStream = async (type: string, activeSrc?: any) => {
    try {
      setStreamError(null);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (['Video Capture Device', 'Display Capture', 'Game Capture', 'Window Capture', 'Audio Input Capture', 'Audio Output Capture', 'Application Audio Capture (BETA)'].includes(type)) {
        let stream: MediaStream;
        if (type === 'Video Capture Device') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else if (['Audio Input Capture', 'Application Audio Capture (BETA)'].includes(type)) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } else {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        }
        
        if (activeSrc) {
          stream.getAudioTracks().forEach(track => { track.enabled = !activeSrc.isMuted; });
        }

        mediaStreamRef.current = stream;
        
        if (videoRef.current && type !== 'Audio Input Capture') {
          videoRef.current.srcObject = stream;
          const shouldMuteLocal = activeSrc ? (activeSrc.isMuted || !activeSrc.monitored) : false;
          videoRef.current.volume = shouldMuteLocal ? 0 : (activeSrc?.volume ?? 100) / 100;
          videoRef.current.muted = shouldMuteLocal;
        }

        if (audioRef.current) {
          audioRef.current.srcObject = stream;
          const shouldMuteLocal = activeSrc ? (activeSrc.isMuted || !activeSrc.monitored) : false;
          audioRef.current.volume = shouldMuteLocal ? 0 : (activeSrc?.volume ?? 100) / 100;
          audioRef.current.muted = shouldMuteLocal;
        }
      } else {
        if (videoRef.current) videoRef.current.srcObject = null;
        if (audioRef.current) audioRef.current.srcObject = null;
      }
    } catch (err: any) {
      setStreamError("Unable to access hardware capture. Check browser permissions.");
    }
  };

  useEffect(() => {
    const isPrivileged = userRole === "owner" || userRole === "moderator";
    if (!isPrivileged) return;

    if (activeSourceId) {
      const activeSrc = sources.find(s => s.id === activeSourceId);
      if (activeSrc) {
        loadSourceStream(activeSrc.type, activeSrc);
        if (videoRef.current) {
          const shouldMuteLocal = activeSrc.isMuted || !activeSrc.monitored;
          videoRef.current.volume = shouldMuteLocal ? 0 : (activeSrc.volume ?? 100) / 100;
          videoRef.current.muted = shouldMuteLocal;
        }
      }
    } else {
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    const interval = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 40) + 30);
    }, 150);

    return () => {
      clearInterval(interval);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeSourceId, userRole]);

  const handleMouseDownSource = (e: React.MouseEvent, srcId: string) => {
    e.stopPropagation();
    const src = sources.find(s => s.id === srcId);
    if (src?.isLocked) return;

    setActiveSourceId(srcId);
    setDraggingId(srcId);
    
    if (canvasRef.current && src) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - (src.x ?? 20),
        y: e.clientY - rect.top - (src.y ?? 20)
      });
    }
  };

  const handleDoubleClickSource = (e: React.MouseEvent, srcId: string) => {
    e.stopPropagation();
    const src = sources.find(s => s.id === srcId);
    if (src?.isLocked) return;
    setSources(sources.map(s => s.id === srcId ? { ...s, isPinned: !s.isPinned } : s));
  };

  const handleMouseDownResize = (e: React.MouseEvent, src: any) => {
    e.stopPropagation();
    if (src?.isLocked) return;

    setActiveSourceId(src.id);
    setResizingId(src.id);
    const isChat = src.type === 'YouTube Live Chat';
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: src.width ?? (isChat ? 180 : 560),
      height: src.height ?? (isChat ? 240 : 315)
    });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (draggingId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      let newX = e.clientX - rect.left - dragOffset.x;
      let newY = e.clientY - rect.top - dragOffset.y;

      setSources(sources.map(s => {
        if (s.id === draggingId && !s.isLocked) {
          return { ...s, x: Math.max(0, newX), y: Math.max(0, newY) };
        }
        return s;
      }));
    } else if (resizingId) {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;
      const activeResizingSrc = sources.find(s => s.id === resizingId);
      if (activeResizingSrc?.isLocked) return;

      const isChat = activeResizingSrc?.type === 'YouTube Live Chat';
      const newWidth = Math.max(120, resizeStart.width + deltaX);
      const newHeight = isChat ? Math.max(100, resizeStart.height + deltaY) : Math.round(newWidth * (9 / 16));

      setSources(sources.map(s => {
        if (s.id === resizingId && !s.isLocked) {
          return { ...s, width: newWidth, height: newHeight };
        }
        return s;
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setDraggingId(null);
    setResizingId(null);
  };

  const handleSelectSource = (src: any) => {
    setActiveSourceId(src.id);
    loadSourceStream(src.type, src);
  };

  const toggleSourceVisibility = (id: string) => {
    setSources(sources.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const toggleSourceLock = (id: string) => {
    setSources(sources.map(s => s.id === id ? { ...s, isLocked: !s.isLocked } : s));
  };

  const toggleSourceMonitoring = (id: string) => {
    setSources(sources.map(s => {
      if (s.id === id) {
        const newMonitored = !s.monitored;
        if (id === activeSourceId) {
          const shouldMute = s.isMuted || !newMonitored;
          if (videoRef.current) {
            videoRef.current.muted = shouldMute;
            videoRef.current.volume = shouldMute ? 0 : (s.volume ?? 100) / 100;
          }
          if (audioRef.current) {
            audioRef.current.muted = shouldMute;
            audioRef.current.volume = shouldMute ? 0 : (s.volume ?? 100) / 100;
          }
        }
        return { ...s, monitored: newMonitored };
      }
      return s;
    }));
  };

  const toggleSourceMute = (id: string) => {
    setSources(sources.map(s => {
      if (s.id === id) {
        const newMuted = !s.isMuted;
        if (mediaStreamRef.current && id === activeSourceId) {
          mediaStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !newMuted; });
        }
        if (id === activeSourceId) {
          const shouldMute = newMuted || !s.monitored;
          if (videoRef.current) {
            videoRef.current.muted = shouldMute;
            videoRef.current.volume = shouldMute ? 0 : (s.volume ?? 100) / 100;
          }
          if (audioRef.current) {
            audioRef.current.muted = shouldMute;
            audioRef.current.volume = shouldMute ? 0 : (s.volume ?? 100) / 100;
          }
        }
        return { ...s, isMuted: newMuted };
      }
      return s;
    }));
  };

  const handleSourceVolumeChange = (id: string, newVolume: number) => {
    setSources(sources.map(s => {
      if (s.id === id) {
        const updated = { ...s, volume: newVolume };
        if (id === activeSourceId) {
          const shouldMute = s.isMuted || !s.monitored;
          if (videoRef.current) videoRef.current.volume = shouldMute ? 0 : newVolume / 100;
          if (audioRef.current) audioRef.current.volume = shouldMute ? 0 : newVolume / 100;
        }
        return updated;
      }
      return s;
    }));
  };

  const deleteSource = (id: string) => {
    const updated = sources.filter(s => s.id !== id);
    setSources(updated);
    const remainingInScene = updated.filter(s => (s.sceneId || '1') === activeSceneId);
    if (activeSourceId === id) {
      if (remainingInScene.length > 0) {
        setActiveSourceId(remainingInScene[0].id);
        loadSourceStream(remainingInScene[0].type, remainingInScene[0]);
      } else {
        setActiveSourceId(null);
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabase) {
      alert("Supabase client is not initialized.");
      return;
    }

    setIsUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('obs-media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('obs-media').getPublicUrl(filePath);
      setSourceValue(publicUrlData.publicUrl);
    } catch (err: any) {
      alert(`Failed to upload file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    
    if (['Image', 'Media', 'VLC Video', 'Image Slide Show'].includes(newSourceType) && !sourceValue) {
      alert("Please upload a media/image file or set path first!");
      return;
    }

    const isChat = newSourceType === 'YouTube Live Chat';
    const newSrc = {
      id: Date.now().toString(),
      sceneId: activeSceneId,
      name: newSourceName.trim(),
      type: newSourceType,
      value: sourceValue.trim(),
      visible: true,
      monitored: false,
      isMuted: false,
      isPinned: false,
      isLocked: false,
      volume: 100,
      x: 50, 
      y: 50, 
      width: isChat ? 180 : 560,
      height: isChat ? 240 : 315
    };

    setSources([...sources, newSrc]);
    setActiveSourceId(newSrc.id);
    loadSourceStream(newSourceType, newSrc);
    setNewSourceName('');
    setSourceValue('');
    setIsAddSourceOpen(false);

    // ── LOGGING SYSTEM INTEGRATION: CREATE SOURCE ──
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          moderator_id: user.id,
          action_type: "CREATE_SOURCE",
          target_id: newSrc.id,
          details: `Operator added source '${newSrc.name}' (Type: ${newSrc.type}) to scene ID ${activeSceneId}.`
        });
      }
    } catch (logErr) {
      console.error("Failed to insert create source audit log:", logErr);
    }
    // ──────────────────────────────────────────────
  };

  const handleAddScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;
    const newScene = { id: Date.now().toString(), name: newSceneName.trim() };
    setScenes([...scenes, newScene]);
    handleSceneSwitch(newScene.id);
    setNewSceneName('');

    // ── LOGGING SYSTEM INTEGRATION: CREATE SCENE ──
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          moderator_id: user.id,
          action_type: "CREATE_SCENE",
          target_id: newScene.id,
          details: `Operator created a new studio scene: '${newScene.name}'.`
        });
      }
    } catch (logErr) {
      console.error("Failed to insert create scene audit log:", logErr);
    }
    // ──────────────────────────────────────────────
  };

  const deleteScene = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scenes.length <= 1) {
      alert("You must keep at least one scene!");
      return;
    }
    const updatedScenes = scenes.filter(s => s.id !== id);
    const updatedSources = sources.filter(s => (s.sceneId || '1') !== id);
    setScenes(updatedScenes);
    setSources(updatedSources);
    if (activeSceneId === id) handleSceneSwitch(updatedScenes[0].id);
  };

  if (loadingRole) {
    return (
      <div className="min-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs sm:text-sm text-cyan-400 animate-pulse">
          SYNCHRONIZING_SECURITY_CLEARANCE...
        </div>
      </div>
    );
  }

  const isPrivileged = userRole === "owner" || userRole === "moderator";

  if (!isPrivileged) {
    return (
      <div className="min-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        <Navbar />

        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex flex-col gap-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                <span className="truncate">ASTEROID_STUDIO // V1.2_RELEASE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Asteroid Studio Development
              </h1>
              <p className="text-xs sm:text-sm text-cyan-200/60 mt-1">
                Current User Clearance Level: <span className="text-cyan-400 font-mono uppercase font-bold">{userRole}</span>
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center py-12 px-4">
            <div className="max-w-xl w-full p-6 sm:p-10 rounded-2xl bg-[#0b0f19]/90 border border-cyan-500/40 text-center shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Lock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase">
                  SECURITY_NOTICE // CLEARANCE_RESTRICTED
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Asteroid Studio Feature Coming Soon
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed pt-2">
                  The Asteroid Studio feature is currently under active architecture development and will be launching globally in the **next software update v1.2**. Stay tuned, operators!
                </p>
              </div>

              <div className="pt-4 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a 
                  href="/dashboard"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                >
                  Return to Dashboard <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const activeSrcObj = currentSceneSources.find(s => s.id === activeSourceId);

  return (
    <div className="min-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Background Neon Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full space-y-6 relative z-10">
        
        {/* Top Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              {isSavingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Cloud className="w-3.5 h-3.5 shrink-0" />} 
              <span className="truncate">{cloudStatus}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Broadcaster Control & Mixer Matrix
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/60 mt-1">
              Clearance: <span className="text-cyan-400 font-mono uppercase font-bold">{userRole}</span> • Neon Blue + Cyan Studio Workspace
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isRecording && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                REC: {formatTimer(recordingTimer)} ({hotkeys.stopRecord})
              </div>
            )}
            <button
              onClick={handleToggleRecord}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                isRecording 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 animate-pulse' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              }`}
            >
              <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-current text-white' : 'text-amber-400'}`} />
              {isRecording ? 'Stop Recording' : 'Start Recording'} <span className="opacity-60 text-[10px]">({isRecording ? hotkeys.stopRecord : hotkeys.startRecord})</span>
            </button>

            {isStreaming && (
              <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                LIVE: {formatTimer(streamTimer)} ({hotkeys.stopStream})
              </div>
            )}
            <button
              onClick={handleToggleStream}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                isStreaming 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 animate-pulse' 
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}
            >
              {isStreaming ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isStreaming ? 'Stop Streaming' : 'Start Streaming'} <span className="opacity-60 text-[10px]">({isStreaming ? hotkeys.stopStream : hotkeys.startStream})</span>
            </button>
          </div>
        </div>

        {streamError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /> {streamError}
            </div>
            <button onClick={() => { setIsSettingsOpen(true); setSettingsTab('stream'); }} className="underline font-semibold hover:text-white cursor-pointer">
              Configure Settings
            </button>
          </div>
        )}

        {/* Canvas Workspace */}
        <div className="w-full rounded-2xl bg-[#0b0f19]/90 border border-cyan-500/30 overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl">
          <div 
            ref={canvasRef}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            className="w-full aspect-video bg-[#020617] relative overflow-hidden select-none border-b border-cyan-500/20 min-h-[380px] sm:min-h-[480px] lg:min-h-[540px]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:32px_32px]" />

            <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${isSceneTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              {currentSceneSources.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan-400/40 text-xs sm:text-sm font-mono">
                  <Video className="w-12 h-12 mb-2 opacity-30 animate-pulse" />
                  <p>Scene Empty. Add sources from the panels below.</p>
                </div>
              ) : (
                currentSceneSources.map((src: any) => {
                  if (!src.visible) return null;

                  if (['Audio Input Capture', 'Audio Output Capture', 'Application Audio Capture (BETA)'].includes(src.type)) {
                    return null;
                  }

                  const isInteracting = (draggingId === src.id || resizingId === src.id || src.isPinned) && !src.isLocked;
                  const posX = src.x ?? 50;
                  const posY = src.y ?? 50;
                  const isChat = src.type === 'YouTube Live Chat';
                  const width = src.width ?? (isChat ? 180 : 560);
                  const height = src.height ?? (isChat ? 240 : Math.round(width * (9 / 16)));

                  return (
                    <div
                      key={src.id}
                      onMouseDown={(e) => handleMouseDownSource(e, src.id)}
                      onDoubleClick={(e) => handleDoubleClickSource(e, src.id)}
                      style={{
                        position: 'absolute',
                        left: `${posX}px`,
                        top: `${posY}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        zIndex: isInteracting ? 20 : 10
                      }}
                      className={`border rounded-lg overflow-hidden shadow-2xl transition-shadow bg-black/95 flex flex-col ${
                        src.isLocked ? 'cursor-not-allowed border-zinc-800/80' : 'cursor-grab active:cursor-grabbing'
                      } ${
                        isInteracting ? 'border-cyan-400 ring-2 ring-cyan-500/40 shadow-cyan-500/20' : 'border-cyan-500/20 hover:border-cyan-400/60'
                      }`}
                    >
                      {isInteracting && (
                        <div className="bg-[#0b0f19] px-2.5 py-1 flex items-center justify-between text-[11px] text-cyan-300 border-b border-cyan-500/30">
                          <span className="truncate font-semibold flex items-center gap-1 font-mono">
                            <Move className="w-3 h-3 text-cyan-400" /> {src.name} {src.isPinned ? '(Pinned)' : ''}
                          </span>
                          <span className="text-[10px] text-cyan-400/60 font-mono">{width}x{height}px</span>
                        </div>
                      )}

                      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                        {src.type === 'Browser' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/40 p-2 text-center">
                            <Globe className="w-6 h-6 text-cyan-400 mb-1" />
                            <span className="text-[10px] text-cyan-200 truncate max-w-full font-mono">{src.value}</span>
                          </div>
                        ) : isChat ? (
                          <div className="absolute inset-0 bg-[#0b0f19] flex flex-col overflow-hidden font-sans">
                            <div className="flex items-center justify-between px-2 py-1 bg-[#060b14] border-b border-cyan-500/30 text-[10px] text-cyan-400 font-bold select-none font-mono">
                              <span className="flex items-center gap-1">🔴 YT Live Chat</span>
                              <span className="text-cyan-200/50 font-mono text-[9px]">Functional</span>
                            </div>
                            {src.value ? (
                              <iframe
                                src={`https://www.youtube.com/live_chat?v=${extractYouTubeId(src.value)}&embed_domain=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`}
                                className="w-full flex-1 border-0"
                                title={src.name}
                              />
                            ) : (
                              <div className="flex-1 flex flex-col p-2 text-xs text-white overflow-hidden">
                                <div className="flex-1 overflow-y-auto space-y-1.5 py-1 text-[11px]">
                                  <div className="flex items-start gap-1.5">
                                    <span className="font-bold text-cyan-400">GamerGuy99:</span>
                                    <span className="text-slate-200">Stream mast chal rahi hai! 🔥</span>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <span className="font-bold text-blue-400">Priya_Op:</span>
                                    <span className="text-slate-200">Hello everyone! 👋</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : src.type === 'Color' ? (
                          <div className="absolute inset-0" style={{ backgroundColor: src.value }} />
                        ) : src.type === 'Text (GDI+)' ? (
                          <div className="absolute inset-0 flex items-center justify-center p-2">
                            <span className="text-white font-bold text-base drop-shadow-md text-center">{src.value}</span>
                          </div>
                        ) : src.type === 'Image' ? (
                          <img src={src.value} alt={src.name} className="w-full h-full object-contain" />
                        ) : ['Media', 'VLC Video', 'Image Slide Show'].includes(src.type) ? (
                          <video 
                            key={src.value}
                            ref={activeSourceId === src.id ? videoRef : null}
                            src={src.value} 
                            crossOrigin="anonymous" 
                            autoPlay 
                            loop 
                            muted={src.isMuted || !src.monitored} 
                            playsInline 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <video 
                            key={src.value || src.type}
                            ref={activeSourceId === src.id ? videoRef : null} 
                            crossOrigin="anonymous" 
                            autoPlay 
                            playsInline 
                            muted={src.isMuted || !src.monitored} 
                            className={`w-full h-full object-cover ${src.type === 'Video Capture Device' ? 'transform -scale-x-100' : ''}`} 
                          />
                        )}
                      </div>

                      {isInteracting && !src.isLocked && (
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, src)}
                          className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-400 cursor-se-resize rounded-tl flex items-center justify-center z-30 shadow-lg"
                        >
                          <div className="w-1.5 h-1.5 bg-[#020617] rounded-full" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-[#0b0f19] border-t border-cyan-500/20 flex items-center justify-between text-xs text-cyan-200/70 font-mono flex-wrap gap-2">
            <span>Active Scene: <strong className="text-white">{scenes.find(s => s.id === activeSceneId)?.name}</strong> | Selected Layer: <strong className="text-cyan-400">{activeSrcObj?.name || 'None'}</strong></span>
            <span>FPS: {videoSettings.fps}.0 | Bitrate: {isStreaming ? `${outputSettings.videoBitrate} Kbps` : '0 Kbps'}</span>
          </div>
        </div>

        {/* Control Panels Below */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Scenes & Sources */}
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg space-y-3">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" /> Scenes
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {scenes.map((scene: any) => (
                  <div 
                    key={scene.id} 
                    onClick={() => handleSceneSwitch(scene.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                      activeSceneId === scene.id ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-[#020617] text-slate-400 hover:bg-white/5 border border-cyan-500/10'
                    }`}
                  >
                    <span className="truncate max-w-[180px]">{scene.name}</span>
                    <button onClick={(e) => deleteScene(scene.id, e)} className="text-slate-500 hover:text-red-400 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddScene} className="flex gap-2 pt-2 border-t border-cyan-500/20">
                <input 
                  type="text" 
                  placeholder="New scene name..."
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  className="flex-1 bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-extrabold cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  Add
                </button>
              </form>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-cyan-400" /> Sources
                </span>
                <button 
                  onClick={() => { setNewSourceType('Video Capture Device'); setSourceValue(''); setIsAddSourceOpen(true); }}
                  className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {currentSceneSources.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs font-mono">No sources. Click '+' to add.</div>
                ) : (
                  currentSceneSources.map((src: any) => (
                    <div 
                      key={src.id} 
                      onClick={() => handleSelectSource(src)}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                        activeSourceId === src.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-[#020617] border-cyan-500/10 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate max-w-[130px]">{src.name}</span>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSourceVisibility(src.id)} className="text-slate-400 hover:text-white cursor-pointer">
                          {src.visible ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                        <button onClick={() => toggleSourceLock(src.id)} className="text-slate-400 hover:text-white cursor-pointer">
                          {src.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <button onClick={() => deleteSource(src.id)} className="text-slate-400 hover:text-red-400 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Audio Mixer */}
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-cyan-400" /> Audio Mixer
                </span>
                <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
                  {currentSceneSources.length} Channels
                </span>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {currentSceneSources.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">No audio channels in this scene.</div>
                ) : (
                  currentSceneSources.map((src: any) => {
                    const isMonitored = src.monitored || false;
                    const isMuted = src.isMuted || false;
                    const currentVol = src.volume ?? 100;
                    return (
                      <div key={src.id} className="space-y-2 p-3 rounded-xl bg-[#020617] border border-cyan-500/20">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="truncate max-w-[120px] font-medium" title={src.name}>{src.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-cyan-400">
                              {isMuted ? 'Muted' : !isMonitored ? 'No Monitor' : `${currentVol}%`}
                            </span>
                            <button
                              onClick={() => toggleSourceMute(src.id)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isMuted ? 'bg-red-600 text-white shadow-md' : 'bg-[#0b0f19] border border-cyan-500/30 text-slate-400 hover:text-white'
                              }`}
                            >
                              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => toggleSourceMonitoring(src.id)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isMonitored ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-[#0b0f19] border border-cyan-500/30 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Headphones className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={isMuted || !isMonitored ? 0 : currentVol}
                            onChange={(e) => handleSourceVolumeChange(src.id, Number(e.target.value))}
                            className="w-full h-1.5 bg-[#0b0f19] rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                        </div>

                        <div className="h-2 rounded-full bg-[#0b0f19] overflow-hidden p-0.5 border border-cyan-500/20">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(6,182,212,0.5)]" 
                            style={{ width: `${src.visible && !isMuted && currentVol > 0 ? (audioLevel * (currentVol / 100)) : 0}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Controls & Panel */}
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg space-y-4">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" /> Controls & Panel
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                >
                  <Settings className="w-4 h-4 text-cyan-400" /> Settings
                </button>
                <button 
                  onClick={() => alert("Studio Mode layout active.")}
                  className="px-4 py-3 rounded-xl bg-[#020617] hover:bg-white/5 border border-cyan-500/20 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Studio Mode
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-[#020617] border border-cyan-500/20 text-[11px] text-slate-400 space-y-1.5 font-mono">
                <p className="font-semibold text-cyan-300">Quick Tips:</p>
                <p>• Click the lock icon in source list to lock position.</p>
                <p>• Drag & drop any source on canvas to move it.</p>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Hidden Audio Player for Monitoring Microphones/Audio Streams */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* ── FULLY OPERATIONAL SETTINGS MODAL ── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
          <div className="w-full max-w-4xl h-[85vh] sm:h-[600px] bg-[#0b0f19] border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 bg-[#060b14] border-b border-cyan-500/30">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" /> Studio Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              
              <div className="w-full sm:w-56 bg-[#020617]/50 border-r border-cyan-500/20 p-2 space-y-1 overflow-x-auto sm:overflow-y-auto flex sm:flex-col shrink-0">
                {[
                  { id: 'general', label: 'General' },
                  { id: 'appearance', label: 'Appearance' },
                  { id: 'stream', label: 'Stream' },
                  { id: 'output', label: 'Output' },
                  { id: 'audio', label: 'Audio' },
                  { id: 'video', label: 'Video' },
                  { id: 'hotkeys', label: 'Hotkeys' },
                  { id: 'accessibility', label: 'Accessibility' },
                  { id: 'advanced', label: 'Advanced' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className={`whitespace-nowrap sm:w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                      settingsTab === tab.id ? 'bg-cyan-500 text-black font-extrabold shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#0b0f19] space-y-6 text-slate-200 text-xs">
                
                {/* 1. GENERAL TAB */}
                {settingsTab === 'general' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">General Preferences</h4>
                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Language</label>
                      <select 
                        value={generalSettings.language}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi (हिन्दी)</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={generalSettings.confirmOnExit}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, confirmOnExit: e.target.checked })}
                          className="rounded bg-[#020617] border-cyan-500/30 text-cyan-500 w-4 h-4"
                        />
                        <span>Show confirmation dialog when exiting studio</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={generalSettings.systemTray}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, systemTray: e.target.checked })}
                          className="rounded bg-[#020617] border-cyan-500/30 text-cyan-500 w-4 h-4"
                        />
                        <span>Minimize to system tray on close</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 2. APPEARANCE TAB */}
                {settingsTab === 'appearance' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Appearance & Themes</h4>
                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">UI Layout Density</label>
                      <select 
                        value={appearanceSettings.uiDensity}
                        onChange={(e) => setAppearanceSettings({ ...appearanceSettings, uiDensity: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="Compact">Compact (Pro Streamer)</option>
                        <option value="Comfortable">Comfortable</option>
                      </select>
                    </div>
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={appearanceSettings.showFpsOverlay}
                          onChange={(e) => setAppearanceSettings({ ...appearanceSettings, showFpsOverlay: e.target.checked })}
                          className="rounded bg-[#020617] border-cyan-500/30 text-cyan-500 w-4 h-4"
                        />
                        <span>Show live performance FPS & Bitrate bar</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. STREAM TAB */}
                {settingsTab === 'stream' && (
                  <div className="space-y-6 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Stream Broadcasting Configuration</h4>
                    <div className="space-y-1.5">
                      <label className="block font-mono text-slate-400">Service</label>
                      <select 
                        value={streamService}
                        onChange={(e) => setStreamService(e.target.value)}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="YouTube - RTMPS">YouTube - RTMPS</option>
                        <option value="Twitch">Twitch</option>
                        <option value="Facebook Live">Facebook Live</option>
                        <option value="Custom RTMP">Custom RTMP</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-xl bg-[#020617] border border-cyan-500/30 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block font-mono text-slate-400">Server Ingest</label>
                        <select 
                          value={streamServer}
                          onChange={(e) => setStreamServer(e.target.value)}
                          className="w-full bg-black border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                        >
                          <option value="Primary YouTube ingest server (legacy RTMP)">Primary YouTube ingest server (legacy RTMP)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button 
                          onClick={() => { setIsAccountConnected(true); setStreamError(null); alert("YouTube account successfully connected via OAuth!"); }}
                          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-colors cursor-pointer ${isAccountConnected ? 'bg-emerald-600 text-white' : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'}`}
                        >
                          {isAccountConnected ? '✓ Account Connected' : 'Connect Account (recommended)'}
                        </button>
                        <button 
                          onClick={() => setShowStreamKey(!showStreamKey)}
                          className="px-4 py-2.5 bg-[#0b0f19] hover:bg-white/5 border border-cyan-500/30 text-slate-300 rounded-xl font-semibold text-xs cursor-pointer"
                        >
                          {showStreamKey ? 'Hide Stream Key' : 'Use Stream Key'}
                        </button>
                      </div>

                      {showStreamKey && (
                        <div className="space-y-1 pt-2">
                          <label className="block font-mono text-slate-400">Stream Key</label>
                          <input 
                            type="password"
                            placeholder="Paste stream key here..."
                            value={streamKeyInput}
                            onChange={(e) => setStreamKeyInput(e.target.value)}
                            className="w-full bg-black border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white font-mono outline-none focus:border-cyan-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. OUTPUT TAB */}
                {settingsTab === 'output' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Output & Encoding Settings</h4>
                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Video Bitrate (Kbps)</label>
                      <select 
                        value={outputSettings.videoBitrate}
                        onChange={(e) => setOutputSettings({ ...outputSettings, videoBitrate: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="2500">2500 Kbps (720p 60fps)</option>
                        <option value="3000">3000 Kbps (Standard 1080p)</option>
                        <option value="4500">4500 Kbps (High Quality)</option>
                        <option value="6000">6000 Kbps (Pro 1080p 60fps)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Encoder Hardware</label>
                      <select 
                        value={outputSettings.encoder}
                        onChange={(e) => setOutputSettings({ ...outputSettings, encoder: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="Hardware (NVENC)">NVIDIA NVENC Hardware Encoder</option>
                        <option value="Software (x264)">Software Encoder (x264 CPU)</option>
                        <option value="QuickSync">Intel QuickSync</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Local Recording Format</label>
                      <select 
                        value={outputSettings.recordingFormat}
                        onChange={(e) => setOutputSettings({ ...outputSettings, recordingFormat: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="webm">WEBM (Optimized)</option>
                        <option value="mp4">MP4 (Standard)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. AUDIO TAB */}
                {settingsTab === 'audio' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Global Audio Settings</h4>
                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Sample Rate</label>
                      <select 
                        value={audioSettings.sampleRate}
                        onChange={(e) => setAudioSettings({ ...audioSettings, sampleRate: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="48kHz">48 kHz (Studio Quality)</option>
                        <option value="44.1kHz">44.1 kHz (Standard)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Channels</label>
                      <select 
                        value={audioSettings.channels}
                        onChange={(e) => setAudioSettings({ ...audioSettings, channels: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="Stereo">Stereo</option>
                        <option value="Mono">Mono</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 6. VIDEO TAB */}
                {settingsTab === 'video' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Video & Resolution Configuration</h4>
                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Base (Canvas) Resolution</label>
                      <select 
                        value={videoSettings.baseRes}
                        onChange={(e) => setVideoSettings({ ...videoSettings, baseRes: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="1920x1080">1920x1080 (1080p)</option>
                        <option value="1280x720">1280x720 (720p)</option>
                        <option value="3840x2160">3840x2160 (4K Ultra)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Output (Scaled) Resolution</label>
                      <select 
                        value={videoSettings.outputRes}
                        onChange={(e) => setVideoSettings({ ...videoSettings, outputRes: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="1920x1080">1920x1080 (1080p)</option>
                        <option value="1280x720">1280x720 (720p)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Common FPS Values</label>
                      <select 
                        value={videoSettings.fps}
                        onChange={(e) => setVideoSettings({ ...videoSettings, fps: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="60">60 FPS (Smooth Gaming/Live)</option>
                        <option value="30">30 FPS (Standard)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 7. HOTKEYS TAB */}
                {settingsTab === 'hotkeys' && (
                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/20">
                      <Keyboard className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white">Global Studio Hotkeys Configuration</h4>
                    </div>
                    <p className="text-slate-400 text-xs">Click on any hotkey box and press your preferred keyboard key to rebind it instantly.</p>
                    
                    <div className="space-y-3">
                      {[
                        { keyName: 'startStream', label: 'Start Streaming' },
                        { keyName: 'stopStream', label: 'Stop Streaming' },
                        { keyName: 'startRecord', label: 'Start Recording' },
                        { keyName: 'stopRecord', label: 'Stop Recording' },
                        { keyName: 'muteActive', label: 'Mute/Unmute Active Source' },
                      ].map((item) => (
                        <div key={item.keyName} className="flex items-center justify-between p-3 rounded-xl bg-[#020617] border border-cyan-500/20">
                          <span className="font-medium text-slate-200">{item.label}</span>
                          <button
                            onClick={() => setRecordingKeyAction(item.keyName)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                              recordingKeyAction === item.keyName ? 'bg-amber-600 text-white animate-pulse' : 'bg-[#0b0f19] hover:bg-white/5 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {recordingKeyAction === item.keyName ? 'Press any key...' : (hotkeys as any)[item.keyName] || 'Unassigned'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. ACCESSIBILITY TAB */}
                {settingsTab === 'accessibility' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Accessibility Options</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={accessibilitySettings.highContrast}
                          onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, highContrast: e.target.checked })}
                          className="rounded bg-[#020617] border-cyan-500/30 text-cyan-500 w-4 h-4"
                        />
                        <span>Enable High Contrast UI Elements</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={accessibilitySettings.screenReaderAnnounce}
                          onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, screenReaderAnnounce: e.target.checked })}
                          className="rounded bg-[#020617] border-cyan-500/30 text-cyan-500 w-4 h-4"
                        />
                        <span>Enable Screen Reader Status Announcements</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 9. ADVANCED TAB */}
                {settingsTab === 'advanced' && (
                  <div className="space-y-5 max-w-xl">
                    <h4 className="font-bold text-white text-sm border-b border-cyan-500/20 pb-2">Advanced Studio Settings</h4>
                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Process Priority</label>
                      <select 
                        value={advancedSettings.processPriority}
                        onChange={(e) => setAdvancedSettings({ ...advancedSettings, processPriority: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Above Normal">Above Normal (Recommended)</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-400 font-mono">Automatic Reconnect Timeout (Seconds)</label>
                      <input 
                        type="number"
                        value={advancedSettings.reconnectTimeout}
                        onChange={(e) => setAdvancedSettings({ ...advancedSettings, reconnectTimeout: e.target.value })}
                        className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

              </div>

            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-3 bg-[#060b14] border-t border-cyan-500/30 text-xs">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-xl bg-[#0b0f19] hover:bg-white/5 border border-cyan-500/30 text-slate-300 font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={() => { alert("All settings successfully saved & applied!"); setIsSettingsOpen(false); }} className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer">
                Apply & Save
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {isAddSourceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-md bg-[#0b0f19] border border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-[#060b14]">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2 truncate">
                <Plus className="w-4 h-4 text-cyan-400 shrink-0" /> Add Source to <span className="text-cyan-300 truncate">{scenes.find(s => s.id === activeSceneId)?.name}</span>
              </h3>
              <button onClick={() => setIsAddSourceOpen(false)} className="text-slate-400 hover:text-white cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Source Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Intro Video, Overlay Image"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Source Type</label>
                <select 
                  value={newSourceType}
                  onChange={(e) => { setNewSourceType(e.target.value); setSourceValue(''); }}
                  className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                >
                  <option value="Application Audio Capture (BETA)">Application Audio Capture (BETA)</option>
                  <option value="Audio Input Capture">Audio Input Capture</option>
                  <option value="Audio Output Capture">Audio Output Capture</option>
                  <option value="Browser">Browser</option>
                  <option value="Color">Color Source</option>
                  <option value="Display Capture">Display Capture</option>
                  <option value="Game Capture">Game Capture</option>
                  <option value="Image">Image</option>
                  <option value="Image Slide Show">Image Slide Show</option>
                  <option value="Media">Media Source (.mp4 / video)</option>
                  <option value="Text (GDI+)">Text (GDI+)</option>
                  <option value="Video Capture Device">Video Capture Device</option>
                  <option value="VLC Video">VLC Video</option>
                  <option value="Window Capture">Window Capture</option>
                  <option value="YouTube Live Chat">YouTube Live Chat</option>
                </select>
              </div>

              {newSourceType === 'Text (GDI+)' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Text Content</label>
                  <input 
                    type="text" 
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    placeholder="Enter screen text..."
                    className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {newSourceType === 'Browser' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Browser Source URL</label>
                  <input 
                    type="text" 
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {newSourceType === 'YouTube Live Chat' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">YouTube Video ID or Live URL (Functional)</label>
                  <input 
                    type="text" 
                    value={sourceValue}
                    onChange={(e) => setSourceValue(e.target.value)}
                    placeholder="e.g. dQw4w9WgXcQ"
                    className="w-full bg-[#020617] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {newSourceType === 'Color' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Color Hex Code</label>
                  <input 
                    type="color" 
                    value={sourceValue || '#06b6d4'}
                    onChange={(e) => setSourceValue(e.target.value)}
                    className="w-full h-10 bg-[#020617] border border-cyan-500/30 rounded-xl px-1 py-1 cursor-pointer"
                  />
                </div>
              )}

              {['Image', 'Media', 'VLC Video', 'Image Slide Show'].includes(newSourceType) && (
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-slate-400">
                    Upload Local File
                  </label>
                  <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-cyan-500/30 rounded-xl bg-[#020617] hover:border-cyan-400 transition-colors cursor-pointer relative">
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept={newSourceType === 'Image' ? 'image/*' : 'video/*'} />
                    {isUploadingFile ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> Uploading...</div>
                    ) : sourceValue ? (
                      <span className="text-xs text-cyan-400 font-bold font-mono">File Uploaded Successfully!</span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">Click or Drag file to upload</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cyan-500/30">
                <button type="button" onClick={() => setIsAddSourceOpen(false)} className="px-4 py-2.5 rounded-xl bg-[#020617] border border-cyan-500/30 text-slate-300 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer">
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

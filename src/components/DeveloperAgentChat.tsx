import React, { useState, useEffect, useRef } from "react";
import { safeFetchJson } from "../lib/fetchUtils";
import {
  DEVELOPER_COMMANDS,
  DEVELOPER_COMMAND_CATEGORIES,
  DeveloperCommand
} from "../data/developerCommands";
import {
  Bot,
  Send,
  Volume2,
  VolumeX,
  Play,
  Square,
  RefreshCw,
  Cpu,
  Zap,
  Sparkles,
  Check,
  Copy,
  AlertTriangle,
  Code,
  Wrench,
  HelpCircle,
  X,
  Maximize2,
  Minimize2,
  Minus,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Pin,
  PinOff,
  Move,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Eye,
  Sliders,
  Moon,
  Sun,
  Globe,
  Radio,
  Image as ImageIcon,
  Download,
  FileCode,
  Search,
  Settings,
  Palette,
  Terminal,
  Activity,
  Plus,
  FilePlus,
  Key,
  FolderTree,
  Table,
  Filter,
  Trash2,
  Edit3,
  Server,
  Database,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Lock,
  Unlock,
  CheckCircle,
  Hash,
  ClipboardList,
  AlertOctagon,
  Info,
  ListChecks,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  ArrowLeft,
  Hand,
  Cloud,
  Compass,
  Smartphone,
  TrendingUp,
  Camera,
  UploadCloud,
  Paperclip,
  ScanLine
} from "lucide-react";

export interface AgentActivityLog {
  id: string;
  type: "error" | "success" | "warning" | "info";
  title: string;
  description: string;
  timestamp: string;
  timestampMs: number;
  source?: string;
  details?: any;
  durationMs?: number;
}

export interface AgentActionData {
  type:
    | "generate_image"
    | "modify_ui_theme"
    | "file_write"
    | "file_read"
    | "file_search"
    | "system_diagnostics"
    | "navigation"
    | "code_patch"
    | "file_delete"
    | "file_tree"
    | "get_keys_table"
    | "rotate_key"
    | "reset_keys_status"
    | "get_live_stats"
    | "check_r2_status"
    | "check_seo_sitemap"
    | "check_firebase_quota"
    | "check_agents_rules";
  title: string;
  status: "pending" | "success" | "error";
  imageUrl?: string;
  imagePrompt?: string;
  codeSnippet?: string;
  filePath?: string;
  diagnostics?: any;
  tableData?: any[];
  summary?: any;
  message?: string;
}

export interface AgentChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  modelUsed?: string;
  keyUsedLabel?: string;
  audioBase64?: string;
  voiceKeyLabel?: string;
  isError?: boolean;
  actionExecuted?: string;
  actionData?: AgentActionData;
  imageUrl?: string;
  imageMimeType?: string;
  imageFileName?: string;
  imageSizeKb?: number;
}

export interface TaskExecutionState {
  isActive: boolean;
  taskId: string;
  taskName: string;
  currentStep: string;
  progress: number;
  status: "idle" | "running" | "success" | "error";
  resultMessage?: string;
  details?: string;
  startTime?: number;
  durationMs?: number;
}

export type WindowSizePreset = "compact" | "standard" | "pro" | "fullscreen";

export interface DeveloperAgentChatProps {
  getIdTokenHelper?: () => string;
  initialContext?: {
    activeTab?: string;
    tabId?: string;
    tabTitle?: string;
    contextData?: any;
    totalApps?: number;
    adminEmail?: string;
    [key: string]: any;
  };
  onClose?: () => void;
  isFloatingModal?: boolean;
  onNavigate?: (view: "home" | "admin" | "privacy" | "app", id?: string) => void;
  onTabChange?: (tab: string) => void;
  onToggleDarkMode?: () => void;
  onToggleLanguage?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onRefreshApps?: () => void;
  onRefreshSettings?: () => void;
}

export const DeveloperAgentChat: React.FC<DeveloperAgentChatProps> = ({
  getIdTokenHelper,
  initialContext,
  onClose,
  isFloatingModal = false,
  onNavigate,
  onTabChange,
  onToggleDarkMode,
  onToggleLanguage,
  isPinned = false,
  onTogglePin,
  onRefreshApps,
  onRefreshSettings
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "msg_welcome",
      sender: "agent",
      text: "أهلاً بك يا مطورنا العزيز! 👋 أنا وكيل المطور الذكي المتكامل المعتمد على محركات الذكاء الاصطناعي الفائقة وصوت ElevenLabs الطبيعي.\n\n✨ **القدرات المتاحة في الشريط العلوي:**\n• **📄 ملف جديد**: إنشاء أي ملف في مسار المشروع بنقرة واحدة.\n• **⚡ تعديل كود**: تصحيح واستبدال الأكواد والوظائف البرمجية فوراً.\n• **🔑 جدول المفاتيح**: استعراض كافة المفاتيح المشفرة وحالتها وإعادة تفعيلها أو إدراجها داخل المحادثة.\n• **🔄 تبديل النماذج**: تدوير وتبديل مفاتيح Groq و Gemini و ElevenLabs بضغطة زر.\n• **📂 شجرة الملفات**: استكشاف كامل ملفات المشروع ومجلداته بحرية.",
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      modelUsed: "llama-3.3-70b-versatile",
      keyUsedLabel: "Proq/Groq LLaMA Primary Engine"
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState("llama-3.3-70b-versatile");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Window Sizing & Minimization States
  const [sizePreset, setSizePreset] = useState<WindowSizePreset>("standard");
  const [isMinimized, setIsMinimized] = useState(false);
  const [customWidth, setCustomWidth] = useState(540);
  const [customHeight, setCustomHeight] = useState(680);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [sizeToast, setSizeToast] = useState<{ visible: boolean; label: string; icon: string } | null>(null);

  // 📷 Multimodal Image Attachment State (Gemini Vision OCR & Analysis)
  const [selectedImage, setSelectedImage] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
    fileName: string;
    sizeKb: number;
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Task Progress State
  const [taskState, setTaskState] = useState<TaskExecutionState>({
    isActive: false,
    taskId: "",
    taskName: "",
    currentStep: "",
    progress: 0,
    status: "idle"
  });

  // Modal / Drawer States for Top Ribbon Actions
  const [showKeysTableModal, setShowKeysTableModal] = useState(false);
  const [keysTableData, setKeysTableData] = useState<any[] | null>(null);
  const [keysSummary, setKeysSummary] = useState<any | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [selectedKeyProviderFilter, setSelectedKeyProviderFilter] = useState("all");
  const [keysSearchQuery, setKeysSearchQuery] = useState("");

  const [showFileCreatorModal, setShowFileCreatorModal] = useState(false);
  const [newFilePath, setNewFilePath] = useState("src/components/MyNewWidget.tsx");
  const [newFileContent, setNewFileContent] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  const [showFilePatcherModal, setShowFilePatcherModal] = useState(false);
  const [patchFilePath, setPatchFilePath] = useState("");
  const [patchTargetText, setPatchTargetText] = useState("");
  const [patchReplacementText, setPatchReplacementText] = useState("");
  const [isPatchingFile, setIsPatchingFile] = useState(false);

  const [showFileTreeModal, setShowFileTreeModal] = useState(false);
  const [fileTreeData, setFileTreeData] = useState<any[] | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");

  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // ⚡ 25+ DEVELOPER COMMANDS & SCROLLABLE RIBBON STATES
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [selectedCommandCategory, setSelectedCommandCategory] = useState<string>("all");
  const [copiedCommandPrompt, setCopiedCommandPrompt] = useState<string | null>(null);

  // Ribbon Drag-to-Scroll References & States
  const ribbonScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingRibbon, setIsDraggingRibbon] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasDraggedRibbon, setHasDraggedRibbon] = useState(false);

  // Ribbon Mouse Drag Handlers
  const handleRibbonMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ribbonScrollRef.current) return;
    setIsDraggingRibbon(true);
    setHasDraggedRibbon(false);
    setDragStartX(e.pageX - ribbonScrollRef.current.offsetLeft);
    setScrollLeftState(ribbonScrollRef.current.scrollLeft);
  };

  const handleRibbonMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRibbon || !ribbonScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - ribbonScrollRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    if (Math.abs(walk) > 4) {
      setHasDraggedRibbon(true);
    }
    ribbonScrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleRibbonMouseUpOrLeave = () => {
    setIsDraggingRibbon(false);
  };

  const scrollRibbonLeft = () => {
    if (ribbonScrollRef.current) {
      ribbonScrollRef.current.scrollBy({ left: -220, behavior: "smooth" });
    }
  };

  const scrollRibbonRight = () => {
    if (ribbonScrollRef.current) {
      ribbonScrollRef.current.scrollBy({ left: 220, behavior: "smooth" });
    }
  };

  // Command Icon Renderer
  const renderCommandIcon = (iconName: string, className: string = "w-3.5 h-3.5") => {
    switch (iconName) {
      case "Cloud": return <Cloud className={className} />;
      case "Server": return <Server className={className} />;
      case "ArrowRight": return <ArrowRight className={className} />;
      case "Download": return <Download className={className} />;
      case "FileText": return <FileText className={className} />;
      case "Search": return <Search className={className} />;
      case "Sparkles": return <Sparkles className={className} />;
      case "Volume2": return <Volume2 className={className} />;
      case "Code": return <Code className={className} />;
      case "ImageIcon": return <ImageIcon className={className} />;
      case "Compass": return <Compass className={className} />;
      case "Globe": return <Globe className={className} />;
      case "Hash": return <Hash className={className} />;
      case "RefreshCw": return <RefreshCw className={className} />;
      case "Database": return <Database className={className} />;
      case "ShieldCheck": return <ShieldCheck className={className} />;
      case "MessageSquare": return <MessageSquare className={className} />;
      case "Activity": return <Activity className={className} />;
      case "Zap": return <Zap className={className} />;
      case "Smartphone": return <Smartphone className={className} />;
      case "TrendingUp": return <TrendingUp className={className} />;
      case "Key": return <Key className={className} />;
      case "ClipboardList": return <ClipboardList className={className} />;
      case "ListChecks": return <ListChecks className={className} />;
      case "Palette": return <Palette className={className} />;
      case "Lock": return <Lock className={className} />;
      default: return <Terminal className={className} />;
    }
  };

  const handleExecuteCommand = (cmd: DeveloperCommand, immediate = true) => {
    if (immediate) {
      setShowCommandsModal(false);
      handleSendMessage(cmd.prompt);
    } else {
      setInputText(cmd.prompt);
      setShowCommandsModal(false);
    }
  };

  // 📋 LIVE ACTIVITY & ERROR LOGS STATE
  const [activityLogs, setActivityLogs] = useState<AgentActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem("dev_agent_activity_logs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "log_init",
        type: "info",
        title: "بدء جلسة الوكيل الذكي والمنصة",
        description: "تم تهيئة وتشغيل خدمات المطور والنماذج الحية LLaMA 3.3 و Groq و Gemini بنجاح.",
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        timestampMs: Date.now(),
        source: "النظام"
      }
    ];
  });

  // 🚨 ACTIVE TOP ERROR RECTANGLE BANNER STATE
  const [activeTopError, setActiveTopError] = useState<{
    id: string;
    title: string;
    message: string;
    details?: any;
    timestamp: string;
    source?: string;
  } | null>(null);

  // Modal / Inspector State for Live Logs & Errors
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [logFilterTab, setLogFilterTab] = useState<"all" | "errors" | "success">("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Logger helper function
  const addActivityLog = (log: Omit<AgentActivityLog, "id" | "timestamp" | "timestampMs">) => {
    const timestamp = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const newLog: AgentActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      timestampMs: Date.now()
    };

    setActivityLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 150);
      try {
        localStorage.setItem("dev_agent_activity_logs", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // If it's an error, trigger the top notification banner!
    if (log.type === "error") {
      setActiveTopError({
        id: newLog.id,
        title: log.title,
        message: log.description,
        details: log.details,
        timestamp: newLog.timestamp,
        source: log.source
      });
    }
  };

  // Global error & unhandled rejection listeners
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      addActivityLog({
        type: "error",
        title: "خطأ غير معالج في تطبيق الويب (Runtime Error)",
        description: event.message || "حدث خطأ غير متوقع في جافاسكريبت أثناء التنفيذ",
        source: event.filename ? `${event.filename.split("/").pop()}:${event.lineno}` : "المتصفح",
        details: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMsg = event.reason?.message || String(event.reason || "فشل استدعاء غير معالج (Unhandled Promise Rejection)");
      addActivityLog({
        type: "error",
        title: "فشل استدعاء غير معالج (Unhandled Promise Rejection)",
        description: reasonMsg,
        source: "شبكة / خادم",
        details: event.reason
      });
    };

    const handleCustomAppLog = (event: any) => {
      if (event.detail) {
        addActivityLog(event.detail);
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("app_activity_log", handleCustomAppLog);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("app_activity_log", handleCustomAppLog);
    };
  }, []);

  // Floating Position & Dragging State
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dev_agent_pos");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            const maxX = Math.max(8, window.innerWidth - 80);
            const maxY = Math.max(8, window.innerHeight - 80);
            return {
              x: Math.max(8, Math.min(maxX, parsed.x)),
              y: Math.max(8, Math.min(maxY, parsed.y))
            };
          }
        }
      } catch {}
      const isMobile = window.innerWidth < 640;
      const initialW = isMobile ? Math.min(window.innerWidth - 16, 380) : 500;
      const initialH = isMobile ? Math.min(window.innerHeight - 24, 560) : 660;
      return {
        x: Math.max(8, Math.min(window.innerWidth - initialW - 8, isMobile ? 8 : 24)),
        y: Math.max(8, Math.min(window.innerHeight - initialH - 8, isMobile ? 8 : window.innerHeight - initialH - 24))
      };
    }
    return { x: 24, y: 80 };
  });

  // 🖼️ 5-LEVEL ZOOMABLE & DRAGGABLE IMAGE VIEWER MODAL STATE
  const [activeImageViewer, setActiveImageViewer] = useState<{
    url: string;
    prompt?: string;
    title?: string;
  } | null>(null);

  // 5 Zoom levels: 1 = 50%, 2 = 75%, 3 = 100%, 4 = 150%, 5 = 200%
  const [imageZoomLevel, setImageZoomLevel] = useState<number>(3);
  const [imagePanOffset, setImagePanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageDragRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0
  });

  const ZOOM_LEVELS = [
    { level: 1, scale: 0.5, label: "مصغر", percent: "50%" },
    { level: 2, scale: 0.75, label: "مدمج", percent: "75%" },
    { level: 3, scale: 1.0, label: "طبيعي", percent: "100%" },
    { level: 4, scale: 1.5, label: "مكبر", percent: "150%" },
    { level: 5, scale: 2.0, label: "أقصى", percent: "200%" }
  ];

  const currentZoomConfig = ZOOM_LEVELS.find((z) => z.level === imageZoomLevel) || ZOOM_LEVELS[2];

  const handleOpenImageViewer = (url: string, prompt?: string, title?: string) => {
    setActiveImageViewer({ url, prompt, title });
    setImageZoomLevel(3); // default 100%
    setImagePanOffset({ x: 0, y: 0 }); // center
  };

  const handleCloseImageViewer = () => {
    setActiveImageViewer(null);
    setImagePanOffset({ x: 0, y: 0 });
  };

  const handleNudgeImagePan = (direction: "left" | "right") => {
    const step = 80;
    setImagePanOffset((prev) => ({
      x: direction === "left" ? prev.x - step : prev.x + step,
      y: prev.y
    }));
  };

  const handleImageDragStart = (clientX: number, clientY: number) => {
    imageDragRef.current = {
      startX: clientX,
      startY: clientY,
      initialPanX: imagePanOffset.x,
      initialPanY: imagePanOffset.y
    };
    setIsDraggingImage(true);

    const onImageMove = (e: MouseEvent | TouchEvent) => {
      const curX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const curY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = curX - imageDragRef.current.startX;
      const deltaY = curY - imageDragRef.current.startY;

      setImagePanOffset({
        x: imageDragRef.current.initialPanX + deltaX,
        y: imageDragRef.current.initialPanY + deltaY
      });
    };

    const onImageEnd = () => {
      setIsDraggingImage(false);
      window.removeEventListener("mousemove", onImageMove);
      window.removeEventListener("mouseup", onImageEnd);
      window.removeEventListener("touchmove", onImageMove);
      window.removeEventListener("touchend", onImageEnd);
    };

    window.addEventListener("mousemove", onImageMove);
    window.addEventListener("mouseup", onImageEnd);
    window.addEventListener("touchmove", onImageMove, { passive: false });
    window.addEventListener("touchend", onImageEnd);
  };

  // 📷 Multimodal Image Attachment Handlers (OCR & Code Analysis)
  const handleImageSelect = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG, WEBP, GIF, SVG)");
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    const fileName = file.name || "screenshot.png";
    const mimeType = file.type || "image/jpeg";

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        let pureBase64 = result;
        if (pureBase64.includes("base64,")) {
          pureBase64 = pureBase64.split("base64,")[1];
        }
        setSelectedImage({
          dataUrl: result,
          base64: pureBase64,
          mimeType,
          fileName,
          sizeKb
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSelectedImage = () => {
    setSelectedImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleClipboardPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageSelect(file);
          break;
        }
      }
    }
  };

  // Keyboard navigation & global listeners for image viewer and window resizing
  useEffect(() => {
    const handleGlobalImageView = (e: any) => {
      if (e.detail?.url) {
        handleOpenImageViewer(e.detail.url, e.detail.prompt, e.detail.title);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeImageViewer) return;
      if (e.key === "Escape") {
        handleCloseImageViewer();
      } else if (e.key === "ArrowLeft") {
        handleNudgeImagePan("left");
      } else if (e.key === "ArrowRight") {
        handleNudgeImagePan("right");
      } else if (e.key === "+" || e.key === "=") {
        setImageZoomLevel((prev) => Math.min(5, prev + 1));
      } else if (e.key === "-" || e.key === "_") {
        setImageZoomLevel((prev) => Math.max(1, prev - 1));
      }
    };

    // Auto-clamp floating chat position on window resize to prevent mobile screen clipping
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      const w = isMobile ? Math.min(window.innerWidth - 16, 420) : getWindowWidth();
      const h = isMobile ? Math.min(window.innerHeight - 24, 600) : getWindowHeight();
      const maxX = Math.max(8, window.innerWidth - w - 8);
      const maxY = Math.max(8, window.innerHeight - h - 8);
      setPosition((prev) => ({
        x: Math.max(8, Math.min(maxX, prev.x)),
        y: Math.max(8, Math.min(maxY, prev.y))
      }));
    };

    window.addEventListener("view_image_modal", handleGlobalImageView);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("view_image_modal", handleGlobalImageView);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeImageViewer, sizePreset, customWidth, customHeight]);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    hasMoved: false
  });

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    initialW: number;
    initialH: number;
  }>({
    startX: 0,
    startY: 0,
    initialW: 500,
    initialH: 660
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending, isMinimized, taskState.isActive]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Load initial keys and diagnostics summary on mount
  useEffect(() => {
    fetchKeysTable();
  }, []);

  const handleToggleModelMenu = () => {
    const nextState = !showModelMenu;
    setShowModelMenu(nextState);
    if (nextState) {
      fetchKeysTable();
    }
  };

  // --- DRAG HANDLERS (MOUSE & TOUCH) ---
  const handleDragStart = (clientX: number, clientY: number) => {
    if (sizePreset === "fullscreen") return;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialPosX: position.x,
      initialPosY: position.y,
      hasMoved: false
    };
    setIsDragging(true);

    let latestX = position.x;
    let latestY = position.y;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const curX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = curX - dragRef.current.startX;
      const deltaY = curY - dragRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragRef.current.hasMoved = true;
      }

      const widgetW = isMinimized ? 68 : getWindowWidth();
      const widgetH = isMinimized ? 68 : getWindowHeight();

      const maxX = Math.max(8, window.innerWidth - widgetW - 8);
      const maxY = Math.max(8, window.innerHeight - widgetH - 8);

      const newX = Math.max(8, Math.min(maxX, dragRef.current.initialPosX + deltaX));
      const newY = Math.max(8, Math.min(maxY, dragRef.current.initialPosY + deltaY));

      latestX = newX;
      latestY = newY;
      setPosition({ x: newX, y: newY });
    };

    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      try {
        localStorage.setItem("dev_agent_pos", JSON.stringify({ x: latestX, y: latestY }));
      } catch {}
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  // --- RESIZE HANDLER ---
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      initialW: getWindowWidth(),
      initialH: getWindowHeight()
    };
    setIsResizing(true);

    const onResizeMove = (moveEvent: MouseEvent | TouchEvent) => {
      const curX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = curX - resizeRef.current.startX;
      const deltaY = curY - resizeRef.current.startY;

      const minW = Math.min(320, window.innerWidth - 30);
      const maxW = Math.max(minW, window.innerWidth - 30);
      const minH = 400;
      const maxH = Math.max(minH, window.innerHeight - 30);

      const newW = Math.max(minW, Math.min(maxW, resizeRef.current.initialW + deltaX));
      const newH = Math.max(minH, Math.min(maxH, resizeRef.current.initialH + deltaY));

      setCustomWidth(newW);
      setCustomHeight(newH);
    };

    const onResizeEnd = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeEnd);
      window.removeEventListener("touchmove", onResizeMove);
      window.removeEventListener("touchend", onResizeEnd);
    };

    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
    window.addEventListener("touchmove", onResizeMove, { passive: false });
    window.addEventListener("touchend", onResizeEnd);
  };

  // Dimension Calculations (Fully responsive to mobile & small screens)
  const getWindowWidth = () => {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const maxAllowed = Math.max(280, screenW - 16);
    if (sizePreset === "fullscreen") return maxAllowed;
    if (sizePreset === "compact") return Math.min(maxAllowed, 380);
    if (sizePreset === "pro") return Math.min(maxAllowed, 800);
    if (sizePreset === "standard") return Math.min(maxAllowed, 500);
    return Math.min(maxAllowed, customWidth);
  };

  const getWindowHeight = () => {
    const screenH = typeof window !== "undefined" ? window.innerHeight : 700;
    const maxAllowed = Math.max(360, screenH - 24);
    if (sizePreset === "fullscreen") return maxAllowed;
    if (sizePreset === "compact") return Math.min(maxAllowed, 540);
    if (sizePreset === "pro") return Math.min(maxAllowed, 760);
    if (sizePreset === "standard") return Math.min(maxAllowed, 660);
    return Math.min(maxAllowed, customHeight);
  };

  // Window Size Cycle Handler (Standard -> Pro -> Fullscreen -> Compact -> Standard)
  const cycleWindowSize = () => {
    let nextPreset: WindowSizePreset = "standard";
    let toastLabel = "الوضع القياسي للمطور (500x660)";
    let toastIcon = "📱";

    if (sizePreset === "standard") {
      nextPreset = "pro";
      toastLabel = "وضع المطور الموسع Pro (800x760)";
      toastIcon = "💻";
    } else if (sizePreset === "pro") {
      nextPreset = "fullscreen";
      toastLabel = "وضع ملء الشاشة الفائق (Fullscreen)";
      toastIcon = "🖥️";
    } else if (sizePreset === "fullscreen") {
      nextPreset = "compact";
      toastLabel = "الوضع المدمج السريع (Compact 380x540)";
      toastIcon = "🔍";
    } else {
      nextPreset = "standard";
      toastLabel = "الوضع القياسي للمطور (500x660)";
      toastIcon = "📱";
    }

    setSizePreset(nextPreset);
    setSizeToast({ visible: true, label: toastLabel, icon: toastIcon });
    setTimeout(() => setSizeToast(null), 2500);
  };

  // Window Close & Minimize Handler with Persistent Pin Support
  const handleWindowClose = () => {
    if (isPinned) {
      // When pinned, closing transforms the window into the persistent draggable floating HUD / bubble
      setIsMinimized(true);
      setSizeToast({
        visible: true,
        label: "النافذة مثبتة: ستبقى ظاهرة على الشاشة كأيقونة عائمة يمكنك سحبها بحرية 📌",
        icon: "📌"
      });
      setTimeout(() => setSizeToast(null), 3000);
    } else {
      if (onClose) {
        onClose();
      } else {
        setIsMinimized(true);
      }
    }
  };

  // Popout Standalone Window
  const handleOpenStandalone = () => {
    const url = `${window.location.origin}/?standalone_agent=true`;
    window.open(url, "RoohDeveloperAgentStandalone", "width=540,height=760,menubar=no,toolbar=no,location=no,status=no,resizable=yes");
  };

  // Audio Playback Handler
  const playAudioBase64 = (base64Audio: string, msgId: string) => {
    if (!isVoiceEnabled) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    try {
      const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setCurrentPlayingId(msgId);
      setIsPlayingAudio(true);

      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentPlayingId(null);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setCurrentPlayingId(null);
      };

      audio.play().catch(() => {
        setIsPlayingAudio(false);
        setCurrentPlayingId(null);
      });
    } catch {
      setIsPlayingAudio(false);
      setCurrentPlayingId(null);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setCurrentPlayingId(null);
  };

  const toggleVoiceSetting = () => {
    if (isPlayingAudio) stopAudio();
    setIsVoiceEnabled((prev) => !prev);
  };

  // --- CLIENT-SIDE ACTION AND THEME MUTATOR ---
  const applyThemeColor = (colorName: string) => {
    const root = document.documentElement;
    localStorage.setItem("site_accent_color", colorName);
    
    // Dispatch custom event for real-time site update
    window.dispatchEvent(new CustomEvent("site_theme_changed", { detail: { color: colorName } }));
  };

  // Parse Action Blocks like [ACTION:generate_image:{"prompt":"..."}]
  const executeServerAction = async (actionType: string, actionParams: any): Promise<AgentActionData | null> => {
    const actionStartTime = Date.now();
    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const { ok, data } = await safeFetchJson("/api/admin/agent-execute", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: actionType, params: actionParams })
      });

      const elapsed = Date.now() - actionStartTime;

      if (ok && data && data.success) {
        addActivityLog({
          type: "success",
          title: `تم تنفيذ العملية: ${actionType === 'generate_image' ? 'توليد صورة بالذكاء الاصطناعي 🎨' : actionType === 'file_write' ? 'إنشاء وحفظ ملف 📄' : actionType === 'code_patch' ? 'تعديل برمجي ⚡' : actionType === 'get_keys_table' ? 'فحص جدول المفاتيح 🔑' : actionType}`,
          description: data.message || `تمت العملية ${actionType} بنجاح وسرعة (${elapsed}ms).`,
          source: "خادم الوكيل",
          details: { action: actionType, params: actionParams, result: data },
          durationMs: elapsed
        });

        if (actionType === "generate_image") {
          return {
            type: "generate_image",
            title: "تم توليد الصورة بالذكاء الاصطناعي 🎨",
            status: "success",
            imageUrl: data.imageUrl,
            imagePrompt: data.prompt,
            message: data.message
          };
        } else if (actionType === "file_write" || actionType === "file_read" || actionType === "code_patch" || actionType === "file_delete") {
          return {
            type: actionType as any,
            title: actionType === "file_write" ? "تم حفظ الملف 📄" : actionType === "code_patch" ? "تعديل برمجي للملف ⚡" : actionType === "file_delete" ? "حذف الملف 🗑️" : "قراءة الملف 🔍",
            status: "success",
            filePath: data.path,
            codeSnippet: data.content,
            message: data.message
          };
        } else if (actionType === "file_tree") {
          return {
            type: "file_tree",
            title: "شجرة ملفات المشروع 📂",
            status: "success",
            diagnostics: data.tree,
            message: data.message
          };
        } else if (actionType === "file_search") {
          return {
            type: "file_search",
            title: "نتائج البحث في ملفات المشروع 🔍",
            status: "success",
            diagnostics: data.matches,
            message: data.message
          };
        } else if (actionType === "get_keys_table") {
          return {
            type: "get_keys_table",
            title: "جدول مفاتيح الـ APIs والنماذج الحية 🔑",
            status: "success",
            tableData: data.table,
            summary: data.summary,
            message: data.message
          };
        } else if (actionType === "rotate_key" || actionType === "reset_keys_status") {
          return {
            type: actionType as any,
            title: actionType === "rotate_key" ? "تبديل مفتاح النموذج 🔄" : "إعادة تفعيل كافة المفاتيح ✨",
            status: "success",
            message: data.message
          };
        } else if (actionType === "get_live_stats" || actionType === "system_diagnostics") {
          return {
            type: "system_diagnostics",
            title: actionType === "get_live_stats" ? "إحصائيات المنصة الحية 📊" : "تقرير تشخيص النظام والمفاتيح 🩺",
            status: "success",
            diagnostics: data.stats || data.status,
            message: data.message
          };
        } else if (actionType === "modify_ui_theme") {
          const accentColor = data.accentColor || actionParams.accentColor || "emerald";
          const themeMode = data.themeMode || actionParams.themeMode || "dark";
          try {
            localStorage.setItem("app_theme_color", accentColor);
            localStorage.setItem("theme", themeMode);
            if (themeMode === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
            window.dispatchEvent(new CustomEvent("app_theme_changed", { detail: { accentColor, themeMode } }));
          } catch (_) {}

          return {
            type: "modify_ui_theme",
            title: `تم تعديل سمة وألوان الواجهة 🎨 (${accentColor})`,
            status: "success",
            message: data.message || `تم تطبيق سمة اللون (${accentColor}) والنمط (${themeMode}) بنجاح!`
          };
        } else if (actionType === "sync_github") {
          return {
            type: "system_diagnostics",
            title: "مزامنة أسرار ومفاتيح GitHub 🚀",
            status: "success",
            message: data.message || "تمت مزامنة المفاتيح مع GitHub بنجاح!"
          };
        }
      } else {
        const errorReason = data?.message || "فشل الخادم في تنفيذ الإجراء المطلوب.";
        addActivityLog({
          type: "error",
          title: `فشل تنفيذ الإجراء: ${actionType}`,
          description: errorReason,
          source: "خادم الوكيل",
          details: { action: actionType, params: actionParams, response: data },
          durationMs: elapsed
        });
      }
    } catch (err: any) {
      console.error("Action execution failed:", err);
      addActivityLog({
        type: "error",
        title: `خطأ تقني أثناء تنفيذ: ${actionType}`,
        description: err?.message || String(err),
        source: "الشبكة / الخادم",
        details: { action: actionType, params: actionParams, error: err }
      });
    }
    return null;
  };

  // --- ACTIONS & MODAL HELPERS ---
  const fetchKeysTable = async () => {
    setIsLoadingKeys(true);
    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const { ok, data } = await safeFetchJson("/api/admin/agent-execute", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "get_keys_table", params: {} })
      });

      if (ok && data && data.success) {
        setKeysTableData(data.table || []);
        setKeysSummary(data.summary || null);
      }
    } catch (e) {
      console.error("Failed to fetch keys table:", e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleOpenKeysTable = () => {
    setShowKeysTableModal(true);
    fetchKeysTable();
  };

  const handleInsertKeysTableToChat = () => {
    const tableMsg: AgentChatMessage = {
      id: `msg_keys_table_${Date.now()}`,
      sender: "agent",
      text: "📊 إليك جدول جميع مفاتيح الـ APIs والنماذج المسجلة في النظام مع حالتها الحية والمزود الخاص بكل مفتاح:",
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      modelUsed: activeModel,
      actionExecuted: "عرض جدول المفاتيح والنماذج الحية 🔑",
      actionData: {
        type: "get_keys_table",
        title: "جدول مفاتيح الـ APIs والنماذج الحية 🔑",
        status: "success",
        tableData: keysTableData || [],
        summary: keysSummary || null,
        message: "تم تحديث ومزامنة جدول المفاتيح مع الخادم بنجاح!"
      }
    };
    setMessages((prev) => [...prev, tableMsg]);
    setShowKeysTableModal(false);
  };

  const handleRotateKey = async (provider: string) => {
    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const { ok, data } = await safeFetchJson("/api/admin/agent-execute", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "rotate_key", params: { provider } })
      });

      if (ok && data && data.success) {
        alert(data.message || `تم تبديل مفتاح ${provider} بنجاح!`);
        fetchKeysTable();
      }
    } catch (e: any) {
      alert("تعذر التبديل: " + (e?.message || e));
    }
  };

  const handleResetKeys = async (provider = "all") => {
    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const { ok, data } = await safeFetchJson("/api/admin/agent-execute", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "reset_keys_status", params: { provider } })
      });

      if (ok && data && data.success) {
        alert(data.message || "تمت إعادة تفعيل جميع المفاتيح بنجاح!");
        fetchKeysTable();
      }
    } catch (e: any) {
      alert("تعذر إعادة التفعيل: " + (e?.message || e));
    }
  };

  const handleCreateFileSubmit = async () => {
    if (!newFilePath.trim() || !newFileContent.trim()) {
      alert("يرجى إدخال مسار الملف ومحتوى الكود.");
      return;
    }
    setIsCreatingFile(true);
    try {
      const actionRes = await executeServerAction("file_write", {
        path: newFilePath.trim(),
        content: newFileContent
      });
      if (actionRes) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_file_${Date.now()}`,
            sender: "agent",
            text: `✅ تم إنشاء وحفظ الملف \`${newFilePath.trim()}\` بنجاح في مسار المشروع!`,
            timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
            actionData: actionRes
          }
        ]);
        setShowFileCreatorModal(false);
        setNewFileContent("");
      }
    } catch (e: any) {
      alert("خطأ أثناء إنشاء الملف: " + (e?.message || e));
    } finally {
      setIsCreatingFile(false);
    }
  };

  const handlePatchFileSubmit = async () => {
    if (!patchFilePath.trim() || !patchTargetText.trim()) {
      alert("يرجى إدخال مسار الملف والنص المستهدف.");
      return;
    }
    setIsPatchingFile(true);
    try {
      const actionRes = await executeServerAction("code_patch", {
        path: patchFilePath.trim(),
        target: patchTargetText,
        replacement: patchReplacementText
      });
      if (actionRes) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_patch_${Date.now()}`,
            sender: "agent",
            text: `⚡ تم تطبيق التعديل البرمجي بنجاح على الملف \`${patchFilePath.trim()}\`!`,
            timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
            actionData: actionRes
          }
        ]);
        setShowFilePatcherModal(false);
        setPatchTargetText("");
        setPatchReplacementText("");
      }
    } catch (e: any) {
      alert("خطأ أثناء تعديل الملف: " + (e?.message || e));
    } finally {
      setIsPatchingFile(false);
    }
  };

  const handleOpenTreeModal = async () => {
    setShowFileTreeModal(true);
    setIsLoadingTree(true);
    try {
      const actionRes = await executeServerAction("file_tree", {});
      if (actionRes && actionRes.diagnostics) {
        setFileTreeData(actionRes.diagnostics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTree(false);
    }
  };

  // Client-Side Intent Parser
  const tryExecuteClientIntent = async (text: string): Promise<{ executed: boolean; description?: string; actionData?: AgentActionData }> => {
    const lower = text.toLowerCase().trim();

    // 0. Keys Table Intent
    if (lower.includes("جدول المفاتيح") || lower.includes("مفاتيح api") || lower.includes("عرض المفاتيح") || lower.includes("keys table") || lower.includes("كل المفاتيح") || lower.includes("المفاتيح في جدول")) {
      const keysRes = await executeServerAction("get_keys_table", {});
      if (keysRes) {
        return {
          executed: true,
          description: "تم استخراج وعرض جدول مفاتيح APIs والنماذج الحية بنجاح 🔑",
          actionData: keysRes
        };
      }
    }

    // 0.1 Rotate Key Intent
    if (lower.includes("تبديل المفتاح") || lower.includes("غير المفتاح") || lower.includes("rotate key") || lower.includes("تدوير المفتاح")) {
      const provider = lower.includes("gemini") ? "gemini" : lower.includes("eleven") || lower.includes("صوت") ? "elevenlabs" : "groq";
      const rotRes = await executeServerAction("rotate_key", { provider });
      if (rotRes) {
        return {
          executed: true,
          description: `تم تبديل مفتاح ${provider} إلى المفتاح التالي بنجاح 🔄`,
          actionData: rotRes
        };
      }
    }

    // 0.2 Reset Keys Status Intent
    if (lower.includes("تصفير المفاتيح") || lower.includes("اعادة تفعيل") || lower.includes("إعادة تفعيل") || lower.includes("reset keys")) {
      const resetRes = await executeServerAction("reset_keys_status", { provider: "all" });
      if (resetRes) {
        return {
          executed: true,
          description: "تمت إعادة تفعيل جميع المفاتيح المستنفدة بنجاح ✨",
          actionData: resetRes
        };
      }
    }

    // 0.3 Live Stats Intent
    if (lower.includes("عدد التطبيقات") || lower.includes("كم تطبيق") || lower.includes("احصائيات") || lower.includes("إحصائيات") || lower.includes("stats") || lower.includes("live stats")) {
      const statsRes = await executeServerAction("get_live_stats", {});
      if (statsRes) {
        return {
          executed: true,
          description: "تم جلب أحدث إحصائيات المنصة والتطبيقات المنشورة 📊",
          actionData: statsRes
        };
      }
    }

    // 0.4 Cloudflare R2 & Manifest Intent
    if (lower.includes("cloudflare") || lower.includes("r2") || lower.includes("approved-apps") || lower.includes("عمال cloudflare") || lower.includes("worker")) {
      const r2Res = await executeServerAction("check_r2_status", {});
      if (r2Res) {
        return {
          executed: true,
          description: "تم فحص حالة Cloudflare R2 وملف approved-apps.json بنجاح ☁️",
          actionData: r2Res
        };
      }
    }

    // 0.5 Dynamic Sitemap & Clean Slugs Intent
    if (lower.includes("sitemap") || lower.includes("خريطة الموقع") || lower.includes("clean slug") || lower.includes("الروابط النظيفة") || lower.includes("slugs")) {
      const siteRes = await executeServerAction("check_seo_sitemap", {});
      if (siteRes) {
        return {
          executed: true,
          description: "تم تدقيق خريطة الموقع sitemap.xml والروابط النظيفة 🗺️",
          actionData: siteRes
        };
      }
    }

    // 0.6 Firebase Firestore Quota Shield Intent
    if (lower.includes("فايربيز") || lower.includes("firebase") || lower.includes("firestore") || lower.includes("كوتا") || lower.includes("quota")) {
      const fbRes = await executeServerAction("check_firebase_quota", {});
      if (fbRes) {
        return {
          executed: true,
          description: "تم فحص درع حماية كوتا Firebase Firestore بنجاح 🛡️",
          actionData: fbRes
        };
      }
    }

    // 0.7 AGENTS.md Guidelines Compliance Intent
    if (lower.includes("agents.md") || lower.includes("القواعد الأربع") || lower.includes("قواعد الموقع") || lower.includes("إرشادات العمل")) {
      const agRes = await executeServerAction("check_agents_rules", {});
      if (agRes) {
        return {
          executed: true,
          description: "تم تدقيق مطابقة النظام مع القواعد الأربع في AGENTS.md بنجاح 📋",
          actionData: agRes
        };
      }
    }

    // 1. Image Generation Intent
    if (lower.includes("صورة") || lower.includes("image") || lower.includes("شعار") || lower.includes("logo") || lower.includes("بنر") || lower.includes("banner")) {
      const promptMatch = text.replace(/أنشئ|صمم|اعمل|توليد|صورة|شعار|logo|image/gi, "").trim();
      const generatedPrompt = promptMatch.length > 5 ? promptMatch : "Modern futuristic high tech application review logo icon 3D render";
      
      const actionRes = await executeServerAction("generate_image", {
        prompt: generatedPrompt,
        style: lower.includes("3d") ? "3d" : lower.includes("انمي") ? "anime" : lower.includes("واقعي") ? "realistic" : "cyber"
      });

      if (actionRes) {
        return {
          executed: true,
          description: `تم توليد الصورة بنجاح: "${generatedPrompt}" 🎨`,
          actionData: actionRes
        };
      }
    }

    // 2. UI Theme Color Intent
    if (lower.includes("لون") || lower.includes("ثيم") || lower.includes("theme") || lower.includes("color")) {
      let color = "indigo";
      let nameAr = "النيلي";
      if (lower.includes("زمرد") || lower.includes("أخضر") || lower.includes("green") || lower.includes("emerald")) {
        color = "emerald";
        nameAr = "الأخضر الزمردي";
      } else if (lower.includes("بنفسج") || lower.includes("purple") || lower.includes("موف")) {
        color = "purple";
        nameAr = "البنفسجي الملكي";
      } else if (lower.includes("وردي") || lower.includes("زهري") || lower.includes("pink") || lower.includes("rose")) {
        color = "rose";
        nameAr = "الوردي الفاخر";
      } else if (lower.includes("سماوي") || lower.includes("أزرق") || lower.includes("cyan") || lower.includes("blue")) {
        color = "cyan";
        nameAr = "السماوي السيان";
      } else if (lower.includes("ذهبي") || lower.includes("أصفر") || lower.includes("amber") || lower.includes("gold")) {
        color = "amber";
        nameAr = "الذهبي العنبري";
      }

      applyThemeColor(color);
      return {
        executed: true,
        description: `تم تغيير ألوان الموقع وثيم الواجهة إلى (${nameAr}) بنجاح! 🎨`,
        actionData: {
          type: "modify_ui_theme",
          title: "تغيير ثيم ومظهر الموقع",
          status: "success",
          message: `تم تطبيق اللون ${nameAr} على جميع أزرار وعناصر الموقع.`
        }
      };
    }

    // 3. System Diagnostics Intent
    if (lower.includes("فحص") || lower.includes("تشخيص") || lower.includes("status") || lower.includes("health") || lower.includes("صحة")) {
      const diagRes = await executeServerAction("system_diagnostics", {});
      if (diagRes) {
        return {
          executed: true,
          description: "تم إجراء فحص شامل لكافة مكونات النظام ومفاتيح APIs بنجاح 🩺",
          actionData: diagRes
        };
      }
    }

    // 4. Tab Navigation Commands
    if (onTabChange) {
      if (lower.includes("نشر") || lower.includes("publish") || lower.includes("كشط") || lower.includes("إضافة تطبيق")) {
        onTabChange("publish");
        return { executed: true, description: "تم الانتقال فوراً إلى قسم نشر ومراجعة التطبيقات بالذكاء الاصطناعي 🚀" };
      }
      if (lower.includes("مفاتيح") || lower.includes("مفتاح") || lower.includes("env") || lower.includes("groq") || lower.includes("elevenlabs")) {
        onTabChange("envManager");
        return { executed: true, description: "تم الانتقال إلى لوحة إدارة المفاتيح وتوزيع الأحمال (EnvManager) 🔑" };
      }
      if (lower.includes("إعلان") || lower.includes("ads") || lower.includes("أدسنس") || lower.includes("ads.txt")) {
        onTabChange("adsense");
        return { executed: true, description: "تم الانتقال إلى إعدادات الإعلانات وأكواد ads.txt 💰" };
      }
      if (lower.includes("أرشيف") || lower.includes("r2") || lower.includes("cloudflare") || lower.includes("approved-apps")) {
        onTabChange("r2Status");
        return { executed: true, description: "تم فتح لوحة تخزين Cloudflare R2 والصفحات المؤرشفة 📦" };
      }
      if (lower.includes("أرشفة") || lower.includes("indexing") || lower.includes("جوجل") || lower.includes("sitemap")) {
        onTabChange("indexing");
        return { executed: true, description: "تم فتح قسم الأرشفة الفورية و Google Indexing API 🌐" };
      }
      if (lower.includes("فايربيز") || lower.includes("firebase") || lower.includes("كوتا") || lower.includes("firestore")) {
        onTabChange("firebaseStatus");
        return { executed: true, description: "تم الانتقال لمؤشر كوتا واستخدام Firebase Firestore 🔥" };
      }
    }

    // 5. View Navigation Commands
    if (onNavigate) {
      if (lower.includes("الرئيسية") || lower.includes("الصفحة الأولى") || lower.includes("home")) {
        onNavigate("home");
        return { executed: true, description: "تم الانتقال إلى الصفحة الرئيسية للموقع 🏠" };
      }
      if (lower.includes("لوحة التحكم") || lower.includes("الادمن") || lower.includes("admin")) {
        onNavigate("admin");
        return { executed: true, description: "تم الانتقال إلى لوحة تحكم المطور ⚙️" };
      }
      if (lower.includes("سياسة الخصوصية") || lower.includes("privacy")) {
        onNavigate("privacy");
        return { executed: true, description: "تم الانتقال إلى صفحة سياسة الخصوصية 🛡️" };
      }
    }

    // 6. Dark Mode & Language Toggle
    if (onToggleDarkMode && (lower.includes("وضع ليلي") || lower.includes("وضع مظلم") || lower.includes("dark mode") || lower.includes("light mode") || lower.includes("الدارك مود"))) {
      onToggleDarkMode();
      return { executed: true, description: "تم تبديل مظهر الموقع بين الوضع الليلي والنهاري بنجاح 🌓" };
    }

    if (onToggleLanguage && (lower.includes("لغة") || lower.includes("انجليزي") || lower.includes("language") || lower.includes("ترجم"))) {
      onToggleLanguage();
      return { executed: true, description: "تم تبديل لغة واجهة الموقع بنجاح 🌐" };
    }

    return { executed: false };
  };

  // --- SEND MESSAGE & TASK EXECUTION HANDLER ---
  const handleSendMessage = async (customTextOverride?: string) => {
    const currentAttachedImage = selectedImage;
    let textToSend = (customTextOverride || inputText).trim();

    if (!textToSend && !currentAttachedImage) return;
    if (!textToSend && currentAttachedImage) {
      textToSend = "اقرأ واستخرج جميع النصوص والكلمات المكتوبة في هذه الصورة بدقة شديدة (OCR)، واشرح ما تحتويه بالتفصيل وحل أي مشكلة أو خطأ برمجي يظهر بها.";
    }
    if (isSending) return;

    const startTime = Date.now();
    const taskId = `task_${Date.now()}`;

    // Start Dynamic Progress Bar
    setTaskState({
      isActive: true,
      taskId,
      taskName: currentAttachedImage
        ? `تحليل صورة: ${currentAttachedImage.fileName}`
        : textToSend.length > 35
        ? textToSend.slice(0, 35) + "..."
        : textToSend,
      currentStep: currentAttachedImage
        ? "👁️ جاري فحص الصورة واستخراج النصوص عبر Gemini Vision OCR..."
        : "🧠 تحليل الأمر واستنتاج العمليات المطلوبة...",
      progress: 20,
      status: "running",
      startTime
    });

    const userMessage: AgentChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      imageUrl: currentAttachedImage?.dataUrl,
      imageMimeType: currentAttachedImage?.mimeType,
      imageFileName: currentAttachedImage?.fileName,
      imageSizeKb: currentAttachedImage?.sizeKb
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customTextOverride) setInputText("");
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setIsSending(true);

    // Simulate progressive stages
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setTaskState((prev) => {
        if (!prev.isActive || prev.status !== "running") return prev;
        if (prev.progress < 45) {
          return {
            ...prev,
            progress: 45,
            currentStep: currentAttachedImage
              ? "🔍 معالجة واستخراج النصوص والأكواد البرمجية بدقة..."
              : "⚙️ استدعاء أدوات الذكاء الاصطناعي ومحرك LLaMA 3.3..."
          };
        } else if (prev.progress < 75) {
          return { ...prev, progress: 75, currentStep: "🎙️ توليد المحتوى الصوتي عبر ElevenLabs وتطبيق الأوامر..." };
        } else if (prev.progress < 90) {
          return { ...prev, progress: 90, currentStep: "✨ صياغة الاستجابة وتحديث الواجهة البرمجية..." };
        }
        return prev;
      });
    }, 450);

    // Execute Client Intent if matched
    const actionResult = await tryExecuteClientIntent(textToSend);

    try {
      const idToken = getIdTokenHelper ? getIdTokenHelper() : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const formattedHistory = [...messages, userMessage].map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      const { ok, data } = await safeFetchJson("/api/admin/agent-chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: formattedHistory,
          imageBase64: currentAttachedImage?.base64,
          imageMimeType: currentAttachedImage?.mimeType,
          generateVoice: isVoiceEnabled,
          contextInfo: {
            activeTab: initialContext?.activeTab || "developer-dashboard",
            tabTitle: initialContext?.tabTitle || "لوحة المطور",
            tabId: initialContext?.tabId || "general",
            contextData: initialContext?.contextData,
            actionTriggered: actionResult.executed ? actionResult.description : undefined
          }
        })
      });

      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      const elapsed = Date.now() - startTime;

      if (ok && data && data.reply) {
        const agentMsgId = `agent_${Date.now()}`;
        let finalText = data.reply;
        let dynamicActionData = actionResult.actionData;

        // Check if AI response contains an Action Block
        const actionMatch = finalText.match(/\[ACTION:([a-zA-Z_]+):(\{.*?\})\]/s);
        if (actionMatch) {
          const actType = actionMatch[1];
          try {
            const actParams = JSON.parse(actionMatch[2]);
            const serverActRes = await executeServerAction(actType, actParams);
            if (serverActRes) {
              dynamicActionData = serverActRes;
            }
          } catch (_) {}
          finalText = finalText.replace(/\[ACTION:[a-zA-Z_]+:\{.*?\}\]/gs, "").trim();
        }

        if (actionResult.executed && actionResult.description && !dynamicActionData) {
          finalText = `✅ **[تم تنفيذ الإجراء]**: ${actionResult.description}\n\n${finalText}`;
        }

        const agentMessage: AgentChatMessage = {
          id: agentMsgId,
          sender: "agent",
          text: finalText,
          timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
          modelUsed: data.modelUsed || "llama-3.3-70b-versatile",
          keyUsedLabel: data.keyUsedLabel,
          audioBase64: data.audioBase64,
          voiceKeyLabel: data.voiceKeyLabel,
          actionExecuted: actionResult.executed ? actionResult.description : undefined,
          actionData: dynamicActionData
        };

        if (data.modelUsed) {
          setActiveModel(data.modelUsed);
        }

        setMessages((prev) => [...prev, agentMessage]);

        // Record Success in Live Activity Log
        addActivityLog({
          type: "success",
          title: `استجابة ناجحة من نموذج ${data.modelUsed || activeModel}`,
          description: actionResult.executed ? actionResult.description : `تم توليد وصياغة الرد البرمجي بنجاح (${elapsed}ms).`,
          source: data.modelUsed || "Groq LLaMA 3.3",
          durationMs: elapsed
        });

        // Complete Task Progress (Success)
        setTaskState({
          isActive: true,
          taskId,
          taskName: textToSend.length > 35 ? textToSend.slice(0, 35) + "..." : textToSend,
          currentStep: "✨ تم إنجاز المهمة والرد بنجاح!",
          progress: 100,
          status: "success",
          resultMessage: actionResult.executed ? actionResult.description : `تمت الاستجابة عبر ${data.modelUsed || 'LLaMA 3.3'}`,
          durationMs: elapsed
        });

        // Auto-play audio if generated & enabled
        if (data.audioBase64 && isVoiceEnabled) {
          playAudioBase64(data.audioBase64, agentMsgId);
        }
      } else {
        const errorText = data?.message || "تعذر الحصول على استجابة من الوكيل الذكي، يرجى إعادة المحاولة أو تبديل المفتاح.";
        const errorMsg: AgentChatMessage = {
          id: `err_${Date.now()}`,
          sender: "agent",
          text: errorText,
          timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
          isError: true
        };
        setMessages((prev) => [...prev, errorMsg]);

        addActivityLog({
          type: "error",
          title: "تعذر الحصول على استجابة من الوكيل الذكي",
          description: errorText,
          source: activeModel,
          details: { model: activeModel, textToSend, response: data },
          durationMs: elapsed
        });

        setTaskState({
          isActive: true,
          taskId,
          taskName: textToSend.length > 35 ? textToSend.slice(0, 35) + "..." : textToSend,
          currentStep: "❌ تعذر إكمال المعالجة",
          progress: 100,
          status: "error",
          resultMessage: errorText,
          durationMs: elapsed
        });
      }
    } catch (err: any) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      const elapsed = Date.now() - startTime;
      const errorText = `حدث خطأ تقني: ${err?.message || err}`;

      const errorMsg: AgentChatMessage = {
        id: `err_${Date.now()}`,
        sender: "agent",
        text: errorText,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);

      addActivityLog({
        type: "error",
        title: "فشل الاتصال بخادم الوكيل الذكي",
        description: errorText,
        source: "العميل / الشبكة",
        details: { error: err?.message || String(err), textToSend },
        durationMs: elapsed
      });

      setTaskState({
        isActive: true,
        taskId,
        taskName: textToSend.length > 35 ? textToSend.slice(0, 35) + "..." : textToSend,
        currentStep: "❌ فشل الاتصال بالخادم",
        progress: 100,
        status: "error",
        resultMessage: errorText,
        durationMs: elapsed
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm("هل تريد بدء محادثة جديدة وتصفير سجل الرسائل؟")) {
      stopAudio();
      setMessages([
        {
          id: "msg_welcome_new",
          sender: "agent",
          text: "تم تصفير المحادثة بنجاح 🚀 جاهز لأي مهمة برمجية أو تصميم أو استفسار!",
          timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
          modelUsed: activeModel
        }
      ]);
      setTaskState({ isActive: false, taskId: "", taskName: "", currentStep: "", progress: 0, status: "idle" });
    }
  };

  // --- 1. CIRCULAR GLOWING DRAGGABLE LAUNCHER (WHEN MINIMIZED / FLOATING BUBBLE) ---
  if (isFloatingModal && isMinimized) {
    return (
      <div
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: "none"
        }}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        className="select-none cursor-grab active:cursor-grabbing transition-transform duration-75"
      >
        <div className="relative group flex items-center justify-center">
          {/* Dynamic Multi-Color Neon Aura (Intensified with neon colors while dragging) */}
          <div
            className={`absolute -inset-3.5 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
              isDragging
                ? "bg-gradient-to-r from-cyan-400 via-pink-500 via-purple-500 to-yellow-400 opacity-100 scale-125 animate-spin-slow shadow-[0_0_40px_#22d3ee,0_0_70px_#ec4899]"
                : "bg-gradient-to-r from-yellow-400 via-rose-500 to-blue-500 opacity-75 group-hover:opacity-100 animate-pulse"
            }`}
          />

          {/* Rotating Radiant Neon Ring */}
          <div
            className={`absolute -inset-1.5 rounded-full p-[3px] transition-all duration-200 pointer-events-none ${
              isDragging
                ? "bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-emerald-400 shadow-[0_0_35px_#22d3ee,0_0_60px_#ec4899] animate-spin"
                : "bg-gradient-to-tr from-yellow-400 via-amber-500 to-rose-500 opacity-90 animate-spin-slow"
            }`}
          />

          {/* Main Glowing Circular Button */}
          <button
            onClick={() => {
              if (!dragRef.current.hasMoved) {
                setIsMinimized(false);
              }
            }}
            className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-zinc-950 flex flex-col items-center justify-center transition-all transform cursor-pointer overflow-hidden ${
              isDragging
                ? "border-3 border-cyan-300 shadow-[0_0_40px_#22d3ee,0_0_70px_#ec4899,0_0_100px_#a855f7] scale-115 ring-4 ring-pink-500/80"
                : "border-2 border-yellow-400 text-white shadow-[0_0_25px_rgba(250,204,21,0.5)] hover:scale-110 active:scale-95"
            }`}
            title="وكيل المطور الذكي (اسحب في أي مكان على الشاشة / انقر للفتح)"
          >
            {/* Dynamic Neon Background Fill */}
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                isDragging
                  ? "bg-gradient-to-b from-cyan-500/40 via-purple-600/30 to-pink-900/50 animate-pulse"
                  : "bg-gradient-to-b from-yellow-500/25 via-blue-900/20 to-zinc-950"
              }`}
            />
            
            <Bot
              className={`w-7 h-7 relative z-10 transition-all ${
                isDragging
                  ? "text-cyan-200 rotate-12 scale-110 drop-shadow-[0_0_12px_#22d3ee]"
                  : "text-yellow-300 animate-bounce group-hover:rotate-12 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              }`}
            />

            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-pulse z-20" />
            
            {isPinned && (
              <span className="absolute bottom-1 bg-yellow-400 text-zinc-950 font-black text-[9px] px-1.5 py-0.2 rounded-full z-20 shadow-xs">
                📌
              </span>
            )}
          </button>

          {/* Close Completely Button (X on hover) - shown when not actively dragging */}
          {!isDragging && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
              }}
              className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer"
              title="إغلاق نهائي"
            >
              ✕
            </button>
          )}

          {/* Live Dragging Neon Tooltip */}
          {isDragging && (
            <div className="absolute -bottom-8 bg-zinc-950/95 border border-cyan-400/90 text-cyan-300 text-[10px] font-black px-2.5 py-0.5 rounded-xl shadow-[0_0_20px_#22d3ee] whitespace-nowrap z-30 animate-pulse pointer-events-none">
              ✨ سحب نيون حر ({Math.round(position.x)}, {Math.round(position.y)})
            </div>
          )}

          {/* Floating Task Progress Pill */}
          {taskState.isActive && taskState.status === "running" && !isDragging && (
            <div className="absolute -top-8 bg-zinc-950/95 border border-yellow-400/80 text-yellow-300 text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 whitespace-nowrap animate-bounce z-30">
              <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
              <span>جاري التنفيذ ({taskState.progress}%)</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 2. EXPANDED DRAGGABLE & RESIZABLE CHAT WINDOW ---
  const calculatedW = getWindowWidth();
  const calculatedH = getWindowHeight();

  const safeLeft = isFloatingModal
    ? sizePreset === "fullscreen"
      ? 8
      : Math.max(8, Math.min((typeof window !== "undefined" ? window.innerWidth : 800) - calculatedW - 8, position.x))
    : 0;

  const safeTop = isFloatingModal
    ? sizePreset === "fullscreen"
      ? 8
      : Math.max(8, Math.min((typeof window !== "undefined" ? window.innerHeight : 600) - calculatedH - 8, position.y))
    : 0;

  const containerStyle = isFloatingModal
    ? {
        position: "fixed" as const,
        left: `${safeLeft}px`,
        top: `${safeTop}px`,
        width: `${calculatedW}px`,
        height: `${calculatedH}px`,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100vh - 16px)",
        zIndex: 9999
      }
    : {};

  return (
    <div
      style={containerStyle}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          handleImageSelect(file);
        }
      }}
      className={`flex flex-col bg-zinc-950/98 backdrop-blur-3xl border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.35),0_0_15px_rgba(250,204,21,0.2)] ring-1 ring-yellow-400/50 rounded-3xl overflow-hidden transition-all duration-150 relative ${
        !isFloatingModal ? "w-full h-full my-0" : ""
      }`}
    >
      {/* 📸 DRAG-AND-DROP FILE UPLOAD OVERLAY */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-indigo-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 border-4 border-dashed border-cyan-400 rounded-3xl text-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 mb-3 shadow-[0_0_30px_#22d3ee] animate-bounce">
            <UploadCloud className="w-8 h-8 text-cyan-300" />
          </div>
          <h3 className="text-lg font-black text-white mb-1">أفلت لقطة الشاشة أو الصورة هنا 📸</h3>
          <p className="text-xs text-cyan-200 font-medium max-w-xs">
            سيقوم الوكيل الذكي بقراءة النصوص واستخراج الأكواد والأخطاء فورياً (OCR Vision)
          </p>
        </div>
      )}

      {/* 🚀 TOAST NOTIFICATION ON SIZE OR PIN CHANGE */}
      {sizeToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 via-amber-500 to-rose-500 text-zinc-950 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(250,204,21,0.6)] flex items-center gap-2 text-xs font-black animate-in fade-in zoom-in-95 duration-200 border-2 border-yellow-200 pointer-events-none whitespace-nowrap">
          <span className="text-base">{sizeToast.icon}</span>
          <span>{sizeToast.label}</span>
        </div>
      )}

      {/* 🌟 DRAGGABLE HEADER BAR & ULTRA-COMPACT INTEGRATED COMMAND TOOLBAR */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select") || (e.target as HTMLElement).closest("input")) return;
          if (isFloatingModal && sizePreset !== "fullscreen") {
            handleDragStart(e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select") || (e.target as HTMLElement).closest("input")) return;
          if (isFloatingModal && sizePreset !== "fullscreen") {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        className={`bg-gradient-to-r from-blue-950 via-zinc-950 to-indigo-950 p-2 sm:p-2.5 border-b border-yellow-400/40 flex items-center justify-between gap-1.5 shrink-0 ${
          isFloatingModal && sizePreset !== "fullscreen" ? "cursor-grab active:cursor-grabbing select-none" : ""
        }`}
      >
        {/* 🤖 BOT AVATAR / EMOJI -> CLICK CYCLES AND TOGGLES WINDOW SIZE (STANDARD / PRO / FULLSCREEN / COMPACT) */}
        <button
          onClick={cycleWindowSize}
          className="relative shrink-0 group cursor-pointer focus:outline-none transition-transform active:scale-90"
          title={`انقر لتكبير/تصغير وتغيير حجم النافذة (الحجم الحالي: ${sizePreset}) 🔍`}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-rose-600 group-hover:from-cyan-400 group-hover:via-purple-500 group-hover:to-pink-500 flex items-center justify-center text-zinc-950 shadow-md shadow-yellow-500/30 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.7)] transition-all duration-300 group-hover:scale-110 border border-yellow-300/80 group-hover:border-cyan-300">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950 font-black drop-shadow-xs group-hover:rotate-12 transition-transform" />
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-pulse"
            title="الوكيل الذكي نشط"
          />
          {/* Preset indicator pill */}
          <span className="absolute -top-1.5 -left-1.5 px-1 py-0.2 bg-black/90 border border-yellow-400/80 text-yellow-300 text-[8px] font-mono font-black rounded-md shadow-xs uppercase">
            {sizePreset === "fullscreen" ? "MAX" : sizePreset === "pro" ? "PRO" : sizePreset === "compact" ? "MIN" : "STD"}
          </span>
        </button>

        {/* 🚀 EXPANDED ACTION RIBBON TOOLBAR: OCCUPIES THE ENTIRE UPPER BAR SPACE (VISIBLE ALWAYS ON MOBILE) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 overflow-x-auto custom-scrollbar py-0.5 px-0.5">
          {/* 📄 1. NEW FILE */}
          <button
            onClick={() => setShowFileCreatorModal(true)}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-white border border-emerald-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-emerald-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="📄 إنشاء ملف جديد في المشروع (Create New File)"
          >
            <FilePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
          </button>

          {/* ⚡ 2. EDIT CODE */}
          <button
            onClick={() => setShowFilePatcherModal(true)}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/35 text-white border border-yellow-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-yellow-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="⚡ تعديل واستبدال كود داخل ملف (Patch / Edit Code)"
          >
            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
          </button>

          {/* 🔑 3. KEYS TABLE */}
          <button
            onClick={handleOpenKeysTable}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-white border border-blue-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-blue-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="🔑 عرض وإدارة جدول مفاتيح APIs والنماذج الحية (Keys Table)"
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
          </button>

          {/* 📂 4. FILE TREE */}
          <button
            onClick={handleOpenTreeModal}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 text-white border border-indigo-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-indigo-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="📂 تصفح شجرة ملفات ومجلدات المشروع (File Tree)"
          >
            <FolderTree className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
          </button>

          {/* 🎥 5. IMAGE GENERATOR */}
          <button
            onClick={() => handleSendMessage("أنشئ صورة 3D احترافية لشعار التطبيق بألوان نيون بنفسجية ووردية")}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-white border border-rose-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-rose-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="🎥 توليد صورة بالذكاء الاصطناعي (AI Image Generator)"
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
          </button>

          {/* 📊 6. LIVE STATS */}
          <button
            onClick={() => handleSendMessage("كم هو عدد التطبيقات المنشورة حالياً وحالة النظام؟")}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-white border border-cyan-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-cyan-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="📊 إحصائيات المنصة الحية والتطبيقات (Live Stats)"
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
          </button>

          {/* ✨ 7. FULL DIAGNOSTICS */}
          <button
            onClick={() => handleSendMessage("قم بفحص شامل لجميع خدمات وسيرفر ومفاتيح الموقع")}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-yellow-400/25 hover:bg-yellow-400/40 text-white border border-yellow-300/60 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-yellow-400/40 hover:scale-105 active:scale-80 shrink-0"
            title="✨ فحص وصيانة شاملة للنظام (Diagnostics)"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
          </button>

          {/* 📋 8. LIVE ACTIVITY & ERROR LOGS */}
          <button
            onClick={() => setShowActivityLogModal(true)}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 text-white border border-purple-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-purple-500/30 hover:scale-105 active:scale-80 shrink-0 relative"
            title="📋 سجل العمليات والأخطاء الحية (Activity & Error Logs)"
          >
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
            {activityLogs.filter(l => l.type === 'error').length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse border border-zinc-950">
                {activityLogs.filter(l => l.type === 'error').length}
              </span>
            )}
          </button>

          {/* 🎨 9. THEME SELECTOR */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-red-500/20 hover:bg-red-500/35 text-white border border-red-400/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-red-500/30 hover:scale-105 active:scale-80"
              title="🎨 تغيير ثيم وألوان الموقع (Theme Color)"
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-300" />
            </button>

            {showThemeMenu && (
              <div className="absolute top-full right-0 mt-1.5 w-48 bg-zinc-950/98 backdrop-blur-2xl border border-yellow-400/40 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-xs animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="text-[10px] font-black text-yellow-400 px-2 py-1 border-b border-zinc-800">
                  ألوان وثيم الموقع:
                </div>
                <button
                  onClick={() => {
                    applyThemeColor("emerald");
                    setShowThemeMenu(false);
                  }}
                  className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-emerald-950/60 text-emerald-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>الأخضر الزمردي</span>
                </button>
                <button
                  onClick={() => {
                    applyThemeColor("purple");
                    setShowThemeMenu(false);
                  }}
                  className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-purple-950/60 text-purple-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>البنفسجي الملكي</span>
                </button>
                <button
                  onClick={() => {
                    applyThemeColor("indigo");
                    setShowThemeMenu(false);
                  }}
                  className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-indigo-950/60 text-indigo-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span>النيلي الأساسي</span>
                </button>
                <button
                  onClick={() => {
                    applyThemeColor("rose");
                    setShowThemeMenu(false);
                  }}
                  className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-rose-950/60 text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span>الوردي الفاخر</span>
                </button>
                <button
                  onClick={() => {
                    applyThemeColor("amber");
                    setShowThemeMenu(false);
                  }}
                  className="w-full text-right px-2 py-1.5 rounded-xl hover:bg-amber-950/60 text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>الذهبي العنبري</span>
                </button>
              </div>
            )}
          </div>

          {/* 🔊 9. VOICE TOGGLE */}
          <button
            onClick={toggleVoiceSetting}
            className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:scale-105 active:scale-80 shrink-0 ${
              isVoiceEnabled
                ? "bg-purple-500/25 text-purple-200 border-purple-400/60 hover:bg-purple-500/40"
                : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
            title={isVoiceEnabled ? "الصوت الطبيعي مفعل (ElevenLabs)" : "الصوت مكتوم"}
          >
            {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500" />}
          </button>

          {/* 📌 10. PIN TO FRONTEND */}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs hover:scale-105 active:scale-80 shrink-0 border ${
                isPinned
                  ? "bg-yellow-400 text-zinc-950 border-yellow-300 shadow-md shadow-yellow-400/40"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-yellow-300 hover:border-yellow-400/40"
              }`}
              title={isPinned ? "المساعد مثبت على الواجهة الأمامية" : "تثبيت المساعد على الواجهة"}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 fill-current" /> : <PinOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          )}

          {/* ↗️ 11. POPOUT STANDALONE */}
          <button
            onClick={handleOpenStandalone}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-white border border-blue-400/50 text-xs transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-blue-500/30 hover:scale-105 active:scale-80 shrink-0"
            title="فتح في نافذة مستقلة خارج المتصفح (Popout Window)"
          >
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
          </button>

          {/* 🔍 12. SIZE CYCLE BUTTON */}
          <button
            onClick={cycleWindowSize}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-white border border-purple-400/50 text-xs transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-purple-500/30 hover:scale-105 active:scale-80 shrink-0"
            title={`تغيير وتكبير/تصغير حجم النافذة (الحجم الحالي: ${sizePreset}) 🔍`}
          >
            {sizePreset === "fullscreen" ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
            )}
          </button>

          {/* ➖ 13. MINIMIZE BUTTON */}
          <button
            onClick={() => setIsMinimized(true)}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs transition-all cursor-pointer flex items-center justify-center shadow-xs hover:scale-105 active:scale-80 shrink-0"
            title="تصغير النافذة إلى أيقونة عائمة (اسحبها في أي مكان على الشاشة)"
          >
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-300" />
          </button>

          {/* ✕ 14. CLOSE BUTTON */}
          <button
            onClick={handleWindowClose}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-rose-600/25 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs transition-all cursor-pointer flex items-center justify-center shadow-xs hover:shadow-rose-600/40 hover:scale-105 active:scale-80 shrink-0 font-black"
            title={isPinned ? "إغلاق النافذة (ستبقى مثبتة كأيقونة عائمة على الشاشة 📌)" : "إغلاق نافذة الوكيل"}
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* 🚨 TOP COMPACT RECTANGULAR ERROR BANNER (عرض الأخطاء أعلى النافذة مع إمكانية النسخ والإصلاح الفوري) */}
      {activeTopError && (
        <div className="bg-gradient-to-r from-red-950/95 via-zinc-950 to-rose-950/95 p-2.5 sm:p-3 border-b-2 border-red-500 shadow-[0_4px_25px_rgba(239,68,68,0.4)] flex flex-col gap-2 shrink-0 animate-in slide-in-from-top-3 duration-150 z-20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-red-500/20 border border-red-400 text-red-300 shrink-0 mt-0.5 animate-pulse">
                <AlertOctagon className="w-4 h-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-red-200 text-xs sm:text-sm">⚠️ {activeTopError.title}</span>
                  {activeTopError.source && (
                    <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-700/50 font-mono">
                      {activeTopError.source}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-400 font-mono">{activeTopError.timestamp}</span>
                </div>
                <p className="text-xs text-red-100/90 font-mono mt-1 break-words line-clamp-3 select-all bg-black/40 p-1.5 rounded-lg border border-red-500/20">
                  {activeTopError.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTopError(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
              title="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-red-500/20 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  const errorTextToCopy = `[تقرير خطأ في النظام]:\n• العنوان: ${activeTopError.title}\n• المصدر: ${activeTopError.source || 'النظام'}\n• التوقيت: ${activeTopError.timestamp}\n• الرسالة: ${activeTopError.message}\n${activeTopError.details ? `• التفاصيل: ${JSON.stringify(activeTopError.details, null, 2)}` : ''}`;
                  navigator.clipboard.writeText(errorTextToCopy);
                  setCopiedLogId(activeTopError.id);
                  setTimeout(() => setCopiedLogId(null), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-400/50 flex items-center gap-1.5 font-bold transition-all text-xs cursor-pointer shadow-xs active:scale-95"
              >
                {copiedLogId === activeTopError.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLogId === activeTopError.id ? "تم النسخ!" : "نسخ الخطأ"}</span>
              </button>

              <button
                onClick={() => {
                  const promptToSend = `لقد ظهر لي هذا الخطأ في النظام أثناء العمل، يرجى تحليله وإصلاحه فوراً:\n\nالعنوان: ${activeTopError.title}\nالمصدر: ${activeTopError.source || 'النظام'}\nالرسالة: ${activeTopError.message}\n${activeTopError.details ? `التفاصيل: ${JSON.stringify(activeTopError.details)}` : ''}`;
                  handleSendMessage(promptToSend);
                  setActiveTopError(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>إرسال للوكيل للإصلاح 🚀</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowActivityLogModal(true);
                setLogFilterTab("errors");
              }}
              className="text-zinc-400 hover:text-zinc-200 underline text-[11px] cursor-pointer"
            >
              عرض كافة الأخطاء ({activityLogs.filter(l => l.type === 'error').length})
            </button>
          </div>
        </div>
      )}

      {/* 📊 ACTIVE ENGINE & STATUS BAR */}
      <div className="bg-gradient-to-r from-blue-950/60 via-zinc-950 to-zinc-950 px-3.5 py-1.5 border-b border-yellow-400/20 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-300 shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-zinc-400">المحرك:</span>
          <span className="font-mono text-yellow-400 font-bold">{activeModel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearHistory}
            className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-500/20 flex items-center gap-1 cursor-pointer transition-colors"
            title="تصفير الجلسة"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>تصفير</span>
          </button>
        </div>
      </div>

      {/* 🚀 DYNAMIC TASK PROGRESS BAR */}
      {taskState.isActive && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/90 to-zinc-950 p-3 border-b border-indigo-500/40 transition-all duration-300 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {taskState.status === "running" ? (
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              ) : taskState.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-bold text-white truncate">{taskState.currentStep}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-black text-indigo-300 text-[11px]">{taskState.progress}%</span>
              {taskState.status !== "running" && (
                <button
                  onClick={() => setTaskState((prev) => ({ ...prev, isActive: false }))}
                  className="text-zinc-400 hover:text-white text-xs px-1"
                  title="إخفاء شريط المهمة"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-indigo-500/30 relative">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                taskState.status === "error"
                  ? "bg-rose-500"
                  : taskState.status === "success"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
              }`}
              style={{ width: `${taskState.progress}%` }}
            />
          </div>

          {taskState.status === "success" && taskState.resultMessage && (
            <div className="mt-2 p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-[11px] font-bold text-emerald-200 flex items-center justify-between">
              <span>✨ {taskState.resultMessage}</span>
              {taskState.durationMs && (
                <span className="text-[10px] text-emerald-400/80 font-mono">({taskState.durationMs}ms)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 💬 CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/80 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-1.5`}
          >
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 px-1">
              {msg.sender === "agent" ? (
                <button
                  onClick={cycleWindowSize}
                  className="flex items-center gap-1.5 group cursor-pointer hover:text-yellow-300 transition-all active:scale-95"
                  title="انقر على صورة الوكيل لتكبير أو تصغير وتغيير حجم النافذة 🔍"
                >
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-yellow-400 via-amber-500 to-rose-600 flex items-center justify-center text-zinc-950 shadow-xs group-hover:scale-115 group-hover:shadow-[0_0_10px_rgba(250,204,21,0.6)] transition-all">
                    <Bot className="w-3.5 h-3.5 text-zinc-950 font-black" />
                  </div>
                  <span className="font-bold text-yellow-400 group-hover:text-yellow-300 group-hover:underline">وكيل الذكاء الاصطناعي</span>
                  <span className="text-[8px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.2 rounded font-mono group-hover:bg-yellow-400 group-hover:text-black transition-colors">⛶ تكبير/تصغير</span>
                </button>
              ) : (
                <span className="font-bold text-blue-300">أنت (المطور)</span>
              )}
              <span>•</span>
              <span>{msg.timestamp}</span>
              {msg.modelUsed && (
                <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded font-mono">
                  {msg.modelUsed}
                </span>
              )}
            </div>

            <div
              className={`relative max-w-[95%] sm:max-w-[88%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                msg.sender === "user"
                  ? "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-tl-sm border border-blue-400/50 shadow-blue-900/30 font-medium"
                  : msg.isError
                  ? "bg-rose-950/70 text-rose-100 border border-rose-500/50 rounded-tr-sm border-r-2 border-r-rose-500"
                  : "bg-zinc-900/95 text-zinc-100 border border-zinc-800/90 rounded-tr-sm border-r-2 border-r-yellow-400 shadow-md"
              }`}
            >
              {/* 📷 Attached Image Preview in User Message */}
              {msg.imageUrl && (
                <div className="mb-2.5">
                  <div
                    onClick={() => handleOpenImageViewer(msg.imageUrl!, undefined, msg.imageFileName || "صورة مرفقة للتحليل")}
                    className="relative group rounded-xl overflow-hidden border border-white/30 bg-black/40 cursor-pointer shadow-md hover:border-yellow-300 transition-all max-w-[280px]"
                    title="انقر لتكبير ومعاينة الصورة في عارض الصور 🔍"
                  >
                    <img
                      src={msg.imageUrl}
                      alt={msg.imageFileName || "صورة مرفقة"}
                      className="w-full h-auto max-h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <div className="flex items-center justify-between text-[11px] text-white">
                        <span className="flex items-center gap-1 font-bold truncate max-w-[170px]">
                          <ScanLine className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                          <span className="truncate">{msg.imageFileName || "صورة مرفقة"}</span>
                        </span>
                        {msg.imageSizeKb && (
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                            {msg.imageSizeKb} KB
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-yellow-300 mt-0.5 font-medium">
                        <ZoomIn className="w-3 h-3" />
                        <span>انقر للمعاينة والتكبير (5 مستويات) 🔍</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</div>

              {/* 🎨 DYNAMIC ACTION RESULTS CARD (IMAGE GENERATION, FILES, DIAGNOSTICS) */}
              {msg.actionData && (
                <div className="mt-3 p-3 rounded-2xl bg-zinc-950/90 border border-yellow-400/40 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-yellow-300">
                    <span className="flex items-center gap-1.5">
                      {msg.actionData.type === "generate_image" ? <ImageIcon className="w-4 h-4 text-pink-400" /> : <Activity className="w-4 h-4 text-emerald-400" />}
                      {msg.actionData.title}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ناجح ✓
                    </span>
                  </div>

                  {/* Render Generated Image with Click-to-Zoom & Pan */}
                  {msg.actionData.imageUrl && (
                    <div
                      onClick={() => {
                        if (msg.actionData?.imageUrl) {
                          handleOpenImageViewer(
                            msg.actionData.imageUrl,
                            msg.actionData.imagePrompt,
                            msg.actionData.title || "معاينة الصورة المولدة"
                          );
                        }
                      }}
                      className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-md hover:border-yellow-400/80 transition-all"
                      title="انقر للمعاينة التفاعلية في منتصف الشاشة مع 5 مستويات تكبير وسحب يميناً ويساراً"
                    >
                      <img
                        src={msg.actionData.imageUrl}
                        alt={msg.actionData.imagePrompt || "Generated AI Image"}
                        className="w-full max-h-64 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Top Click Hint Badge */}
                      <div className="absolute top-2 right-2 bg-zinc-950/90 text-yellow-300 border border-yellow-400/60 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <MoveHorizontal className="w-3 h-3 text-yellow-400 animate-pulse" />
                        <span>معاينة وسحب (5 مستويات)</span>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                        <span className="text-[11px] text-white font-bold truncate max-w-[65%] drop-shadow-md">
                          {msg.actionData.imagePrompt}
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (msg.actionData?.imageUrl) {
                                handleOpenImageViewer(
                                  msg.actionData.imageUrl,
                                  msg.actionData.imagePrompt,
                                  msg.actionData.title || "معاينة الصورة"
                                );
                              }
                            }}
                            className="p-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 rounded-lg transition-colors font-bold flex items-center gap-1 text-[10px]"
                            title="تكبير ومعاينة في المنتصف"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={msg.actionData.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-zinc-900/90 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                            title="فتح في تبويب مستقل"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => {
                              if (msg.actionData?.imageUrl) {
                                navigator.clipboard.writeText(msg.actionData.imageUrl);
                                alert("تم نسخ رابط الصورة بنجاح!");
                              }
                            }}
                            className="p-1.5 bg-zinc-900/90 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                            title="نسخ الرابط"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render File Path & Code Snippet */}
                  {msg.actionData.filePath && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-500/20">
                        <span>📁 {msg.actionData.filePath}</span>
                      </div>
                      {msg.actionData.codeSnippet && (
                        <div className="relative">
                          <pre className="p-2.5 bg-zinc-900/90 rounded-xl text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-48 custom-scrollbar border border-zinc-800">
                            <code>{msg.actionData.codeSnippet}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Render Diagnostics & System Status */}
                  {msg.actionData.diagnostics && !msg.actionData.filePath && (
                    <div className="p-2.5 bg-zinc-900 rounded-xl text-[11px] font-mono text-zinc-300 space-y-1 overflow-x-auto max-h-48 custom-scrollbar">
                      {msg.actionData.type === "file_search" && Array.isArray(msg.actionData.diagnostics) ? (
                        <div>
                          <div className="text-indigo-400 font-bold mb-1">الملفات المطابقة ({msg.actionData.diagnostics.length}):</div>
                          {msg.actionData.diagnostics.map((f: string, i: number) => (
                            <div key={i} className="text-zinc-400 hover:text-white py-0.5">📄 {f}</div>
                          ))}
                        </div>
                      ) : msg.actionData.type === "file_tree" ? (
                        <div>
                          <div className="text-indigo-400 font-bold mb-1">شجرة ملفات المشروع:</div>
                          <div className="text-[10px] text-zinc-400 whitespace-pre">
                            {JSON.stringify(msg.actionData.diagnostics, null, 2).slice(0, 1000)}
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.actionData.diagnostics.server && <div className="text-emerald-400 font-bold">● خادم النظام: {msg.actionData.diagnostics.server}</div>}
                          {msg.actionData.diagnostics.totalAppsCount !== undefined && <div className="text-indigo-300 font-bold">📱 عدد التطبيقات المنشورة: {msg.actionData.diagnostics.totalAppsCount} تطبيقاً</div>}
                          {msg.actionData.diagnostics.groqKeys && <div>Groq LLaMA: {msg.actionData.diagnostics.groqKeys?.active} نشط من {msg.actionData.diagnostics.groqKeys?.total}</div>}
                          {msg.actionData.diagnostics.geminiKeys && <div>Gemini API: {msg.actionData.diagnostics.geminiKeys?.active} نشط من {msg.actionData.diagnostics.geminiKeys?.total}</div>}
                          {msg.actionData.diagnostics.elevenlabsKeys && <div>ElevenLabs Voice: {msg.actionData.diagnostics.elevenlabsKeys?.active} نشط من {msg.actionData.diagnostics.elevenlabsKeys?.total}</div>}
                          {msg.actionData.diagnostics.githubTokens && <div>GitHub PAT: {msg.actionData.diagnostics.githubTokens?.active} نشط</div>}
                        </>
                      )}
                    </div>
                  )}

                  {/* Render Interactive Live Keys Table */}
                  {msg.actionData.type === "get_keys_table" && msg.actionData.tableData && (
                    <div className="space-y-2 mt-2">
                      {/* Summary Badges */}
                      {msg.actionData.summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
                          <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-center">
                            <span className="text-zinc-500 block">إجمالي المفاتيح</span>
                            <span className="text-white font-bold text-xs">{msg.actionData.summary.totalKeys}</span>
                          </div>
                          <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl text-center">
                            <span className="text-emerald-400 block">النشطة ✓</span>
                            <span className="text-emerald-300 font-bold text-xs">{msg.actionData.summary.activeKeys}</span>
                          </div>
                          <div className="bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl text-center">
                            <span className="text-rose-400 block">المستنفدة ✕</span>
                            <span className="text-rose-300 font-bold text-xs">{msg.actionData.summary.exhaustedKeys}</span>
                          </div>
                          <div className="bg-purple-950/40 border border-purple-500/30 p-2 rounded-xl text-center">
                            <span className="text-purple-400 block">Groq / Gemini</span>
                            <span className="text-purple-300 font-bold text-xs">{msg.actionData.summary.groqCount + msg.actionData.summary.geminiCount}</span>
                          </div>
                        </div>
                      )}

                      {/* Keys Table */}
                      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/90">
                        <div className="overflow-x-auto max-h-60 custom-scrollbar">
                          <table className="w-full text-right text-[11px]">
                            <thead className="bg-zinc-950 text-zinc-400 text-[10px] font-black border-b border-zinc-800 sticky top-0">
                              <tr>
                                <th className="p-2">#</th>
                                <th className="p-2">المزود</th>
                                <th className="p-2">المفتاح المشفر</th>
                                <th className="p-2">الحالة الحية</th>
                                <th className="p-2">الأخطاء</th>
                                <th className="p-2 text-center">إجراء</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono">
                              {msg.actionData.tableData.map((k: any, idx: number) => (
                                <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                                  <td className="p-2 text-zinc-500">{k.index}</td>
                                  <td className="p-2 font-sans font-bold">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] ${
                                        k.provider === "groq"
                                          ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                                          : k.provider === "gemini"
                                          ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                                          : k.provider === "elevenlabs"
                                          ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                          : "bg-zinc-800 text-zinc-300"
                                      }`}
                                    >
                                      {k.provider.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-2 text-zinc-300 text-[10px]">{k.maskedKey}</td>
                                  <td className="p-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold inline-flex items-center gap-1 ${
                                        k.status === "active"
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      }`}
                                    >
                                      {k.status === "active" ? "نشط ✓" : "مستنفد ✕"}
                                    </span>
                                  </td>
                                  <td className="p-2 text-zinc-400">{k.errorCount}</td>
                                  <td className="p-2 text-center">
                                    <button
                                      onClick={() => handleRotateKey(k.provider)}
                                      className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-[9px] font-sans font-bold transition-colors cursor-pointer"
                                      title="تبديل هذا المزود إلى المفتاح التالي"
                                    >
                                      🔄 تدوير
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Quick Table Actions Toolbar */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button
                          onClick={() => handleRotateKey("groq")}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3 text-indigo-400" />
                          <span>تدوير مفتاح Groq</span>
                        </button>
                        <button
                          onClick={() => handleRotateKey("gemini")}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3 text-cyan-400" />
                          <span>تدوير مفتاح Gemini</span>
                        </button>
                        <button
                          onClick={() => handleResetKeys("all")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>إعادة تفعيل كافة المفاتيح</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.actionData.message && (
                    <p className="text-[11px] text-zinc-400">{msg.actionData.message}</p>
                  )}
                </div>
              )}

              {/* Message Bottom Toolbar */}
              {msg.sender === "agent" && !msg.isError && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {msg.audioBase64 ? (
                      <button
                        onClick={() => {
                          if (currentPlayingId === msg.id && isPlayingAudio) {
                            stopAudio();
                          } else {
                            playAudioBase64(msg.audioBase64!, msg.id);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          currentPlayingId === msg.id && isPlayingAudio
                            ? "bg-purple-600 text-white border-purple-400 animate-pulse"
                            : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {currentPlayingId === msg.id && isPlayingAudio ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>إيقاف الصوت</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>استماع (ElevenLabs)</span>
                          </>
                        )}
                      </button>
                    ) : null}

                    {msg.voiceKeyLabel && (
                      <span className="text-[9px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">
                        {msg.voiceKeyLabel}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-md transition-all cursor-pointer flex items-center gap-1"
                    title="نسخ نص الإجابة"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px]">{copiedMessageId === msg.id ? "تم النسخ" : "نسخ"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ⚡ QUICK INTERACTIVE ACTION PILLS & MODEL/KEY SWITCHER */}
      <div className="bg-zinc-900/90 px-2.5 py-1.5 border-t border-zinc-800 flex items-center gap-2 text-[11px] shrink-0 relative overflow-visible">
        {/* 🔑 COMPACT MODEL & KEY ROTATOR BUTTON (BOTTOM RIGHT) */}
        <div className="relative shrink-0">
          <button
            onClick={handleToggleModelMenu}
            className="w-8 h-8 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 border border-purple-500/40 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-90 relative"
            title="تبديل النماذج والمفاتيح الحية (Switch Models & Rotate Keys)"
          >
            <Key className="w-4 h-4 text-purple-400" />
            {keysSummary && keysSummary.activeCount !== undefined && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950 animate-pulse"
                title={`${keysSummary.activeCount} مفتاح نشط`}
              />
            )}
          </button>

          {/* Upward Floating Model & Key Selection Menu */}
          {showModelMenu && (
            <div className="absolute bottom-full right-0 mb-2.5 w-80 sm:w-88 max-w-[calc(100vw-2.5rem)] bg-zinc-950/98 backdrop-blur-2xl border border-purple-500/40 rounded-2xl shadow-2xl p-3 z-50 space-y-2.5 text-xs animate-in slide-in-from-bottom-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-black text-white">تبديل النماذج والمفاتيح الحية</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={fetchKeysTable}
                    disabled={isLoadingKeys}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-purple-300 transition-colors cursor-pointer"
                    title="تحديث حالة المفاتيح الآن"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? "animate-spin text-purple-400" : ""}`} />
                  </button>
                  <button
                    onClick={() => setShowModelMenu(false)}
                    className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Keys Overview Badge */}
              <div className="px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-[10px]">
                <span className="text-purple-200 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                  المفاتيح الحية النشطة:
                </span>
                <span className="font-mono font-black text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  {keysSummary ? `${keysSummary.activeCount || 0} من ${keysSummary.total || 0} تعمل` : "جاري الفحص..."}
                </span>
              </div>

              {/* Models List with Live Count of Working Keys */}
              <div className="space-y-1.5">
                {/* Groq 70B */}
                <button
                  onClick={() => {
                    setActiveModel("llama-3.3-70b-versatile");
                    setShowModelMenu(false);
                    handleSendMessage("قم بتفعيل نموذج Groq LLaMA 3.3 70B Flagship واستخدامه في المحادثة");
                  }}
                  className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                    activeModel === "llama-3.3-70b-versatile"
                      ? "bg-indigo-600/25 text-indigo-100 border-indigo-500/50 shadow-xs font-bold"
                      : "bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 border-zinc-800/80"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">⚡ Groq LLaMA 3.3 70B</span>
                      <span className="text-[9px] text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-500/30 font-sans">القيادي</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">فائق الذكاء لكتابة المقالات والبرمجة</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      {keysSummary?.groq ? `${keysSummary.groq.active}/${keysSummary.groq.total} نشط` : "3 نشط"}
                    </span>
                    {activeModel === "llama-3.3-70b-versatile" && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                </button>

                {/* Groq 8B */}
                <button
                  onClick={() => {
                    setActiveModel("llama-3.1-8b-instant");
                    setShowModelMenu(false);
                    handleSendMessage("قم بتفعيل نموذج Groq LLaMA 3.1 8B Instant فائق السرعة");
                  }}
                  className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                    activeModel === "llama-3.1-8b-instant"
                      ? "bg-indigo-600/25 text-indigo-100 border-indigo-500/50 shadow-xs font-bold"
                      : "bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 border-zinc-800/80"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">🚀 Groq LLaMA 3.1 8B</span>
                      <span className="text-[9px] text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-500/30 font-sans">فائق السرعة</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">استجابة فورية للأوامر السريعة</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      {keysSummary?.groq ? `${keysSummary.groq.active}/${keysSummary.groq.total} نشط` : "3 نشط"}
                    </span>
                    {activeModel === "llama-3.1-8b-instant" && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                </button>

                {/* Google Gemini 3.6 */}
                <button
                  onClick={() => {
                    setActiveModel("gemini-3.6-flash");
                    setShowModelMenu(false);
                    handleSendMessage("قم بالتحويل إلى نموذج Google Gemini 3.6 Flash");
                  }}
                  className={`w-full text-right p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                    activeModel === "gemini-3.6-flash"
                      ? "bg-cyan-600/25 text-cyan-100 border-cyan-500/50 shadow-xs font-bold"
                      : "bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 border-zinc-800/80"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">✨ Google Gemini 3.6</span>
                      <span className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/30 font-sans">Google AI</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">دعم متقدم للبحث وتحليل الصور</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                      {keysSummary?.gemini ? `${keysSummary.gemini.active}/${keysSummary.gemini.total} نشط` : "1 نشط"}
                    </span>
                    {activeModel === "gemini-3.6-flash" && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                </button>
              </div>

              {/* Quick Key Rotation & Reset Actions */}
              <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    handleRotateKey("groq");
                    setShowModelMenu(false);
                  }}
                  className="py-1.5 px-2 rounded-xl bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-200 text-[10px] font-bold text-center transition-colors cursor-pointer border border-indigo-500/30 flex items-center justify-center gap-1"
                >
                  🔄 تدوير Groq
                </button>
                <button
                  onClick={() => {
                    handleRotateKey("gemini");
                    setShowModelMenu(false);
                  }}
                  className="py-1.5 px-2 rounded-xl bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 text-[10px] font-bold text-center transition-colors cursor-pointer border border-cyan-500/30 flex items-center justify-center gap-1"
                >
                  🔄 تدوير Gemini
                </button>
                <button
                  onClick={() => {
                    handleResetKeys("all");
                    setShowModelMenu(false);
                  }}
                  className="py-1.5 px-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 text-[10px] font-bold text-center transition-colors cursor-pointer border border-emerald-500/30 flex items-center justify-center gap-1"
                >
                  ✨ تصفير الكوتا
                </button>
                <button
                  onClick={() => {
                    handleOpenKeysTable();
                    setShowModelMenu(false);
                  }}
                  className="py-1.5 px-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 text-[10px] font-bold text-center transition-colors cursor-pointer border border-purple-500/30 flex items-center justify-center gap-1"
                >
                  🔑 جدول المفاتيح
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ⚡ 25+ DEVELOPER COMMANDS DRAGGABLE & SCROLLABLE RIBBON */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 relative">
          {/* Scroll Left Arrow */}
          <button
            onClick={scrollRibbonRight}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer hidden sm:flex items-center justify-center"
            title="تمرير الأوامر لليمين"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* ⚙️ All 25+ Commands Modal Trigger Button */}
          <button
            onClick={() => setShowCommandsModal(true)}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 hover:from-amber-500/40 hover:to-purple-500/40 text-amber-300 border border-amber-500/40 cursor-pointer transition-all flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-90 group"
            title={`⚙️ فتح نافذة الأوامر البرمجية (${DEVELOPER_COMMANDS.length} أمراً جاهزاً)`}
          >
            <span className="text-sm select-none group-hover:rotate-45 transition-transform duration-300 leading-none">⚙️</span>
          </button>

          {/* Draggable & Touch-Scrollable Commands Container */}
          <div
            ref={ribbonScrollRef}
            onMouseDown={handleRibbonMouseDown}
            onMouseMove={handleRibbonMouseMove}
            onMouseUp={handleRibbonMouseUpOrLeave}
            onMouseLeave={handleRibbonMouseUpOrLeave}
            className={`flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 min-w-0 py-0.5 select-none ${
              isDraggingRibbon ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {DEVELOPER_COMMANDS.map((cmd) => {
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    if (!hasDraggedRibbon) {
                      handleExecuteCommand(cmd, true);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl border text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95 group font-medium ${cmd.colorClass.bg} ${cmd.colorClass.border} ${cmd.colorClass.text} ${cmd.colorClass.hoverBg}`}
                  title={`${cmd.title}: ${cmd.quickSummary}`}
                >
                  <span className={`${cmd.colorClass.iconColor} group-hover:scale-110 transition-transform`}>
                    {renderCommandIcon(cmd.iconName, "w-3.5 h-3.5")}
                  </span>
                  <span>{cmd.title}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Arrow */}
          <button
            onClick={scrollRibbonLeft}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer hidden sm:flex items-center justify-center"
            title="تمرير الأوامر لليسار"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ✍️ INPUT FORM & MULTIMODAL VISION ATTACHMENT */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-zinc-950 via-blue-950/30 to-zinc-950 border-t border-yellow-400/30 shrink-0">
        {/* 📷 Attached Image Preview Bar */}
        {selectedImage && (
          <div className="mb-2.5 p-2.5 rounded-2xl bg-zinc-900/95 border border-yellow-400/60 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => handleOpenImageViewer(selectedImage.dataUrl, undefined, selectedImage.fileName)}
                className="w-12 h-12 rounded-xl overflow-hidden border border-yellow-400/40 shrink-0 bg-black cursor-pointer group relative"
                title="انقر لتكبير ومعاينة الصورة في عارض الصور 🔍"
              >
                <img
                  src={selectedImage.dataUrl}
                  alt={selectedImage.fileName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ZoomIn className="w-3.5 h-3.5 text-yellow-300" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-yellow-300 truncate">{selectedImage.fileName}</span>
                  <span className="text-[9px] bg-yellow-400/20 text-yellow-200 font-mono px-1.5 py-0.5 rounded">
                    {selectedImage.sizeKb} KB
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                  <ScanLine className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-cyan-300 font-medium truncate">جاهزة للاستخراج وتحليل الأكواد والكلمات (OCR Vision)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenImageViewer(selectedImage.dataUrl, undefined, selectedImage.fileName)}
                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-yellow-300 border border-zinc-700 text-xs transition-colors cursor-pointer"
                title="معاينة وتكبير الصورة"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRemoveSelectedImage}
                className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs transition-colors cursor-pointer"
                title="إلغاء إرفاق الصورة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Hidden File Input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelect(file);
            }}
          />

          {/* 👁️🗨️ Multimodal Vision Image Attachment Button */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-90 shadow-sm hover:scale-105 ${
              selectedImage
                ? "bg-yellow-400 text-zinc-950 border-yellow-300 shadow-yellow-400/30 ring-2 ring-yellow-400/50"
                : "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 hover:border-yellow-400/50"
            }`}
            title="👁️🗨️ إرفاق صورة أو لقطة شاشة لقراءة النصوص واستخراج الأكواد (OCR Vision)"
          >
            <span className="select-none text-sm sm:text-base leading-none">👁️🗨️</span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handleClipboardPaste}
            placeholder={
              selectedImage
                ? "اكتب سؤالك أو اترك الحقل فارغاً لقراءة وتحليل الصورة تلقائياً..."
                : "اكتب أمرك أو الصق (Ctrl+V) / ارفع صورة لقراءة محتواها وتحليلها..."
            }
            className="flex-1 bg-zinc-900/90 border border-zinc-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/40 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none transition-all font-sans"
            dir="rtl"
            disabled={isSending}
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isSending}
            className="px-4.5 py-3 rounded-2xl bg-gradient-to-r from-yellow-500 via-rose-600 to-blue-600 hover:from-yellow-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-yellow-500/25 border border-yellow-300/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 active:scale-90"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Send className="w-4 h-4 rotate-180" />
                <span className="hidden sm:inline">تنفيذ</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🪟 1. KEYS TABLE MODAL OVERLAY                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showKeysTableModal && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-black text-white">جدول المفاتيح والنماذج الحية (Live API Keys Table)</h4>
            </div>
            <button
              onClick={() => setShowKeysTableModal(false)}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-[10px]">
              {["all", "groq", "gemini", "elevenlabs", "github"].map((prov) => (
                <button
                  key={prov}
                  onClick={() => setSelectedKeyProviderFilter(prov)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedKeyProviderFilter === prov
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {prov === "all" ? "الكل" : prov.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={keysSearchQuery}
                onChange={(e) => setKeysSearchQuery(e.target.value)}
                placeholder="بحث في المفاتيح..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={fetchKeysTable}
              disabled={isLoadingKeys}
              className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-800 flex items-center gap-1 cursor-pointer"
              title="تحديث البيانات من الخادم"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isLoadingKeys ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto border border-zinc-800/80 rounded-2xl bg-zinc-900/60 custom-scrollbar my-2">
            {isLoadingKeys ? (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center gap-2 h-full">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-xs">جاري فحص وجلب جدول المفاتيح من الخادم...</span>
              </div>
            ) : !keysTableData || keysTableData.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2 h-full">
                <Key className="w-8 h-8 text-zinc-700" />
                <span className="text-xs">لا توجد مفاتيح مسجلة تطابق البحث</span>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-950/90 text-zinc-400 text-[10px] font-black border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">المزود</th>
                    <th className="p-2.5">المفتاح المشفر</th>
                    <th className="p-2.5">الحالة الحية</th>
                    <th className="p-2.5">الأخطاء</th>
                    <th className="p-2.5 text-center">إجراء تدوير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 font-mono">
                  {keysTableData
                    .filter((k) => {
                      if (selectedKeyProviderFilter !== "all" && k.provider !== selectedKeyProviderFilter) return false;
                      if (keysSearchQuery && !k.maskedKey.toLowerCase().includes(keysSearchQuery.toLowerCase()) && !k.provider.toLowerCase().includes(keysSearchQuery.toLowerCase())) return false;
                      return true;
                    })
                    .map((k, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="p-2.5 text-zinc-500">{k.index}</td>
                        <td className="p-2.5 font-sans font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              k.provider === "groq"
                                ? "bg-indigo-950 text-indigo-300 border border-indigo-500/30"
                                : k.provider === "gemini"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                                : k.provider === "elevenlabs"
                                ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {k.provider.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2.5 text-zinc-200 text-xs">{k.maskedKey}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold inline-flex items-center gap-1 ${
                              k.status === "active"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {k.status === "active" ? "● نشط وجاهز" : "✕ مستنفد الكوتا"}
                          </span>
                        </td>
                        <td className="p-2.5 text-zinc-400">{k.errorCount}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleRotateKey(k.provider)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-[10px] font-sans font-bold transition-colors cursor-pointer"
                          >
                            🔄 تدوير
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleRotateKey("groq")}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 text-xs font-bold transition-colors cursor-pointer"
              >
                🔄 تدوير Groq
              </button>
              <button
                onClick={() => handleResetKeys("all")}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
              >
                ✨ تصفير الكوتا للكل
              </button>
            </div>

            <button
              onClick={handleInsertKeysTableToChat}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
            >
              <Table className="w-3.5 h-3.5" />
              <span>إدراج الجدول داخل المحادثة</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 📄 2. FILE CREATOR MODAL OVERLAY                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showFileCreatorModal && (
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-black text-white">إنشاء ملف برمجي جديد في المشروع (Create File)</h4>
            </div>
            <button
              onClick={() => setShowFileCreatorModal(false)}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 py-3 flex-1 flex flex-col min-h-0">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">مسار الملف النسبي:</label>
              <input
                type="text"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="مثال: src/components/CustomWidget.tsx أو src/utils/tools.ts"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                dir="ltr"
              />
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500 font-bold">قوالب سريعة:</span>
              <button
                onClick={() => {
                  setNewFilePath("src/components/MyNewComponent.tsx");
                  setNewFileContent(`import React from 'react';\n\nexport const MyNewComponent: React.FC = () => {\n  return (\n    <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">\n      <h3 className="text-lg font-bold text-emerald-400">مكون مخصص جديد</h3>\n      <p className="text-sm text-zinc-400 mt-1">تم إنشاؤه بواسطة وكيل المطور الذكي.</p>\n    </div>\n  );\n};\n`);
                }}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded-lg cursor-pointer"
              >
                ⚛️ مكون React
              </button>
              <button
                onClick={() => {
                  setNewFilePath("src/lib/customHelpers.ts");
                  setNewFileContent(`// Custom helper utilities\nexport function formatCustomData(input: string): string {\n  return input.trim().toLowerCase();\n}\n`);
                }}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded-lg cursor-pointer"
              >
                🛠️ دالة مساعدة
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">محتوى الكود البرمجي:</label>
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder="// اكتب أو الصق كود الملف هنا..."
                className="flex-1 w-full bg-zinc-900/90 border border-zinc-700 rounded-2xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500 custom-scrollbar resize-none"
                dir="ltr"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setShowFileCreatorModal(false)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleCreateFileSubmit}
              disabled={isCreatingFile || !newFilePath.trim() || !newFileContent.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
            >
              {isCreatingFile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>حفظ وإنشاء الملف</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ⚡ 3. CODE PATCHER / EDITOR MODAL OVERLAY                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showFilePatcherModal && (
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-black text-white">تعديل واستبدال جزء من كود ملف (Code Patcher)</h4>
            </div>
            <button
              onClick={() => setShowFilePatcherModal(false)}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 py-3 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">مسار الملف المطلوب تعديله:</label>
              <input
                type="text"
                value={patchFilePath}
                onChange={(e) => setPatchFilePath(e.target.value)}
                placeholder="مثال: server.ts أو src/App.tsx"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-rose-400 mb-1">النص / الكود المراد استبداله (Target to Replace):</label>
              <textarea
                value={patchTargetText}
                onChange={(e) => setPatchTargetText(e.target.value)}
                placeholder="الصق النص أو الكود الحالي الدقيق الموجود في الملف..."
                className="w-full h-28 bg-zinc-900/90 border border-zinc-700 rounded-xl p-2.5 text-xs font-mono text-rose-200 focus:outline-none focus:border-rose-500 custom-scrollbar resize-none"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-400 mb-1">الكود الجديد البديل (New Replacement Code):</label>
              <textarea
                value={patchReplacementText}
                onChange={(e) => setPatchReplacementText(e.target.value)}
                placeholder="الصق الكود الجديد المعدل الذي سيحل محل الكود السابق..."
                className="w-full h-28 bg-zinc-900/90 border border-zinc-700 rounded-xl p-2.5 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500 custom-scrollbar resize-none"
                dir="ltr"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => setShowFilePatcherModal(false)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handlePatchFileSubmit}
              disabled={isPatchingFile || !patchFilePath.trim() || !patchTargetText.trim()}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
            >
              {isPatchingFile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>تطبيق التعديل البرمجي فوراً</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 📂 4. FILE TREE MODAL OVERLAY                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showFileTreeModal && (
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col p-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-black text-white">مستكشف شجرة ملفات المشروع (File Tree Explorer)</h4>
            </div>
            <button
              onClick={() => setShowFileTreeModal(false)}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 flex items-center gap-2 shrink-0">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={treeSearchQuery}
              onChange={(e) => setTreeSearchQuery(e.target.value)}
              placeholder="تصفية الملفات بالاسم..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-auto border border-zinc-800/80 rounded-2xl bg-zinc-900/60 p-3 font-mono text-xs text-zinc-300 custom-scrollbar my-2">
            {isLoadingTree ? (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center gap-2 h-full">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span>جاري مسح واستكشاف ملفات المشروع...</span>
              </div>
            ) : !fileTreeData ? (
              <div className="p-8 text-center text-zinc-500">لا توجد بيانات شجرة ملفات</div>
            ) : (
              <div className="space-y-1">
                {fileTreeData
                  .filter((item) => !treeSearchQuery || item.name?.toLowerCase().includes(treeSearchQuery.toLowerCase()) || item.path?.toLowerCase().includes(treeSearchQuery.toLowerCase()))
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {item.type === "directory" ? (
                          <FolderTree className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span className={item.type === "directory" ? "font-bold text-indigo-200" : "text-zinc-300"}>
                          {item.name || item.path}
                        </span>
                      </div>
                      {item.type !== "directory" && (
                        <button
                          onClick={() => {
                            setPatchFilePath(item.path || item.name);
                            setShowFileTreeModal(false);
                            setShowFilePatcherModal(true);
                          }}
                          className="text-[10px] text-amber-400 hover:underline px-2 py-0.5 bg-amber-950/40 rounded cursor-pointer"
                        >
                          تعديل كود
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 📋 5. LIVE ACTIVITY & ERROR LOGS MODAL OVERLAY                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showActivityLogModal && (
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex flex-col p-3 sm:p-4 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/20 border border-purple-400 text-purple-300">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>سجل العمليات والأخطاء الحية (Activity & Error Logs)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                    {activityLogs.length} سجل
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-400">تتبع حي لجميع العمليات الناجحة، استدعاءات النماذج، وأخطاء النظام مع إمكانية النسخ الفوري</p>
              </div>
            </div>
            <button
              onClick={() => setShowActivityLogModal(false)}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics & Actions Bar */}
          <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-zinc-800/80">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setLogFilterTab("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  logFilterTab === "all" ? "bg-yellow-400 text-zinc-950 shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                الكل ({activityLogs.length})
              </button>
              <button
                onClick={() => setLogFilterTab("errors")}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  logFilterTab === "errors" ? "bg-rose-600 text-white shadow-xs" : "text-rose-400 hover:text-rose-200"
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>الأخطاء ({activityLogs.filter((l) => l.type === "error").length})</span>
              </button>
              <button
                onClick={() => setLogFilterTab("success")}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  logFilterTab === "success" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-400 hover:text-emerald-200"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>العمليات الناجحة ({activityLogs.filter((l) => l.type === "success").length})</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Copy All Errors */}
              <button
                onClick={() => {
                  const errorLogs = activityLogs.filter((l) => l.type === "error");
                  if (errorLogs.length === 0) {
                    alert("لا توجد أخطاء مسجلة حالياً لنسخها!");
                    return;
                  }
                  const formatted = errorLogs
                    .map(
                      (l, i) =>
                        `[خطأ ${i + 1}]:\n• التوقيت: ${l.timestamp}\n• المصدر: ${l.source || "غير محدد"}\n• العنوان: ${l.title}\n• الرسالة: ${l.description}\n${
                          l.details ? `• التفاصيل: ${JSON.stringify(l.details, null, 2)}` : ""
                        }\n`
                    )
                    .join("\n---\n");
                  navigator.clipboard.writeText(formatted);
                  setCopiedLogId("all_errors");
                  setTimeout(() => setCopiedLogId(null), 2000);
                }}
                className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="نسخ تقرير مجمع لجميع الأخطاء"
              >
                {copiedLogId === "all_errors" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLogId === "all_errors" ? "تم نسخ الأخطاء!" : "نسخ تقرير الأخطاء"}</span>
              </button>

              {/* Send Errors to Agent Chat */}
              <button
                onClick={() => {
                  const errorLogs = activityLogs.filter((l) => l.type === "error");
                  if (errorLogs.length === 0) {
                    alert("لا توجد أخطاء مسجلة حالياً لإرسالها!");
                    return;
                  }
                  const formatted = errorLogs
                    .slice(0, 5)
                    .map(
                      (l, i) =>
                        `[خطأ ${i + 1}] (${l.timestamp} - ${l.source || "النظام"}): ${l.title}\nالرسالة: ${l.description}`
                    )
                    .join("\n\n");
                  const prompt = `إليك سجل الأخطاء المسجلة في النظام أثناء العمل، يرجى فحصها وتزويدي بالحل والإصلاح المناسب:\n\n${formatted}`;
                  handleSendMessage(prompt);
                  setShowActivityLogModal(false);
                }}
                className="px-3 py-1 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="إرسال الأخطاء مباشرة لمحادثة الوكيل"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>إرسال للوكيل للإصلاح 🚀</span>
              </button>

              {/* Clear Logs */}
              <button
                onClick={() => {
                  if (window.confirm("هل ترغب في مسح سجل العمليات والأخطاء بالكامل؟")) {
                    setActivityLogs([]);
                    try {
                      localStorage.removeItem("dev_agent_activity_logs");
                    } catch {}
                    setActiveTopError(null);
                  }
                }}
                className="p-1 rounded-xl bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-800 text-xs transition-colors cursor-pointer"
                title="مسح السجل"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Filter Input */}
          <div className="py-2 flex items-center gap-2 shrink-0">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              placeholder="ابحث في السجلات (اسم العملية، نوع الخطأ، التوقيت، المصدر)..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            {logSearchQuery && (
              <button onClick={() => setLogSearchQuery("")} className="text-zinc-400 hover:text-white text-xs px-2 cursor-pointer">
                مسح البحث
              </button>
            )}
          </div>

          {/* Logs List Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 my-1">
            {activityLogs
              .filter((log) => {
                if (logFilterTab === "errors" && log.type !== "error") return false;
                if (logFilterTab === "success" && log.type !== "success") return false;
                if (!logSearchQuery) return true;
                const q = logSearchQuery.toLowerCase();
                return (
                  log.title.toLowerCase().includes(q) ||
                  log.description.toLowerCase().includes(q) ||
                  (log.source && log.source.toLowerCase().includes(q)) ||
                  log.timestamp.includes(q)
                );
              })
              .map((log) => {
                const isErr = log.type === "error";
                const isSucc = log.type === "success";

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isErr
                        ? "bg-red-950/40 border-red-500/40 hover:border-red-400/70"
                        : isSucc
                        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/50"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                            isErr
                              ? "bg-red-500/20 text-red-400 border border-red-500/40"
                              : isSucc
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                          }`}
                        >
                          {isErr ? (
                            <AlertOctagon className="w-4 h-4" />
                          ) : isSucc ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Info className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold ${isErr ? "text-red-200" : isSucc ? "text-emerald-200" : "text-zinc-200"}`}>
                              {log.title}
                            </span>
                            {log.source && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                                {log.source}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-400 font-mono">{log.timestamp}</span>
                            {log.durationMs !== undefined && (
                              <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-1 rounded">
                                ⚡ {log.durationMs}ms
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-300 break-words font-mono leading-relaxed bg-black/30 p-2 rounded-xl border border-zinc-800/80 select-all">
                            {log.description}
                          </p>

                          {/* Technical Details Preview (if any) */}
                          {log.details && (
                            <details className="text-[11px] text-zinc-400 font-mono mt-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                              <summary className="cursor-pointer text-yellow-400 font-bold hover:underline select-none">
                                عرض التفاصيل التقنية (Technical Details JSON)
                              </summary>
                              <pre className="mt-2 text-[10px] text-zinc-300 overflow-x-auto p-2 bg-black/60 rounded-lg custom-scrollbar max-h-36">
                                {typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>

                      {/* Log Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Copy this log */}
                        <button
                          onClick={() => {
                            const textToCopy = `[سجل عملية]:\n• التوقيت: ${log.timestamp}\n• الحالة: ${log.type}\n• المصدر: ${log.source || "غير محدد"}\n• العنوان: ${log.title}\n• التفاصيل: ${log.description}\n${log.details ? `• تقني: ${JSON.stringify(log.details, null, 2)}` : ""}`;
                            navigator.clipboard.writeText(textToCopy);
                            setCopiedLogId(log.id);
                            setTimeout(() => setCopiedLogId(null), 2000);
                          }}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
                          title="نسخ هذا السجل"
                        >
                          {copiedLogId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Send this error to agent chat */}
                        {isErr && (
                          <button
                            onClick={() => {
                              const promptToSend = `لقد واجهت هذا الخطأ في النظام، يرجى تحليله وإصلاحه:\n\nالعنوان: ${log.title}\nالمصدر: ${log.source || "النظام"}\nالرسالة: ${log.description}\n${log.details ? `التفاصيل: ${JSON.stringify(log.details)}` : ""}`;
                              handleSendMessage(promptToSend);
                              setShowActivityLogModal(false);
                            }}
                            className="px-2 py-1 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            title="إرسال هذا الخطأ للوكيل"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>إرسال للوكيل</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {activityLogs.length === 0 && (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                <ClipboardList className="w-8 h-8 text-zinc-600" />
                <span>لا توجد سجلات بعد في هذه الجلسة</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 🖼️ 6. 5-LEVEL ZOOMABLE & DRAGGABLE IMAGE VIEWER MODAL OVERLAY */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeImageViewer && (
        <div
          className="fixed inset-0 bg-zinc-950/95 backdrop-blur-2xl z-[10000] flex flex-col justify-between p-2 sm:p-4 select-none animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseImageViewer();
            }
          }}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-zinc-900/90 rounded-2xl border border-yellow-400/40 shrink-0 shadow-2xl backdrop-blur-md z-20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-rose-500 text-zinc-950 font-black shrink-0 shadow-md">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-[400px]">
                    {activeImageViewer.title || "معاينة وتحريك الصورة التفاعلية"}
                  </h3>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                    مستوى التكبير: {imageZoomLevel} من 5 ({currentZoomConfig.percent})
                  </span>
                </div>
                {activeImageViewer.prompt && (
                  <p className="text-[10px] text-zinc-400 truncate max-w-[280px] sm:max-w-[500px] font-mono mt-0.5">
                    {activeImageViewer.prompt}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Copy URL */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeImageViewer.url);
                  alert("تم نسخ رابط الصورة بنجاح!");
                }}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                title="نسخ رابط الصورة"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">نسخ الرابط</span>
              </button>

              {/* Download / Open full in new tab */}
              <a
                href={activeImageViewer.url}
                target="_blank"
                rel="noreferrer"
                download="ai-generated-image.png"
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                title="تحميل / فتح بحجم كامل"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">فتح كامل</span>
              </a>

              {/* Close Button */}
              <button
                onClick={handleCloseImageViewer}
                className="p-1.5 sm:p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                title="إغلاق المعاينة (ESC)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Center Interactive Pan & Zoom Viewport Stage */}
          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing my-2 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 touch-none shadow-inner"
            onMouseDown={(e) => {
              e.preventDefault();
              handleImageDragStart(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleImageDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
          >
            {/* Visual Drag Guides (Left and Right directional arrows) */}
            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none opacity-40 hover:opacity-100 transition-opacity z-10">
              <div className="p-2 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-400 shadow-xl backdrop-blur-xs">
                <ArrowLeft className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none opacity-40 hover:opacity-100 transition-opacity z-10">
              <div className="p-2 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-400 shadow-xl backdrop-blur-xs">
                <ArrowRight className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            {/* The Draggable & Zoomable Image */}
            <div
              style={{
                transform: `translate(${imagePanOffset.x}px, ${imagePanOffset.y}px) scale(${currentZoomConfig.scale})`,
                transition: isDraggingImage ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
                transformOrigin: "center center"
              }}
              className="will-change-transform flex items-center justify-center max-w-full max-h-full"
            >
              <img
                src={activeImageViewer.url}
                alt={activeImageViewer.prompt || "Preview"}
                className="max-w-[85vw] max-h-[65vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border-2 border-yellow-400/40 pointer-events-none select-none"
                draggable={false}
              />
            </div>

            {/* Floating Quick Pan Reset / Reposition overlay badge */}
            {(imagePanOffset.x !== 0 || imagePanOffset.y !== 0 || imageZoomLevel !== 3) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImagePanOffset({ x: 0, y: 0 });
                  setImageZoomLevel(3);
                }}
                className="absolute bottom-4 bg-zinc-900/90 hover:bg-yellow-400 hover:text-zinc-950 text-yellow-300 border border-yellow-400/50 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-1.5 transition-all cursor-pointer z-10 active:scale-95"
                title="إعادة الصورة للمنتصف وتعيين الحجم 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط للمنتصف (100%)</span>
              </button>
            )}
          </div>

          {/* Bottom Floating Control Dock (5 Zoom Levels + Left/Right Pan Controls) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 sm:p-3 bg-zinc-900/95 rounded-2xl border border-yellow-400/40 shrink-0 shadow-2xl backdrop-blur-md z-20">
            {/* Left/Right Directional Buttons & Reset */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
              <button
                onClick={() => handleNudgeImagePan("left")}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer border border-zinc-700 active:scale-90"
                title="سحب الصورة إلى اليسار"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-yellow-400" />
                <span>سحب لليسار</span>
              </button>

              <button
                onClick={() => setImagePanOffset({ x: 0, y: 0 })}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-zinc-700 active:scale-90"
                title="توسيط الصورة في المنتصف"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>توسيط</span>
              </button>

              <button
                onClick={() => handleNudgeImagePan("right")}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer border border-zinc-700 active:scale-90"
                title="سحب الصورة إلى اليمين"
              >
                <span>سحب لليمين</span>
                <ArrowRight className="w-3.5 h-3.5 text-yellow-400" />
              </button>
            </div>

            {/* 5 Zoom Level Stepper Buttons */}
            <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto justify-center">
              {/* Zoom Out Step */}
              <button
                onClick={() => setImageZoomLevel((prev) => Math.max(1, prev - 1))}
                disabled={imageZoomLevel === 1}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="تصغير المستوى"
              >
                <ZoomOut className="w-4 h-4 text-rose-400" />
              </button>

              {/* 5 Distinct Levels */}
              {ZOOM_LEVELS.map((lvl) => {
                const isActive = imageZoomLevel === lvl.level;
                return (
                  <button
                    key={lvl.level}
                    onClick={() => setImageZoomLevel(lvl.level)}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center ${
                      isActive
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 shadow-md shadow-yellow-500/30 scale-105 border border-yellow-300"
                        : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
                    }`}
                    title={`مستوى ${lvl.level}: ${lvl.label} (${lvl.percent})`}
                  >
                    <span className="text-[10px] leading-none">مستوى {lvl.level}</span>
                    <span className="text-[9px] font-mono leading-none mt-0.5 opacity-90">{lvl.percent}</span>
                  </button>
                );
              })}

              {/* Zoom In Step */}
              <button
                onClick={() => setImageZoomLevel((prev) => Math.min(5, prev + 1))}
                disabled={imageZoomLevel === 5}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="تكبير المستوى"
              >
                <ZoomIn className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* Instruction Tip */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <Hand className="w-3.5 h-3.5 text-yellow-400" />
              <span>اسحب بالماوس أو اللمس يميناً ويساراً للتنقل</span>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ ALL 25+ DEVELOPER COMMANDS SEARCHABLE MODAL */}
      {showCommandsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20">
                  <Terminal className="w-5 h-5 font-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">لوحة الأوامر البرمجية للمطور</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/40">
                      {DEVELOPER_COMMANDS.length} أمراً جاهزاً
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    اختر أي أمر برمجي لتوجيه الوكيل الذكي فوراً أو فحوصات التخزين، السيو، الكوتا، ومطابقة قواعد AGENTS.md
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCommandsModal(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Tabs */}
            <div className="p-3 sm:p-4 bg-zinc-900/60 border-b border-zinc-800 space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={commandSearchQuery}
                  onChange={(e) => setCommandSearchQuery(e.target.value)}
                  placeholder="ابحث في الأوامر البرمجية بالاسم أو الوصف (مثال: R2, كوتا, سيو, مفاتيح, مراجعة 1500 كلمة)..."
                  className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                  dir="rtl"
                />
                {commandSearchQuery && (
                  <button
                    onClick={() => setCommandSearchQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {DEVELOPER_COMMAND_CATEGORIES.map((cat) => {
                  const isActive = selectedCommandCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCommandCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20 scale-105"
                          : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border-zinc-800"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Commands Grid */}
            <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {(() => {
                const filtered = DEVELOPER_COMMANDS.filter((cmd) => {
                  const matchesCategory = selectedCommandCategory === "all" || cmd.category === selectedCommandCategory;
                  const q = commandSearchQuery.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    cmd.title.toLowerCase().includes(q) ||
                    cmd.quickSummary.toLowerCase().includes(q) ||
                    cmd.prompt.toLowerCase().includes(q) ||
                    cmd.category.toLowerCase().includes(q) ||
                    cmd.categoryLabel.toLowerCase().includes(q);
                  return matchesCategory && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 space-y-3">
                      <Terminal className="w-12 h-12 text-zinc-600 mx-auto" />
                      <p className="text-sm font-bold text-zinc-400">لا توجد أوامر مطابقة لكلمة البحث</p>
                      <button
                        onClick={() => {
                          setCommandSearchQuery("");
                          setSelectedCommandCategory("all");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        إعادة تعيين الفلاتر
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map((cmd) => {
                      return (
                        <div
                          key={cmd.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${cmd.colorClass.bg} ${cmd.colorClass.border}`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 ${cmd.colorClass.iconColor}`}>
                                  {renderCommandIcon(cmd.iconName, "w-4 h-4")}
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-black text-white">{cmd.title}</h4>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{cmd.quickSummary}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${cmd.colorClass.badgeBg} ${cmd.colorClass.badgeText} border border-zinc-700/50`}>
                                {cmd.badge || cmd.categoryLabel}
                              </span>
                            </div>

                            {/* Prompt Snippet Box */}
                            <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-300 font-mono line-clamp-2" dir="rtl">
                              {cmd.prompt}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/60">
                            <button
                              onClick={() => handleExecuteCommand(cmd, true)}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>تنفيذ فوري</span>
                            </button>

                            <button
                              onClick={() => handleExecuteCommand(cmd, false)}
                              className="py-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer border border-zinc-700 active:scale-95"
                              title="إدراج نص الأمر في حقل الكتابة للتعديل عليه"
                            >
                              تعديل
                            </button>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(cmd.prompt);
                                setCopiedCommandPrompt(cmd.id);
                                setTimeout(() => setCopiedCommandPrompt(null), 2000);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800 active:scale-95"
                              title="نسخ نص الأمر للحافظة"
                            >
                              {copiedCommandPrompt === cmd.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer with Direct Diagnostic Quick-Triggers */}
            <div className="p-3 sm:p-4 bg-zinc-900/90 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>جميع الأوامر تتبع معايير AGENTS.md ونظام التخزين الخفيف Cloudflare R2</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setShowCommandsModal(false);
                    handleSendMessage("افحص حالة Cloudflare R2 وملف approved-apps.json");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 text-[11px] font-bold cursor-pointer transition-all"
                >
                  ☁️ فحص R2
                </button>
                <button
                  onClick={() => {
                    setShowCommandsModal(false);
                    handleSendMessage("افحص درع حماية كوتا Firebase Firestore");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold cursor-pointer transition-all"
                >
                  🛡️ كوتا فايربيز
                </button>
                <button
                  onClick={() => {
                    setShowCommandsModal(false);
                    handleSendMessage("دقق مطابقة الموقع مع القواعد الأربع في AGENTS.md");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer transition-all"
                >
                  📋 تدقيق AGENTS.md
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📐 CORNER RESIZE HANDLE */}
      {isFloatingModal && sizePreset !== "fullscreen" && (
        <div
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          className="absolute bottom-1 left-1 w-6 h-6 cursor-nwse-resize flex items-center justify-center text-zinc-500 hover:text-indigo-400 transition-colors z-30 select-none"
          title="اسحب لتغيير حجم النافذة بحرية"
        >
          <div className="w-2.5 h-2.5 border-b-2 border-l-2 border-current rounded-bl-xs" />
        </div>
      )}
    </div>
  );
};

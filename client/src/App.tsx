import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import PdfComparator, { type MarkdownBlock } from './PdfComparator';
import { useTheme } from './useTheme';
import type { Theme } from './theme';
import LiquidBackdrop from './LiquidBackdrop';
import Sidebar, { type NavPage } from './Sidebar';
import GlobalStyles from './GlobalStyles';
import ThemeFade from './ThemeFade';
import Spinner from './Spinner';
import {
  IconUpload,
  IconZap,
  IconTrash,
  IconRefresh,
  IconPlay,
  IconPause,
  IconMic,
  IconStop,
  IconSend,
  IconChevronDown,
  IconChevronUp,
  IconSun,
  IconMoon,
  IconScan,
} from './icons';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface ApiError {
  error?: string;
  message?: string;
}

interface ChunkInfo {
  chunkIndex: number;
  text: string;
  characterCount: number;
  vectorDimensions: number;
  nodeId?: string;
  markdownBlockId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  pageHeight?: number;
  pageWidth?: number;
  isBottomOrigin?: boolean;
}

interface UploadedDoc {
  documentId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  characterCount: number;
  totalChunks: number;
  chunks: ChunkInfo[];
  createdAt?: string;
}

interface ChatMessage {
  sender: string;
  text: string;
  id: string;
  isPlaying?: boolean;
  isPaused?: boolean;
  progress?: number;
  durationFormatted?: string;
  currentTimeFormatted?: string;
  currentPositionSec?: number;
  estimatedDurationSec?: number;
}

export default function App() {
  const { theme, themeName, toggleTheme } = useTheme();

  const comparisonDocumentId = new URLSearchParams(window.location.search).get(
    'comparison'
  );
  const [token, setToken] = useState<string>(
    () => localStorage.getItem('jwt_token') ?? ''
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [activeNavPage, setActiveNavPage] = useState<NavPage>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docList, setDocList] = useState<UploadedDoc[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [chunkingDocId, setChunkingDocId] = useState<string | null>(null);
  const [unchunkingDocId, setUnchunkingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [docSuccessMsg, setDocSuccessMsg] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const [selectedInspectorDocId] = useState<string>(comparisonDocumentId ?? '');
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [comparisonBlocks, setComparisonBlocks] = useState<MarkdownBlock[]>([]);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [comparisonLoading, setComparisonLoading] = useState(
    Boolean(comparisonDocumentId)
  );
  const [comparisonError, setComparisonError] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');

  const [generalChatInput, setGeneralChatInput] = useState('');
  const [generalChatLog, setGeneralChatLog] = useState<ChatMessage[]>([]);
  const [generalChatLoading, setGeneralChatLoading] = useState(false);

  const [isGeneralRecording, setIsGeneralRecording] = useState(false);
  const generalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const generalAudioChunksRef = useRef<Blob[]>([]);
  const [processingGeneralVoice, setProcessingGeneralVoice] = useState(false);

  const [ragChatInput, setRagChatInput] = useState('');
  const [ragChatLog, setRagChatLog] = useState<ChatMessage[]>([]);
  const [ragChatLoading, setRagChatLoading] = useState(false);
  const [selectedDocScope, setSelectedDocScope] = useState<string[]>([]);
  const [scopeExpanded, setScopeExpanded] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [processingVoice, setProcessingVoice] = useState(false);

  const activeMessageIdRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const positionTimerRef = useRef<number>(0);

  const ingestedDocs = docList.filter((d) => d.totalChunks > 0);

  const openComparisonWindow = (documentId: string) => {
    const currentToken = localStorage.getItem('jwt_token');
    if (!currentToken) {
      alert('Your session expired. Please sign in again.');
      return;
    }
    const comparisonUrl = `${window.location.origin}${window.location.pathname}?comparison=${encodeURIComponent(documentId)}`;
    window.open(comparisonUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          console.warn('[Auth] 401 received, clearing token');
          localStorage.removeItem('jwt_token');
          if (comparisonDocumentId) {
            window.close();
          } else {
            setToken('');
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [comparisonDocumentId]);

  useEffect(() => {
    if (!selectedInspectorDocId || !token || comparisonDocumentId) {
      setMarkdownContent('');
      return;
    }
    axios
      .get(`/api/documents/${selectedInspectorDocId}/markdown`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.data?.markdownContent) {
          setMarkdownContent(res.data.data.markdownContent);
        } else {
          setMarkdownContent('');
        }
      })
      .catch(() => setMarkdownContent('Failed to load markdown.'));
  }, [selectedInspectorDocId, token, comparisonDocumentId]);

  useEffect(() => {
    if (!comparisonDocumentId) return;
    if (!token) {
      setComparisonError(
        'Your login session is missing. Return to the main app and sign in again.'
      );
      setComparisonLoading(false);
      return;
    }

    axios
      .get(`/api/documents/${comparisonDocumentId}/comparison`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      })
      .then((res) => {
        const data = res.data?.data;
        if (!data) throw new Error('Comparison data was not returned.');
        setMarkdownContent(data.markdownContent || '');
        setComparisonBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        setPageWidth(data.pageWidth || 0);
        setPageHeight(data.pageHeight || 0);
        if (data.filename) setPdfFilename(data.filename);
        setComparisonLoading(false);
      })
      .catch((err: unknown) => {
        const error = err as AxiosError<{ error?: string }>;
        const status = error.response?.status;
        const msg =
          error.response?.data?.error || error.message || 'Unknown error';
        setComparisonError(status ? `[${status}] ${msg}` : msg);
        setComparisonLoading(false);
      });
  }, [comparisonDocumentId, token]);

  useEffect(() => {
    if (themeName !== 'deep-space') return;
    const canvas = document.getElementById('spaceCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    const numStars = 600;
    const speed = 2.5;

    class Star {
      x!: number;
      y!: number;
      z!: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = (Math.random() - 0.5) * width * 2;
        this.y = (Math.random() - 0.5) * height * 2;
        this.z = Math.random() * width;
      }

      update() {
        this.z -= speed;
        if (this.z <= 0) {
          this.z = width;
          this.x = (Math.random() - 0.5) * width * 2;
          this.y = (Math.random() - 0.5) * height * 2;
        }
      }

      draw(
        canvasCtx: CanvasRenderingContext2D,
        targetCanvas: HTMLCanvasElement
      ) {
        if (this.z <= 0) return;

        const k = 300 / this.z;
        const px = this.x * k + targetCanvas.width / 2;
        const py = this.y * k + targetCanvas.height / 2;

        if (
          px >= 0 &&
          px <= targetCanvas.width &&
          py >= 0 &&
          py <= targetCanvas.height
        ) {
          const pSize = Math.max(1, (1 - this.z / targetCanvas.width) * 3.5);
          const opacity = Math.min(1, (1 - this.z / targetCanvas.width) * 1.5);

          canvasCtx.fillStyle = `rgba(130, 190, 255, ${opacity})`;
          canvasCtx.beginPath();
          canvasCtx.arc(px, py, pSize, 0, Math.PI * 2);
          canvasCtx.fill();
        }
      }
    }

    const stars: Star[] = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < numStars; i++) {
      stars.push(new Star());
    }

    let animationFrameId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(5, 10, 25, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        star.update();
        star.draw(ctx, canvas);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [themeName]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      window.speechSynthesis.getVoices();
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const cleanMarkdownForSpeech = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, ' code block omitted ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/>\s+/g, '')
      .replace(/[-*+]\s+/g, '');
  };

  const stopCurrentSpeech = useCallback((resetState = true) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (activeMessageIdRef.current && resetState) {
      const targetId = activeMessageIdRef.current;
      setGeneralChatLog((prev) =>
        prev.map((msg) =>
          msg.id === targetId
            ? { ...msg, isPlaying: false, isPaused: false }
            : msg
        )
      );
      setRagChatLog((prev) =>
        prev.map((msg) =>
          msg.id === targetId
            ? { ...msg, isPlaying: false, isPaused: false }
            : msg
        )
      );
      activeMessageIdRef.current = null;
    }
  }, []);

  const getBritishFemaleVoice = (): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const britishVoices = voices.filter(
      (v) =>
        v.lang === 'en-GB' ||
        v.lang.toLowerCase().includes('en_gb') ||
        v.lang.toLowerCase().includes('british')
    );
    const preferredFemale = britishVoices.find(
      (v) =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('hazel') ||
        v.name.toLowerCase().includes('libby') ||
        v.name.toLowerCase().includes('stephanie') ||
        v.name.toLowerCase().includes('susan') ||
        v.name.toLowerCase().includes('uk english') ||
        !v.name.toLowerCase().includes('george')
    );
    if (preferredFemale) return preferredFemale;
    if (britishVoices.length > 0) return britishVoices[0];
    return (
      voices.find(
        (v) =>
          v.name.toLowerCase().includes('female') &&
          v.lang.toLowerCase().includes('en')
      ) ||
      voices[0] ||
      null
    );
  };

  const playSpeechSegment = (
    textToSpeak: string,
    messageId: string,
    startSec: number,
    totalDuration: number,
    setLogFn: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  ) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const cleanText = cleanMarkdownForSpeech(textToSpeak);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const britishVoice = getBritishFemaleVoice();
    if (britishVoice) {
      utterance.voice = britishVoice;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    activeMessageIdRef.current = messageId;
    positionTimerRef.current = startSec;

    setLogFn((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              isPlaying: true,
              isPaused: false,
              currentPositionSec: startSec,
              estimatedDurationSec: totalDuration,
              durationFormatted: formatTime(totalDuration),
              currentTimeFormatted: formatTime(startSec),
              progress: Math.min(100, (startSec / totalDuration) * 100),
            }
          : msg
      )
    );

    progressIntervalRef.current = window.setInterval(() => {
      positionTimerRef.current += 0.2;
      const currentPos = Math.min(positionTimerRef.current, totalDuration);
      const progressPercent = (currentPos / totalDuration) * 100;

      setLogFn((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                currentPositionSec: currentPos,
                currentTimeFormatted: formatTime(currentPos),
                progress: progressPercent,
              }
            : msg
        )
      );

      if (currentPos >= totalDuration) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
    }, 200) as unknown as number;

    utterance.onend = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setLogFn((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isPlaying: false,
                isPaused: false,
                progress: 100,
                currentPositionSec: 0,
                currentTimeFormatted: formatTime(totalDuration),
              }
            : msg
        )
      );
      activeMessageIdRef.current = null;
    };

    utterance.onerror = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setLogFn((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isPlaying: false, isPaused: false }
            : msg
        )
      );
      activeMessageIdRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleMessageAudio = (
    msg: ChatMessage,
    setLogFn: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  ) => {
    if (!('speechSynthesis' in window)) return;

    const words = msg.text.split(/\s+/);
    const totalWords = words.length;
    const estimatedDuration =
      msg.estimatedDurationSec || Math.max(2, (totalWords / 140) * 60);
    const currentPos = msg.currentPositionSec || 0;

    if (activeMessageIdRef.current === msg.id && msg.isPlaying) {
      window.speechSynthesis.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setLogFn((prev) =>
        prev.map((item) =>
          item.id === msg.id
            ? { ...item, isPlaying: false, isPaused: true }
            : item
        )
      );
      return;
    }

    if (activeMessageIdRef.current === msg.id && msg.isPaused) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        playSpeechSegment(
          msg.text,
          msg.id,
          currentPos,
          estimatedDuration,
          setLogFn
        );
        return;
      }

      positionTimerRef.current = currentPos;
      let elapsedTime = currentPos;
      progressIntervalRef.current = window.setInterval(() => {
        elapsedTime += 0.2;
        const progressPercent = Math.min(
          100,
          (elapsedTime / estimatedDuration) * 100
        );
        setLogFn((prev) =>
          prev.map((item) =>
            item.id === msg.id
              ? {
                  ...item,
                  currentPositionSec: elapsedTime,
                  progress: progressPercent,
                  currentTimeFormatted: formatTime(
                    Math.min(elapsedTime, estimatedDuration)
                  ),
                }
              : item
          )
        );
      }, 200) as unknown as number;

      setLogFn((prev) =>
        prev.map((item) =>
          item.id === msg.id
            ? { ...item, isPlaying: true, isPaused: false }
            : item
        )
      );
      return;
    }

    stopCurrentSpeech(false);
    playSpeechSegment(
      msg.text,
      msg.id,
      currentPos > 0 && currentPos < estimatedDuration - 0.5 ? currentPos : 0,
      estimatedDuration,
      setLogFn
    );
  };

  const handleAudioProgressBarClick = (
    e: React.MouseEvent<HTMLDivElement>,
    msg: ChatMessage,
    setLogFn: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickedRatio = Math.max(0, Math.min(1, clickX / width));

    const estimatedDuration = msg.estimatedDurationSec || 10;
    const newPositionSec = clickedRatio * estimatedDuration;

    setLogFn((prev) =>
      prev.map((item) =>
        item.id === msg.id
          ? {
              ...item,
              currentPositionSec: newPositionSec,
              progress: clickedRatio * 100,
              currentTimeFormatted: formatTime(newPositionSec),
            }
          : item
      )
    );

    playSpeechSegment(
      msg.text,
      msg.id,
      newPositionSec,
      estimatedDuration,
      setLogFn
    );
  };

  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setDocList(res.data.data);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/students/login', { email, password });
      const jwtToken = res.data.token || res.data.data?.token;
      if (jwtToken) {
        setToken(jwtToken);
        localStorage.setItem('jwt_token', jwtToken);
      }
    } catch (err: unknown) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  const handleDocUpload = async () => {
    if (!selectedFile || uploadingDoc) return;

    setUploadingDoc(true);
    setDocSuccessMsg('');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post('/api/documents/upload', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newDoc: UploadedDoc = res.data.data;

      setDocList((prev) => [...prev, newDoc]);
      setDocSuccessMsg(`Uploaded successfully: ${newDoc.originalName}`);
      setSelectedFile(null);
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string; details?: string }>;
      const backendMsg =
        error.response?.data?.error ||
        error.response?.data?.details ||
        error.message ||
        'Unknown upload error';
      alert(`Document upload failed.\n\n${backendMsg}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleChunkDoc = async (documentId: string) => {
    if (chunkingDocId) return;
    setChunkingDocId(documentId);
    try {
      const res = await axios.post(
        `/api/documents/${documentId}/chunk`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 600000,
        }
      );
      const updated = res.data.data;
      setDocList((prev) =>
        prev.map((d) =>
          d.documentId === documentId
            ? {
                ...d,
                characterCount: updated.characterCount,
                totalChunks: updated.totalChunks,
                chunks: updated.chunks,
              }
            : d
        )
      );
      setDocSuccessMsg(`Vectors Ingested: ${updated.originalName}`);
    } catch (err: unknown) {
      const error = err as AxiosError<{ error?: string; details?: string }>;
      const status = error.response?.status;
      const msg =
        error.response?.data?.error ||
        error.response?.data?.details ||
        error.message ||
        'Unknown error';
      console.error('[Chunk] Failed:', err);
      alert(
        `Document vector ingestion failed.\n\n${status ? `[${status}] ` : ''}${msg}`
      );
    } finally {
      setChunkingDocId(null);
    }
  };

  const handleUnchunkDoc = async (documentId: string) => {
    if (unchunkingDocId) return;
    setUnchunkingDocId(documentId);
    try {
      const res = await axios.post(
        `/api/documents/${documentId}/unchunk`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data.data;
      setDocList((prev) =>
        prev.map((d) =>
          d.documentId === documentId
            ? {
                ...d,
                characterCount: 0,
                totalChunks: 0,
                chunks: [],
              }
            : d
        )
      );
      setSelectedDocScope((prev) => prev.filter((id) => id !== documentId));
      setDocSuccessMsg(`Vectors Purged: ${updated.originalName}`);
    } catch {
      alert('Vector purge failed.');
    } finally {
      setUnchunkingDocId(null);
    }
  };

  const handleDeleteDoc = async (documentId: string, filename: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${filename}"? This will remove it from MongoDB and the uploads directory.`
      )
    ) {
      return;
    }
    setDeletingDocId(documentId);
    try {
      await axios.delete(`/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocList((prev) => prev.filter((d) => d.documentId !== documentId));
      setSelectedDocScope((prev) => prev.filter((id) => id !== documentId));
      setDocSuccessMsg(`Successfully deleted document: ${filename}`);
    } catch {
      alert('Failed to delete document from storage and database.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const sendGeneralChatMessage = async () => {
    if (!generalChatInput.trim() || generalChatLoading) return;
    const userMsg = generalChatInput.trim();
    const userMsgId = 'msg-' + crypto.randomUUID() + '-user';
    const aiMsgId = 'msg-' + crypto.randomUUID() + '-ai';

    setGeneralChatLog((prev) => [
      ...prev,
      { sender: 'User', text: userMsg, id: userMsgId },
    ]);
    setGeneralChatInput('');
    setGeneralChatLoading(true);

    try {
      const res = await axios.post(
        '/api/chat',
        { message: userMsg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const reply =
        res.data?.data?.response ||
        res.data?.response ||
        'No response generated.';

      const wordCount = reply.split(/\s+/).length;
      const estimatedDurationSec = Math.max(2, (wordCount / 140) * 60);

      setGeneralChatLog((prev) => [
        ...prev,
        {
          sender: 'AI',
          text: reply,
          id: aiMsgId,
          isPlaying: false,
          isPaused: false,
          progress: 0,
          currentPositionSec: 0,
          estimatedDurationSec: estimatedDurationSec,
          durationFormatted: formatTime(estimatedDurationSec),
          currentTimeFormatted: '0:00',
        },
      ]);
    } catch {
      setGeneralChatLog((prev) => [
        ...prev,
        { sender: 'AI', text: 'Error processing request.', id: aiMsgId },
      ]);
    } finally {
      setGeneralChatLoading(false);
    }
  };

  const startGeneralRecording = async () => {
    generalAudioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      generalMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          generalAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(generalAudioChunksRef.current, {
          type: 'audio/webm',
        });
        stream.getTracks().forEach((track) => track.stop());
        await handleGeneralVoiceTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsGeneralRecording(true);
    } catch {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopGeneralRecording = () => {
    if (generalMediaRecorderRef.current && isGeneralRecording) {
      generalMediaRecorderRef.current.stop();
      setIsGeneralRecording(false);
    }
  };

  const handleGeneralVoiceTranscription = async (blob: Blob) => {
    setProcessingGeneralVoice(true);
    const formData = new FormData();
    formData.append('audio', blob, 'voice-prompt.webm');

    try {
      const res = await axios.post('/api/voice/transcribe', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const transcriptText = res.data.data?.transcript || res.data.transcript;
      if (transcriptText) {
        setGeneralChatInput(transcriptText);
      }
    } catch {
      alert('Voice transcription failed.');
    } finally {
      setProcessingGeneralVoice(false);
    }
  };

  const sendRagChatMessage = async () => {
    if (!ragChatInput.trim() || ragChatLoading) return;
    const userMsg = ragChatInput.trim();
    const userMsgId = 'rag-' + crypto.randomUUID() + '-user';
    const aiMsgId = 'rag-' + crypto.randomUUID() + '-ai';

    setRagChatLog((prev) => [
      ...prev,
      { sender: 'User', text: userMsg, id: userMsgId },
    ]);
    setRagChatInput('');
    setRagChatLoading(true);

    try {
      const payloadDocId =
        selectedDocScope.length === 0
          ? undefined
          : selectedDocScope.length === 1
            ? selectedDocScope[0]
            : selectedDocScope;

      const res = await axios.post(
        '/api/documents/chat',
        {
          query: userMsg,
          documentId: payloadDocId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const answer =
        res.data?.data?.answer || res.data?.answer || 'No response generated.';

      const wordCount = answer.split(/\s+/).length;
      const estimatedDurationSec = Math.max(2, (wordCount / 140) * 60);

      setRagChatLog((prev) => [
        ...prev,
        {
          sender: 'AI',
          text: answer,
          id: aiMsgId,
          isPlaying: false,
          isPaused: false,
          progress: 0,
          currentPositionSec: 0,
          estimatedDurationSec: estimatedDurationSec,
          durationFormatted: formatTime(estimatedDurationSec),
          currentTimeFormatted: '0:00',
        },
      ]);
    } catch {
      setRagChatLog((prev) => [
        ...prev,
        { sender: 'AI', text: 'Error querying documents.', id: aiMsgId },
      ]);
    } finally {
      setRagChatLoading(false);
    }
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        stream.getTracks().forEach((track) => track.stop());
        await handleVoiceTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceTranscription = async (blob: Blob) => {
    setProcessingVoice(true);
    const formData = new FormData();
    formData.append('audio', blob, 'voice-prompt.webm');

    try {
      const res = await axios.post('/api/voice/transcribe', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const transcriptText = res.data.data?.transcript || res.data.transcript;
      if (transcriptText) {
        setRagChatInput(transcriptText);
      }
    } catch {
      alert('Voice transcription failed.');
    } finally {
      setProcessingVoice(false);
    }
  };

  const toggleScopeDoc = (docId: string) => {
    setSelectedDocScope((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  // ─── Comparison window ───────────────────────────────────────────────────────
  if (comparisonDocumentId) {
    return (
      <>
        <GlobalStyles />
        <main
          style={{
            position: 'fixed',
            inset: 0,
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            background: '#F5F6F8',
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          {comparisonLoading ? (
            <p style={{ color: '#1C1C1E', padding: '24px' }}>
              Loading document comparison...
            </p>
          ) : comparisonError ? (
            <p style={{ color: '#FF3B30', padding: '24px' }}>
              {comparisonError}
            </p>
          ) : (
            <PdfComparator
              markdownContent={markdownContent}
              blocks={comparisonBlocks}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              pdfUrl={
                pdfFilename
                  ? `http://localhost:3001/uploads/${pdfFilename}`
                  : undefined
              }
            />
          )}
        </main>
      </>
    );
  }

  // ─── Login screen ───────────────────────────────────────────────────────────
  if (!token) {
    return (
      <>
        <GlobalStyles />
        <ThemeFade trigger={themeName} />
        {theme.backdropElements === 'aurora' ? (
          <LiquidBackdrop />
        ) : (
          <canvas id="spaceCanvas" style={backgroundCanvasStyle} />
        )}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            pointerEvents: 'none',
            opacity: 0.03,
            mixBlendMode: 'overlay',
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: theme.fontSans,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 32,
              background: theme.glassElevated,
              backdropFilter: theme.glassBlur,
              WebkitBackdropFilter: theme.glassBlur,
              border: `1px solid ${theme.glassBorder}`,
              borderRadius: theme.radiusXl,
              boxShadow: theme.glassShadowStrong,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: theme.accentGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  boxShadow: `0 8px 24px ${theme.accentSoft}`,
                }}
              >
                <svg
                  width={26}
                  height={26}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8" />
                </svg>
              </div>
              <h2
                style={{
                  color: theme.textPrimary,
                  fontSize: 22,
                  fontWeight: 700,
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.3px',
                }}
              >
                Welcome back
              </h2>
              <p
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  margin: 0,
                }}
              >
                Sign in to your workspace
              </p>
            </div>
            <form
              onSubmit={handleLogin}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle(theme)}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle(theme)}
                  required
                />
              </div>
              <button type="submit" style={primaryButtonStyle(theme)}>
                Sign In
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textSecondary,
                  fontSize: 12,
                  padding: 8,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: theme.fontSans,
                }}
              >
                {themeName === 'liquid-glass' ? (
                  <IconMoon size={14} color={theme.textSecondary} />
                ) : (
                  <IconSun size={14} color={theme.textSecondary} />
                )}
                Switch to{' '}
                {themeName === 'liquid-glass' ? 'Deep Space' : 'Liquid Glass'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ─── Main app ───────────────────────────────────────────────────────────────
  return (
    <>
      <GlobalStyles />
      {theme.backdropElements === 'aurora' ? (
        <LiquidBackdrop />
      ) : (
        <canvas id="spaceCanvas" style={backgroundCanvasStyle} />
      )}

      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
          opacity: 0.03,
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
        }}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          gap: 16,
          padding: 16,
          boxSizing: 'border-box',
          fontFamily: theme.fontSans,
          zIndex: 1,
        }}
      >
        <Sidebar
          theme={theme}
          activePage={activeNavPage}
          onNavigate={setActiveNavPage}
          documentCount={docList.length}
          onToggleTheme={toggleTheme}
          onSignOut={() => {
            stopCurrentSpeech();
            localStorage.removeItem('jwt_token');
            setToken('');
          }}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            background: theme.glassElevated,
            backdropFilter: theme.glassBlur,
            WebkitBackdropFilter: theme.glassBlur,
            border: `1px solid ${theme.glassBorder}`,
            borderRadius: theme.radiusXl,
            boxShadow: theme.glassShadowStrong,
            padding: 32,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeNavPage === 1 && (
            <PageDocuments
              theme={theme}
              docList={docList}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              uploadingDoc={uploadingDoc}
              handleDocUpload={handleDocUpload}
              docSuccessMsg={docSuccessMsg}
              expandedDocId={expandedDocId}
              setExpandedDocId={setExpandedDocId}
              chunkingDocId={chunkingDocId}
              unchunkingDocId={unchunkingDocId}
              deletingDocId={deletingDocId}
              handleChunkDoc={handleChunkDoc}
              handleUnchunkDoc={handleUnchunkDoc}
              handleDeleteDoc={handleDeleteDoc}
            />
          )}

          {activeNavPage === 2 && (
            <PageGeneralChat
              theme={theme}
              log={generalChatLog}
              loading={generalChatLoading}
              input={generalChatInput}
              setInput={setGeneralChatInput}
              onSend={sendGeneralChatMessage}
              isRecording={isGeneralRecording}
              onStartRecording={startGeneralRecording}
              onStopRecording={stopGeneralRecording}
              processingVoice={processingGeneralVoice}
              onToggleAudio={(msg) =>
                toggleMessageAudio(msg, setGeneralChatLog)
              }
              onSeek={(e, msg) =>
                handleAudioProgressBarClick(e, msg, setGeneralChatLog)
              }
            />
          )}

          {activeNavPage === 3 && (
            <PageRagChat
              theme={theme}
              log={ragChatLog}
              loading={ragChatLoading}
              input={ragChatInput}
              setInput={setRagChatInput}
              onSend={sendRagChatMessage}
              isRecording={isRecording}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              processingVoice={processingVoice}
              onToggleAudio={(msg) => toggleMessageAudio(msg, setRagChatLog)}
              onSeek={(e, msg) =>
                handleAudioProgressBarClick(e, msg, setRagChatLog)
              }
              docList={docList}
              selectedScope={selectedDocScope}
              onToggleScope={toggleScopeDoc}
              onClearScope={() => setSelectedDocScope([])}
              scopeExpanded={scopeExpanded}
              onToggleScopeExpanded={() => setScopeExpanded((v) => !v)}
            />
          )}

          {activeNavPage === 4 && (
            <PageInspector
              theme={theme}
              ingestedDocs={ingestedDocs}
              onOpen={openComparisonWindow}
            />
          )}
        </main>
      </div>
    </>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────
const backgroundCanvasStyle: React.CSSProperties = {
  display: 'block',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
  pointerEvents: 'none',
};

const inputStyle = (theme: Theme): React.CSSProperties => ({
  width: '100%',
  padding: '12px 14px',
  borderRadius: theme.radiusSm,
  border: `1px solid ${theme.separatorStrong}`,
  background:
    theme.name === 'liquid-glass' ? 'rgba(255,255,255,0.6)' : theme.surfaceAlt,
  fontSize: 14,
  color: theme.textPrimary,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: theme.fontSans,
  transition: `border-color 160ms ${theme.ease}`,
});

const primaryButtonStyle = (theme: Theme): React.CSSProperties => ({
  background: theme.accentGradient,
  color: '#FFFFFF',
  border: 'none',
  padding: '12px 18px',
  borderRadius: theme.radiusSm,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: `0 6px 18px ${theme.accentSoft}`,
  fontFamily: theme.fontSans,
  transition: `transform 160ms ${theme.spring}, box-shadow 160ms ${theme.ease}`,
});

const cardStyle = (theme: Theme): React.CSSProperties => ({
  background: theme.surface,
  border: `1px solid ${theme.separator}`,
  borderRadius: theme.radiusLg,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  backdropFilter: theme.name === 'liquid-glass' ? 'blur(20px)' : 'none',
  WebkitBackdropFilter: theme.name === 'liquid-glass' ? 'blur(20px)' : 'none',
});

const cardLabelStyle = (theme: Theme): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  color: theme.textSecondary,
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.7px',
});

const chipStyle = (theme: Theme, active: boolean): React.CSSProperties => ({
  background: active ? theme.accent : theme.surface,
  color: active ? '#FFFFFF' : theme.textPrimary,
  border: active ? 'none' : `1px solid ${theme.separatorStrong}`,
  padding: '7px 14px',
  borderRadius: theme.radiusPill,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: theme.fontSans,
  transition: `all 160ms ${theme.ease}`,
  boxShadow: active ? `0 4px 12px ${theme.accentSoft}` : 'none',
  whiteSpace: 'nowrap',
  maxWidth: 220,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const ghostButtonStyle = (
  theme: Theme,
  color?: string
): React.CSSProperties => ({
  background: 'transparent',
  color: color || theme.textSecondary,
  border: `1px solid ${theme.separatorStrong}`,
  padding: '8px 12px',
  borderRadius: theme.radiusSm,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: theme.fontSans,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: `all 160ms ${theme.ease}`,
});

const disabledButtonStyle = (theme: Theme): React.CSSProperties => ({
  background: theme.separatorStrong,
  color: theme.textTertiary,
  border: 'none',
  padding: '12px 18px',
  borderRadius: theme.radiusSm,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'not-allowed',
  fontFamily: theme.fontSans,
});

// ─── Page: Documents ──────────────────────────────────────────────────────────
interface PageDocsProps {
  theme: Theme;
  docList: UploadedDoc[];
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  uploadingDoc: boolean;
  handleDocUpload: () => void;
  docSuccessMsg: string;
  expandedDocId: string | null;
  setExpandedDocId: (id: string | null) => void;
  chunkingDocId: string | null;
  unchunkingDocId: string | null;
  deletingDocId: string | null;
  handleChunkDoc: (id: string) => void;
  handleUnchunkDoc: (id: string) => void;
  handleDeleteDoc: (id: string, name: string) => void;
}

const PageDocuments: React.FC<PageDocsProps> = ({
  theme,
  docList,
  selectedFile,
  setSelectedFile,
  uploadingDoc,
  handleDocUpload,
  docSuccessMsg,
  expandedDocId,
  setExpandedDocId,
  chunkingDocId,
  unchunkingDocId,
  deletingDocId,
  handleChunkDoc,
  handleUnchunkDoc,
  handleDeleteDoc,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: theme.textPrimary,
            margin: '0 0 4px 0',
            letterSpacing: '-0.5px',
          }}
        >
          Documents
        </h1>
        <p style={{ fontSize: 14, color: theme.textSecondary, margin: 0 }}>
          Upload PDFs and prepare them for AI queries.
        </p>
      </div>

      <div style={cardStyle(theme)}>
        <h3 style={cardLabelStyle(theme)}>Upload new document</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label
            style={{
              flex: 1,
              border: `1px dashed ${theme.separatorStrong}`,
              borderRadius: theme.radiusMd,
              padding: '16px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: theme.surfaceAlt,
              transition: `border-color 160ms ${theme.ease}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <IconUpload size={18} color={theme.textSecondary} />
            <span
              style={{
                fontSize: 14,
                color: theme.textPrimary,
                fontWeight: 500,
                wordBreak: 'break-all',
              }}
            >
              {selectedFile ? selectedFile.name : 'Choose a PDF file'}
            </span>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={uploadingDoc}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={handleDocUpload}
            disabled={!selectedFile || uploadingDoc}
            style={{
              ...(!selectedFile || uploadingDoc
                ? disabledButtonStyle(theme)
                : primaryButtonStyle(theme)),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minWidth: 110,
            }}
          >
            {uploadingDoc && (
              <Spinner size={14} color={theme.textTertiary} strokeWidth={2.2} />
            )}
            <span>{uploadingDoc ? 'Uploading' : 'Upload'}</span>
          </button>
        </div>
        {docSuccessMsg && (
          <p
            style={{
              color: theme.success,
              fontSize: 13,
              margin: '4px 0 0 0',
              fontWeight: 500,
            }}
          >
            {docSuccessMsg}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={cardLabelStyle(theme)}>Indexed documents</h3>
        {docList.length === 0 ? (
          <div
            style={{
              ...cardStyle(theme),
              padding: 48,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: theme.textSecondary, margin: 0 }}>
              No documents uploaded yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {docList.map((doc) => {
              const isChunked = doc.totalChunks > 0;
              const isExpanded = expandedDocId === doc.documentId;
              return (
                <div key={doc.documentId} style={cardStyle(theme)}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: theme.textPrimary,
                          marginBottom: 6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.originalName}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            background: isChunked
                              ? theme.successSoft
                              : theme.warningSoft,
                            color: isChunked ? theme.success : theme.warning,
                            padding: '3px 10px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.2px',
                          }}
                        >
                          {isChunked
                            ? `Ingested · ${doc.totalChunks} chunks`
                            : 'Staged · Unchunked'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: theme.textTertiary,
                          }}
                        >
                          {(doc.fileSize / 1024).toFixed(1)} KB ·{' '}
                          {doc.characterCount} chars
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {!isChunked ? (
                        <button
                          onClick={() => handleChunkDoc(doc.documentId)}
                          disabled={chunkingDocId === doc.documentId}
                          style={{
                            ...primaryButtonStyle(theme),
                            padding: '8px 14px',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            minWidth: 150,
                          }}
                        >
                          {chunkingDocId === doc.documentId ? (
                            <Spinner
                              size={14}
                              color="#FFFFFF"
                              strokeWidth={2.2}
                            />
                          ) : (
                            <IconZap size={14} color="#FFFFFF" />
                          )}
                          <span>
                            {chunkingDocId === doc.documentId
                              ? 'Processing'
                              : 'Ingest Vectors'}
                          </span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              setExpandedDocId(
                                isExpanded ? null : doc.documentId
                              )
                            }
                            style={ghostButtonStyle(theme)}
                          >
                            {isExpanded ? (
                              <IconChevronUp
                                size={14}
                                color={theme.textSecondary}
                              />
                            ) : (
                              <IconChevronDown
                                size={14}
                                color={theme.textSecondary}
                              />
                            )}
                            {isExpanded ? 'Hide' : 'Chunks'}
                          </button>
                          <button
                            onClick={() => handleUnchunkDoc(doc.documentId)}
                            disabled={unchunkingDocId === doc.documentId}
                            style={ghostButtonStyle(theme, theme.warning)}
                          >
                            {unchunkingDocId === doc.documentId ? (
                              <Spinner
                                size={14}
                                color={theme.warning}
                                strokeWidth={2.2}
                              />
                            ) : (
                              <IconRefresh size={14} color={theme.warning} />
                            )}
                            <span>
                              {unchunkingDocId === doc.documentId
                                ? 'Processing'
                                : 'Purge'}
                            </span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          handleDeleteDoc(doc.documentId, doc.originalName)
                        }
                        disabled={deletingDocId === doc.documentId}
                        style={ghostButtonStyle(theme, theme.danger)}
                        title="Delete permanently"
                      >
                        <IconTrash
                          size={14}
                          color={
                            deletingDocId === doc.documentId
                              ? theme.textTertiary
                              : theme.danger
                          }
                        />
                      </button>
                    </div>
                  </div>

                  {isExpanded && isChunked && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 16,
                        background: theme.surfaceAlt,
                        borderRadius: theme.radiusMd,
                        border: `1px solid ${theme.separator}`,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: theme.textSecondary,
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                          paddingBottom: 10,
                          borderBottom: `1px solid ${theme.separator}`,
                          marginBottom: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <span>Chunks</span>
                        <span style={{ color: theme.accent }}>
                          {doc.filename}
                        </span>
                      </div>
                      <div
                        style={{
                          maxHeight: 280,
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {doc.chunks.map((chunk) => (
                          <div
                            key={chunk.chunkIndex}
                            style={{
                              background:
                                theme.name === 'liquid-glass'
                                  ? 'rgba(255,255,255,0.6)'
                                  : theme.surface,
                              border: `1px solid ${theme.separator}`,
                              borderRadius: theme.radiusSm,
                              padding: '10px 14px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                color: theme.accent,
                                fontWeight: 600,
                                marginBottom: 6,
                              }}
                            >
                              <span>Chunk #{chunk.chunkIndex}</span>
                              <span style={{ color: theme.textTertiary }}>
                                {chunk.characterCount} chars ·{' '}
                                {chunk.vectorDimensions}-dim
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 12,
                                color: theme.textSecondary,
                                margin: 0,
                                lineHeight: 1.5,
                              }}
                            >
                              {chunk.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page: General Chat ───────────────────────────────────────────────────────
interface PageGeneralChatProps {
  theme: Theme;
  log: ChatMessage[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  processingVoice: boolean;
  onToggleAudio: (m: ChatMessage) => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>, m: ChatMessage) => void;
}

const PageGeneralChat: React.FC<PageGeneralChatProps> = ({
  theme,
  log,
  loading,
  input,
  setInput,
  onSend,
  isRecording,
  onStartRecording,
  onStopRecording,
  processingVoice,
  onToggleAudio,
  onSeek,
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      height: '100%',
      minHeight: 0,
    }}
  >
    <div>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: theme.textPrimary,
          margin: '0 0 4px 0',
          letterSpacing: '-0.5px',
        }}
      >
        General Chat
      </h1>
      <p style={{ fontSize: 14, color: theme.textSecondary, margin: 0 }}>
        Conversational assistant for anything — coursework, coding,
        explanations.
      </p>
    </div>

    <ChatLog
      theme={theme}
      log={log}
      loading={loading}
      emptyTitle="Start a conversation"
      emptyDesc="Ask about programming, algorithms, math, or notes."
      onToggleAudio={onToggleAudio}
      onSeek={onSeek}
      senderAI="Campus AI"
    />

    <ChatInput
      theme={theme}
      input={input}
      setInput={setInput}
      onSend={onSend}
      loading={loading}
      isRecording={isRecording}
      onStartRecording={onStartRecording}
      onStopRecording={onStopRecording}
      processingVoice={processingVoice}
      placeholder="Type a message or record voice…"
    />
  </div>
);

// ─── Page: RAG Chat ───────────────────────────────────────────────────────────
interface PageRagChatProps extends PageGeneralChatProps {
  docList: UploadedDoc[];
  selectedScope: string[];
  onToggleScope: (id: string) => void;
  onClearScope: () => void;
  scopeExpanded: boolean;
  onToggleScopeExpanded: () => void;
}

const PageRagChat: React.FC<PageRagChatProps> = ({
  theme,
  log,
  loading,
  input,
  setInput,
  onSend,
  isRecording,
  onStartRecording,
  onStopRecording,
  processingVoice,
  onToggleAudio,
  onSeek,
  docList,
  selectedScope,
  onToggleScope,
  onClearScope,
  scopeExpanded,
  onToggleScopeExpanded,
}) => {
  const ingested = docList.filter((d) => d.totalChunks > 0);
  const [allowScroll, setAllowScroll] = useState(false);

  useEffect(() => {
    if (scopeExpanded) {
      const t = window.setTimeout(() => setAllowScroll(true), 240);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setAllowScroll(false), 0);
    return () => window.clearTimeout(t);
  }, [scopeExpanded]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        minHeight: 0,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: theme.textPrimary,
            margin: '0 0 4px 0',
            letterSpacing: '-0.5px',
          }}
        >
          RAG & Voice
        </h1>
        <p style={{ fontSize: 14, color: theme.textSecondary, margin: 0 }}>
          Ask questions grounded in your uploaded documents.
        </p>
      </div>

      <div style={cardStyle(theme)}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h3 style={cardLabelStyle(theme)}>
            Knowledge scope
            {ingested.length > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: theme.textTertiary,
                  fontWeight: 600,
                  letterSpacing: '0.2px',
                  textTransform: 'none',
                }}
              >
                {selectedScope.length === 0
                  ? `All ${ingested.length}`
                  : `${selectedScope.length} of ${ingested.length} selected`}
              </span>
            )}
          </h3>
          {ingested.length > 5 && (
            <button
              onClick={onToggleScopeExpanded}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.accent,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: theme.fontSans,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {scopeExpanded ? 'Collapse' : 'Expand'}
              {scopeExpanded ? (
                <IconChevronUp size={12} color={theme.accent} />
              ) : (
                <IconChevronDown size={12} color={theme.accent} />
              )}
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            maxHeight: scopeExpanded ? 240 : 36,
            overflowY: allowScroll ? 'auto' : 'hidden',
            transition: 'max-height 220ms cubic-bezier(0.4, 0, 0.2, 1)',
            paddingRight: allowScroll ? 4 : 0,
          }}
        >
          <button
            onClick={onClearScope}
            style={chipStyle(theme, selectedScope.length === 0)}
          >
            All documents
          </button>
          {ingested.map((d) => (
            <button
              key={d.documentId}
              onClick={() => onToggleScope(d.documentId)}
              style={chipStyle(theme, selectedScope.includes(d.documentId))}
            >
              {d.originalName}
            </button>
          ))}
          {ingested.length === 0 && (
            <span
              style={{
                fontSize: 12,
                color: theme.textTertiary,
                alignSelf: 'center',
              }}
            >
              No ingested documents yet.
            </span>
          )}
        </div>
      </div>

      <ChatLog
        theme={theme}
        log={log}
        loading={loading}
        emptyTitle="Query your documents"
        emptyDesc="Ask anything or use the mic to speak."
        onToggleAudio={onToggleAudio}
        onSeek={onSeek}
        senderAI="Document Assistant"
      />

      <ChatInput
        theme={theme}
        input={input}
        setInput={setInput}
        onSend={onSend}
        loading={loading}
        isRecording={isRecording}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        processingVoice={processingVoice}
        placeholder="Ask anything about your documents…"
      />
    </div>
  );
};

// ─── Page: Inspector ──────────────────────────────────────────────────────────
interface PageInspectorProps {
  theme: Theme;
  ingestedDocs: UploadedDoc[];
  onOpen: (id: string) => void;
}

const PageInspector: React.FC<PageInspectorProps> = ({
  theme,
  ingestedDocs,
  onOpen,
}) => {
  const [selected, setSelected] = useState('');
  const currentDoc = ingestedDocs.find((d) => d.documentId === selected);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: theme.textPrimary,
              margin: '0 0 4px 0',
              letterSpacing: '-0.5px',
            }}
          >
            Visual Inspector
          </h1>
          <p style={{ fontSize: 14, color: theme.textSecondary, margin: 0 }}>
            Compare a PDF against its extracted structure side-by-side.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: '0 1 420px',
            minWidth: 0,
          }}
        >
          <span style={cardLabelStyle(theme)}>Select document</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              ...inputStyle(theme),
              cursor: 'pointer',
            }}
          >
            <option value="">— Choose an ingested document —</option>
            {ingestedDocs.map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.originalName} · {d.totalChunks} chunks
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentDoc ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              ...cardStyle(theme),
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              height: '100%',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                borderBottom: `1px solid ${theme.separator}`,
                fontSize: 11,
                fontWeight: 700,
                color: theme.textSecondary,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Preview · {currentDoc.originalName}
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                background: '#E8ECF2',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflowY: 'auto',
                padding: 16,
              }}
            >
              <PdfPreviewer
                url={`http://localhost:3001/uploads/${currentDoc.filename}`}
              />
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderTop: `1px solid ${theme.separator}`,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                background: theme.surface,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => onOpen(currentDoc.documentId)}
                style={{
                  ...primaryButtonStyle(theme),
                  padding: '10px 20px',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  minHeight: 40,
                }}
              >
                <IconScan size={16} color="#FFFFFF" />
                Open Comparison
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              overflowY: 'auto',
              minHeight: 0,
              paddingRight: 4,
            }}
          >
            <div style={cardStyle(theme)}>
              <h3 style={cardLabelStyle(theme)}>Document stats</h3>
              <StatRow
                theme={theme}
                label="Original name"
                value={currentDoc.originalName}
              />
              <StatRow
                theme={theme}
                label="File size"
                value={`${(currentDoc.fileSize / 1024).toFixed(1)} KB`}
              />
              <StatRow
                theme={theme}
                label="Characters"
                value={currentDoc.characterCount.toLocaleString()}
              />
              <StatRow
                theme={theme}
                label="Chunks"
                value={String(currentDoc.totalChunks)}
              />
              <StatRow
                theme={theme}
                label="Vector dims"
                value={
                  currentDoc.chunks.length > 0
                    ? String(currentDoc.chunks[0].vectorDimensions)
                    : '—'
                }
              />
            </div>

            <div style={cardStyle(theme)}>
              <h3 style={cardLabelStyle(theme)}>How to use</h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: theme.textSecondary,
                  lineHeight: 1.65,
                }}
              >
                <li>
                  Click "Open Comparison" to launch the side-by-side view.
                </li>
                <li>
                  Hover any block on the right pane to locate it on the PDF.
                </li>
                <li>
                  Blocks tagged "approximate" have unreliable bounding boxes
                  from the parser.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...cardStyle(theme),
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: theme.textSecondary,
              margin: 0,
              textAlign: 'center',
            }}
          >
            {ingestedDocs.length === 0
              ? 'No ingested documents yet. Upload and ingest first.'
              : 'Pick a document above to see its preview and stats.'}
          </p>
        </div>
      )}
    </div>
  );
};

const StatRow: React.FC<{ theme: Theme; label: string; value: string }> = ({
  theme,
  label,
  value,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      paddingBottom: 8,
      borderBottom: `1px solid ${theme.separator}`,
      fontSize: 13,
    }}
  >
    <span style={{ color: theme.textSecondary }}>{label}</span>
    <span
      style={{
        color: theme.textPrimary,
        fontWeight: 600,
        textAlign: 'right',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 200,
      }}
      title={value}
    >
      {value}
    </span>
  </div>
);

interface PdfPreviewerProps {
  url: string;
}

const PdfPreviewer: React.FC<PdfPreviewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState(0);
  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages: n }) => setNumPages(n)}
      loading={
        <div
          style={{
            color: 'rgba(60,60,67,0.6)',
            fontSize: 13,
          }}
        >
          Loading preview…
        </div>
      }
      error={
        <div
          style={{
            color: '#FF3B30',
            fontSize: 13,
            padding: 24,
            textAlign: 'center',
          }}
        >
          Preview unavailable — open comparison to view the document.
        </div>
      }
    >
      {numPages > 0 && (
        <Page
          pageNumber={1}
          width={Math.min(560, window.innerWidth * 0.42)}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      )}
    </Document>
  );
};

// ─── Shared building blocks ───────────────────────────────────────────────────
interface ChatLogProps {
  theme: Theme;
  log: ChatMessage[];
  loading: boolean;
  emptyTitle: string;
  emptyDesc: string;
  senderAI: string;
  onToggleAudio: (m: ChatMessage) => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>, m: ChatMessage) => void;
}

const ChatLog: React.FC<ChatLogProps> = ({
  theme,
  log,
  loading,
  emptyTitle,
  emptyDesc,
  senderAI,
  onToggleAudio,
  onSeek,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log.length, loading]);

  const lastText = log.length > 0 ? log[log.length - 1].text : '';
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lastText]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 20,
        background: theme.surfaceAlt,
        border: `1px solid ${theme.separator}`,
        borderRadius: theme.radiusLg,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {log.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
          }}
        >
          <h4
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: theme.textPrimary,
              margin: '0 0 6px 0',
            }}
          >
            {emptyTitle}
          </h4>
          <p style={{ fontSize: 13, color: theme.textSecondary, margin: 0 }}>
            {emptyDesc}
          </p>
        </div>
      ) : (
        log.map((m) => (
          <ChatBubble
            key={m.id}
            theme={theme}
            message={m}
            senderAI={senderAI}
            onToggleAudio={onToggleAudio}
            onSeek={onSeek}
          />
        ))
      )}
      {loading && (
        <div
          style={{
            alignSelf: 'flex-start',
            background: theme.surface,
            border: `1px solid ${theme.separator}`,
            padding: '12px 16px',
            borderRadius: theme.radiusMd,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: theme.accent,
              animation: 'pulse 1.2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: theme.accent,
              animation: 'pulse 1.2s ease-in-out 0.2s infinite',
            }}
          />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: theme.accent,
              animation: 'pulse 1.2s ease-in-out 0.4s infinite',
            }}
          />
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3 } 50% { opacity: 1 } }`}</style>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

interface ChatBubbleProps {
  theme: Theme;
  message: ChatMessage;
  senderAI: string;
  onToggleAudio: (m: ChatMessage) => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>, m: ChatMessage) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  theme,
  message,
  senderAI,
  onToggleAudio,
  onSeek,
}) => {
  const isUser = message.sender === 'User';
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: isUser ? theme.accent : theme.textSecondary,
          paddingLeft: isUser ? 0 : 4,
          paddingRight: isUser ? 4 : 0,
          textAlign: isUser ? 'right' : 'left',
        }}
      >
        {isUser ? 'You' : senderAI}
      </span>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: isUser
            ? `${theme.radiusMd} ${theme.radiusMd} 4px ${theme.radiusMd}`
            : `${theme.radiusMd} ${theme.radiusMd} ${theme.radiusMd} 4px`,
          background: isUser ? theme.accentGradient : theme.surface,
          border: isUser ? 'none' : `1px solid ${theme.separator}`,
          color: isUser ? '#FFFFFF' : theme.textPrimary,
          fontSize: 14,
          lineHeight: 1.55,
          boxShadow: isUser
            ? `0 4px 16px ${theme.accentSoft}`
            : '0 2px 8px rgba(0,0,0,0.04)',
          fontFamily: theme.fontSans,
          wordBreak: 'break-word',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            p: ({ children }) => (
              <p style={{ margin: '0 0 8px 0' }}>{children}</p>
            ),
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th
                style={{
                  border: `1px solid ${theme.separator}`,
                  padding: '6px 10px',
                  textAlign: 'left',
                  background: isUser
                    ? 'rgba(255,255,255,0.15)'
                    : theme.surfaceAlt,
                }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td
                style={{
                  border: `1px solid ${theme.separator}`,
                  padding: '6px 10px',
                }}
              >
                {children}
              </td>
            ),
            code: ({ children }) => (
              <code
                style={{
                  background: isUser
                    ? 'rgba(255,255,255,0.2)'
                    : theme.surfaceAlt,
                  padding: '2px 6px',
                  borderRadius: 6,
                  fontFamily: theme.fontMono,
                  fontSize: 12,
                }}
              >
                {children}
              </code>
            ),
          }}
        >
          {message.text}
        </ReactMarkdown>
      </div>
      {!isUser && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 12px',
            background: theme.surface,
            border: `1px solid ${theme.separator}`,
            borderRadius: theme.radiusPill,
            alignSelf: 'flex-start',
          }}
        >
          <button
            onClick={() => onToggleAudio(message)}
            style={{
              background: theme.accent,
              color: '#FFFFFF',
              border: 'none',
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={message.isPlaying ? 'Pause' : 'Play'}
          >
            {message.isPlaying ? (
              <IconPause size={11} color="#FFFFFF" />
            ) : (
              <IconPlay size={11} color="#FFFFFF" />
            )}
          </button>
          <div
            onClick={(e) => onSeek(e, message)}
            style={{
              flex: 1,
              minWidth: 120,
              height: 3,
              background: theme.separator,
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${message.progress || 0}%`,
                background: theme.accent,
                transition: 'width 0.2s linear',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              color: theme.textTertiary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {message.currentTimeFormatted || '0:00'} /{' '}
            {message.durationFormatted || '0:00'}
          </span>
        </div>
      )}
    </div>
  );
};

interface ChatInputProps {
  theme: Theme;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  processingVoice: boolean;
  placeholder: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  theme,
  input,
  setInput,
  onSend,
  loading,
  isRecording,
  onStartRecording,
  onStopRecording,
  processingVoice,
  placeholder,
}) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
    <input
      style={{ ...inputStyle(theme), flex: 1 }}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder={processingVoice ? 'Transcribing…' : placeholder}
      disabled={processingVoice}
      onKeyDown={(e) => e.key === 'Enter' && onSend()}
    />
    <button
      onClick={isRecording ? onStopRecording : onStartRecording}
      disabled={processingVoice}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background: isRecording ? theme.danger : theme.surface,
        color: isRecording ? '#FFFFFF' : theme.accent,
        boxShadow: isRecording
          ? `0 0 0 6px ${theme.dangerSoft}`
          : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: processingVoice ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: `all 160ms ${theme.spring}`,
      }}
      title={isRecording ? 'Stop recording' : 'Record voice'}
    >
      {isRecording ? (
        <IconStop size={16} color="#FFFFFF" />
      ) : (
        <IconMic size={18} color={theme.accent} />
      )}
    </button>
    <button
      onClick={onSend}
      disabled={loading || !input.trim()}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background:
          loading || !input.trim()
            ? theme.separatorStrong
            : theme.accentGradient,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        boxShadow:
          loading || !input.trim() ? 'none' : `0 6px 18px ${theme.accentSoft}`,
        transition: `all 160ms ${theme.spring}`,
      }}
      title="Send"
    >
      <IconSend size={16} color="#FFFFFF" />
    </button>
  </div>
);

export {};

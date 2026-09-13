import React, { useState, useRef, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ApiError {
  error?: string;
  message?: string;
}

interface ChunkInfo {
  chunkIndex: number;
  text: string;
  characterCount: number;
  vectorDimensions: number;
  // Spatial bounding box coordinates (percentages 0-100 relative to document canvas/page)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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

// Visual Document vs Extracted Continuous Text Inspector Subcomponent with Bidirectional Highlighting
const VisualTextInspector: React.FC<{
  documents: UploadedDoc[];
  token: string;
}> = ({ documents }) => {
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [hoveredChunkIndex, setHoveredChunkIndex] = useState<number | null>(
    null
  );

  const currentDoc = documents.find((d) => d.documentId === selectedDocId);
  const ingestedDocs = documents.filter((d) => d.totalChunks > 0);

  return (
    <div style={styles.uploadCard}>
      <h3 style={styles.cardSectionTitle}>
        Visual Document vs. Extracted Continuous Text Inspector
      </h3>
      <p style={styles.pageDesc}>
        Select an ingested document to inspect its original layout side-by-side
        with its fully extracted continuous text. Hover over text on either side
        to synchronize and trace the highlighted block.
      </p>

      <div style={{ marginTop: '8px', marginBottom: '12px' }}>
        <select
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          style={{ ...styles.input, width: '100%', maxWidth: '420px' }}
        >
          <option value="">-- Select an Ingested Document --</option>
          {ingestedDocs.map((doc) => (
            <option key={doc.documentId} value={doc.documentId}>
              {doc.originalName} ({doc.totalChunks} chunks)
            </option>
          ))}
        </select>
      </div>

      {currentDoc ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            height: '560px',
          }}
        >
          {/* Left: Original Document Visual View with Bounding Box Overlays */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={styles.mongoServerHeader}>
              <span>Original Document View ({currentDoc.originalName})</span>
              {hoveredChunkIndex !== null && (
                <span style={{ color: '#34D399' }}>
                  Highlighting Source Block #{hoveredChunkIndex}
                </span>
              )}
            </div>
            <div
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <iframe
                src={`/uploads/${currentDoc.filename}`}
                title={currentDoc.originalName}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#FFFFFF',
                }}
              />
              {/* Interactive Bounding Box Overlay Layer */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {currentDoc.chunks.map((chunk) => {
                  const isHovered = hoveredChunkIndex === chunk.chunkIndex;
                  // Fallback fallback coordinates if backend coordinates aren't explicitly provided
                  const boxStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${chunk.x ?? 5}%`,
                    top: `${chunk.y ?? chunk.chunkIndex * 12 + 5}%`,
                    width: `${chunk.width ?? 90}%`,
                    height: `${chunk.height ?? 10}%`,
                    backgroundColor: isHovered
                      ? 'rgba(52, 211, 153, 0.35)'
                      : 'transparent',
                    border: isHovered
                      ? '2px solid #34D399'
                      : '1px dashed rgba(99, 102, 241, 0.2)',
                    borderRadius: '4px',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  };
                  return (
                    <div
                      key={`overlay-${chunk.chunkIndex}`}
                      style={boxStyle}
                      onMouseEnter={() =>
                        setHoveredChunkIndex(chunk.chunkIndex)
                      }
                      onMouseLeave={() => setHoveredChunkIndex(null)}
                      title={`Chunk #${chunk.chunkIndex}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Extracted Continuous Text */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={styles.mongoServerHeader}>
              <span>Fully Extracted Continuous Text</span>
              <span style={{ color: '#818CF8' }}>
                {currentDoc.characterCount} total characters
              </span>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                fontSize: '13px',
                lineHeight: '1.7',
                color: '#CBD5E1',
              }}
            >
              {currentDoc.chunks.map((chunk) => {
                const isHovered = hoveredChunkIndex === chunk.chunkIndex;
                return (
                  <span
                    key={chunk.chunkIndex}
                    onMouseEnter={() => setHoveredChunkIndex(chunk.chunkIndex)}
                    onMouseLeave={() => setHoveredChunkIndex(null)}
                    style={{
                      backgroundColor: isHovered
                        ? 'rgba(99, 102, 241, 0.25)'
                        : 'transparent',
                      outline: isHovered ? '1px solid #6366F1' : 'none',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      display: 'inline',
                    }}
                    title={`Extracted from Chunk #${chunk.chunkIndex}`}
                  >
                    {chunk.text}{' '}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...styles.emptyStateBox,
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={styles.emptyFilesText}>
            {ingestedDocs.length === 0
              ? 'No ingested documents available. Please upload a PDF and ingest vectors in the Documents tab first.'
              : 'Please select an ingested document above to view its visual comparison and continuous extracted text.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState<string>(
    localStorage.getItem('jwt_token') || ''
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Navigation: 1 = Documents Hub, 2 = General AI Chat, 3 = Document RAG Chat & Voice, 4 = Inspector
  const [activeNavPage, setActiveNavPage] = useState<1 | 2 | 3 | 4>(1);

  // Document Management States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docList, setDocList] = useState<UploadedDoc[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [chunkingDocId, setChunkingDocId] = useState<string | null>(null);
  const [unchunkingDocId, setUnchunkingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [docSuccessMsg, setDocSuccessMsg] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Page 2: General AI Chat States
  const [generalChatInput, setGeneralChatInput] = useState('');
  const [generalChatLog, setGeneralChatLog] = useState<ChatMessage[]>([]);
  const [generalChatLoading, setGeneralChatLoading] = useState(false);

  // General Chat Voice States
  const [isGeneralRecording, setIsGeneralRecording] = useState(false);
  const generalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const generalAudioChunksRef = useRef<Blob[]>([]);
  const [processingGeneralVoice, setProcessingGeneralVoice] = useState(false);

  // Page 3: Document RAG Chat & Voice Assistant States
  const [ragChatInput, setRagChatInput] = useState('');
  const [ragChatLog, setRagChatLog] = useState<ChatMessage[]>([]);
  const [ragChatLoading, setRagChatLoading] = useState(false);
  const [selectedDocScope, setSelectedDocScope] = useState<string[]>([]);

  // Real-time Voice Assistant States on Page 3
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [processingVoice, setProcessingVoice] = useState(false);

  // Robust Web Audio API Speech Synthesis tracking
  const activeMessageIdRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const positionTimerRef = useRef<number>(0);

  // Starfield Canvas Background Effect
  useEffect(() => {
    const canvas = document.getElementById('spaceCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    let width: number, height: number;
    const stars: Star[] = [];
    const numStars = 600;
    const speed = 2.5;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

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

      draw() {
        const k = 300 / this.z;
        const px = this.x * k + width / 2;
        const py = this.y * k + height / 2;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const pSize = Math.max(1, (1 - this.z / width) * 3.5);
          const opacity = Math.min(1, (1 - this.z / width) * 1.5);

          ctx.fillStyle = `rgba(130, 190, 255, ${opacity})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (let i = 0; i < numStars; i++) {
      stars.push(new Star());
    }

    let animationFrameId: number;
    function animate() {
      ctx.fillStyle = 'rgba(5, 10, 25, 0.35)';
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      window.speechSynthesis.getVoices();
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
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

  const stopCurrentSpeech = (resetState = true) => {
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
  };

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
        v.name.toLowerCase().includes('george') === false
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
    } catch {
      alert('Document upload failed.');
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
        { headers: { Authorization: `Bearer ${token}` } }
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
    } catch {
      alert('Document vector ingestion failed.');
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

  return (
    <div style={styles.pageBackground}>
      <canvas id="spaceCanvas" style={styles.canvasBackground}></canvas>
      <style>{`
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
          background: transparent;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
          margin: 0px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        ::-webkit-scrollbar-button {
          display: none !important;
          width: 0px;
          height: 0px;
          background: transparent;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
        }
      `}</style>

      <div style={styles.container}>
        <header style={styles.topHeader}>
          <div style={styles.brandHeader}>
            <div style={styles.brandLogo}>✨</div>
            <div>
              <h1 style={styles.title}>Campus.AI</h1>
              <p style={styles.subtitle}>Workspace v2.3</p>
            </div>
          </div>
          {token && (
            <nav style={styles.navBar}>
              <button
                style={
                  activeNavPage === 1
                    ? styles.activeNavBtn
                    : styles.inactiveNavBtn
                }
                onClick={() => setActiveNavPage(1)}
              >
                Documents ({docList.length})
              </button>
              <button
                style={
                  activeNavPage === 2
                    ? styles.activeNavBtn
                    : styles.inactiveNavBtn
                }
                onClick={() => setActiveNavPage(2)}
              >
                General AI Chat
              </button>
              <button
                style={
                  activeNavPage === 3
                    ? styles.activeNavBtn
                    : styles.inactiveNavBtn
                }
                onClick={() => setActiveNavPage(3)}
              >
                RAG & Voice Chat
              </button>
              <button
                style={
                  activeNavPage === 4
                    ? styles.activeNavBtn
                    : styles.inactiveNavBtn
                }
                onClick={() => setActiveNavPage(4)}
              >
                Visual Inspector
              </button>
            </nav>
          )}
          {token && (
            <button
              style={styles.signOutBtn}
              onClick={() => {
                stopCurrentSpeech();
                localStorage.removeItem('jwt_token');
                setToken('');
              }}
            >
              Sign Out
            </button>
          )}
        </header>

        <main style={styles.mainContentArea}>
          {!token ? (
            <div style={styles.authWrapper}>
              <div style={styles.authCard}>
                <div style={styles.authHeader}>
                  <div style={styles.brandLogoLarge}>✨</div>
                  <h2 style={styles.authTitle}>Welcome Back</h2>
                  <p style={styles.authSubtitle}>
                    Sign in to access your study companion
                  </p>
                </div>
                <form onSubmit={handleLogin} style={styles.formStack}>
                  <div style={styles.inputFieldWrapper}>
                    <label style={styles.inputLabel}>Email Address</label>
                    <input
                      type="email"
                      placeholder="student@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputFieldWrapper}>
                    <label style={styles.inputLabel}>Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <button type="submit" style={styles.primaryButtonLarge}>
                    Sign In
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              {activeNavPage === 1 && (
                <div style={styles.pageSection}>
                  <div style={styles.sectionHeadingRow}>
                    <h2 style={styles.pageTitle}>Documents & Knowledge Hub</h2>
                    <p style={styles.pageDesc}>
                      Upload PDF files, ingest vector embeddings, preview text
                      chunks, and manage storage.
                    </p>
                  </div>

                  <div style={styles.uploadCard}>
                    <h3 style={styles.cardSectionTitle}>Upload New Document</h3>
                    <div style={styles.uploadRow}>
                      <label style={styles.fileDropZone}>
                        <span style={styles.fileDropText}>
                          {selectedFile
                            ? `📄 ${selectedFile.name}`
                            : '📄 Choose PDF Document'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            setSelectedFile(e.target.files?.[0] || null)
                          }
                          disabled={uploadingDoc}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        onClick={handleDocUpload}
                        disabled={!selectedFile || uploadingDoc}
                        style={
                          !selectedFile || uploadingDoc
                            ? styles.disabledButton
                            : styles.primaryButton
                        }
                      >
                        {uploadingDoc ? 'Uploading...' : 'Upload File'}
                      </button>
                    </div>
                    {docSuccessMsg && (
                      <p style={styles.successText}>{docSuccessMsg}</p>
                    )}
                  </div>

                  <div style={styles.documentsContainer}>
                    <h3 style={styles.cardSectionTitle}>
                      Indexed Documents Directory
                    </h3>
                    {docList.length === 0 ? (
                      <div style={styles.emptyStateBox}>
                        <p style={styles.emptyFilesText}>
                          No documents uploaded yet. Upload a PDF above to get
                          started.
                        </p>
                      </div>
                    ) : (
                      <div style={styles.docListStack}>
                        {docList.map((doc) => {
                          const isChunked = doc.totalChunks > 0;
                          const isExpanded = expandedDocId === doc.documentId;
                          return (
                            <div
                              key={doc.documentId}
                              style={styles.docItemCard}
                            >
                              <div style={styles.docMainInfoRow}>
                                <div style={styles.docMetaCol}>
                                  <span style={styles.docNameText}>
                                    📄 {doc.originalName}
                                  </span>
                                  <div style={styles.badgeRow}>
                                    <span
                                      style={
                                        isChunked
                                          ? styles.statusBadgeChunked
                                          : styles.statusBadgeStaged
                                      }
                                    >
                                      {isChunked
                                        ? `⚡ Ingested (${doc.totalChunks} chunks)`
                                        : '📄 Staged (Unchunked)'}
                                    </span>
                                    <span style={styles.metaSubText}>
                                      Size: {(doc.fileSize / 1024).toFixed(1)}{' '}
                                      KB | Chars: {doc.characterCount}
                                    </span>
                                  </div>
                                </div>
                                <div style={styles.docActionRow}>
                                  {!isChunked ? (
                                    <button
                                      onClick={() =>
                                        handleChunkDoc(doc.documentId)
                                      }
                                      disabled={
                                        chunkingDocId === doc.documentId
                                      }
                                      style={styles.primaryButton}
                                    >
                                      {chunkingDocId === doc.documentId
                                        ? 'Processing...'
                                        : '⚡ Ingest Vectors'}
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() =>
                                          setExpandedDocId(
                                            isExpanded ? null : doc.documentId
                                          )
                                        }
                                        style={styles.secondaryButtonSmall}
                                      >
                                        {isExpanded
                                          ? 'Hide Chunks 🔼'
                                          : 'Preview Chunks 🔽'}
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleUnchunkDoc(doc.documentId)
                                        }
                                        disabled={
                                          unchunkingDocId === doc.documentId
                                        }
                                        style={styles.warningButtonSmall}
                                      >
                                        {unchunkingDocId === doc.documentId
                                          ? 'Processing...'
                                          : '🔄 Purge Vectors'}
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDeleteDoc(
                                        doc.documentId,
                                        doc.originalName
                                      )
                                    }
                                    disabled={deletingDocId === doc.documentId}
                                    style={styles.dangerButtonSmall}
                                    title="Delete document from app, uploads folder, and MongoDB"
                                  >
                                    {deletingDocId === doc.documentId
                                      ? 'Deleting...'
                                      : '🗑️ Delete'}
                                  </button>
                                </div>
                              </div>

                              {isExpanded && isChunked && (
                                <div style={styles.chunkPreviewBox}>
                                  <div style={styles.mongoServerHeader}>
                                    <span>
                                      MongoDB Document Server Record View
                                    </span>
                                    <span style={{ color: '#818CF8' }}>
                                      Filename: {doc.filename}
                                    </span>
                                  </div>
                                  <div style={styles.chunksGrid}>
                                    {doc.chunks.map((chunk) => (
                                      <div
                                        key={chunk.chunkIndex}
                                        style={styles.chunkCard}
                                      >
                                        <div style={styles.chunkCardHeader}>
                                          <span>
                                            Chunk Index #{chunk.chunkIndex}
                                          </span>
                                          <span>
                                            {chunk.characterCount} chars |
                                            Vector Dim: {chunk.vectorDimensions}
                                          </span>
                                        </div>
                                        <p style={styles.chunkTextSnippet}>
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
              )}

              {activeNavPage === 2 && (
                <div style={styles.pageSection}>
                  <div style={styles.sectionHeadingRow}>
                    <h2 style={styles.pageTitle}>General AI Study Chat</h2>
                    <p style={styles.pageDesc}>
                      Conversational chatbot for general topics, coding
                      assistance, and coursework explanations.
                    </p>
                  </div>
                  <div style={styles.chatLogContainer}>
                    {generalChatLog.length === 0 ? (
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateIcon}>💬</div>
                        <h4 style={styles.emptyStateTitle}>
                          Start a conversation
                        </h4>
                        <p style={styles.emptyStateDesc}>
                          Ask questions about programming, algorithms, math, or
                          notes.
                        </p>
                      </div>
                    ) : (
                      generalChatLog.map((m) => (
                        <div
                          key={m.id}
                          style={
                            m.sender === 'User'
                              ? styles.userBubble
                              : styles.aiBubbleFull
                          }
                        >
                          <span style={styles.bubbleSender}>
                            {m.sender === 'User' ? 'You' : 'Campus AI'}
                          </span>
                          <div style={styles.markdownContent}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>

                          {m.sender === 'AI' && (
                            <div style={styles.messageAudioBar}>
                              <button
                                onClick={() =>
                                  toggleMessageAudio(m, setGeneralChatLog)
                                }
                                style={styles.audioBarPlayBtn}
                                title={m.isPlaying ? 'Pause' : 'Play'}
                              >
                                {m.isPlaying ? (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="11"
                                    height="11"
                                    fill="currentColor"
                                  >
                                    <rect
                                      x="5"
                                      y="4"
                                      width="4"
                                      height="16"
                                      rx="1"
                                    />
                                    <rect
                                      x="15"
                                      y="4"
                                      width="4"
                                      height="16"
                                      rx="1"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="11"
                                    height="11"
                                    fill="currentColor"
                                  >
                                    <polygon points="5,3 19,12 5,21" />
                                  </svg>
                                )}
                              </button>
                              <div
                                style={styles.audioBarTrackWrapper}
                                onClick={(e) =>
                                  handleAudioProgressBarClick(
                                    e,
                                    m,
                                    setGeneralChatLog
                                  )
                                }
                              >
                                <div
                                  style={{
                                    ...styles.audioBarFill,
                                    width: `${m.progress || 0}%`,
                                  }}
                                />
                              </div>
                              <span style={styles.audioBarDuration}>
                                {m.currentTimeFormatted || '0:00'} /{' '}
                                {m.durationFormatted || '0:00'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {generalChatLoading && (
                      <div style={styles.aiBubbleFull}>
                        <span style={styles.bubbleSender}>Campus AI</span>
                        <div style={styles.typingIndicator}>
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.ragInputBarContainer}>
                    <input
                      style={styles.input}
                      value={generalChatInput}
                      onChange={(e) => setGeneralChatInput(e.target.value)}
                      placeholder={
                        processingGeneralVoice
                          ? 'Transcribing voice prompt...'
                          : 'Type your message or record voice...'
                      }
                      disabled={processingGeneralVoice}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && sendGeneralChatMessage()
                      }
                    />

                    {!isGeneralRecording ? (
                      <button
                        onClick={startGeneralRecording}
                        disabled={processingGeneralVoice}
                        style={styles.voiceIconButton}
                        title="Record Voice Prompt"
                      >
                        🎙️
                      </button>
                    ) : (
                      <button
                        onClick={stopGeneralRecording}
                        style={styles.voiceRecordingActiveBtn}
                        title="Stop Recording"
                      >
                        ⏹️
                      </button>
                    )}

                    <button
                      onClick={sendGeneralChatMessage}
                      disabled={generalChatLoading || !generalChatInput.trim()}
                      style={
                        generalChatLoading || !generalChatInput.trim()
                          ? styles.disabledButton
                          : styles.primaryButton
                      }
                    >
                      Send →
                    </button>
                  </div>
                  {isGeneralRecording && (
                    <p style={styles.recordingIndicator}>
                      🔴 Listening to microphone... Click stop when finished.
                    </p>
                  )}
                  {processingGeneralVoice && (
                    <p style={styles.processingIndicator}>
                      ⏳ Transcribing voice audio into text bar...
                    </p>
                  )}
                </div>
              )}

              {activeNavPage === 3 && (
                <div style={styles.pageSection}>
                  <div style={styles.sectionHeadingRow}>
                    <h2 style={styles.pageTitle}>
                      Document Knowledge & Voice Assistant
                    </h2>
                    <p style={styles.pageDesc}>
                      Select specific ingested documents or query across all
                      files using text chat or real-time voice recording.
                    </p>
                  </div>

                  <div style={styles.docSelectionToolbar}>
                    <span style={styles.toolbarLabel}>
                      Select Knowledge Scope:
                    </span>
                    <div style={styles.scopeChipsRow}>
                      <button
                        style={
                          selectedDocScope.length === 0
                            ? styles.scopeChipActive
                            : styles.scopeChipInactive
                        }
                        onClick={() => setSelectedDocScope([])}
                      >
                        🌍 All Ingested Documents
                      </button>
                      {docList
                        .filter((d) => d.totalChunks > 0)
                        .map((d) => {
                          const isSelected = selectedDocScope.includes(
                            d.documentId
                          );
                          return (
                            <button
                              key={d.documentId}
                              style={
                                isSelected
                                  ? styles.scopeChipActive
                                  : styles.scopeChipInactive
                              }
                              onClick={() => toggleScopeDoc(d.documentId)}
                            >
                              📄 {d.originalName}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div style={styles.chatLogContainer}>
                    {ragChatLog.length === 0 ? (
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateIcon}>🧠</div>
                        <h4 style={styles.emptyStateTitle}>
                          Query your documents
                        </h4>
                        <p style={styles.emptyStateDesc}>
                          Ask questions regarding the selected document scope or
                          use the voice recording button below.
                        </p>
                      </div>
                    ) : (
                      ragChatLog.map((m) => (
                        <div
                          key={m.id}
                          style={
                            m.sender === 'User'
                              ? styles.userBubble
                              : styles.aiBubbleFull
                          }
                        >
                          <span style={styles.bubbleSender}>
                            {m.sender === 'User' ? 'You' : 'Document Assistant'}
                          </span>
                          <div style={styles.markdownContent}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>

                          {m.sender === 'AI' && (
                            <div style={styles.messageAudioBar}>
                              <button
                                onClick={() =>
                                  toggleMessageAudio(m, setRagChatLog)
                                }
                                style={styles.audioBarPlayBtn}
                                title={m.isPlaying ? 'Pause' : 'Play'}
                              >
                                {m.isPlaying ? (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="11"
                                    height="11"
                                    fill="currentColor"
                                  >
                                    <rect
                                      x="5"
                                      y="4"
                                      width="4"
                                      height="16"
                                      rx="1"
                                    />
                                    <rect
                                      x="15"
                                      y="4"
                                      width="4"
                                      height="16"
                                      rx="1"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="11"
                                    height="11"
                                    fill="currentColor"
                                  >
                                    <polygon points="5,3 19,12 5,21" />
                                  </svg>
                                )}
                              </button>
                              <div
                                style={styles.audioBarTrackWrapper}
                                onClick={(e) =>
                                  handleAudioProgressBarClick(
                                    e,
                                    m,
                                    setRagChatLog
                                  )
                                }
                              >
                                <div
                                  style={{
                                    ...styles.audioBarFill,
                                    width: `${m.progress || 0}%`,
                                  }}
                                />
                              </div>
                              <span style={styles.audioBarDuration}>
                                {m.currentTimeFormatted || '0:00'} /{' '}
                                {m.durationFormatted || '0:00'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {ragChatLoading && (
                      <div style={styles.aiBubbleFull}>
                        <span style={styles.bubbleSender}>
                          Document Assistant
                        </span>
                        <div style={styles.typingIndicator}>
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.ragInputBarContainer}>
                    <input
                      style={styles.input}
                      value={ragChatInput}
                      onChange={(e) => setRagChatInput(e.target.value)}
                      placeholder={
                        processingVoice
                          ? 'Transcribing voice prompt...'
                          : 'Ask anything about your document context...'
                      }
                      disabled={processingVoice}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && sendRagChatMessage()
                      }
                    />

                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={processingVoice}
                        style={styles.voiceIconButton}
                        title="Record Voice Prompt"
                      >
                        🎙️
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        style={styles.voiceRecordingActiveBtn}
                        title="Stop Recording"
                      >
                        ⏹️
                      </button>
                    )}

                    <button
                      onClick={sendRagChatMessage}
                      disabled={ragChatLoading || !ragChatInput.trim()}
                      style={
                        ragChatLoading || !ragChatInput.trim()
                          ? styles.disabledButton
                          : styles.primaryButton
                      }
                    >
                      Send →
                    </button>
                  </div>
                  {isRecording && (
                    <p style={styles.recordingIndicator}>
                      🔴 Listening to microphone... Click stop when finished.
                    </p>
                  )}
                  {processingVoice && (
                    <p style={styles.processingIndicator}>
                      ⏳ Transcribing voice audio into text bar...
                    </p>
                  )}
                </div>
              )}

              {activeNavPage === 4 && (
                <div style={styles.pageSection}>
                  <div style={styles.sectionHeadingRow}>
                    <h2 style={styles.pageTitle}>Visual Document Inspector</h2>
                    <p style={styles.pageDesc}>
                      Examine original document layouts side-by-side with fully
                      extracted continuous text.
                    </p>
                  </div>
                  <VisualTextInspector documents={docList} token={token} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    position: 'relative',
    backgroundColor: '#0A1128',
    minHeight: '100vh',
    padding: '32px 20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
    color: '#F8FAFC',
    overflowX: 'hidden',
  },
  canvasBackground: {
    display: 'block',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topHeader: {
    backgroundColor: '#1E293B',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '18px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  },
  brandHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  brandLogo: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
  },
  brandLogoLarge: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    margin: '0 auto 16px auto',
    boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
  },
  title: {
    color: '#F8FAFC',
    fontSize: '17px',
    fontWeight: '700',
    margin: '0',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: '11px',
    margin: '2px 0 0 0',
    fontWeight: '500',
  },
  navBar: {
    display: 'flex',
    gap: '6px',
    backgroundColor: '#0F172A',
    padding: '5px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  activeNavBtn: {
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
    transition: 'all 0.2s ease',
  },
  inactiveNavBtn: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '10px',
    fontWeight: '500',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  signOutBtn: {
    backgroundColor: 'transparent',
    color: '#94A3B8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mainContentArea: {
    backgroundColor: '#1E293B',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 15px 35px -10px rgba(0, 0, 0, 0.4)',
    minHeight: '600px',
  },
  pageSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  },
  sectionHeadingRow: {
    marginBottom: '2px',
  },
  pageTitle: {
    fontSize: '19px',
    fontWeight: '700',
    color: '#F8FAFC',
    margin: '0 0 4px 0',
    letterSpacing: '-0.2px',
  },
  pageDesc: {
    fontSize: '13px',
    color: '#94A3B8',
    margin: 0,
  },
  uploadCard: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  cardSectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#818CF8',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  uploadRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  fileDropZone: {
    flex: 1,
    border: '1px dashed rgba(99, 102, 241, 0.3)',
    borderRadius: '12px',
    padding: '14px 18px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#1E293B',
    transition: 'all 0.2s',
  },
  fileDropText: {
    fontSize: '13px',
    color: '#CBD5E1',
    wordBreak: 'break-all',
  },
  documentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyStateBox: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
  },
  emptyFilesText: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0,
  },
  docListStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  docItemCard: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '18px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  docMainInfoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  docMetaCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  docNameText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#F8FAFC',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusBadgeChunked: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34D399',
    border: '1px solid rgba(52, 211, 153, 0.2)',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
  },
  statusBadgeStaged: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    color: '#FBBF24',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
  },
  metaSubText: {
    fontSize: '11px',
    color: '#64748B',
  },
  docActionRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  chunkPreviewBox: {
    backgroundColor: '#1E293B',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  mongoServerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '8px',
  },
  chunksGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  chunkCard: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  chunkCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#818CF8',
    fontWeight: '600',
    marginBottom: '4px',
  },
  chunkTextSnippet: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0,
    lineHeight: '1.4',
  },
  chatLogContainer: {
    height: '460px',
    overflowY: 'auto',
    overflowX: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '16px 20px',
    backgroundColor: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748B',
    textAlign: 'center',
  },
  emptyStateIcon: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  emptyStateTitle: {
    color: '#E2E8F0',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  emptyStateDesc: {
    fontSize: '12px',
    margin: 0,
    color: '#64748B',
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: '12px 12px 2px 12px',
    maxWidth: '75%',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
    fontSize: '13px',
  },
  aiBubbleFull: {
    alignSelf: 'flex-start',
    backgroundColor: '#151C2C',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#E2E8F0',
    padding: '12px 14px',
    borderRadius: '12px 12px 12px 2px',
    maxWidth: '78%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  messageAudioBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '4px 10px',
    marginTop: '6px',
  },
  audioBarPlayBtn: {
    background: '#6366F1',
    color: '#FFFFFF',
    border: 'none',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  audioBarTrackWrapper: {
    flex: 1,
    height: '4px',
    backgroundColor: '#1E293B',
    borderRadius: '2px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  audioBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: '2px',
    transition: 'width 0.2s linear',
  },
  audioBarDuration: {
    fontSize: '10px',
    color: '#94A3B8',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: '0',
  },
  bubbleSender: {
    fontSize: '10px',
    fontWeight: '700',
    display: 'block',
    marginBottom: '1px',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  markdownContent: {
    fontSize: '13px',
    lineHeight: '1.45',
    margin: 0,
  },
  ragInputBarContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F172A',
    fontSize: '13px',
    color: '#F8FAFC',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '11px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    transition: 'all 0.2s ease',
  },
  secondaryButtonSmall: {
    backgroundColor: '#334155',
    color: '#E2E8F0',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
  },
  warningButtonSmall: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    color: '#FBBF24',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
  },
  dangerButtonSmall: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#F87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
  },
  primaryButtonLarge: {
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    border: 'none',
    padding: '13px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '6px',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
  },
  voiceIconButton: {
    backgroundColor: '#0F172A',
    color: '#F43F5E',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    cursor: 'pointer',
  },
  voiceRecordingActiveBtn: {
    backgroundColor: '#F43F5E',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(244, 63, 94, 0.5)',
  },
  disabledButton: {
    backgroundColor: '#334155',
    color: '#64748B',
    border: 'none',
    padding: '11px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'not-allowed',
  },
  successText: {
    color: '#34D399',
    fontSize: '12px',
    margin: '4px 0 0 0',
    fontWeight: '500',
  },
  recordingIndicator: {
    color: '#F43F5E',
    fontSize: '12px',
    marginTop: '6px',
    fontWeight: '600',
  },
  processingIndicator: {
    color: '#818CF8',
    fontSize: '12px',
    marginTop: '6px',
    fontWeight: '600',
  },
  docSelectionToolbar: {
    backgroundColor: '#0F172A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  toolbarLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  scopeChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  scopeChipActive: {
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    border: '1px solid transparent',
    padding: '7px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
  scopeChipInactive: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '7px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  authWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '460px',
  },
  authCard: {
    width: '100%',
    maxWidth: '380px',
    padding: '10px',
  },
  authHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  authTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#F8FAFC',
    margin: '0 0 4px 0',
  },
  authSubtitle: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0,
  },
  inputFieldWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  },
  inputLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    fontSize: '16px',
    letterSpacing: '2px',
    color: '#94A3B8',
  },
};

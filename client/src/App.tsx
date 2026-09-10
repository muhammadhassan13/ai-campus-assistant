import React, { useState, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ApiError {
  error?: string;
  message?: string;
}

interface UploadedDoc {
  documentId: string;
  originalName: string;
  totalChunks: number;
}

export default function App() {
  const [token, setToken] = useState<string>(
    localStorage.getItem('jwt_token') || ''
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'chat' | 'knowledge'>('chat');

  // AI Chat States (Normal Chat - No Document)
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<
    Array<{ sender: string; text: string }>
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Document & Voice Knowledge States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docList, setDocList] = useState<UploadedDoc[]>([]);
  const [targetDocId, setTargetDocId] = useState<string>('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docSuccessMsg, setDocSuccessMsg] = useState('');

  // Document Text Query States
  const [ragQuery, setRagQuery] = useState('');
  const [ragAnswer, setRagAnswer] = useState('');
  const [queryingDoc, setQueryingDoc] = useState(false);

  // Real-time Voice Assistant States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceReply, setVoiceReply] = useState<{
    transcript: string;
    answer: string;
    audioUrl: string;
  } | null>(null);
  const [processingVoice, setProcessingVoice] = useState(false);

  // Auth Handler
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

  // Normal AI Chat Handler
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatLog((prev) => [...prev, { sender: 'User', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post(
        '/api/chat',
        { message: userMsg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const reply = res.data?.data?.response || res.data?.response;
      setChatLog((prev) => [...prev, { sender: 'AI', text: reply }]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        { sender: 'AI', text: 'Error processing request.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Document Upload Handler
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
      const newDoc: UploadedDoc = {
        documentId: res.data.data.documentId,
        originalName: res.data.data.originalName,
        totalChunks: res.data.data.totalChunks,
      };

      setDocList((prev) => [...prev, newDoc]);
      setDocSuccessMsg(`Uploaded: ${newDoc.originalName}`);
      setSelectedFile(null);
    } catch {
      alert('Document upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Document Query Handler
  const handleRagChat = async () => {
    if (!ragQuery.trim() || queryingDoc) return;

    setQueryingDoc(true);
    setRagAnswer('');

    try {
      const res = await axios.post(
        '/api/documents/chat',
        {
          query: ragQuery,
          documentId: targetDocId || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRagAnswer(res.data.data.answer);
    } catch {
      alert('Failed to query document.');
    } finally {
      setQueryingDoc(false);
    }
  };

  // Real-time Voice Recording Controls
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordedBlob(null);
    setVoiceReply(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
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

  // Submit Recorded Voice Query
  const handleVoiceRag = async () => {
    if (!recordedBlob || processingVoice) return;

    setProcessingVoice(true);
    setVoiceReply(null);

    const formData = new FormData();
    formData.append('audio', recordedBlob, 'voice-prompt.webm');
    if (targetDocId) formData.append('documentId', targetDocId);

    try {
      const res = await axios.post('/api/voice/rag-chat', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVoiceReply(res.data.data);
    } catch {
      alert('Voice processing failed.');
    } finally {
      setProcessingVoice(false);
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {/* Sidebar Structure */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarCard}>
            <h1 style={styles.title}>Campus.AI</h1>
            <p style={styles.subtitle}>Neural Interface</p>
            {token && (
              <nav style={styles.tabBar}>
                <button
                  style={tab === 'chat' ? styles.activeTab : styles.inactiveTab}
                  onClick={() => setTab('chat')}
                >
                  ⚡ AI Study Chat
                </button>
                <button
                  style={
                    tab === 'knowledge' ? styles.activeTab : styles.inactiveTab
                  }
                  onClick={() => setTab('knowledge')}
                >
                  📂 PDF Knowledge & Voice
                </button>
              </nav>
            )}
          </div>

          {token && (
            <div style={styles.sidebarCard}>
              <h3 style={styles.panelTitle}>Upload Knowledge</h3>
              <div style={styles.sidebarUploadStack}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={uploadingDoc}
                  style={styles.fileInput}
                />
                <button
                  onClick={handleDocUpload}
                  disabled={!selectedFile || uploadingDoc}
                  style={
                    !selectedFile || uploadingDoc
                      ? styles.disabledButton
                      : styles.primaryButton
                  }
                >
                  {uploadingDoc ? 'Ingesting...' : 'Upload PDF'}
                </button>
              </div>
              {docSuccessMsg && (
                <p style={styles.successText}>{docSuccessMsg}</p>
              )}

              <div style={{ marginTop: '12px' }}>
                <span style={styles.responseLabel}>Uploaded Documents</span>
                {docList.length === 0 ? (
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#6B7280',
                      margin: '4px 0 0 0',
                    }}
                  >
                    No files uploaded yet.
                  </p>
                ) : (
                  <ul style={styles.docList}>
                    {docList.map((doc) => (
                      <li
                        key={doc.documentId}
                        style={styles.docListItemContainer}
                      >
                        <div style={styles.docRow}>
                          <span
                            style={{
                              ...styles.docTitleText,
                              ...(targetDocId === doc.documentId
                                ? { color: '#00F2FE' }
                                : {}),
                            }}
                            title={doc.originalName}
                            onClick={() => setTargetDocId(doc.documentId)}
                          >
                            📄 {doc.originalName}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {token && (
            <div style={styles.sidebarCard}>
              <button
                style={styles.secondaryButton}
                onClick={() => {
                  localStorage.removeItem('jwt_token');
                  setToken('');
                }}
              >
                Disconnect Session
              </button>
            </div>
          )}
        </aside>

        {/* Main Workspace Panel */}
        <main style={styles.mainContent}>
          {!token ? (
            <div style={{ maxWidth: '400px', margin: '40px auto' }}>
              <h2
                style={{
                  color: '#FFF',
                  fontSize: '18px',
                  marginBottom: '20px',
                }}
              >
                Authentication Required
              </h2>
              <form onSubmit={handleLogin} style={styles.formStack}>
                <input
                  type="email"
                  placeholder="Student Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  required
                />
                <button type="submit" style={styles.primaryButton}>
                  Initialize Access
                </button>
              </form>
            </div>
          ) : (
            <div>
              {/* TAB 1: NORMAL AI CHAT */}
              {tab === 'chat' && (
                <div>
                  <div style={styles.chatLogContainer}>
                    {chatLog.length === 0 ? (
                      <div style={styles.emptyState}>
                        No neural logs found. Begin transmission below.
                      </div>
                    ) : (
                      chatLog.map((m, i) => (
                        <div
                          key={i}
                          style={
                            m.sender === 'User'
                              ? styles.userBubble
                              : styles.aiBubble
                          }
                        >
                          <span style={styles.bubbleSender}>{m.sender}</span>
                          <div style={styles.markdownContent}>
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={styles.inputGroup}>
                    <input
                      style={styles.input}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Transmit prompt to AI core..."
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={chatLoading}
                      style={
                        chatLoading
                          ? styles.disabledButton
                          : styles.primaryButton
                      }
                    >
                      {chatLoading ? 'Processing...' : 'Send'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PDF KNOWLEDGE & REAL-TIME VOICE ASSISTANT */}
              {tab === 'knowledge' && (
                <div style={styles.sectionStack}>
                  <div style={styles.innerPanel}>
                    <h3 style={styles.panelTitle}>Target Document Context</h3>
                    <select
                      value={targetDocId}
                      onChange={(e) => setTargetDocId(e.target.value)}
                      style={styles.selectInput}
                    >
                      <option value="">All Documents (Global Scope)</option>
                      {docList.map((doc) => (
                        <option key={doc.documentId} value={doc.documentId}>
                          {doc.originalName} ({doc.totalChunks} chunks)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Text RAG Query Sub-Panel */}
                  <div style={styles.innerPanel}>
                    <h3 style={styles.panelTitle}>
                      Query Knowledge Base (Text)
                    </h3>
                    <div style={styles.inputGroup}>
                      <input
                        style={styles.input}
                        value={ragQuery}
                        onChange={(e) => setRagQuery(e.target.value)}
                        placeholder="Query vector database..."
                        disabled={queryingDoc}
                        onKeyDown={(e) => e.key === 'Enter' && handleRagChat()}
                      />
                      <button
                        onClick={handleRagChat}
                        disabled={!ragQuery.trim() || queryingDoc}
                        style={
                          !ragQuery.trim() || queryingDoc
                            ? styles.disabledButton
                            : styles.primaryButton
                        }
                      >
                        {queryingDoc ? 'Searching...' : 'Query Document'}
                      </button>
                    </div>

                    {ragAnswer && (
                      <div style={styles.responseBox}>
                        <span style={styles.responseLabel}>
                          Vector Response
                        </span>
                        <div style={styles.markdownContent}>
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {ragAnswer}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real-Time Microphone Voice Prompt Sub-Panel */}
                  <div style={styles.innerPanel}>
                    <h3 style={styles.panelTitle}>Real-Time Voice Prompt</h3>
                    <div style={styles.voiceControlRow}>
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          disabled={processingVoice}
                          style={styles.recordButton}
                        >
                          🎙️ Start Recording
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          style={styles.stopButton}
                        >
                          ⏹️ Stop Recording
                        </button>
                      )}

                      <button
                        onClick={handleVoiceRag}
                        disabled={
                          !recordedBlob || processingVoice || isRecording
                        }
                        style={
                          !recordedBlob || processingVoice || isRecording
                            ? styles.disabledButton
                            : styles.primaryButton
                        }
                      >
                        {processingVoice
                          ? 'Synthesizing Audio...'
                          : 'Send Voice Prompt'}
                      </button>
                    </div>

                    {isRecording && (
                      <p style={styles.recordingIndicator}>
                        🔴 Recording audio live...
                      </p>
                    )}

                    {recordedBlob && !isRecording && (
                      <p style={styles.successText}>
                        ✓ Audio recorded and ready for transmission.
                      </p>
                    )}

                    {voiceReply && (
                      <div style={styles.responseBox}>
                        <p style={styles.metaText}>
                          <strong>Transcript:</strong> {voiceReply.transcript}
                        </p>
                        <div style={styles.markdownContent}>
                          <strong>Answer:</strong>
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {voiceReply.answer}
                          </ReactMarkdown>
                        </div>
                        <audio
                          controls
                          src={voiceReply.audioUrl}
                          style={styles.audioPlayer}
                        />
                      </div>
                    )}
                  </div>
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
    backgroundColor: '#0B0F19',
    backgroundImage:
      'radial-gradient(circle at 10% 20%, rgba(0, 242, 254, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(127, 0, 255, 0.05) 0%, transparent 40%)',
    minHeight: '100vh',
    padding: '30px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
    color: '#F3F4F6',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '24px',
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sidebarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sidebarUploadStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mainContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    letterSpacing: '-0.3px',
    background: 'linear-gradient(135deg, #00F2FE 0%, #7F00FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: '11px',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tabBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
  },
  activeTab: {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    color: '#00F2FE',
    border: '1px solid rgba(0, 242, 254, 0.3)',
    padding: '10px 14px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    border: '1px solid transparent',
    padding: '10px 14px',
    borderRadius: '10px',
    fontWeight: '500',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  chatLogContainer: {
    height: '420px',
    overflowY: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  emptyState: {
    color: '#6B7280',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '180px',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    color: '#E5E7EB',
    border: '1px solid rgba(0, 242, 254, 0.3)',
    padding: '12px 16px',
    borderRadius: '14px 14px 2px 14px',
    maxWidth: '75%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#E5E7EB',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '12px 16px',
    borderRadius: '14px 14px 14px 2px',
    maxWidth: '75%',
  },
  bubbleSender: {
    fontSize: '10px',
    fontWeight: '700',
    display: 'block',
    marginBottom: '6px',
    color: '#00F2FE',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  markdownContent: {
    fontSize: '13px',
    lineHeight: '1.6',
    margin: 0,
  },
  inputGroup: {
    display: 'flex',
    gap: '12px',
  },
  voiceControlRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    fontSize: '13px',
    color: '#FFFFFF',
    outline: 'none',
  },
  fileInput: {
    fontSize: '11px',
    color: '#9CA3AF',
  },
  selectInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '13px',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    outline: 'none',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
    color: '#0B0F19',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    flex: 1,
    boxShadow: '0 4px 15px rgba(0, 242, 254, 0.2)',
  },
  recordButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    flex: 1,
  },
  stopButton: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    width: '100%',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#4B5563',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'not-allowed',
    flex: 1,
  },
  sectionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  innerPanel: {
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  panelTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#00F2FE',
    marginTop: 0,
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  successText: {
    color: '#34D399',
    fontSize: '11px',
    margin: '8px 0 0 0',
    fontWeight: '500',
    wordBreak: 'break-word',
  },
  recordingIndicator: {
    color: '#EF4444',
    fontSize: '11px',
    margin: '8px 0 0 0',
    fontWeight: '600',
  },
  responseBox: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeft: '3px solid #00F2FE',
    borderRadius: '0 10px 10px 0',
  },
  responseLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#00F2FE',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
    letterSpacing: '0.5px',
  },
  metaText: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
  },
  audioPlayer: {
    width: '100%',
    marginTop: '12px',
    filter: 'invert(1) hue-rotate(180deg)',
  },
  docList: {
    listStyle: 'none',
    padding: 0,
    margin: '6px 0 0 0',
    maxHeight: '160px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  docListItemContainer: {
    fontSize: '11px',
    color: '#D1D5DB',
    padding: '6px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  docTitleText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    flex: 1,
  },
};

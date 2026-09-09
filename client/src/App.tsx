import React, { useState } from 'react';
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
  const [tab, setTab] = useState<'chat' | 'docs' | 'voice'>('chat');

  // AI Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<
    Array<{ sender: string; text: string }>
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Document RAG States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docList, setDocList] = useState<UploadedDoc[]>([]);
  const [targetDocId, setTargetDocId] = useState<string>('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docSuccessMsg, setDocSuccessMsg] = useState('');

  // Document Query States
  const [ragQuery, setRagQuery] = useState('');
  const [ragAnswer, setRagAnswer] = useState('');
  const [queryingDoc, setQueryingDoc] = useState(false);

  // Voice States
  const [audioFile, setAudioFile] = useState<File | null>(null);
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
        alert('Login successful!');
      }
    } catch (err: unknown) {
      const error = err as AxiosError<ApiError>;
      alert(error.response?.data?.error || 'Login failed');
    }
  };

  // Chat Handler
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
      const res = await axios.post('/api/documents/upload', formData);
      const newDoc: UploadedDoc = {
        documentId: res.data.data.documentId,
        originalName: res.data.data.originalName,
        totalChunks: res.data.data.totalChunks,
      };

      setDocList((prev) => [...prev, newDoc]);
      setTargetDocId(newDoc.documentId);
      setDocSuccessMsg(
        `Uploaded "${newDoc.originalName}" (${newDoc.totalChunks} chunks)`
      );
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
      const res = await axios.post('/api/documents/chat', {
        query: ragQuery,
        documentId: targetDocId || undefined,
      });
      setRagAnswer(res.data.data.answer);
    } catch {
      alert('Failed to query document.');
    } finally {
      setQueryingDoc(false);
    }
  };

  // Voice RAG Handler
  const handleVoiceRag = async () => {
    if (!audioFile || processingVoice) return;

    setProcessingVoice(true);
    setVoiceReply(null);

    const formData = new FormData();
    formData.append('audio', audioFile);
    if (targetDocId) formData.append('documentId', targetDocId);

    try {
      const res = await axios.post('/api/voice/rag-chat', formData);
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
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>AI Campus Assistant</h1>
            <p style={styles.subtitle}>Minimal Portal & Study Engine</p>
          </div>
          {token && (
            <button
              style={styles.secondaryButton}
              onClick={() => {
                localStorage.removeItem('jwt_token');
                setToken('');
              }}
            >
              Logout
            </button>
          )}
        </header>

        {!token ? (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Student Authentication</h2>
            <form onSubmit={handleLogin} style={styles.formStack}>
              <input
                type="email"
                placeholder="Email Address"
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
                Login to Portal
              </button>
            </form>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={styles.tabBar}>
              <button
                style={tab === 'chat' ? styles.activeTab : styles.inactiveTab}
                onClick={() => setTab('chat')}
              >
                AI Study Chat
              </button>
              <button
                style={tab === 'docs' ? styles.activeTab : styles.inactiveTab}
                onClick={() => setTab('docs')}
              >
                PDF Knowledge (RAG)
              </button>
              <button
                style={tab === 'voice' ? styles.activeTab : styles.inactiveTab}
                onClick={() => setTab('voice')}
              >
                Voice Assistant
              </button>
            </div>

            {/* TAB 1: AI CHAT */}
            {tab === 'chat' && (
              <div>
                <div style={styles.chatLogContainer}>
                  {chatLog.length === 0 ? (
                    <div style={styles.emptyState}>
                      No conversation yet. Ask a question below.
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
                    placeholder="Ask AI anything..."
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading}
                    style={
                      chatLoading ? styles.disabledButton : styles.primaryButton
                    }
                  >
                    {chatLoading ? 'Thinking...' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DOCUMENTS */}
            {tab === 'docs' && (
              <div style={styles.sectionStack}>
                <div style={styles.innerPanel}>
                  <h3 style={styles.panelTitle}>1. Upload PDF Document</h3>
                  <div style={styles.inputGroup}>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
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
                      {uploadingDoc ? 'Processing PDF...' : 'Upload File'}
                    </button>
                  </div>
                  {docSuccessMsg && (
                    <p style={styles.successText}>{docSuccessMsg}</p>
                  )}
                </div>

                <div style={styles.innerPanel}>
                  <h3 style={styles.panelTitle}>2. Target Context Scope</h3>
                  <select
                    value={targetDocId}
                    onChange={(e) => setTargetDocId(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="">
                      All Uploaded Documents (Global Search)
                    </option>
                    {docList.map((doc) => (
                      <option key={doc.documentId} value={doc.documentId}>
                        {doc.originalName} ({doc.totalChunks} chunks)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.innerPanel}>
                  <h3 style={styles.panelTitle}>3. Query Documents</h3>
                  <div style={styles.inputGroup}>
                    <input
                      style={styles.input}
                      value={ragQuery}
                      onChange={(e) => setRagQuery(e.target.value)}
                      placeholder="Type your question about the uploaded document..."
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
                      <span style={styles.responseLabel}>Document Answer</span>
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
              </div>
            )}

            {/* TAB 3: VOICE */}
            {tab === 'voice' && (
              <div style={styles.sectionStack}>
                <div style={styles.innerPanel}>
                  <h3 style={styles.panelTitle}>Target Document Context</h3>
                  <select
                    value={targetDocId}
                    onChange={(e) => setTargetDocId(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="">All Uploaded Documents</option>
                    {docList.map((doc) => (
                      <option key={doc.documentId} value={doc.documentId}>
                        {doc.originalName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.innerPanel}>
                  <h3 style={styles.panelTitle}>Voice Query</h3>
                  <div style={styles.inputGroup}>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) =>
                        setAudioFile(e.target.files?.[0] || null)
                      }
                      disabled={processingVoice}
                      style={styles.fileInput}
                    />
                    <button
                      onClick={handleVoiceRag}
                      disabled={!audioFile || processingVoice}
                      style={
                        !audioFile || processingVoice
                          ? styles.disabledButton
                          : styles.primaryButton
                      }
                    >
                      {processingVoice
                        ? 'Processing Audio...'
                        : 'Submit Voice Query'}
                    </button>
                  </div>

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
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    backgroundColor: '#333639',
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  container: {
    maxWidth: '850px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    color: '#FFFFFF',
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#C8C6BC',
    fontSize: '14px',
    margin: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  },
  cardTitle: {
    color: '#333639',
    fontSize: '18px',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '20px',
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #C8C6BC',
    paddingBottom: '12px',
    marginBottom: '24px',
  },
  activeTab: {
    backgroundColor: '#5A8D9B',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    color: '#4E6978',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
  },
  chatLogContainer: {
    height: '340px',
    overflowY: 'auto',
    border: '1px solid #C8C6BC',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#FAF9F6',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  emptyState: {
    color: '#4E6978',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '140px',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#5A8D9B',
    color: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: '12px 12px 2px 12px',
    maxWidth: '75%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    color: '#333639',
    border: '1px solid #C8C6BC',
    padding: '10px 14px',
    borderRadius: '12px 12px 12px 2px',
    maxWidth: '75%',
  },
  bubbleSender: {
    fontSize: '11px',
    fontWeight: '700',
    display: 'block',
    marginBottom: '4px',
    opacity: 0.85,
  },
  markdownContent: {
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  inputGroup: {
    display: 'flex',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #C8C6BC',
    fontSize: '14px',
    color: '#333639',
    outline: 'none',
  },
  fileInput: {
    flex: 1,
    padding: '8px',
    fontSize: '14px',
    color: '#333639',
  },
  selectInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #C8C6BC',
    fontSize: '14px',
    color: '#333639',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  primaryButton: {
    backgroundColor: '#5A8D9B',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#C8C6BC',
    border: '1px solid #C8C6BC',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  disabledButton: {
    backgroundColor: '#C8C6BC',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'not-allowed',
    whiteSpace: 'nowrap',
  },
  sectionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  innerPanel: {
    border: '1px solid #C8C6BC',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#FFFFFF',
  },
  panelTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#4E6978',
    marginTop: 0,
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  successText: {
    color: '#5A8D9B',
    fontSize: '13px',
    margin: '10px 0 0 0',
    fontWeight: '500',
  },
  responseBox: {
    marginTop: '16px',
    padding: '14px',
    backgroundColor: '#FAF9F6',
    borderLeft: '4px solid #5A8D9B',
    borderRadius: '0 6px 6px 0',
  },
  responseLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#5A8D9B',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '6px',
  },
  metaText: {
    fontSize: '13px',
    color: '#4E6978',
    marginBottom: '8px',
  },
  audioPlayer: {
    width: '100%',
    marginTop: '12px',
  },
};

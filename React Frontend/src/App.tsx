import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import {
  Send,
  Plus,
  Trash2,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Wifi,
  MessageSquare,
  File as FileIcon,
  Settings as SettingsIcon,
  Paperclip,
  Eye,
  RefreshCw,
  Menu,
  Cpu,
  MoreVertical
} from 'lucide-react';
import { ShikiHighlighter } from 'react-shiki/web';

// ---------- Types ----------
export type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type Thread = {
  id: number;
  title: string;
  created_at: number;
};

export type FileData = {
  id: number;
  filename: string;
  created_at: number;
};

type AppConfig = {
  apiUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  useRag: boolean;
};

type HealthStatus = {
  status: 'checking' | 'ok' | 'error';
  timestamp: number | null;
  modelLoaded: boolean;
};

// ---------- Helpers: Markdown components ----------
function CodeBlock({ inline, className, children }: any) {
  // Detect language safely (fallback to 'text')
  const langMatch = /language-(\w+)/.exec(className || '');
  const lang = (langMatch && langMatch[1]) || 'text';

  // Ensure we never mutate or slice the original content
  const raw = typeof children === 'string' ? children : String(children ?? '');

  // Inline code: small, dark-only chip style
  if (inline || lang === 'text') {
    return (
      <code className="bg-[#0d1117] text-[#c9d1d9] border border-[#161b22] rounded px-1.5 py-0.5 text-[0.85em] font-mono break-words">
        {children}
      </code>
    );
  }

  // Copy handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
    } catch (_) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="not-prose my-3 rounded-xl overflow-hidden border border-[#30363d] shadow-lg bg-[#0d1117]">
      {/* Header: dark-only */}
      <div className="bg-[#0d1117] px-4 py-2 text-xs text-[#8b949e] flex justify-between items-center border-b border-[#21262d]">
        <span className="uppercase font-semibold tracking-wider">{lang}</span>
        <div className="flex items-center gap-2">
          {/* traffic lights (dim) */}
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
          {/* Copy button */}
          <button
            onClick={handleCopy}
            type="button"
            className="ml-2 px-2 py-0.5 rounded-md border border-[#30363d] text-[#c9d1d9] hover:bg-[#161b22] transition-colors"
            aria-label="Copy code"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Scrollable code area — prevents visual truncation */}
      <div
        className="
          max-h-[65vh] overflow-y-auto overflow-x-auto
          bg-[#0d1117]
        "
      >
        {/* Shiki with dark-only theme; ensure full text and formatting */}
        <ShikiHighlighter
          language={lang}
          theme={{ light: 'github-dark', dark: 'github-dark' }} // force dark palette
          // Optional: you can pass `className` to control whitespace handling on the rendered <code>
        >
          {/* Preserve exact content; do NOT trim or slice */}
          {raw}
        </ShikiHighlighter>
      </div>
    </div>
  );
}

function MermaidBlock({ children }: any) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    const code = String(children ?? '').trim();
    const id = 'mmd-' + Math.random().toString(36).slice(2);

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (ref.current) ref.current.textContent = 'Mermaid render failed.';
      });
  }, [children]);

  // Dark-only container, scrollable to avoid visual clipping
  return (
    <div
      ref={ref}
      className="overflow-auto my-4 p-4 bg-[#0d1117] rounded-xl border border-[#21262d] flex justify-center"
    />
  );
}

// ---------- App ----------
const App: React.FC = () => {
  // Config
  const [config, setConfig] = useState<AppConfig>({
    apiUrl: 'http://localhost:8000', // Replace with you ngrok LocalForge API endpoint
    apiKey: 'key123', // Replace with your authentication key
    temperature: 0.1, // Adjust AI creativity (0.0 - 1.0)
    maxTokens: 2048, // Control response length (64 - 2048)
    useRag: false, // Enable/disable retrieval-augmented generation
  });

  // Data
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesByThread, setMessagesByThread] = useState<Record<number, Message[]>>({});
  const currentThreadIdRef = useRef<number | null>(null);

  const [files, setFiles] = useState<FileData[]>([]);

  // UI
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [status, setStatus] = useState<HealthStatus>({ status: 'checking', timestamp: null, modelLoaded: false });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'threads' | 'files'>('threads');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; content: string } | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hardcoded logo path
  const logoPath = './assets/logo.png'; 

  // ---------- Initialization & Storage ----------
  useEffect(() => {
    const savedConfig = localStorage.getItem('localForgeConfig');
    if (savedConfig) {
      try { setConfig(JSON.parse(savedConfig)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('localForgeConfig', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (!demoMode) {
      initializeData();
      const interval = setInterval(checkHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [config.apiUrl, config.apiKey, demoMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------- API Handling ----------
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (demoMode) return mockApiHandler(endpoint, options);

    const controller = new AbortController();
    const timeoutMs = endpoint.includes('/filechat') ? 60000 : (endpoint.includes('/chat') ? 30000 : 10000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.apiUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'X-API-Key': config.apiKey,
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      const ct = response.headers.get('content-type') || '';

      if (!response.ok) {
        const errBody = ct.includes('application/json')
          ? await response.json().catch(() => ({}))
          : await response.text().catch(() => '');
        const msg = typeof errBody === 'object' && (errBody as any)?.detail
          ? (errBody as any).detail
          : (typeof errBody === 'string' ? errBody.slice(0, 400) : `HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}: ${msg}`);
      }

      if (ct.includes('application/json')) return await response.json();
      if (ct.startsWith('text/') || ct.includes('application/xml') || ct.includes('text/html')) {
        return await response.text();
      }
      const blob = await response.blob();
      return { blob, contentType: ct };
    } catch (error) {
      console.warn(`API Error (${endpoint}):`, error);
      if (endpoint === '/api/health' && !demoMode) {
        setStatus(prev => ({ ...prev, status: 'error' }));
      }
      throw error;
    }
  }, [config.apiUrl, config.apiKey, demoMode]);

  // ---------- Demo Mode Mocks ----------
  const mockApiHandler = (endpoint: string, options: RequestInit) => {
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        if (endpoint === '/api/health') resolve({ status: 'ok', hf_model_loaded: true, timestamp: Date.now() });
        else if (endpoint === '/api/threads' && options.method === 'POST') resolve({ id: Date.now(), title: 'New Conversation', created_at: Date.now() });
        else if (endpoint === '/api/threads') resolve([{ id: 1, title: 'Demo Conversation', created_at: Date.now() }]);
        else if (endpoint.includes('/api/threads/')) resolve({ messages: [{ id: 1, role: 'assistant', content: 'Welcome to Demo Mode! Backend is bypassed.', timestamp: Date.now() }] });
        else if (endpoint === '/api/files') resolve([{ id: 101, filename: 'demo_doc.pdf', created_at: Date.now() }]);
        else if (endpoint === '/api/chat' || endpoint === '/api/filechat') resolve({ answer: `(Demo) You said: "${JSON.parse(String((options as any).body || '{}')).prompt || ''}"`, thread_id: 1 });
        else resolve({});
      }, 400);
    });
  };

  // ---------- Core Actions ----------
  const checkHealth = async () => {
    try {
      const data = await apiCall('/api/health');
      setStatus({
        status: (data && data.status) || 'ok',
        timestamp: data?.timestamp ?? null,
        modelLoaded: data?.hf_model_loaded !== undefined ? Boolean(data.hf_model_loaded) : true,
      });
    } catch {
      setStatus({ status: 'error', timestamp: null, modelLoaded: false });
    }
  };

  const initializeData = async () => {
    try {
      await checkHealth();

      const threadData = await apiCall('/api/threads');
      if (Array.isArray(threadData)) setThreads(threadData);

      const fileData = await apiCall('/api/files');
      if (Array.isArray(fileData)) setFiles(fileData);

      if (Array.isArray(threadData) && threadData.length > 0) {
        handleThreadSelect(threadData[0]);
      }
    } catch (e) {
      console.error('Init failed:', e);
    }
  };

  const createNewThread = async () => {
    try {
      const formData = new FormData();
      formData.append('title', 'New Conversation');
      const created = await apiCall('/api/threads', { method: 'POST', body: formData });
      setThreads([created, ...threads]);
      handleThreadSelect(created);
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (e) {
      console.error('Create thread failed', e);
    }
  };

  const handleThreadSelect = async (thread: Thread) => {
    setCurrentThread(thread);
    currentThreadIdRef.current = thread.id;

    if (messagesByThread[thread.id]) {
      setMessages(messagesByThread[thread.id]);
    } else {
       setMessages([]);
    }

    try {
      const data = await apiCall(`/api/threads/${thread.id}`);
      if (data && Array.isArray(data.messages)) {
        const msgs: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at || Date.now(),
        }));

        setMessagesByThread(prev => ({ ...prev, [thread.id]: msgs }));
        if (currentThreadIdRef.current === thread.id) {
          setMessages(msgs);
        }
      }
    } catch (e) {
      console.error('Load thread failed', e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${config.apiUrl}/api/upload`, {
        method: 'POST',
        headers: { 'X-API-Key': config.apiKey },
        body: formData,
      });
      const result = await (async () => {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) return response.json();
        const txt = await response.text();
        try { return JSON.parse(txt); } catch { return {}; }
      })();
      if (result && result.id) {
        setFiles(prev => [{ id: result.id, filename: result.filename || file.name, created_at: Date.now() }, ...prev]);
        setActiveSidebarTab('files');
      }
    } catch (error) {
      console.error('Upload error', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (fileId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;
    try {
      await apiCall(`/api/files/${fileId}/delete`, { method: 'POST' });
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const previewFileContent = async (fileId: number, filename: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      const content = await apiCall(`/api/files/${fileId}/content`);
      if (typeof content === 'string') {
        setPreviewFile({ name: filename, content });
      } else if (content?.blob) {
        const url = URL.createObjectURL(content.blob);
        window.open(url, '_blank');
        setPreviewFile({ name: filename, content: `Opened ${filename} in a new tab.` });
      } else {
        setPreviewFile({ name: filename, content: JSON.stringify(content, null, 2) });
      }
    } catch (e: any) {
      alert(`Could not fetch file content: ${e?.message || e}`);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;

    const threadId = currentThread?.id;
    const userMsg: Message = { id: Date.now(), role: 'user', content: input.trim(), timestamp: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    if (threadId) {
      setMessagesByThread(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), userMsg],
      }));
    }

    setInput('');
    setIsLoading(true);

    try {
      const endpoint = selectedFiles.length > 0 ? '/api/filechat' : '/api/chat';
      const payload: any = {
        prompt: userMsg.content,
        thread_id: threadId,
        file_ids: selectedFiles,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        use_rag: selectedFiles.length > 0 ? true : config.useRag,
      };

      const data = await apiCall(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const newThreadId = data?.thread_id || threadId;
      const aiMsg: Message = { id: Date.now() + 1, role: 'assistant', content: data?.answer || 'No answer', timestamp: Date.now() };

      setMessages(prev => [...prev, aiMsg]);

      if (newThreadId) {
        setMessagesByThread(prev => ({
          ...prev,
          [newThreadId]: [...(prev[newThreadId] ?? (newThreadId === threadId ? nextMessages : [])), aiMsg],
        }));
      }

      if (!currentThread && data?.thread_id) {
        const newThread: Thread = { id: data.thread_id, title: userMsg.content.substring(0, 20) + '...', created_at: Date.now() };
        setThreads(prev => [newThread, ...prev]);
        setCurrentThread(newThread);
        currentThreadIdRef.current = newThread.id;
      }

      if (selectedFiles.length > 0) {
        setSelectedFiles([]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: '**Error:** Failed to get response. Check your connection and settings.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- UI Components for New Layout ----------

  // Status Pill
  const StatusPill = () => (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 border border-white/5 backdrop-blur-sm">
        {demoMode ? (
            <><Wifi className="w-3 h-3 text-purple-400" /><span className="text-[10px] font-medium text-purple-200 uppercase tracking-wide">Demo</span></>
        ) : status.status === 'checking' ? (
            <><RefreshCw className="w-3 h-3 animate-spin text-blue-400" /><span className="text-[10px] font-medium text-blue-200 uppercase tracking-wide">Connecting</span></>
        ) : status.modelLoaded ? (
            <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-[10px] font-medium text-emerald-200 uppercase tracking-wide">Online</span></>
        ) : (
            <><AlertCircle className="w-3 h-3 text-amber-400" /><span className="text-[10px] font-medium text-amber-200 uppercase tracking-wide">Loading</span></>
        )}
    </div>
  );

  return (
    <div className="inset w-full h-full bg-[#0a0a0c] text-gray-200 font-sans overflow-hidden selection:bg-blue-500/30">
        {/* Background Ambience */}
        <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-950/20 via-gray-950/80 to-black z-0" />
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="fixed w-full z-10 flex h-full p-2 md:p-4 gap-4">
            {/* Sidebar - Floating Panel */}
            <aside 
                className={`
                    fixed md:relative md:left-0
                    flex flex-col w-80 shrink-0 
                    bg-gray-900/70 backdrop-blur-xl 
                    rounded-3xl border border-white/10 shadow-2xl 
                    transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[110%] md:-translate-x-[100%] md:w-0 md:opacity-0 md:overflow-hidden'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 pb-2">
                    <div className="flex items-center gap-3">
                        <img src={logoPath} alt="App Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-900/30" />
                        <div>
                            <h1 className="font-bold text-lg tracking-tight text-white leading-none">LocalForge</h1>
                            <span className="text-[10px] font-medium text-blue-300/80 uppercase tracking-wider">Intelligence</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSidebarOpen(false)} 
                        className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-4 pt-4">
                    <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveSidebarTab('threads')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all duration-300 ${
                                activeSidebarTab === 'threads' ? 'bg-gray-700/50 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chats
                        </button>
                        <button
                            onClick={() => setActiveSidebarTab('files')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all duration-300 ${
                                activeSidebarTab === 'files' ? 'bg-gray-700/50 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            <FileIcon className="w-3.5 h-3.5" />
                            Library
                        </button>
                    </div>
                </div>

                {/* Lists */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {activeSidebarTab === 'threads' && (
                    <>
                        <button
                        onClick={createNewThread}
                        className="w-full group flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            <span className="font-medium text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" /> New Chat
                            </span>
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                <MessageSquare className="w-3 h-3" />
                            </div>
                        </button>
                        
                        <div className="space-y-1 mt-4">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Recents</h3>
                            {threads.map(thread => (
                                <button
                                key={thread.id}
                                onClick={() => handleThreadSelect(thread)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 border ${
                                    currentThread?.id === thread.id 
                                    ? 'bg-white/10 border-white/10 text-white shadow-sm' 
                                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                                >
                                <div className="truncate font-medium">{thread.title || `Chat ${thread.id}`}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                    {new Date(thread.created_at).toLocaleDateString()}
                                </div>
                                </button>
                            ))}
                        </div>
                    </>
                    )}

                    {activeSidebarTab === 'files' && (
                    <div className="space-y-3">
                        <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group overflow-hidden border border-dashed border-gray-700 hover:border-blue-500/50 bg-white/5 hover:bg-white/10 rounded-2xl p-6 cursor-pointer transition-all text-center"
                        >
                            <div className="relative z-10 flex flex-col items-center gap-2 text-gray-400 group-hover:text-blue-300 transition-colors">
                                {isUploading ? (
                                <RefreshCw className="w-6 h-6 animate-spin" />
                                ) : (
                                <Upload className="w-6 h-6" />
                                )}
                                <span className="text-xs font-medium">Click to Upload</span>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                        </div>

                        {files.map(file => (
                        <div
                            key={file.id}
                            onClick={() => setSelectedFiles(prev =>
                            prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
                            )}
                            className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                            selectedFiles.includes(file.id)
                                ? 'bg-blue-500/20 border-blue-500/30'
                                : 'bg-black/20 border-white/5 hover:border-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedFiles.includes(file.id) ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                {selectedFiles.includes(file.id) ? <CheckCircle className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-medium truncate ${selectedFiles.includes(file.id) ? 'text-blue-100' : 'text-gray-300'}`}>
                                    {file.filename}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <button
                                        onClick={(e) => previewFileContent(file.id, file.filename, e)}
                                        className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded text-gray-400 transition-colors"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={(e) => deleteFile(file.id, e)}
                                        className="text-[10px] hover:bg-red-900/30 hover:text-red-400 px-2 py-0.5 rounded text-gray-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center justify-between">
                         <StatusPill />
                         <button onClick={() => setSettingsOpen(true)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <SettingsIcon className="w-4 h-4" />
                         </button>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area - Floating Window */}
            <main className="flex-1 flex flex-col bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden ">
                
                {/* Top Bar */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md z-20">
                    <div className="flex items-center gap-4">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                {currentThread?.title || 'New Conversation'}
                            </h2>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                Using {config.useRag ? 'RAG Enabled' : 'Standard Model'} • {status.modelLoaded ? 'Ready' : 'Initializing'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-full border border-white/5">
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Temp: {config.temperature}</span>
                         </div>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar scroll-smooth">
                    {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                        <img src={logoPath} alt="App Logo" className="w-24 h-24 rounded-[2rem] mb-6 shadow-2xl border border-white/5 object-cover" />
                        <h3 className="text-2xl font-bold text-white mb-2">LocalForge AI</h3>
                        <p className="text-gray-400 max-w-md leading-relaxed">
                            Your private, secure workspace for AI interactions. Upload documents to chat with context or start a fresh conversation.
                        </p>
                    </div>
                    ) : (
                    messages.map(msg => (
                        <div
                        key={msg.id}
                        className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                        <div 
                            className={`
                            relative max-w-[85%] md:max-w-[75%] px-6 py-5 rounded-3xl text-sm leading-relaxed shadow-md
                            ${msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-sm ml-12' 
                                : 'bg-[#1a1a1e] border border-white/5 text-gray-200 rounded-bl-sm mr-12'
                            }
                            `}
                        >
                            {msg.role === 'assistant' ? (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0">
                                <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    code({ inline, className, children }) {
                                    const lang = /language-(\w+)/.exec(className || '')?.[1];
                                    if (!inline && lang === 'mermaid') return <MermaidBlock>{children}</MermaidBlock>;
                                    return <CodeBlock inline={inline} className={className}>{children}</CodeBlock>;
                                    }
                                }}
                                >
                                {msg.content}
                                </ReactMarkdown>
                            </div>
                            ) : (
                            msg.content
                            )}
                        </div>
                        </div>
                    ))
                    )}
                    {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="px-6 py-4 rounded-3xl rounded-bl-sm bg-[#1a1a1e] border border-white/5 text-gray-400 text-sm shadow-md flex items-center gap-3">
                             <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-0" />
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
                             </div>
                             <span className="text-xs font-medium uppercase tracking-wider opacity-70">Processing</span>
                        </div>
                    </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Floating Capsule */}
                <div className="p-4 md:p-6 bg-gradient-to-t from-gray-900/90 to-transparent">
                    <div className="max-w-4xl mx-auto">
                        {selectedFiles.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap mb-3 animate-slide-up">
                                {files.filter(f => selectedFiles.includes(f.id)).map(f => (
                                    <span key={f.id} className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                                        <FileIcon className="w-3 h-3" />
                                        {f.filename}
                                        <button onClick={() => setSelectedFiles(prev => prev.filter(id => id !== f.id))} className="hover:text-white ml-1 rounded-full hover:bg-blue-500/20 p-0.5">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative flex items-end gap-2 p-1.5 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50">
                            <button
                                onClick={() => { setSidebarOpen(true); setActiveSidebarTab('files'); }}
                                className={`p-3.5 rounded-full transition-all duration-200 hover:bg-white/10 ${selectedFiles.length > 0 ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400'}`}
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>

                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                placeholder="Type a message..."
                                className="w-full bg-transparent text-gray-100 text-base py-3.5 focus:outline-none resize-none max-h-32 custom-scrollbar placeholder-gray-600"
                                rows={1}
                                style={{ minHeight: '52px' }}
                            />

                            <button
                                onClick={sendMessage}
                                disabled={(input.trim().length === 0 && selectedFiles.length === 0) || isLoading}
                                className={`
                                    p-3.5 rounded-full transition-all duration-300 transform
                                    ${(input.trim().length > 0 || selectedFiles.length > 0) && !isLoading 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:scale-105 hover:bg-blue-500' 
                                        : 'bg-white/5 text-gray-600 cursor-not-allowed'}
                                `}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

      {/* Settings Modal - Glass Design */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-[#121214] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h4 className="font-bold text-lg text-white">Settings</h4>
              <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Backend Config */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Connection</h5>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1.5 font-semibold">Backend URL</label>
                        <input
                        value={config.apiUrl}
                        onChange={e => setConfig(c => ({ ...c, apiUrl: e.target.value }))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1.5 font-semibold">API Key</label>
                        <input
                        type="password"
                        value={config.apiKey}
                        onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>
              </div>

              {/* Model Parameters */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Parameters</h5>
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                            <span>Creativity (Temperature)</span>
                            <span className="text-blue-400">{config.temperature}</span>
                        </div>
                        <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={config.temperature}
                        onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                            <span>Max Tokens</span>
                            <span className="text-blue-400">{config.maxTokens}</span>
                        </div>
                        <input
                        type="range"
                        min={64}
                        max={4096}
                        step={64}
                        value={config.maxTokens}
                        onChange={e => setConfig(c => ({ ...c, maxTokens: parseInt(e.target.value, 10) }))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-200">RAG Retrieval</span>
                        <span className="text-[10px] text-gray-500">Context awareness</span>
                    </div>
                    <button
                    onClick={() => setConfig(c => ({ ...c, useRag: !c.useRag }))}
                    className={`w-10 h-6 rounded-full relative transition-colors ${config.useRag ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${config.useRag ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-200">Demo Mode</span>
                        <span className="text-[10px] text-gray-500">Mock data enabled</span>
                    </div>
                    <button
                    onClick={() => setDemoMode(!demoMode)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${demoMode ? 'bg-purple-600' : 'bg-gray-700'}`}
                    >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${demoMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
          <div className="w-full max-w-4xl h-[80vh] bg-[#121214] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#18181b]">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-lg text-white truncate max-w-md">{previewFile.name}</h4>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-8 overflow-auto custom-scrollbar bg-[#0a0a0c]">
                <div className="max-w-3xl mx-auto text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {previewFile.content}
                </div>
            </div>
            <div className="px-6 py-4 border-t border-white/5 bg-[#18181b] flex justify-end">
              <button
                onClick={() => setPreviewFile(null)}
                className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
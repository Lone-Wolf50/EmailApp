import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Send, Copy, Check, Trash2, Sparkles, MessageSquare, AlertCircle, Loader2, Mail, ChevronDown
} from 'lucide-react';
import { transformToProfessionalEmail } from './lib/gemini';

const EMAIL_TYPES = [
  "Request", "Complaint", "Follow-up", "Apology", "Update", "Proposal"
];

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

export default function App() {
  const [roughNote, setRoughNote] = useState('');
  const [emailType, setEmailType] = useState('Update');
  const [recipient, setRecipient] = useState('');

  // Transformed data
  const [emailResults, setEmailResults] = useState<any>(null);

  // Editable Fields
  const [activeSubject, setActiveSubject] = useState('');
  const [activeBody, setActiveBody] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const committedTranscriptRef = useRef<string>('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current!.continuous = true;
      recognitionRef.current!.interimResults = true;
      recognitionRef.current!.lang = 'en-US';

      recognitionRef.current!.onresult = (event: SpeechRecognitionEvent) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {  // ← start from resultIndex
          const result = event.results[i];
          if (result.isFinal) {
            sessionFinal += result[0].transcript;
          } else {
            sessionInterim += result[0].transcript;
          }
        }

        if (sessionFinal) {
          committedTranscriptRef.current += (committedTranscriptRef.current ? ' ' : '') + sessionFinal.trim();
        }

        const display = committedTranscriptRef.current + (sessionInterim ? (committedTranscriptRef.current ? ' ' : '') + sessionInterim.trim() : '');
        setRoughNote(display);
      };

      recognitionRef.current!.onend = () => {
        setIsListening(false);
        committedTranscriptRef.current = '';
      };

      recognitionRef.current!.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please check your browser settings.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };
    }
  }, []);

  // Update active subject/body when results change
  useEffect(() => {
    if (!emailResults) {
      setActiveSubject('');
      setActiveBody('');
      return;
    }
    setActiveSubject(emailResults.subject || '');
    setActiveBody(emailResults.body || '');
  }, [emailResults]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      setSuccess(null);
      committedTranscriptRef.current = roughNote.trim();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Start error:', err);
        setIsListening(false);
      }
    }
  };

  const handleTransform = async () => {
    if (!roughNote.trim()) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setEmailResults(null);
    try {
      const result = await transformToProfessionalEmail(roughNote, emailType);
      if (result) {
        setEmailResults(result);
      }
    } catch (err) {
      setError('Failed to transform the message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMailto = () => {
    if (!recipient.trim()) {
      setError('Please enter a recipient email address.');
      return;
    }
    if (!activeSubject.trim() || !activeBody.trim()) {
      setError('Subject and body cannot be empty.');
      return;
    }

    const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(activeSubject)}&body=${encodeURIComponent(activeBody)}`;
    window.open(mailto, '_self');
  };

  const copyToClipboard = () => {
    const fullText = `Subject: ${activeSubject}\n\n${activeBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setRoughNote('');
    setEmailResults(null);
    setRecipient('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-teal-200/20 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[50%] bg-blue-200/20 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-12 pt-10 flex flex-col gap-10">
        <header className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold tracking-wider uppercase"
          >
            <Sparkles className="w-3 h-3" />
            AI Communication Suite
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900"
          >
            Wolf <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600">Pro</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 max-w-xl mx-auto text-lg leading-relaxed"
          >
            Transform rough voice notes and informal updates into polished,
            professional workplace emails.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <section className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-widest">
                  <MessageSquare className="w-4 h-4 text-teal-500" />
                  Your Raw Input
                </label>
                {(roughNote || isListening) && (
                  <button
                    onClick={clearAll}
                    className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Email Type Selector */}
              <div className="relative w-fit">
                <select
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block pl-4 pr-10 py-2.5 font-medium shadow-sm transition-all outline-none cursor-pointer"
                >
                  {EMAIL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="relative group">
              <textarea
                value={roughNote}
                onChange={(e) => setRoughNote(e.target.value)}
                placeholder="Type your rough note here or click the mic to speak..."
                className="w-full h-64 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all resize-none text-slate-700 leading-relaxed placeholder:text-slate-300"
              />

              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleListening}
                  className={`p-4 rounded-2xl flex items-center justify-center transition-all ${isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-200 ring-4 ring-red-500/20'
                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100'
                    }`}
                  title={isListening ? 'Stop listening' : 'Start speaking'}
                >
                  {isListening ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTransform}
                  disabled={!roughNote.trim() || isProcessing}
                  className={`px-6 py-4 rounded-2xl flex items-center gap-3 font-bold transition-all ${!roughNote.trim() || isProcessing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30'
                    }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Polishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Transform
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-full border border-red-100 text-sm font-medium"
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  Listening and transcribing...
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Output Section */}
          <section className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-widest">
                  <Check className="w-4 h-4 text-blue-500" />
                  Draft Output
                </label>
                {emailResults && (
                  <button
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                )}
              </div>

              {/* Recipient Input — always visible */}
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient email (e.g. boss@company.com)"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 text-sm placeholder:text-slate-300"
              />
            </div>

            <div className="relative bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-64 h-full">
              <div className="p-5 flex-1 flex flex-col gap-4 overflow-auto">
                {!emailResults && !isProcessing && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 text-center my-10">
                    <Sparkles className="w-12 h-12 opacity-20" />
                    <p className="max-w-[200px]">The polished magic will appear here.</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse my-10">
                    <Loader2 className="w-8 h-8 text-teal-200 animate-spin" />
                    <p className="text-slate-300 font-medium">Applying professional touch...</p>
                  </div>
                )}

                {emailResults && !isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-3 h-full"
                  >
                    <input
                      value={activeSubject}
                      onChange={(e) => setActiveSubject(e.target.value)}
                      className="w-full font-bold text-lg text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-teal-500 outline-none pb-1 transition-colors"
                      placeholder="Subject"
                    />
                    <textarea
                      value={activeBody}
                      onChange={(e) => setActiveBody(e.target.value)}
                      className="w-full flex-1 min-h-[250px] text-slate-600 bg-transparent resize-none outline-none leading-relaxed"
                      placeholder="Message body"
                    />
                  </motion.div>
                )}
              </div>

              {/* Send Button Footer */}
              {emailResults && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleMailto}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    Open Email Client
                  </motion.button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => { setError(null); setSuccess(null); }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-xl font-medium text-sm border cursor-pointer"
              style={{
                backgroundColor: error ? '#fef2f2' : '#ecfdf5',
                borderColor: error ? '#fecaca' : '#a7f3d0',
                color: error ? '#991b1b' : '#065f46'
              }}
            >
              {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Check className="w-5 h-5 shrink-0" />}
              <p>{error || success}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

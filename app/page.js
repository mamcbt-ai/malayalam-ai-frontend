'use client';
import { useState, useRef } from 'react';

const API_BASE = 'https://use-ai-malayalamai-production-ee70.up.railway.app';
const NGROK_HEADER = { 'ngrok-skip-browser-warning': 'true' };

const STYLES = [
  { key: 'standard',  label: 'Standard' },
  { key: 'formal',    label: 'Formal' },
  { key: 'casual',    label: 'Casual' },
  { key: 'news',      label: 'News' },
  { key: 'literary',  label: 'Literary' },
  { key: 'business',  label: 'Business' },
  { key: 'academic',  label: 'Academic' },
  { key: 'simple',    label: 'Simple' },
  { key: 'humorous',  label: 'Humorous' },
  { key: 'emotional', label: 'Emotional' },
  { key: 'bullet',    label: 'Bullet Points' },
];

const LANGUAGES = [
  { key: 'ml', label: 'Malayalam' },
  { key: 'ta', label: 'Tamil' },
  { key: 'te', label: 'Telugu' },
  { key: 'kn', label: 'Kannada' },
  { key: 'hi', label: 'Hindi' },
];

const NATIVE_LABELS = {
  ml: 'MALAYALAM UNICODE',
  ta: 'TAMIL UNICODE',
  te: 'TELUGU UNICODE',
  kn: 'KANNADA UNICODE',
  hi: 'HINDI UNICODE',
};

export default function Home() {
  const [screen, setScreen]               = useState('login');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [token, setToken]                 = useState(null);
  const [userEmail, setUserEmail]         = useState('');
  const [authError, setAuthError]         = useState('');
  const [authMode, setAuthMode]           = useState('login');

  const [recording, setRecording]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [streamStatus, setStreamStatus]   = useState('');

  const [englishLive, setEnglishLive]     = useState('');
  const [nativeLive, setNativeLive]       = useState('');
  const [refinedText, setRefinedText]     = useState('');
  const [nativeLabel, setNativeLabel]     = useState('NATIVE UNICODE');
  const [isDone, setIsDone]               = useState(false);

  const [selectedStyle, setSelectedStyle] = useState('standard');
  const [selectedLang, setSelectedLang]   = useState('ml');

  const [showPlans, setShowPlans]         = useState(false);
  const [plans, setPlans]                 = useState([]);
  const [forgotSent, setForgotSent]       = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [copiedBox, setCopiedBox]         = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const currentNativeLabel = NATIVE_LABELS[selectedLang] || 'NATIVE UNICODE';
  const hasContent = englishLive || nativeLive || refinedText || streamStatus || loading || error;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const resetResults = () => {
    setEnglishLive(''); setNativeLive(''); setRefinedText('');
    setStreamStatus(''); setIsDone(false); setError('');
    setNativeLabel(NATIVE_LABELS[selectedLang] || 'NATIVE UNICODE');
  };

  const copyText = async (text, box) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopiedBox(box);
    setTimeout(() => setCopiedBox(null), 2000);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setAuthError('');
    try {
      const form = new URLSearchParams();
      form.append('username', email);
      form.append('password', password);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...NGROK_HEADER },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      setToken(data.access_token);
      setUserEmail(data.email);
      setScreen('app');
    } catch (e) { setAuthError(e.message); }
  };

  const handleRegister = async () => {
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...NGROK_HEADER },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      setToken(data.token);
      setUserEmail(data.email);
      setScreen('app');
    } catch (e) { setAuthError(e.message); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setAuthError('Enter your email address first.'); return; }
    setForgotLoading(true); setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...NGROK_HEADER },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setForgotSent(true);
      else setAuthError('Could not send reset email. Please try again.');
    } catch { setAuthError('Could not reach server.'); }
    finally { setForgotLoading(false); }
  };

  const handleAuthKey = (e) => {
    if (e.key === 'Enter') authMode === 'login' ? handleLogin() : handleRegister();
  };

  // ── Recording ─────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    resetResults();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(250);
      setRecording(true);
    } catch { setError('Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setLoading(true);
      setStreamStatus('Uploading audio...');
    }
  };

  // ── Audio processing (JSON endpoint) ─────────────────────────────────────────
  const sendAudio = async (blob) => {
    try {
      setError('');
      setLoading(true);
      setIsDone(false);
      setStreamStatus('Processing your speech...');

      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('style', selectedStyle);
      formData.append('lang', selectedLang);

      const res = await fetch(`${API_BASE}/audio/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...NGROK_HEADER },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || data.message || 'Server error');
      }

      const eng    = data.english_text  || '';
      const native = data.native_text   || '';
      const label  = data.source_language_name
        ? `${data.source_language_name.toUpperCase()} UNICODE`
        : (NATIVE_LABELS[selectedLang] || 'NATIVE UNICODE');

      if (!eng && !native) {
        setError('No speech detected. Please speak clearly and try again.');
        setIsDone(false);
        return;
      }

      setEnglishLive(eng);
      setNativeLive(native);
      setRefinedText(data.refined_text || eng);
      setNativeLabel(label);
      setStreamStatus('');
      setIsDone(true);

    } catch (err) {
      setError(`Failed: ${err.message}`);
      setIsDone(false);
    } finally {
      setLoading(false);
      setStreamStatus('');
    }
  };

  // ── Payment ───────────────────────────────────────────────────────────────────
  const loadPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/payment/plans`, { headers: NGROK_HEADER });
      const data = await res.json();
      setPlans(data.plans); setShowPlans(true);
    } catch { console.error('Failed to load plans'); }
  };

  const handlePayment = async (planId) => {
    try {
      const res = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planId }),
      });
      const order = await res.json();
      new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency,
        name: 'Diya Voice AI', description: `${planId} Plan`, order_id: order.order_id,
        handler: async (response) => {
          const v = await fetch(`${API_BASE}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...response, plan: planId }),
          }).then(r => r.json());
          alert(v.message); setShowPlans(false);
        },
        theme: { color: '#16a34a' },
      }).open();
    } catch { alert('Payment failed. Please try again.'); }
  };

  // ── LOGIN / REGISTER SCREEN ───────────────────────────────────────────────────
  if (screen !== 'app') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-2 text-green-400">Diya Voice AI</h1>
        <p className="text-gray-400 mb-8 text-sm">Speak any Indian language — get instant English translation</p>
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm">
          {/* Login / Register toggle */}
          <div className="flex rounded-xl bg-gray-700 p-1 mb-6">
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setAuthMode(m); setAuthError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize
                  ${authMode === m ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>

          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={handleAuthKey}
            className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-3 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={handleAuthKey}
            className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-4 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500" />

          {authError && <p className="text-red-400 text-sm mb-4">{authError}</p>}
          {forgotSent && <p className="text-green-400 text-sm mb-4 text-center">Reset link sent — check your inbox.</p>}

          <button onClick={authMode === 'login' ? handleLogin : handleRegister}
            className="w-full bg-green-600 hover:bg-green-700 rounded-lg py-3 font-semibold mb-3 transition">
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>

          {authMode === 'login' && (
            <p className="text-center text-sm mb-2">
              <span onClick={handleForgotPassword}
                className={`text-gray-500 hover:text-gray-300 cursor-pointer underline text-xs ${forgotLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                {forgotLoading ? 'Sending...' : 'Forgot password?'}
              </span>
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 pb-16">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-green-400">Diya Voice AI</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">{userEmail}</span>
            <button onClick={loadPlans} className="text-xs text-yellow-400 border border-yellow-600 rounded px-2 py-1 hover:bg-yellow-400/10 transition">⭐ Upgrade</button>
            <button onClick={() => { setToken(null); setScreen('login'); resetResults(); }}
              className="text-xs text-gray-400 border border-gray-600 rounded px-2 py-1 hover:bg-gray-700 transition">Logout</button>
          </div>
        </div>

        {/* Record button */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className={`w-28 h-28 rounded-full text-4xl transition-all duration-200 shadow-lg
              ${recording ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : loading   ? 'bg-gray-600 cursor-not-allowed opacity-60'
              :             'bg-green-600 hover:bg-green-700'}`}>
            {loading ? '⏳' : recording ? '⏹' : '🎤'}
          </button>
          <p className="mt-3 text-sm text-gray-400">
            {recording ? 'Recording… tap to stop' : loading ? 'Processing…' : 'Tap to start recording'}
          </p>
        </div>

        {/* Language selector */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 text-center">INPUT LANGUAGE</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {LANGUAGES.map(l => (
              <button key={l.key}
                onClick={() => { setSelectedLang(l.key); setNativeLabel(NATIVE_LABELS[l.key]); }}
                disabled={recording || loading}
                className={`px-4 py-1 rounded-full text-sm border transition-all
                  ${selectedLang === l.key
                    ? 'bg-blue-500 text-white border-blue-500 font-semibold'
                    : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'}
                  ${(recording || loading) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style selector */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 text-center">TRANSLATION STYLE</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {STYLES.map(s => (
              <button key={s.key}
                onClick={() => setSelectedStyle(s.key)}
                disabled={recording || loading}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                  ${selectedStyle === s.key
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'}
                  ${(recording || loading) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status pill */}
        {streamStatus && !isDone && (
          <div className="flex items-center gap-2 mb-4 text-sm text-yellow-300">
            <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            {streamStatus}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-4 text-sm text-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Output boxes */}
        {hasContent && (
          <div className="space-y-4">

            {/* English Transcript */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 bg-gray-750 border-b border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">English Transcript</p>
                {englishLive && (
                  <button onClick={() => copyText(englishLive, 'en')}
                    className="text-xs text-gray-500 hover:text-white transition">
                    {copiedBox === 'en' ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <p className="px-4 py-3 text-white leading-relaxed min-h-[48px] text-sm">
                {englishLive || <span className="text-gray-500 italic">Waiting for speech...</span>}
              </p>
            </div>

            {/* English Translation (Refined) */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                <p className="text-xs text-green-400 uppercase tracking-wide font-semibold">
                  English Translation · <span className="capitalize">{selectedStyle}</span>
                </p>
                {(refinedText || (isDone && englishLive)) && (
                  <button onClick={() => copyText(refinedText || englishLive, 'tr')}
                    className="text-xs text-gray-500 hover:text-white transition">
                    {copiedBox === 'tr' ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <p className="px-4 py-3 text-white leading-relaxed min-h-[48px] text-sm">
                {refinedText || (isDone ? englishLive : '') ||
                  <span className="text-gray-500 italic">Available after transcription...</span>}
              </p>
            </div>

            {/* Native Unicode */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                <p className="text-xs text-blue-400 uppercase tracking-wide font-semibold">
                  {nativeLabel || currentNativeLabel}
                </p>
                {nativeLive && (
                  <button onClick={() => copyText(nativeLive, 'ml')}
                    className="text-xs text-gray-500 hover:text-white transition">
                    {copiedBox === 'ml' ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <p className="px-4 py-3 text-white text-xl leading-loose min-h-[64px] ml-text">
                {nativeLive || <span className="text-gray-500 italic text-sm">Available after English pass...</span>}
              </p>
            </div>

            {/* Actions */}
            {isDone && (
              <button onClick={resetResults}
                className="w-full text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg py-2.5 transition hover:bg-gray-800">
                🗑️ Clear results
              </button>
            )}
          </div>
        )}
      </div>

      {/* Plans modal */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Choose Your Plan</h2>
            <div className="space-y-3">
              {plans.map(plan => (
                <div key={plan.id} className="bg-gray-700 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-white font-semibold">{plan.name}</p>
                    <p className="text-green-400 text-lg font-bold">₹{plan.price}/month</p>
                    <p className="text-gray-400 text-xs mt-1">{plan.features?.join(' · ')}</p>
                  </div>
                  <button onClick={() => handlePayment(plan.id)}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition">
                    Buy
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPlans(false)}
              className="w-full mt-4 text-gray-400 hover:text-white text-sm transition">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

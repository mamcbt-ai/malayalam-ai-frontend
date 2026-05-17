'use client';
import { useState, useRef } from 'react';

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setLoading(true);
    }
  };

  const sendAudio = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const response = await fetch('http://127.0.0.1:8000/audio/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to process audio. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-2 text-green-400">Malayalam Voice AI</h1>
      <p className="text-gray-400 mb-10 text-sm">Speak Malayalam — get instant English translation</p>

      {/* Mic Button */}
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={loading}
        className={`w-28 h-28 rounded-full text-4xl font-bold transition-all duration-200 shadow-lg
          ${recording
            ? 'bg-red-600 hover:bg-red-700 animate-pulse'
            : loading
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
          }`}
      >
        {loading ? '⏳' : recording ? '⏹' : '🎤'}
      </button>

      <p className="mt-4 text-sm text-gray-400">
        {recording ? 'Recording... tap to stop' : loading ? 'Processing...' : 'Tap to start recording'}
      </p>

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-900 border border-red-600 rounded-lg p-4 max-w-md w-full text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 max-w-md w-full space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Transcript</p>
            <p className="text-white">{result.asr_output?.segments?.[0]?.text || 'No speech detected'}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-green-400 mb-1">English Translation</p>
            <p className="text-white">{result.translation_output?.translation || '-'}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-blue-400 mb-1">Malayalam (Unicode)</p>
            <p className="text-white">{result.reverse_translation?.malayalam || '-'}</p>
          </div>
        </div>
      )}
    </main>
  );
}
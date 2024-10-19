import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { WavRenderer } from '../utils/wav_renderer';
import './ConsolePage.scss';

interface ConversationItem {
  id: string;
  status: string;
  text?: string;
  audio?: Blob;
}

interface Delta {
  text?: string;
  audio?: Uint8Array;
}

export function ConsolePage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<'ai' | 'user' | null>(null);
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollRef = useRef<HTMLDivElement>(null); // To manage scrolling for transcriptions

  const wavRecorderRef = useRef<WavRecorder>(new WavRecorder({ sampleRate: 24000 }));
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(new WavStreamPlayer({ sampleRate: 24000 }));
  const clientRef = useRef<RealtimeClient | null>(null);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('tmp::voice_api_key') || '';
    if (!storedApiKey) {
      const enteredKey = prompt('Enter your OpenAI API Key:');
      if (enteredKey) {
        localStorage.setItem('tmp::voice_api_key', enteredKey);
        setApiKey(enteredKey);
      }
    } else {
      setApiKey(storedApiKey);
    }
  }, []);

  const connectConversation = useCallback(async () => {
    if (!apiKey) return;

    const client = new RealtimeClient({
      apiKey: apiKey,
      dangerouslyAllowAPIKeyInBrowser: true,
    });

    clientRef.current = client;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    try {
      await client.connect();
      setIsConnected(true);

      await wavRecorder.begin();
      await wavStreamPlayer.connect();

      client.sendUserMessageContent([{ type: 'input_text', text: 'Hello!' }]);

      client.on('conversation.updated', async ({ item, delta }: { item: ConversationItem, delta: Delta }) => {
        if (delta?.audio) {
          wavStreamPlayer.add16BitPCM(delta.audio, item.id);
          setIsSpeaking('ai');
          setTimeout(() => setIsSpeaking(null), 2000); // Reset state after AI finishes speaking
        }

        if (item.status === 'completed') {
          const textResponse = delta?.text || '(awaiting transcript)';
          setAiResponseText(textResponse);
          setTranscription((prev) => [...prev, `AI: ${textResponse}`]);

          const audioBlob = delta?.audio ? new Blob([delta.audio], { type: 'audio/wav' }) : null;
          if (audioBlob) {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
          }
        }
      });
    } catch (error) {
      alert('Error connecting to API. Please check your API key.');
    }
  }, [apiKey]);

  const disconnectConversation = useCallback(async () => {
    if (clientRef.current) {
      const client = clientRef.current;
      setIsConnected(false);
      client.disconnect();
      const wavRecorder = wavRecorderRef.current;
      await wavRecorder.end();
      const wavStreamPlayer = wavStreamPlayerRef.current;
      await wavStreamPlayer.interrupt();
    }
  }, []);

  const startRecording = async () => {
    if (!clientRef.current) return;
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    setIsSpeaking('user');
    setIsRecording(true);
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  const stopRecording = async () => {
    if (!clientRef.current) return;
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    setIsSpeaking(null);
    setIsRecording(false);
    await wavRecorder.pause();
    client.createResponse();
    setTranscription((prev) => [...prev, 'User: (capturing speech...)']);
  };

  // Auto-scroll transcription section
  useEffect(() => {
    if (eventsScrollRef.current) {
      eventsScrollRef.current.scrollTop = eventsScrollRef.current.scrollHeight;
    }
  }, [transcription]);

  useEffect(() => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const clientCanvas = clientCanvasRef.current;
    const serverCanvas = serverCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (clientCanvas) {
        clientCtx = clientCtx || clientCanvas.getContext('2d');
        clientCtx?.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
        const userFrequency = wavRecorder.recording ? wavRecorder.getFrequencies('voice').values : new Float32Array([0]);
        WavRenderer.drawSpeechVisual(clientCanvas, clientCtx!, userFrequency, 'user');
      }

      if (serverCanvas) {
        serverCtx = serverCtx || serverCanvas.getContext('2d');
        serverCtx?.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
        const aiFrequency = wavStreamPlayer.analyser ? wavStreamPlayer.getFrequencies('voice').values : new Float32Array([0]);
        WavRenderer.drawSpeechVisual(serverCanvas, serverCtx!, aiFrequency, 'ai');
      }

      requestAnimationFrame(render);
    };

    render();
  }, []);

  return (
    <div data-component="ConsolePage">
      <div className="content-main">
        <div className={`visualization-entry ${isSpeaking ? 'speaking' : ''}`}>
          <canvas ref={clientCanvasRef} />
        </div>
        <div className="content-actions">
          <button onMouseDown={startRecording} onMouseUp={stopRecording}>
            {isRecording ? 'release to send' : 'push to talk'}
          </button>
          <button onClick={isConnected ? disconnectConversation : connectConversation}>
            {isConnected ? 'disconnect' : 'connect'}
          </button>
          <button onClick={() => {
            localStorage.removeItem('tmp::voice_api_key');
            window.location.reload();
          }}>
            Reset API Key
          </button>
        </div>
      </div>

    

      <div className="transcription" ref={eventsScrollRef}>
        <h3>Transcription:</h3>
        {transcription.map((entry, index) => (
          <p key={index}>{entry}</p>
        ))}
      </div>
    </div>
  );
}

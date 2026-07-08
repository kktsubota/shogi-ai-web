import { useEffect, useRef, useState } from 'react';
import { loadModelFromCache, saveModelToCache, fetchModelWithProgress } from '../utils/db';
import { parseUsiInfoLine, parseBestmove } from '../utils/usi-parser';
import type { UsiInfo } from '../utils/usi-parser';

export type EngineStatus = 'uninitialized' | 'downloading' | 'initializing' | 'ready' | 'error';

const MODEL_URL = 'https://raw.githubusercontent.com/yssaya/AobaNNUE/master/eval/nn.bin';
const MODEL_CACHE_KEY = 'aobannue-v1.1-model';

async function checkSimdSupport(): Promise<boolean> {
  try {
    const simdBytes = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 9, 1, 7, 0, 65, 0, 253, 15, 26, 11
    ]);
    return await WebAssembly.validate(simdBytes);
  } catch {
    return false;
  }
}

export function useShogiEngine() {
  const [status, setStatus] = useState<EngineStatus>('uninitialized');
  const [progress, setProgress] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [usiInfo, setUsiInfo] = useState<UsiInfo | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../usi.worker.ts', import.meta.url), {
      type: 'module'
    });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, data } = e.data;
      switch (type) {
        case 'progress':
          setProgress(data);
          break;
        case 'ready':
          setStatus('ready');
          setProgress('Engine ready');
          worker.postMessage({ type: 'command', data: { command: 'usi' } });
          break;
        case 'usi':
          console.log('[USI Output]', data);
          const info = parseUsiInfoLine(data);
          if (info) {
            setUsiInfo(info);
          }
          const move = parseBestmove(data);
          if (move) {
            setBestMove(move);
            setIsAnalyzing(false);
          }
          break;
        case 'error':
          setStatus('error');
          setProgress(`Error: ${data}`);
          break;
        default:
          break;
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const initializeEngine = async () => {
    if (!workerRef.current) return;
    try {
      setStatus('downloading');
      setProgress('Checking model cache...');

      let modelBuffer = await loadModelFromCache(MODEL_CACHE_KEY);

      if (!modelBuffer) {
        setProgress('Downloading model (AobaNNUE)...');
        modelBuffer = await fetchModelWithProgress(MODEL_URL, (p) => {
          setProgress(`Downloading model: ${p}%`);
        });
        setProgress('Saving model to local cache...');
        await saveModelToCache(MODEL_CACHE_KEY, modelBuffer);
      }

      setProgress('Initializing engine worker...');
      const useSimd = await checkSimdSupport();
      console.log(`WASM SIMD Support: ${useSimd}`);

      setStatus('initializing');
      workerRef.current.postMessage({
        type: 'init',
        data: {
          modelBuffer,
          useSimd
        }
      });
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setProgress(`Initialization failed: ${err.message || err}`);
    }
  };

  const startAnalysis = (sfen: string) => {
    if (!workerRef.current || status !== 'ready') return;
    setBestMove(null);
    setUsiInfo(null);
    setIsAnalyzing(true);
    workerRef.current.postMessage({
      type: 'command',
      data: { command: `position sfen ${sfen}` }
    });
    workerRef.current.postMessage({
      type: 'command',
      data: { command: 'go nodes 100000' }
    });
  };

  const stopAnalysis = () => {
    if (!workerRef.current || !isAnalyzing) return;
    workerRef.current.postMessage({
      type: 'command',
      data: { command: 'stop' }
    });
    setIsAnalyzing(false);
  };

  return {
    status,
    progress,
    isAnalyzing,
    usiInfo,
    bestMove,
    initializeEngine,
    startAnalysis,
    stopAnalysis
  };
}

import { useState } from 'react';
import { useShogiEngine } from './hooks/useShogiEngine';

function App() {
  const [sfen, setSfen] = useState('lnsgkgsnl/1r5b1/p1ppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1');
  const {
    status,
    progress,
    isAnalyzing,
    usiInfo,
    bestMove,
    initializeEngine,
    startAnalysis,
    stopAnalysis,
  } = useShogiEngine();

  return (
    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '8px' }}>
      <h1>将棋AI分析デモ</h1>
      <p>Engine status: {status}</p>
      <p>Progress: {progress}</p>
      {status === 'uninitialized' && (
        <button className="glow-button" onClick={initializeEngine}>Initialize Engine</button>
      )}
      {status === 'ready' && (
        <div>
          <textarea
            rows={3}
            value={sfen}
            onChange={(e) => setSfen(e.target.value)}
            style={{ width: '100%' }}
          />
          <button className="glow-button" onClick={() => startAnalysis(sfen)} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analyzing…' : 'Start Analysis'}
          </button>
          {isAnalyzing && (
            <button className="glow-button" onClick={stopAnalysis}>Stop</button>
          )}
          {bestMove && <p>Best move: {bestMove}</p>}
          {usiInfo && (
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(usiInfo, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

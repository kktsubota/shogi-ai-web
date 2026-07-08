export interface UsiInfo {
  depth?: number;
  seldepth?: number;
  scoreCp?: number;
  scoreMate?: number;
  scoreType?: 'cp' | 'mate';
  time?: number;
  nodes?: number;
  nps?: number;
  pv?: string[];
  multipv?: number;
}

export function parseUsiInfoLine(line: string): UsiInfo | null {
  if (!line.startsWith('info ')) return null;

  const info: UsiInfo = {};
  const tokens = line.trim().split(/\s+/);

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token) {
      case 'depth':
        info.depth = parseInt(tokens[++i], 10);
        break;
      case 'seldepth':
        info.seldepth = parseInt(tokens[++i], 10);
        break;
      case 'score': {
        const type = tokens[++i]; // 'cp' or 'mate'
        const valStr = tokens[++i];
        info.scoreType = type as 'cp' | 'mate';
        
        const scoreVal = parseInt(valStr, 10);
        if (tokens[i + 1] === 'upperbound' || tokens[i + 1] === 'lowerbound') {
          i++;
        }
        
        if (type === 'cp') {
          info.scoreCp = scoreVal;
        } else if (type === 'mate') {
          info.scoreMate = scoreVal;
        }
        break;
      }
      case 'time':
        info.time = parseInt(tokens[++i], 10);
        break;
      case 'nodes':
        info.nodes = parseInt(tokens[++i], 10);
        break;
      case 'nps':
        info.nps = parseInt(tokens[++i], 10);
        break;
      case 'multipv':
        info.multipv = parseInt(tokens[++i], 10);
        break;
      case 'pv': {
        const pvMoves: string[] = [];
        const usiKeys = ['depth', 'seldepth', 'score', 'time', 'nodes', 'nps', 'multipv', 'hashfull', 'tbhits', 'cpuload', 'string'];
        i++;
        while (i < tokens.length && !usiKeys.includes(tokens[i])) {
          pvMoves.push(tokens[i]);
          i++;
        }
        i--;
        info.pv = pvMoves;
        break;
      }
    }
  }
  return info;
}

export function parseBestmove(line: string): string | null {
  if (line.startsWith('bestmove ')) {
    const tokens = line.trim().split(/\s+/);
    return tokens[1] || null;
  }
  return null;
}

import { describe, it, expect } from 'vitest';
import { parseUsiInfoLine, parseBestmove } from '../usi-parser';

describe('usi-parser', () => {
  describe('parseUsiInfoLine', () => {
    it('should parse standard cp score info line', () => {
      const line = 'info depth 10 seldepth 12 score cp 52 time 200 nodes 12345 nps 61725 pv 7g7f 8c8d';
      const result = parseUsiInfoLine(line);
      expect(result).toEqual({
        depth: 10,
        seldepth: 12,
        scoreType: 'cp',
        scoreCp: 52,
        time: 200,
        nodes: 12345,
        nps: 61725,
        pv: ['7g7f', '8c8d'],
      });
    });

    it('should parse mate score info line', () => {
      const line = 'info depth 5 score mate -3 nodes 500 pv 7g7f 8c8d';
      const result = parseUsiInfoLine(line);
      expect(result).toEqual({
        depth: 5,
        scoreType: 'mate',
        scoreMate: -3,
        nodes: 500,
        pv: ['7g7f', '8c8d'],
      });
    });

    it('should parse upperbound/lowerbound score info line', () => {
      const line = 'info depth 8 score cp 120 lowerbound nodes 1000';
      const result = parseUsiInfoLine(line);
      expect(result).toEqual({
        depth: 8,
        scoreType: 'cp',
        scoreCp: 120,
        nodes: 1000,
      });
    });

    it('should return null for non-info lines', () => {
      expect(parseUsiInfoLine('readyok')).toBeNull();
      expect(parseUsiInfoLine('bestmove 7g7f')).toBeNull();
    });
  });

  describe('parseBestmove', () => {
    it('should parse bestmove move', () => {
      expect(parseBestmove('bestmove 7g7f')).toBe('7g7f');
      expect(parseBestmove('bestmove resign')).toBe('resign');
    });

    it('should return null for non-bestmove lines', () => {
      expect(parseBestmove('info depth 1')).toBeNull();
      expect(parseBestmove('readyok')).toBeNull();
    });
  });
});

import { MatchReport, FactionType } from '../types';

/**
 * Encodes a match report into a compact string suitable for QR codes and peer-to-peer sharing.
 * Code format: SGC|[id]|[date]|[leagueId]|[playerA_name];[playerA_faction];[playerA_score];[playerA_casualties]|[playerB_name];[playerB_faction];[playerB_score];[playerB_casualties]|[winner]|[underdogPlayed]|[underdogAwarded]
 */
export function encodeMatchReport(report: MatchReport): string {
  const parts = [
    'SGC',
    report.id,
    report.date,
    report.leagueId || 'none',
    `${report.playerA.name.replace(/|/g, '')};${report.playerA.faction};${report.playerA.score};${report.playerA.casualties};${report.playerA.spearheadName || ''};${report.playerA.enhancementName || ''};${report.playerA.regimentAbilityName || ''}`,
    `${report.playerB.name.replace(/|/g, '')};${report.playerB.faction};${report.playerB.score};${report.playerB.casualties};${report.playerB.spearheadName || ''};${report.playerB.enhancementName || ''};${report.playerB.regimentAbilityName || ''}`,
    report.winner,
    report.underdogPlayed || 'none',
    report.underdogAwarded ? '1' : '0'
  ];
  return parts.join('|');
}

/**
 * Decodes a match compact string back to a MatchReport object.
 */
export function decodeMatchReport(code: string): MatchReport | null {
  if (!code.startsWith('SGC|')) {
    return null;
  }
  try {
    const parts = code.split('|');
    if (parts.length < 9) return null;

    const [_, id, date, leagueIdStr, playerAStr, playerBStr, winner, underdogPlayedStr, underdogAwardedStr] = parts;

    const pAParts = playerAStr.split(';');
    const pBParts = playerBStr.split(';');

    if (pAParts.length < 4 || pBParts.length < 4) return null;

    const playerA = {
      name: pAParts[0],
      faction: pAParts[1] as FactionType,
      score: parseInt(pAParts[2], 10),
      casualties: parseInt(pAParts[3], 10),
      spearheadName: pAParts[4] || undefined,
      enhancementName: pAParts[5] || undefined,
      regimentAbilityName: pAParts[6] || undefined
    };

    const playerB = {
      name: pBParts[0],
      faction: pBParts[1] as FactionType,
      score: parseInt(pBParts[2], 10),
      casualties: parseInt(pBParts[3], 10),
      spearheadName: pBParts[4] || undefined,
      enhancementName: pBParts[5] || undefined,
      regimentAbilityName: pBParts[6] || undefined
    };

    return {
      id,
      date,
      leagueId: leagueIdStr === 'none' ? null : leagueIdStr,
      playerA,
      playerB,
      winner: winner as 'A' | 'B' | 'Draw',
      underdogPlayed: underdogPlayedStr === 'none' ? null : (underdogPlayedStr as 'A' | 'B'),
      underdogAwarded: underdogAwardedStr === '1',
      verificationCode: code
    };
  } catch (e) {
    console.error('Failed to parse match report token:', e);
    return null;
  }
}

/**
 * Generates an 8-character compact invite/league code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

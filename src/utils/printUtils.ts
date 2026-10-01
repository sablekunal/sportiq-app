import { Match, Team } from '../types';

export const printKnockoutBrackets = (
  knockoutMatches: Match[], 
  teams: Team[], 
  printMode: 'ALL' | 'SEMIS' | 'FINAL' = 'ALL'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const targetMatches = knockoutMatches.filter(m => {
    const isSemi = m.roundName.toLowerCase().includes('semi');
    const isFinal = m.roundName.toLowerCase().includes('final');
    if (printMode === 'SEMIS') return isSemi;
    if (printMode === 'FINAL') return isFinal;
    return isSemi || isFinal;
  });

  let html = `
    <html>
      <head>
        <title>Print Brackets - Semifinals & Finals</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; }
          h2 { text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .grid { display: flex; gap: 40px; justify-content: center; margin-top: 40px; flex-wrap: wrap; }
          .round-col { display: flex; flex-direction: column; gap: 30px; }
          .round-title { text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; color: #f97316; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;}
          .match { border: 2px solid #e2e8f0; padding: 12px; border-radius: 12px; width: 260px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 10px; display: flex; justify-content: space-between; }
          .team { display: flex; justify-content: space-between; padding: 8px 10px; margin-bottom: 6px; background: #f8fafc; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid #f1f5f9; }
          .team:last-child { margin-bottom: 0; }
          .score { font-family: monospace; font-size: 14px; }
          @media print {
            body { padding: 0; background: #fff; }
            button { display: none; }
            .match { break-inside: avoid; box-shadow: none; border: 2px solid #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <h2>Tournament Championship Brackets</h2>
        <div style="text-align: center; margin-bottom: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            Print Now
          </button>
        </div>
        <div class="grid">
  `;

  if (targetMatches.length === 0) {
    // Render an empty template for printing
    const emptyRounds = [];
    if (printMode === 'ALL' || printMode === 'SEMIS') {
      emptyRounds.push({
        roundNum: 1,
        roundName: 'Semi-Finals',
        matches: [
          { position: 1, home: 'Winner Group A', away: 'Winner Group C' },
          { position: 2, home: 'Winner Group B', away: 'Winner Group D' }
        ]
      });
    }
    if (printMode === 'ALL' || printMode === 'FINAL') {
      emptyRounds.push({
        roundNum: 2,
        roundName: 'Final',
        matches: [
          { position: 1, home: 'Winner SF1', away: 'Winner SF2' }
        ]
      });
    }

    emptyRounds.forEach(r => {
      html += `<div class="round-col">`;
      html += `<div class="round-title">\${r.roundName}</div>`;
      r.matches.forEach((m, idx) => {
        html += `
          <div class="match">
            <div class="header">
              <span>Match #\${m.position}</span>
              <span>Scheduled</span>
            </div>
            <div class="team"><span>\${m.home}</span> <span class="score">-</span></div>
            <div class="team"><span>\${m.away}</span> <span class="score">-</span></div>
          </div>
        `;
      });
      html += `</div>`;
    });
  } else {
    const rounds = [...new Set(targetMatches.map(m => m.round))].sort((a,b) => a - b);
    
    rounds.forEach(roundNum => {
      const matches = targetMatches.filter(m => m.round === roundNum).sort((a,b) => a.position - b.position);
      const roundName = matches[0]?.roundName || `Round \${roundNum}`;
      
      html += `<div class="round-col">`;
      html += `<div class="round-title">\${roundName}</div>`;
      
      matches.forEach(m => {
        const home = teams.find(t => t.id === m.homeTeamId)?.name || m.homePlaceholder || 'TBD (Awaiting)';
        const away = teams.find(t => t.id === m.awayTeamId)?.name || m.awayPlaceholder || 'TBD (Awaiting)';
        const homeScore = m.homeScore ?? '-';
        const awayScore = m.awayScore ?? '-';
        
        html += `
          <div class="match">
            <div class="header">
              <span>Match #\${m.fixtureNumber || m.position}</span>
              <span>\${m.status === 'LIVE' ? 'LIVE' : m.status === 'COMPLETED' ? 'Done' : 'Scheduled'}</span>
            </div>
            <div class="team"><span>\${home}</span> <span class="score">\${homeScore}</span></div>
            <div class="team"><span>\${away}</span> <span class="score">\${awayScore}</span></div>
          </div>
        `;
      });
      html += `</div>`;
    });
  }

  html += `
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};

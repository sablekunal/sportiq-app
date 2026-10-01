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
    const isFinal = m.roundName.toLowerCase().includes('final') && !isSemi;
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
          .match { border: 2px solid #e2e8f0; padding: 12px; border-radius: 12px; width: 340px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 10px; display: flex; justify-content: space-between; }
          .sets-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .sets-table th { font-size: 10px; color: #64748b; text-align: center; font-weight: bold; padding-bottom: 4px; }
          .sets-table td { padding: 4px; text-align: center; }
          .sets-table .team-name { text-align: left; font-weight: 700; font-size: 12px; width: 40%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
          .sets-table .set-box { border: 1px solid #cbd5e1; height: 24px; min-width: 24px; display: inline-block; line-height: 24px; font-size: 12px; font-family: monospace; }
          .sets-table .total-score { font-weight: 900; font-size: 14px; }
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

  const renderMatchScores = (homeName: string, awayName: string, homeScore: any, awayScore: any, isFinal: boolean, setsData?: any[]) => {
    const numSets = isFinal ? 5 : 3;
    let html = '<table class="sets-table">';
    
    // Header
    html += '<tr><th>Team</th>';
    for(let i = 1; i <= numSets; i++) html += `<th>Set ${i}</th>`;
    html += '<th>Win</th></tr>';
    
    // Home Row
    html += `<tr><td class="team-name"><div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${homeName}</div></td>`;
    for(let i = 1; i <= numSets; i++) {
      const s = setsData && setsData[i-1] && (setsData[i-1].scoreA > 0 || setsData[i-1].scoreB > 0) ? setsData[i-1].scoreA : '&nbsp;';
      html += `<td><div class="set-box">${s}</div></td>`;
    }
    html += `<td class="total-score">${homeScore}</td></tr>`;
    
    // Away Row
    html += `<tr><td class="team-name"><div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${awayName}</div></td>`;
    for(let i = 1; i <= numSets; i++) {
      const s = setsData && setsData[i-1] && (setsData[i-1].scoreA > 0 || setsData[i-1].scoreB > 0) ? setsData[i-1].scoreB : '&nbsp;';
      html += `<td><div class="set-box">${s}</div></td>`;
    }
    html += `<td class="total-score">${awayScore}</td></tr>`;
    
    html += '</table>';
    return html;
  };

  if (targetMatches.length === 0) {
    // Render an empty template for printing
    const emptyRounds = [];
    if (printMode === 'ALL' || printMode === 'SEMIS') {
      emptyRounds.push({
        roundNum: 1,
        roundName: 'Semi-Finals',
        matches: [
          { position: 1, home: 'A._________________', away: 'C._________________' },
          { position: 2, home: 'B._________________', away: 'D._________________' }
        ]
      });
    }
    if (printMode === 'ALL' || printMode === 'FINAL') {
      emptyRounds.push({
        roundNum: 2,
        roundName: 'Final',
        matches: [
          { position: 1, home: 'SF1.________________', away: 'SF2.________________' }
        ]
      });
    }

    emptyRounds.forEach(r => {
      const isFinal = r.roundName.toLowerCase().includes('final') && !r.roundName.toLowerCase().includes('semi');
      html += `<div class="round-col">`;
      html += `<div class="round-title">${r.roundName}</div>`;
      r.matches.forEach((m, idx) => {
        html += `
          <div class="match">
            <div class="header">
              <span>Match #${m.position}</span>
              <span>Scheduled</span>
            </div>
            ${renderMatchScores(m.home, m.away, '-', '-', isFinal)}
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
      const isFinal = roundName.toLowerCase().includes('final') && !roundName.toLowerCase().includes('semi');
      
      html += `<div class="round-col">`;
      html += `<div class="round-title">${roundName}</div>`;
      
      matches.forEach(m => {
        let home = teams.find(t => t.id === m.homeTeamId)?.name || m.homePlaceholder || '_________________';
        let away = teams.find(t => t.id === m.awayTeamId)?.name || m.awayPlaceholder || '_________________';
        
        if (home.includes('Winner Group A')) home = 'A._________________';
        if (home.includes('Winner Group B')) home = 'B._________________';
        if (home.includes('Winner Group C')) home = 'C._________________';
        if (home.includes('Winner Group D')) home = 'D._________________';
        if (home.includes('Winner Semi-final 1') || home.includes('Winner SF1')) home = 'SF-1._______________';
        if (home.includes('Winner Semi-final 2') || home.includes('Winner SF2')) home = 'SF-2._______________';

        if (away.includes('Winner Group A')) away = 'A._________________';
        if (away.includes('Winner Group B')) away = 'B._________________';
        if (away.includes('Winner Group C')) away = 'C._________________';
        if (away.includes('Winner Group D')) away = 'D._________________';
        if (away.includes('Winner Semi-final 1') || away.includes('Winner SF1')) away = 'SF-1._______________';
        if (away.includes('Winner Semi-final 2') || away.includes('Winner SF2')) away = 'SF-2._______________';

        let homeScore: any = m.homeScore ?? '';
        let awayScore: any = m.awayScore ?? '';
        
        if (homeScore === 0 && awayScore === 0) {
          homeScore = '';
          awayScore = '';
        }
        
        html += `
          <div class="match">
            <div class="header">
              <span>Match #${m.fixtureNumber || m.position}</span>
              <span>${m.status === 'LIVE' ? 'LIVE' : m.status === 'COMPLETED' ? 'Done' : 'Scheduled'}</span>
            </div>
            ${renderMatchScores(home, away, homeScore, awayScore, isFinal, m.sets)}
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

export const printFixtures = (
  fixtures: Match[],
  teams: Team[]
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let html = `
    <html>
      <head>
        <title>Print Fixtures</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; }
          h2 { text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;}
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; font-size: 14px; text-transform: uppercase; }
          .match-code { font-weight: bold; font-family: monospace; }
          .team { font-weight: bold; }
          .score-box { width: 40px; height: 30px; display: inline-block; border: 1px solid #94a3b8; text-align: center; line-height: 30px; font-weight: bold;}
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>Tournament Fixtures</h2>
        <div style="text-align: center; margin-bottom: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            Print Now
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Stage</th>
              <th>Home Team</th>
              <th>Away Team</th>
              <th>Sets</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
  `;

  fixtures.forEach(m => {
    let homeName = teams.find(t => t.id === m.homeTeamId)?.name || m.homePlaceholder || '_________________';
    let awayName = teams.find(t => t.id === m.awayTeamId)?.name || m.awayPlaceholder || '_________________';

    if (homeName.includes('Winner Group A')) homeName = 'A._________________';
    if (homeName.includes('Winner Group B')) homeName = 'B._________________';
    if (homeName.includes('Winner Group C')) homeName = 'C._________________';
    if (homeName.includes('Winner Group D')) homeName = 'D._________________';
    if (homeName.includes('Winner Semi-final 1') || homeName.includes('Winner SF1')) homeName = 'SF-1._______________';
    if (homeName.includes('Winner Semi-final 2') || homeName.includes('Winner SF2')) homeName = 'SF-2._______________';

    if (awayName.includes('Winner Group A')) awayName = 'A._________________';
    if (awayName.includes('Winner Group B')) awayName = 'B._________________';
    if (awayName.includes('Winner Group C')) awayName = 'C._________________';
    if (awayName.includes('Winner Group D')) awayName = 'D._________________';
    if (awayName.includes('Winner Semi-final 1') || awayName.includes('Winner SF1')) awayName = 'SF-1._______________';
    if (awayName.includes('Winner Semi-final 2') || awayName.includes('Winner SF2')) awayName = 'SF-2._______________';

    const isPlayed = m.status === 'COMPLETED' || m.status === 'LIVE';
    let scoreDisplay = '';
    
    if (isPlayed && (m.homeScore > 0 || m.awayScore > 0)) {
       scoreDisplay = `<span class="score-box">${m.homeScore}</span> - <span class="score-box">${m.awayScore}</span>`;
    } else {
       scoreDisplay = `<span class="score-box"></span> - <span class="score-box"></span>`;
    }

    const winner = m.winnerId ? (teams.find(t => t.id === m.winnerId)?.name || '_________________') : '_________________';

    html += `
      <tr>
        <td class="match-code">#${m.fixtureNumber || m.position} <br> <span style="font-size:10px; color:#64748b;">${m.matchCode || ''}</span></td>
        <td>${m.roundName}</td>
        <td class="team">${homeName}</td>
        <td class="team">${awayName}</td>
        <td style="text-align: center;">${scoreDisplay}</td>
        <td>${winner}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/data.json', 'utf8'));

const teamsMap = {};

data.forEach((row, rowIndex) => {
  const rowType = row["                                          SXY THROWBALL TOURNAMENT TEAM & PLAYER REGISTRATION DETAILS 2026"];
  if (!rowType) return;

  const type = rowType.trim();

  // Iterate over columns: __EMPTY, __EMPTY_1, etc.
  for (const [key, value] of Object.entries(row)) {
    if (key === "                                          SXY THROWBALL TOURNAMENT TEAM & PLAYER REGISTRATION DETAILS 2026") continue;
    
    // key is like __EMPTY, __EMPTY_1... This corresponds to a team index.
    // Chunk 1: index 0 to 7. Chunk 2 (when we see another "Team Name "): index 8 to 15.
    
    // To handle chunks, let's just use an absolute index. We can keep track of the current chunk index.
  }
});

// A better way: Group rows by their rowType.
// Since there are two blocks, let's just collect all 'Team Name', 'Institution', etc.
const attributes = ['Team Name ', 'Institution / Parish Name', 'Captain Name ', 'Contact Number', 'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8'];

const rawTeams = [];

let currentTeamOffset = 0;

for (let i = 0; i < data.length; i++) {
  const rowType = data[i]["                                          SXY THROWBALL TOURNAMENT TEAM & PLAYER REGISTRATION DETAILS 2026"]?.trim();
  
  if (rowType === "Team Name") {
    // Collect 8 teams
    const keys = ["__EMPTY", "__EMPTY_1", "__EMPTY_2", "__EMPTY_3", "__EMPTY_4", "__EMPTY_5", "__EMPTY_6", "__EMPTY_7"];
    keys.forEach((k, idx) => {
       if (!rawTeams[currentTeamOffset + idx]) rawTeams[currentTeamOffset + idx] = {};
       rawTeams[currentTeamOffset + idx]["Team Name"] = data[i][k];
    });
  } else if (rowType === "Institution / Parish Name") {
    const keys = ["__EMPTY", "__EMPTY_1", "__EMPTY_2", "__EMPTY_3", "__EMPTY_4", "__EMPTY_5", "__EMPTY_6", "__EMPTY_7"];
    keys.forEach((k, idx) => {
       rawTeams[currentTeamOffset + idx]["Institution"] = data[i][k];
    });
  } else if (rowType === "Captain Name") {
    const keys = ["__EMPTY", "__EMPTY_1", "__EMPTY_2", "__EMPTY_3", "__EMPTY_4", "__EMPTY_5", "__EMPTY_6", "__EMPTY_7"];
    keys.forEach((k, idx) => {
       rawTeams[currentTeamOffset + idx]["Captain Name"] = data[i][k];
    });
  } else if (rowType === "Contact Number") {
    const keys = ["__EMPTY", "__EMPTY_1", "__EMPTY_2", "__EMPTY_3", "__EMPTY_4", "__EMPTY_5", "__EMPTY_6", "__EMPTY_7"];
    keys.forEach((k, idx) => {
       rawTeams[currentTeamOffset + idx]["Contact Number"] = data[i][k];
    });
  } else if (rowType && rowType.startsWith("Player")) {
    const keys = ["__EMPTY", "__EMPTY_1", "__EMPTY_2", "__EMPTY_3", "__EMPTY_4", "__EMPTY_5", "__EMPTY_6", "__EMPTY_7"];
    keys.forEach((k, idx) => {
       if (!rawTeams[currentTeamOffset + idx]["Players"]) rawTeams[currentTeamOffset + idx]["Players"] = [];
       if (data[i][k]) {
          rawTeams[currentTeamOffset + idx]["Players"].push(data[i][k]);
       }
    });
    if (rowType === "Player 8") {
       currentTeamOffset += 8; // move to next block
    }
  }
}

// Map to structured format
const structuredTeams = rawTeams.map(rt => {
  if (!rt["Team Name"]) return null;
  const teamName = rt["Team Name"]?.toString().trim();
  const shortName = teamName.slice(0, 3).toUpperCase();
  const institution = rt["Institution"]?.toString().trim() || "";
  const captainName = rt["Captain Name"]?.toString().trim() || "";
  const playersList = rt["Players"] || [];
  
  // Special instructions:
  // "rhea jacobs is cap of two teams where she is not playing for the second so add her as external there"
  // "plus one group has only cap so add her in team for now"
  
  let isCaptainPlaying = false;
  let finalPlayers = [...playersList];
  
  // Check if captain is in players list
  let captainIndex = finalPlayers.findIndex(p => p?.toLowerCase().includes(captainName.toLowerCase()));
  
  // If captain name is Rhea Jacob and she is captain of two teams.
  if (captainName.toLowerCase().includes("rhea")) {
    if (teamName === "Mallu Minatteez A") {
      isCaptainPlaying = true;
      if (captainIndex === -1) {
         finalPlayers.unshift(captainName);
         captainIndex = 0;
      }
    } else if (teamName === "Mallu Minatteez B") {
      isCaptainPlaying = false;
      if (captainIndex !== -1) {
         finalPlayers.splice(captainIndex, 1);
         captainIndex = -1;
      }
    } else {
       // Other cases
       if (captainIndex !== -1) isCaptainPlaying = true;
    }
  } else {
    if (captainIndex !== -1) {
      isCaptainPlaying = true;
    } else {
      // "plus one group has only cap so add her in team for now"
      if (finalPlayers.length === 0) {
        finalPlayers.push(captainName);
        captainIndex = 0;
        isCaptainPlaying = true;
      } else {
        // Assume she is external if she's not in the list. Wait, I should just assume if she's not in the list, she's external, EXCEPT if she is the ONLY player? No, if she's not in the list but we want her to be playing, we should add her.
        // Let's default to: if captain is not in list, she's external.
        isCaptainPlaying = false;
      }
    }
  }

  // Format players into proper Player objects
  const players = finalPlayers.map((p, idx) => ({
     id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
     name: p.trim(),
     jerseyNumber: idx + 1,
     role: idx === captainIndex ? 'Captain (C)' : 'Court Player',
     isCaptain: idx === captainIndex
  }));
  
  return {
    id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: teamName,
    shortName: shortName,
    institution: institution,
    captainName: captainName,
    isCaptainPlaying: isCaptainPlaying,
    players: players,
    rosterStatus: players.length === 8 ? 'COMPLETE' : 'INCOMPLETE',
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };
}).filter(Boolean);

fs.writeFileSync('src/data/initialTeams.ts', `export const initialTeamsData = ${JSON.stringify(structuredTeams, null, 2)};`);
console.log("Done generating initialTeams.ts");

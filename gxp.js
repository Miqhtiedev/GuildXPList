// For user input
const readline = require("readline");

// For requesting to the hypixel api
const fetch = require("node-fetch");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Hypixel Api Key
let apiKey = "";

// Name of the Hypixel Guild
let guildName = "";

// If gxp < minGxp you are categorized as "Risks Kick"
let minGxp;

// Gets input from user for the API-KEY, GUILD-NAME, and MIN-GXP
rl.question("Enter hypixel api key: ", async (id) => {
  apiKey = id;
  rl.question("Enter Guild Name: ", async (id) => {
    guildName = id;
    rl.question("What is the min gexp. (GEXP that you kick at if members are below it): ", async (id) => {
      minGxp = id;
      console.log(`API-KEY: ${apiKey}\nGUILD-NAME: ${guildName}\nMIN-GXP: ${minGxp}`);
      console.log("Making requests to the Hypixel API. Please wait a bit!");
      run();
    });
  });
});

async function run() {
  // Gets guild ID (why does hypixel make people do this)
  const findGuildResponse = await fetch(`https://api.hypixel.net/findGuild?key=${apiKey}&byName=${guildName}`);
  const findGuildJson = await findGuildResponse.json();

  // Invalid API-KEY
  if (!findGuildJson.success) {
    console.log(findGuildJson.cause);
    process.exit(1);
  }

  // Invalid GUILD-NAME
  if (findGuildJson.guild === null) {
    console.log("Could not find guild " + guildName);
    process.exit(1);
  }

  const guildId = findGuildJson.guild;

  // ArrayMap to store USERNAME and GEXP and GUILD-RANK
  let gxpArr = [];

  //Gets Guild Data
  const guildResponse = await fetch(`https://api.hypixel.net/guild?key=${apiKey}&id=${guildId}`);
  const guildJson = await guildResponse.json();
  const guild = guildJson.guild;

  console.log("Loading gexp for " + guild.name);

  // Amount of members looped through
  let mct = 1;

  for (const membernum in guild.members) {
    const member = guild.members[membernum];

    // Gets mojang data
    const mojangResponse = await fetch(`https://api.mojang.com/user/profiles/${member.uuid}/names`);
    const mojangJson = await mojangResponse.json();

    //Pushes name, gexp, and guild rank to the array map
    gxpArr.push({ name: getName(mojangJson), gexp: totalGxp(member.expHistory), rank: member.rank });
    console.log(`${Math.floor((mct / guild.members.length) * 100)}% Complete`);

    mct++;
  }

  // List of guild ranks
  const ranks = [];
  for (const rank in guild.ranks) {
    ranks.push(guild.ranks[rank]);
  }

  // Sorts ranks from highest rank to lowest rank
  ranks.push({ name: "Guild Master", priority: 100 });
  ranks.sort((a, b) => {
    return b.priority - a.priority;
  });

  // Formatted Message
  let finalMsg = "";

  // Members that have gxp below mingxp
  let riskKick = [];

  // Loop through guild ranks
  for (ranknum in ranks) {
    const rank = ranks[ranknum];

    // Members with RANK
    let membersWithRank = [];

    // Loops through all members, checks if they have RANK, if they do push them to membersWithRank
    for (membernum in gxpArr) {
      const member = gxpArr[membernum];

      // Checks if member has the rank
      if (rank.name === member.rank) membersWithRank.push({ name: member.name, gexp: member.gexp });
      // Fixing stupid hypixel "bug" to do with calmguild
      else if (member.rank === "Member" && rank.default) membersWithRank.push({ name: member.name, gexp: member.gexp });
      else if (member.rank === "Peacefuls" && rank.default) membersWithRank.push({ name: member.name, gexp: member.gexp });
    }

    // Sorts them in gxp highest to lowest so it looks better
    membersWithRank.sort((a, b) => {
      return b.gexp - a.gexp;
    });

    // Some formatting that I can't be bothered to explain
    finalMsg += `\`\`\`${rank.name} (${membersWithRank.length})\`\`\`\n\n`;
    for (membernum in membersWithRank) {
      const member = membersWithRank[membernum];
      if (member.gexp < minGxp) {
        // Member gxp below mingxp so they are added to risk kick array
        finalMsg += `**RK** \`${member.name}\` - ${member.gexp}\n`;
        riskKick.push({ name: member.name, gexp: member.gexp });
      } else {
        finalMsg += `\`${member.name}\` - ${member.gexp}\n`;
      }
    }
    finalMsg += "\n";
  }

  finalMsg += `\n\`\`\`Overview\`\`\``;
  finalMsg += "\n\n\n**Weekly GTOP**\n\n";

  // Sorts highest to lowest overall gxp
  gxpArr.sort((a, b) => {
    return b.gexp - a.gexp;
  });

  /// Format weekly gtop
  for (let i = 0; i < 10; i++) {
    finalMsg += `\`${i + 1} - ${gxpArr[i].name}\` - ${gxpArr[i].gexp}\n`;
  }

  finalMsg += `\n**RK - Risks Kick (${riskKick.length})**\n\n`;

  // Sort RK highest to lowest gxp
  riskKick.sort((a, b) => {
    return b.gexp - a.gexp;
  });

  // Format RK
  for (let i = 0; i < riskKick.length; i++) {
    finalMsg += `\`${riskKick[i].name} - ${riskKick[i].gexp}\n`;
  }

  // Sends user the final product
  console.log(finalMsg);
}

// Gets current name from mojang name history
function getName(res) {
  let lastName;
  for (const name in res) {
    lastName = res[name].name;
  }
  return lastName;
}

// Adds up gxp for member
function totalGxp(expHistory) {
  let gxp = 0;
  for (let entry in expHistory) {
    gxp += expHistory[entry];
  }
  return gxp;
}

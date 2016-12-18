/* A bot created by PrimalMew for SleepyJirachi.
Run with "node SleepyBot.js --harmony". */

process.title = 'SleepyBot | v1.1.4'

var commands = require("./config/commands.js");
var mod = require("./config/modcmds.js");
var config = require("./config/config.json");
var games = require("./config/games.json").games;
var version = require("./config/version.js");
var Discord = require("discord.js");
var cleverbot = require("./config/cleverbot.js").cleverbot;
var colors = require("./config/colors.js");
var mysql = require("mysql");
var async = require("async");
var request = require("request");
var bannedwords = require("./config/wordsbad.json").wordsbad;
var schedule = require("node-schedule");
var JsonDB = require("node-json-db");
var fs = require("fs");
var util = require("util");
var Youtube = require("youtube-api");
var feedparser = require("ortoo-feedparser");
var degrees = require("./config/degrees.json").degrees;
var weather = require("./config/weathereffects.json").weather;
var taskTimer = require("tasktimer");
var quotes = require("./config/quotes.json").quotes;
var jpics = require("./config/jirachipics.json").jpics;
var ignoreCase = require("ignore-case");

var feedURL = "https://www.youtube.com/feeds/videos.xml?channel_id=UClrB57UsYgwXS1iPXaPr-fA"

var db = new JsonDB("./database/Sleepybase", true, true);

var log_file = fs.createWriteStream(__dirname + '/logger.log', {flags : 'w'});
var log_stdout = process.stdout;
var stats = fs.statSync("./logger.log");
var mtime = new Date(util.inspect(stats.mtime));

console.log = function(d) { //
  log_file.write("TIME:[" + mtime + "]" + util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
  
};

checkConfig();

var lastExecTime = {};
commandsProcessed = 0, talkedToTimes = 0;

var bot = new Discord.Client({autoReconnect:true});
bot.on("warn", (m) => { if (config.show_warn) { console.log(colors.cWarn(" WARN ") + m); } });
bot.on("debug", (m) => { if (config.debug) { console.log(colors.cDebug(" DEBUG ") + m); } });

bot.on("ready", () => {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]); //set game to a random game from games.json
	version.checkForUpdate((resp) => {
		if (resp !== null) { console.log(resp); }
	});
	setTimeout(() => {
		console.log("Status: " + colors.cGreen("Online!") + " | SleepyBot is monitoring " + bot.channels.length + " channels on " + bot.servers.length + " server(s).");
	},500); 
});

bot.on("disconnected", () => {
	console.log(colors.cRed("Disconnected") + " from Discord");
	setTimeout(() => {
		console.log("Attempting to log in...");
		bot.loginWithToken(config.bot_token, err => {
			if(err) console.log(err);
		});
	}, 17500);
});

bot.on("message", (msg) => {
	if (msg.author.id == config.admin_id && msg.content.startsWith("(eval) ")) { evaluateString(msg); return; }
	if (msg.mentions.length !== 0) {
		if (msg.content.indexOf("<@" + config.admin_id + ">") > -1) {
			if (config.send_mentions) {
				var owner = bot.users.get("id", config.admin_id);
				if (owner.status != "online") { bot.sendMessage(owner, msg.channel.server.name + " > " + msg.author.username + ": " + msg.cleanContent); }
			}
		}
	}
	
	if (msg.author.id == bot.user.id) { return; }
	var cmd = msg.content.split(" ")[0].replace(/\n/g, " ").substring(1).toLowerCase();
	var suffix = msg.content.replace(/\n/g, " ").substring(cmd.length + 2);
	if (msg.content.startsWith(config.command_prefix)) {
		if (commands.commands.hasOwnProperty(cmd)) { execCommand(msg, cmd, suffix, "normal");
		} else if (commands.aliases.hasOwnProperty(cmd)) {
			msg.content = msg.content.replace(/[^ ]+ /, config.command_prefix + commands.aliases[cmd] + " ");
			execCommand(msg, commands.aliases[cmd], suffix, "normal");
		}
	} else if (msg.content.startsWith(config.mod_command_prefix)) {
		if (cmd == "reload" && msg.author.id == config.admin_id) { reload(); bot.deleteMessage(msg); bot.sendMessage(msg, "<:Bot:230821190648856577> `Reloaded`", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
		if (mod.commands.hasOwnProperty(cmd)) { execCommand(msg, cmd, suffix, "mod");
		} else if (mod.aliases.hasOwnProperty(cmd)) {
			msg.content = msg.content.replace(/[^ ]+ /, config.mod_command_prefix + mod.aliases[cmd] + " ");
			execCommand(msg, mod.aliases[cmd], suffix, "mod");
		}
	}
	
	//WELCOME QUESTION//
	
	
	var roleBot = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "bot" });
	if (bot.memberHasRole(msg.author, roleBot)) {
		return;
	}
	var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing3" });
	if (bot.memberHasRole(msg.author, role)) {
		var choice = Math.floor(Math.random() * 3);
		if (choice == 0) { bot.sendMessage(msg, "<:Bot:230821190648856577> Wazzup, " + msg.sender + "! Welcome to Sleepytown! It seems this is your first time speaking here! (*I hope...*)\nI'm going to run you through a little quiz. <:JirachiDizzy:230801796493213697>\nThis is so we know you're not just a rando! <:SleepyRage:213244047924527104>\n Please type `Start` when you are ready for the test.");
		} else if (choice == 1) { bot.sendMessage(msg, "<:Bot:230821190648856577> Hey, " + msg.sender + "! Welcome to Sleepytown!\nI'm going to run ya through a few quizzes.\nNo need to worry, they won't stump you too much. Unless you're a rando! <:SleepyRage:213244047924527104>\nPlease type `Start` when your ready to take the tests!");
		} else if (choice == 2) { bot.sendMessage(msg, "<:Bot:230821190648856577> Greetings, " + msg.sender + "! Welcome to Sleepytown! Not sure if this is your first time here.\nAre you ready to take some tests? <:JirachiDizzy:230801796493213697>\nPlease type `Start` when you're ready!."); }
		
		var roleQUIZ = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing" });
		setTimeout(() => {
			bot.addMemberToRole(msg.author, roleQUIZ, err => {
				if(err) console.log(err);
			});
		},1000);
		var roleQUIZ3 = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing3" });
		setTimeout(() => {
			bot.removeMemberFromRole(msg.author, roleQUIZ3, err => {
				if(err) console.log(err);
			});
		},2000);
		
	}
	var roleQUIZ = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing" });
	if (bot.memberHasRole(msg.author, roleQUIZ)) {
		if (msg.content.startsWith("Start")) {
			
			var toSend = [];
			toSend.push("<:Bot:230821190648856577> **TEST FOR** `" + msg.author.username + "`");
			toSend.push("```Markdown");
			toSend.push("#--- QUESTION #1 ---#");
			toSend.push("[Question:](Who is the Mayor of Sleepytown?)");
			toSend.push("-Answer with proper case-");
			toSend.push("[HINT](zzz)");
			toSend.push("```");
				
			bot.sendMessage(msg, toSend);
			
			var roleQUIZ = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing" });
			setTimeout(() => {
				bot.removeMemberFromRole(msg.author, roleQUIZ, err => {
					if(err) console.log(err);
				});
			},1000);
			var roleQUIZ2 = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing2" });
			setTimeout(() => {
				bot.addMemberToRole(msg.author, roleQUIZ2, err => {
					if(err) console.log(err);
				});
			},2000);
		} else {
			var toSend = [];
			toSend.push("<:Bot:230821190648856577> **TEST FOR** `" + msg.author.username + "`");
			toSend.push("```Markdown");
			toSend.push("### Please type Start ###");
			toSend.push("```");
				
			bot.sendMessage(msg, toSend);
		}
	}
	var roleQUIZ2 = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing2" });
	if (bot.memberHasRole(msg.author, roleQUIZ2)) {
		if (msg.content.startsWith("Sleepy")) {
			
			var toSend = [];
			toSend.push("<:Bot:230821190648856577> **TEST FOR** `" + msg.author.username + "`");
			toSend.push("```Markdown");
			toSend.push("[CORRECT](You are now a Resident!)");
			toSend.push("```");
				
			bot.sendMessage(msg, toSend);
			
			var roleQUIZ2 = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "interviewing2" });
			setTimeout(() => {
				bot.removeMemberFromRole(msg.author, roleQUIZ2, err => {
					if(err) console.log(err);
				});
			},1000);
			var roleRes = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "residents" });
			setTimeout(() => {
				if (!bot.memberHasRole(msg.author, roleRes)) {
					setTimeout(() => {
						bot.addMemberToRole(msg.author, roleRes, err => {
							if(err) console.log(err);
						});
					},1000);
				
					setTimeout(() => {
						var roleHom = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "homeless" });
						if (bot.memberHasRole(msg.author, roleHom)) {
							bot.removeMemberFromRole(msg.author, roleHom, err => {
								if(err) console.log(err);
							});
						}
					},2000);
					
				}
			},2000);
			
		} else {
			var toSend = [];
			toSend.push("<:Bot:230821190648856577> **TEST FOR** `" + msg.author.username + "`");
			toSend.push("```Markdown");
			toSend.push("### INCORRECT ###");
			toSend.push("```");
				
			bot.sendMessage(msg, toSend);
		}
	}
	
	//WELCOME QUESTION END//
	
	if (msg.content) {
		if (!msg.channel.isPrivate) {
			console.log(colors.cGrey("~ [Normal Message] ~") + " > " + colors.cServer(msg.channel.server.name) + " > " + colors.cServer(msg.channel.name) + "(" + msg.channel.id + ") > " + colors.cGreen(msg.author.username) + ": " + msg.cleanContent.replace(/\n/g, " "));
			var roleBot = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "bot" });
			if (bot.memberHasRole(msg.author, roleBot)) { return; }
			/*var roleHom = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "homeless" });
			if (bot.memberHasRole(msg.author, roleHom)) {
				bot.removeMemberFromRole(msg.author, roleHom, err => {
					if(err) console.log(err);
				});
			}
			
			var roleRes = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "residents" });
			if (!bot.memberHasRole(msg.author, roleRes)) {
				setTimeout(() => {
					bot.addMemberToRole(msg.author, roleRes, err => {
						if(err) console.log(err);
					});
				},500);
				
				setTimeout(() => {
					var choice = Math.floor(Math.random() * 3);
					if (choice == 0) { bot.sendMessage(msg, "<:SleepyHype:211160529132191744> <:Bot:230821190648856577> Wazzup, " + msg.sender + "! Welcome to " + msg.channel.server.name + "! Since this is your first time speaking here, you've been made a resident.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					} else if (choice == 1) { bot.sendMessage(msg, "<:SleepyHype:211160529132191744> <:Bot:230821190648856577> Hey, " + msg.sender + "! Welcome to " + msg.channel.server.name + "! You have been made a Resident since this is your first time speaking here.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					} else if (choice == 2) { bot.sendMessage(msg, "<:SleepyHype:211160529132191744> <:Bot:230821190648856577> Greetings, " + msg.sender + "! Welcome to " + msg.channel.server.name + "! This is your first time speaking here. You've been made a resident.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
					
					console.log(colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " has spoken for the first time! They have been granted Residency.");
				},800);
				
				setTimeout(() => {
					var roleHom = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "homeless" });
					if (bot.memberHasRole(msg.author, roleHom)) {
						bot.removeMemberFromRole(msg.author, roleHom, err => {
							if(err) console.log(err);
						});
					}
				},1000);
			}*/
		} else { console.log(colors.cGrey("- [Private Message] -") + " > " + colors.cGreen(msg.author.username) + ": " + msg.cleanContent.replace(/\n/g, " ")); }
	}
	//ULTEH CULTIST CODE START
	
	//
	
	var ultehWords = "happy birthday ulteh";
	if (msg.content === ultehWords.toLowerCase()) {
		var roleCult = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "cultist" });
		if (!bot.memberHasRole(msg.author, roleCult)) {
			bot.addMemberToRole(msg.author, roleCult, err => {
				if(err) console.log(err);
			});
			bot.sendMessage(msg, "<:Bot:230821190648856577> `" + msg.author.name + "` is a *crazy cultist*...", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 5000}); });
		}
	}
	//
	
	//ULTEH CULTIST CODE END
});

function execCommand(msg, cmd, suffix, type) {
	try {
		commandsProcessed += 1;
		if (type == "normal") {
			if (!msg.channel.isPrivate) { console.log(colors.cGrey("Command executed on ") + colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " ")); } else { console.log(colors.cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " ")); }
			if (commands.commands[cmd].hasOwnProperty("cooldown")) {
				if (lastExecTime.hasOwnProperty(cmd)) {
					var id = msg.author.id;
					if (lastExecTime[cmd][id] != undefined) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd][id]);
						leTime.setSeconds(leTime.getSeconds() + commands.commands[cmd].cooldown);
						if (cTime < leTime) {
							var left = (leTime.valueOf() - cTime.valueOf()) / 1000;
							if (msg.author.id != config.admin_id) {
								bot.sendMessage(msg, "<:Bot:230821190648856577> Woah, " + msg.author.username + ", you need to *cooldown* (" + Math.round(left) + " seconds)", function(erro, message) { bot.deleteMessage(message, {"wait": 6000}); });
								return;
							}
						} else { lastExecTime[cmd][id] = cTime; }
					} else { lastExecTime[cmd][id] = new Date(); }
				} else { lastExecTime[cmd] = {}; }
			}
			commands.commands[cmd].process(bot, msg, suffix);
			if (!msg.channel.isPrivate && commands.commands[cmd].hasOwnProperty("deleteCommand")) {
				if (commands.commands[cmd].deleteCommand === true) { bot.deleteMessage(msg, {"wait": 10000}); }
			}
		} else if (type == "mod") {
			if (!msg.channel.isPrivate) {
				console.log(colors.cGrey("Command executed on ") + colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + colors.cBlue(msg.cleanContent.replace(/\n/g, " ").split(" ")[0]) + msg.cleanContent.replace(/\n/g, " ").substr(msg.cleanContent.replace(/\n/g, " ").split(" ")[0].length));
			} else { console.log(colors.cGrey("Command executed by ") + colors.cGreen(msg.author.username) + " > " + colors.cBlue(msg.cleanContent.replace(/\n/g, " ").split(" ")[0]) + msg.cleanContent.replace(/\n/g, " ").substr(msg.cleanContent.replace(/\n/g, " ").split(" ")[0].length)); }
			if (mod.commands[cmd].hasOwnProperty("cooldown")) {
				if (lastExecTime.hasOwnProperty(cmd)) {
					var id = msg.author.id;
					if (lastExecTime[cmd][id] != undefined) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd][id]);
						leTime.setSeconds(leTime.getSeconds() + mod.commands[cmd].cooldown);
						if (cTime < leTime) { //if it is still on cooldown
							var left = (leTime.valueOf() - cTime.valueOf()) / 1000;
							if (msg.author.id != config.admin_id) { //admin bypass
								bot.sendMessage(msg, "<:Bot:230821190648856577> Woah, " + msg.author.username + ", you need to *cooldown* (" + Math.round(left) + " seconds)", function(erro, message) { bot.deleteMessage(message, {"wait": 6000}); });
								return;
							}
						} else { lastExecTime[cmd][id] = cTime; }
					} else { lastExecTime[cmd][id] = new Date(); }
				} else { lastExecTime[cmd] = {}; }
			}
			mod.commands[cmd].process(bot, msg, suffix);
			if (!msg.channel.isPrivate && mod.commands[cmd].hasOwnProperty("deleteCommand")) {
				if (mod.commands[cmd].deleteCommand === true) { bot.deleteMessage(msg, {"wait": 10000}); }
			}
		} else { return; }
	} catch (err) { console.log(err.stack); }
}

//event listeners
bot.on("serverNewMember", (objServer, objUser) => {
	if (config.greet_new_members) {
		console.log("New member on " + objServer.name + ": " + objUser.username);
		setTimeout(() => {
			//bot.channels.get("id", 146685904654696448).sendMessage("<:SleepyHype:211160529132191744> <:Bot:230821190648856577> Welcome to town, " + objUser.username + "!");
			bot.sendMessage(objServer.defaultChannel, "<:SleepyHype:211160529132191744> <:Bot:230821190648856577> Welcome to town, " + objUser.username + "!");
		},500);
	}
	setTimeout(() => {
		var role = objServer.roles.find(r => r.name === 'Homeless');
		bot.addMemberToRole(objUser, role);
	},1000);
	setTimeout(() => {
		var roleQUIZ = objServer.roles.find(r => r.name === 'Interviewing3');
		bot.addMemberToRole(objUser, roleQUIZ);
	},2000);
});

bot.on("channelCreated", (objChannel) => {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) { if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "New channel created. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name); } }
	}
});

bot.on("channelDeleted", (objChannel) => {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) { if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Channel deleted. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name); } }
	}
});

bot.on("userBanned", (objUser, objServer) => {
	if (config.ban_alerts) {
		console.log(objUser.username + colors.cRed(" banned on ") + objServer.name);
		bot.sendMessage(objServer.defaultChannel, "<:SleepyBan:210155487570690048> <:Bot:230821190648856577>" + objUser.username.replace(/@/g, '') + " has been banned.");
		bot.sendMessage(objUser, "<:SleepyBan:210155487570690048> <:Bot:230821190648856577>You have been banned from " + objServer.name.replace(/@/g, ''));
	}
});

bot.on("userUnbanned", (objUser, objServer) => {
	if (config.non_essential_event_listeners) { console.log(objUser.username + " unbanned on " + objServer.name); }
});

bot.on("presence", (userOld, userNew) => {
	if (config.log_presence) {
		if ((userNew.status != userOld.status) && (userNew.game === null || userNew.game === undefined)) { console.log(colors.cDebug(" PRESENCE ") + userNew.username + " is now " + userNew.status);
		} else if (userNew.status != userOld.status) { console.log(colors.cDebug(" PRESENCE ") + userNew.username + " is now " + userNew.status + " playing " + userNew.game.name); }
	}
	if (config.username_changes) {
		if (userOld.username != userNew.username) {
			bot.servers.map((ser) => {
				if (ser.members.get("id", userOld.id) && ServerSettings.hasOwnProperty(ser.id) && ServerSettings[ser.id].namechanges == true) {
					bot.sendMessage(ser, "<:Bot:230821190648856577> `" + userOld.username.replace(/@/g, "@ ") + "` is now known as `" + userNew.username.replace(/@/g, "@ ") + "`"); }
			});
		}
	}
});

bot.on("serverDeleted", (objServer) => { //detect when the bot leaves a server
	console.log(colors.cYellow("Left server") + " " + objServer.name);
});

//login
console.log("Logging in...");
bot.loginWithToken(config.bot_token, config.email, config.password, function(err, token) {
	if (err) { console.log(err); setTimeout(() => { process.exit(1); }, 2000); }
	if (!token) { console.log(colors.cWarn(" WARN ") + "failed to connect"); setTimeout(() => { process.exit(1); }, 2000); }
});

/*// ~ Check if streaming ~ //
setInterval(() => {
	request("https://api.twitch.tv/kraken/streams/SleepyJirachi", function(err, res, body) {
		if (res.statusCode == 404 || err) {
			console.log(colors.cRed("404") + ": Not Found - Couldn't connect to Twitch?");
			return;
		}
		if (!err && res.statusCode == 200) {
			var stream = JSON.parse(body);
			if (stream.stream) {
				console.log(colors.cGreen("Received! ") + "Sleepy is currently streaming " + colors.cYellow(stream.stream.game) + ".");
				bot.sendMessage(bot.servers.defaultChannel, "Hey guys, Sleepy is currently streaming! He's playing " + stream.stream.game + " - " + stream.stream.channel.status + "\n" + stream.stream.channel.url + "\n Sleepy currently has " + stream.stream.channel.followers + " followers.");
				setInterval(() => {
					console.log(colors.cGrey("Still streaming.") + colors.cDebug("Status: ") + colors.cGreen("OK") + ". [Will check status again in 2 minutes.]");
					}, 120000); //Pass the time (2 minutes)
			} else {
				var choice = Math.floor(Math.random() * 3);
				if (choice == 0) { console.log(colors.cGrey("Sleepy's not currently streaming."));
				} else if (choice == 1) { console.log(colors.cGrey("Sleepy isn't currently streaming at the moment. Checking later..."));
				} else if (choice == 2) { console.log(colors.cGrey("Sleepy's not streaming. Nothing displayed. Will check again in 5 minutes.")); }
			}
		}
	});
}, 300000); // WILL CHECK EVERY 5 MINUTES //
// ~ Check if streaming ~ \\
*/

//FUNCTIONS//
//LOOK AT THE FUNCTIONS//

function carbonInvite(msg) {
	if (msg) {
		try {
			if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Attempting to join: " + msg.content); }
			var cServers = [];
			bot.servers.map((srvr) => { cServers.push(srvr.id); });
			bot.joinServer(msg.content, function(err, server) {
				if (err) {
					bot.sendMessage(msg, "Failed to join: " + err);
					console.log(colors.cWarn(" WARN ") + err);
				} else if (cServers.indexOf(server.id) > -1) {
					console.log("Already in server " + server.name);
					bot.sendMessage(msg, "Already present in that server!");
				} else {
					if (config.banned_server_ids && config.banned_server_ids.indexOf(server.id) > -1) {
						console.log(colors.cRed("Joined server but it was on the ban list") + ": " + server.name);
						bot.sendMessage(msg, "This server is on the ban list though.");
						bot.leaveServer(server); return;
					}
					console.log(colors.cGreen("Joined server: ") + " " + server.name);
					bot.sendMessage(msg, "Successfully joined " + server.name);
					var toSend = [];
					if (msg.author.id == '109338686889476096') { toSend.push("Greetings! I'm **HypeBot**! I was invited to this server through carbonitex.net."); }
					else { toSend.push("Greetings! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author.username + "."); }
					toSend.push("Could you use **help* to see what commands are available? Mods can use -help for moderator commands.");
					toSend.push("If you don't want me here, you can use `-leave` to make me leave the server.");
					bot.sendMessage(server.defaultChannel, "<:Bot:230821190648856577> " + toSend);
				}
			});
		} catch (err) { bot.sendMessage(msg, "Bot encountered an error while joining"); console.log(err); }
	}
}

function reload() {
	delete require.cache[require.resolve("./config/config.json")];
	config = require("./config/config.json");
	delete require.cache[require.resolve("./config/games.json")];
	games = require("./config/games.json").games;
	delete require.cache[require.resolve("./config/commands.js")];
	try { commands = require("./config/commands.js");
	} catch (err) { console.log(colors.cError(" ERROR ") + "Problem loading commands.js: " + err); }
	delete require.cache[require.resolve("./config/modcmds.js")];
	try { mod = require("./config/modcmds.js");
	} catch (err) { console.log(colors.cError(" ERROR ") + "Problem loading mod.js: " + err); }
	delete require.cache[require.resolve("./config/version.js")];
	version = require("./config/version.js");
	delete require.cache[require.resolve("discord.js")];
	discord = require("discord.js");
	delete require.cache[require.resolve("./config/cleverbot.js")];
	cleverbot = require("./config/cleverbot.js").cleverbot;
	delete require.cache[require.resolve("./config/colors.js")];
	colors = require("./config/colors.js");
	delete require.cache[require.resolve("mysql")];
	mysql = require("mysql");
	delete require.cache[require.resolve("async")];
	async = require("async");
	delete require.cache[require.resolve("request")];
	request = require('request');
	delete require.cache[require.resolve("./config/wordsbad.json")];
	bannedwords = require("./config/wordsbad.json").wordsbad;
}

function checkConfig() {
		if (config.email === null) { console.log(colors.cWarn(" WARN ") + "Email not defined"); }
		if (config.password === null) { console.log(colors.cWarn(" WARN ") + "Password not defined"); }
		if (config.command_prefix === null || config.command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ") + "Prefix either not defined or more than one character"); }
		if (config.mod_command_prefix === null || config.mod_command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ") + "Mod prefix either not defined or more than one character"); }
		if (config.admin_id === null) { console.log(colors.cYellow("Admin user's id not defined") + " in config"); }
		if (config.mal_user === null) { console.log(colors.cYellow("MAL username not defined") + " in config"); }
		if (config.mal_pass === null) { console.log(colors.cYellow("MAL password not defined") + " in config"); }
		if (config.weather_api_key === null) { console.log(colors.cYellow("OpenWeatherMap API key not defined") + " in config"); }
		if (config.osu_api_key === null) { console.log(colors.cYellow("Osu API key not defined") + " in config"); }
}

function evaluateString(msg) {
	if (msg.author.id != config.admin_id) { console.log(colors.cWarn(" WARN ") + "Somehow an unauthorized user got into eval!"); return; }
	var timeTaken = new Date();
	console.log("Running eval");
	var result;
	try { result = eval("try{" + msg.content.substring(7).replace(/\n/g, "") + "}catch(err){console.log(colors.cError(\" ERROR \")+err);bot.sendMessage(msg, \"```\"+err+\"```\");}");
	}catch(e){
		setTimeout(() => {
			bot.sendMessage(msg, "<:Bot:230821190648856577> ```js\n"+e+"```");
		},500);
		
	}
	if (result && typeof result !== "object") {
		bot.sendMessage(msg,  "<:Bot:230821190648856577> `Time taken: " + (timeTaken - msg.timestamp) + "ms`\n" + result);
		console.log("Result: " + result);
	}
}

setInterval(() => {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Updated bot's game"); }
}, 400000);


//Recurring
/*
var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 18;
rule.minute = 0;

var rule2 = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];
rule.hour = 19;
rule.minute = 0;

var j = schedule.scheduleJob(rule, function() {
	bot.channels.get("id", 146685904654696448).sendMessage("**Hour**: `18`\n*It is 6:00 PM.*\n`This is a test for Jail hours` *in progress*");
});

var j1 = schedule.scheduleJob(rule2, function() {
	bot.channels.get("id", 146685904654696448).sendMessage("**Hour**: `19`\n*It is 7:00 PM.*\n`This is a test for Jail hours` *in progress*");
});
*/
//recurring end

var streamAlready = 0;
setInterval(() => {
	console.log("Checking if Sleepy is streaming...");
	request("https://api.twitch.tv/kraken/streams/sleepyjirachi?client_id=gevyqq04oczg41okm7d2i7pqbupjtl0", function(err, res, body) {
		if (res.statusCode == 404 || err) {
			console.log("..." + colors.cRed("error.") + " 404 not found.");
			return;
		}
		if (!err && res.statusCode == 200) {
			var stream = JSON.parse(body);
			if (stream.stream) {
				if (streamAlready == 0) {
					console.log("..." + colors.cGreen("true.") + " Sleepy's streaming! Announcement.");
					bot.sendMessage("95634659290906624", "<:Bot:230821190648856577> **SleepyJirachi** just went live, guys! Sleepy is playing: `" + stream.stream.game + "`\nWatch now at **http://twitch.tv/SleepyJirachi** \nSleepy has __**" + stream.stream.channel.followers + "**__ followers.");
				streamAlready = 1;
				} else { console.log(colors.cGreen("Yes!") + " Sleepy is streaming. However, " + colors.cRed("it was already announced.")); }
			} else {
				console.log("..." + colors.cRed("false.") + " Sleepy isn't currently streaming.");
				streamAlready = 0;
			}
		}
	});
}, 600000);

// GOOD MORNING Timer //

var j = schedule.scheduleJob({hour: 08, minute: 00}, function(){
		const dateobj = new Date();
		var month = dateobj.getMonth() + 1;
		var day = dateobj.getDate();
		var year = dateobj.getFullYear();

		var temperature = degrees[Math.floor(Math.random() * (degrees.length))];

		var weatherstatus = weather[Math.floor(Math.random() * (weather.length))];
		
		var cuteJpics = jpics[Math.floor(Math.random() * (jpics.length))];

		bot.channels.get("id", 187977241487998976).sendMessage("<:Bot:230821190648856577> **Good Morning** town!\nThe date is: `" + month + "/" + day + "/" + year + "`.\nIt's `" + temperature + "` outside and currently " + weatherstatus + ".\n__**TODAY'S QUOTE**__\n" + quotes[Math.floor(Math.random() * (quotes.length))] + ".\nHave a nice day! <:SleepyHype:211160529132191744>");
		setTimeout(() => {
			bot.channels.get("id", 187977241487998976).sendMessage("Also, here's a *really cute* random __Jirachi__!");
		},200); 
		setTimeout(() => {
			bot.channels.get("id", 187977241487998976).sendFile(cuteJpics);
		},250);
		console.log("~~~---Passed GOOD MORNING Message---~~~");
});


// END GOOD MORNING Timer //

// IF IN VOICE CHANNEL //

setInterval(() => {
	bot.unmuteMember("162061224635400192", "95634659290906624");
}, 3000);

// IF IN VOICE CHANNEL END //

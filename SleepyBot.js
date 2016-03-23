/* A bot created by PrimalMew.
Run with "node HypeBot.js --harmony". */

var commands = require("./config/commands.js");
var mod = require("./config/mod.js");
var config = require("./config/config.json");
var games = require("./config/games.json").games;
var versioncheck = require("./config/versioncheck.js");
var discord = require("discord.js");
var cleverbot = require("./config/cleverbot.js").cleverbot;
var colors = require("./config/styles.js");
checkConfig();

var lastExecTime = {};
commandsProcessed = 0, talkedToTimes = 0;

var bot = new discord.Client();
bot.on("warn", (m) => { if (config.show_warn) { console.log(colors.cWarn(" WARN ") + m); } });
bot.on("debug", (m) => { if (config.debug) { console.log(colors.cDebug(" DEBUG ") + m); } });

bot.on("ready", () => {
	bot.forceFetchUsers();
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]); //set game to a random game from games.json
	console.log(colors.cGreen("HypeBot.EXE is ready!") + " Listening in on " + bot.channels.length + " channels on " + bot.servers.length + " server(s).");
	versioncheck.checkForUpdate((resp) => {
		if (resp !== null) { console.log(resp); }
	});
});

bot.on("disconnected", () => {
	console.log(colors.cRed("Disconnected") + " from Discord");
	if (!config.use_env) { process.exit(0);
	} else { //if on heroku try to re-connect
		setTimeout(() => {
			console.log("Attempting to log in...");
			bot.login(process.env.email, process.env.password, function(err, token) {
				if (err) { console.log(err); process.exit(0); }
				if (!token) { console.log(colors.cWarn(" WARN ") + "Failed to re-connect"); process.exit(0); }
			});}, 20000); //waits 20 seconds before doing
	}
});

bot.on("message", (msg) => {
	if (msg.channel.isPrivate && msg.author.id != bot.user.id && (/(^https?:\/\/discord\.gg\/[A-Za-z0-9]+$|^https?:\/\/discordapp\.com\/invite\/[A-Za-z0-9]+$)/.test(msg.content))) { carbonInvite(msg); } //accept invites sent in a DM
	if (msg.author.id == config.admin_id && msg.content.startsWith("(eval) ")) { evaluateString(msg); return; } //bot owner eval command
	if (msg.mentions.length !== 0) {
		if (msg.isMentioned(bot.user) && msg.content.startsWith("<@" + bot.user.id + ">")) {
			cleverbot(bot, msg); talkedToTimes += 1;
			console.log(colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + colors.cYellow("@" + bot.user.username) + " " + msg.cleanContent.replace("@" + bot.user.username, "").replace(/\n/g, " "));
		}
		if (msg.content.indexOf("<@" + config.admin_id + ">") > -1) {
			if (config.send_mentions) {
				var owner = bot.users.get("id", config.admin_id);
				if (owner.status != "online") { bot.sendMessage(owner, msg.channel.server.name + " > " + msg.author.username + ": " + msg.cleanContent); }
			}
		}
	}
	if (!msg.content.startsWith(config.command_prefix) && !msg.content.startsWith(config.mod_command_prefix)) { return; }
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
		if (cmd == "reload" && msg.author.id == config.admin_id) { reload(); bot.deleteMessage(msg); return; }
		if (mod.commands.hasOwnProperty(cmd)) { execCommand(msg, cmd, suffix, "mod");
		} else if (mod.aliases.hasOwnProperty(cmd)) {
			msg.content = msg.content.replace(/[^ ]+ /, config.mod_command_prefix + mod.aliases[cmd] + " ");
			execCommand(msg, mod.aliases[cmd], suffix, "mod");
		}
	}
});

function execCommand(msg, cmd, suffix, type) {
	try {
		commandsProcessed += 1;
		if (type == "normal") {
			if (!msg.channel.isPrivate) { console.log(colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " ")); } else { console.log(colors.cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " ")); }
			if (commands.commands[cmd].hasOwnProperty("cooldown")) {
				if (lastExecTime.hasOwnProperty(cmd)) {
					var id = msg.author.id;
					if (lastExecTime[cmd][id] != undefined) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd][id]);
						leTime.setSeconds(leTime.getSeconds() + commands.commands[cmd].cooldown);
						if (cTime < leTime) { //if it is still on cooldown
							var left = (leTime.valueOf() - cTime.valueOf()) / 1000;
							if (msg.author.id != config.admin_id) { //admin bypass
								bot.sendMessage(msg, msg.author.username + ", need to *cooldown* (" + Math.round(left) + " seconds)", function(erro, message) { bot.deleteMessage(message, {"wait": 6000}); });
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
				console.log(colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + colors.cBlue(msg.cleanContent.replace(/\n/g, " ").split(" ")[0]) + msg.cleanContent.replace(/\n/g, " ").substr(msg.cleanContent.replace(/\n/g, " ").split(" ")[0].length));
			} else { console.log(colors.cGreen(msg.author.username) + " > " + colors.cBlue(msg.cleanContent.replace(/\n/g, " ").split(" ")[0]) + msg.cleanContent.replace(/\n/g, " ").substr(msg.cleanContent.replace(/\n/g, " ").split(" ")[0].length)); }
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
								bot.sendMessage(msg, msg.author.username + ", need to *cooldown* (" + Math.round(left) + " seconds)", function(erro, message) { bot.deleteMessage(message, {"wait": 6000}); });
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
	if (config.greet_new_memebrs) { console.log("New member on " + objServer.name + ": " + objUser.username); bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name.replace(/@/g, '') + " " + objUser.username.replace(/@/g, '')); }
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
		bot.sendMessage(objServer.defaultChannel, "⚠ " + objUser.username.replace(/@/g, '') + " has been banned.");
		bot.sendMessage(objUser, "⚠ You have been banned from " + objServer.name.replace(/@/g, ''));
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
					bot.sendMessage(ser, "`" + userOld.username.replace(/@/g, "@ ") + "` is now known as `" + userNew.username.replace(/@/g, "@ ") + "`"); }
			});
		}
	}
});

bot.on("serverDeleted", (objServer) => { //detect when the bot leaves a server
	console.log(colors.cUYellow("Left server") + " " + objServer.name);
});

//login
console.log("Logging in...");
if (config.use_env) {
	bot.login(process.env.email, process.env.password, function(err, token) {
		if (err) { console.log(err); setTimeout(() => { process.exit(0); }, 2000); }
		if (!token) { console.log(colors.cWarn(" WARN ") + "failed to connect"); setTimeout(() => { process.exit(0); }, 2000); } //make sure it logged in successfully
	});
} else {
	bot.login(config.email, config.password, function(err, token) {
		if (err) { console.log(err); setTimeout(() => { process.exit(1); }, 2000); }
		if (!token) { console.log(colors.cWarn(" WARN ") + "failed to connect"); setTimeout(() => { process.exit(1); }, 2000); }
	});
}

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
					if (config.use_env) {
						if (process.env.banned_server_ids && process.env.banned_server_ids.indexOf(server.id) > -1) {
							console.log(colors.cRed("Joined server but it was on the ban list") + ": " + server.name);
							bot.sendMessage(msg, "This server is on the ban list! PrimalMew doesn't allow it!");
							bot.leaveServer(server); return;
						}
					} else {
						if (config.banned_server_ids && config.banned_server_ids.indexOf(server.id) > -1) {
							console.log(colors.cRed("Joined server but it was on the ban list") + ": " + server.name);
							bot.sendMessage(msg, "This server is on the ban list though.");
							bot.leaveServer(server); return;
						}
					}
					console.log(colors.cGreen("Joined server: ") + " " + server.name);
					bot.sendMessage(msg, "Successfully joined " + server.name);
					var toSend = [];
					if (msg.author.id == '109338686889476096') { toSend.push("Greetings! I'm **HypeBot**! I was invited to this server through carbonitex.net."); }
					else { toSend.push("Greetings! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author.username + "."); }
					toSend.push("Could you use ***-*help*** to see what commands are available? Mods can use ***-**help*** for moderator commands.");
					toSend.push("If you don't want me here, you can use `-*leave` to make me leave the server.");
					bot.sendMessage(server.defaultChannel, toSend);
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
	delete require.cache[require.resolve("./config/mod.js")];
	try {mod = require("./config/mod.js");
	} catch (err) { console.log(colors.cError(" ERROR ") + "Problem loading mod.js: " + err); }
	delete require.cache[require.resolve("./config/config.json")];
	delete require.cache[require.resolve("./config/versioncheck.js")];
	versioncheck = require("./config/versioncheck.js");
	delete require.cache[require.resolve("./config/styles.js")];
	colors = require("./config/styles.js");
	delete require.cache[require.resolve("./config/cleverbot.js")];
	cleverbot = require("./config/cleverbot").cleverbot;
	console.log(colors.BgGreen(" Module Reload ") + " Success");
}

function checkConfig() {
	if (config.use_env) {
		if (process.env.email === null) { console.log(colors.cWarn(" WARN ") + "Email not defined"); }
		if (process.env.password === null) { console.log(colors.cWarn(" WARN ") + "Password not defined"); }
		if (config.command_prefix === null || config.command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ") + "Prefix either not defined or more than one character"); }
		if (config.mod_command_prefix === null || config.mod_command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ") + "Mod prefix either not defined or more than one character"); }
		if (config.admin_id === null) { console.log(colors.cYellow("Admin user's id not defined") + " in process.env"); }
		if (process.env.mal_user === null) { console.log(colors.cYellow("MAL username not defined") + " in process.env"); }
		if (process.env.mal_pass === null) { console.log(colors.cYellow("MAL password not defined") + " in process.env"); }
		if (process.env.weather_api_key === null) { console.log(colors.cYellow("OpenWeatherMap API key not defined") + " in process.env"); }
		if (process.env.osu_api_key === null) { console.log(colors.cYellow("Osu API key not defined") + " in process.env"); }
	} else {
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
}

function evaluateString(msg) {
	if (msg.author.id != config.admin_id) { console.log(colors.cWarn(" WARN ") + "Somehow an unauthorized user got into eval!"); return; }
	var timeTaken = new Date();
	console.log("Running eval");
	var result;
	try { result = eval("try{" + msg.content.substring(7).replace(/\n/g, "") + "}catch(err){console.log(colors.cError(\" ERROR \")+err);bot.sendMessage(msg, \"```\"+err+\"```\");}");
	} catch (e) { console.log(colors.cError(" ERROR ") + e); bot.sendMessage(msg, "```" + e + "```"); }
	if (result && typeof result !== "object") {
		bot.sendMessage(msg,  "`Time taken: " + (timeTaken - msg.timestamp) + "ms`\n" + result);
		console.log("Result: " + result);
	}
}

setInterval(() => {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Updated bot's game"); }
}, 400000); //change playing game every 12 minutes

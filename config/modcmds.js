var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var colors = require("./colors.js");
var fs = require("fs");
var JsonDB = require("node-json-db");
var feedparser = require("ortoo-feedparser");
var request = require("request");
var degrees = require("./degrees.json").degrees;
var weather = require("./weathereffects.json").weather;
var taskTimer = require("tasktimer");
var quotes = require("./quotes.json").quotes;
var jpics = require("./jirachipics.json").jpics;

var feedURL = "https://www.youtube.com/feeds/videos.xml?channel_id=UClrB57UsYgwXS1iPXaPr-fA"

var db = new JsonDB("./database/Sleepybase", true, true);

var confirmCodes = []; //stuff for announce
var announceMessages = [];

/*======
PrimalFunctions
========*/

function correctUsage(cmd) {
	return (commands.hasOwnProperty(cmd)) ? "Usage: `" + config.mod_command_prefix + "" + cmd + " " + commands[cmd].usage + "`": "The usage should be displayed, however, PrimalMew has made a mistake. Please let him know.";
}

function unJail(bot, msg, users, time, role) {
	setTimeout(() => {
		users.map((user) => {
			if (msg.channel.server.members.get("name", user.username) && msg.channel.server.roles.get("name", role.name) && bot.memberHasRole(user, role)) {
				bot.removeMemberFromRole(user, role);
			}
		});
	}, time * 60000);
}

function giveRole(bot, msg, users, role) {
	users.map((user) => {
		if (msg.channel.server.members.get("name", user.username) && msg.channel.server.roles.get("name", role.name)) {
			bot.addMemberToRole(user, role);
		}
	});
}

/*======
Commands
=======*/

var aliases = {
	"h": "help", "commands": "help",
	"s": "stats", "stat": "stats", "status": "stats",
	"play": "playing",
	"c": "clean",
	"p": "prune",
	"l": "leave", "leaves": "leave",
	"a": "announce", "ann": "announce",
	"change": "changelog", "logs": "changelog", "changelogs": "changelog",
	"rolec": "color", "rolecolor": "color",
	"gc": "givecolor", "setcolor": "givecolor",
	"rmcolor": "removecolor", "takecolor": "removecolor", "rc": "removecolor", "deletecolor": "removecolor",
};

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]", deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			var toSend = [];
			if (!suffix) {
				toSend.push("Use -help [command] to get info on a specific command.");
				toSend.push("");
				toSend.push("**|Commands|**\n");
				Object.keys(commands).forEach(function(cmd) {
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { toSend.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
					} else { toSend.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
				});
				bot.sendMessage(msg.author, "<:Bot:230821190648856577>\n" + toSend);
			} else { //if user wants info on a command
				if (commands.hasOwnProperty(suffix)) {
					toSend.push("**" + config.mod_command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { toSend.push("**Usage:** `" + config.mod_command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { toSend.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { toSend.push("*This command will delete the message that activates it*"); }
					bot.sendMessage(msg, "<:Bot:230821190648856577>\n" + toSend);
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Command `" + suffix + "` not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "", cooldown: 30, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id || msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
				var toSend = [];
				toSend.push("```");
				toSend.push("Uptime (may be inaccurate): " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
				toSend.push("Connected to " + bot.servers.length + " servers, " + bot.channels.length + " channels, and " + bot.users.length + " users.");
				toSend.push("Memory Usage: " + Math.round(process.memoryUsage().rss / 1024 / 1000) + "MB");
				toSend.push("Running SleepyBot v" + version);
				toSend.push("Commands processed this session: " + commandsProcessed + " + " + talkedToTimes + " cleverbot");
				toSend.push("```");
				bot.sendMessage(msg, "<:Bot:230821190648856577>\n" + toSend);
			} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Only Mayors can do this.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"playing": {
		desc: "Allows the bot owner to set the game.",
		usage: "[game]", cooldown: 10, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id) {
				if (!suffix) { bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
				} else { bot.setPlayingGame(suffix); if (config.debug) { console.log(colors.cDebug(" DEBUG ") + msg.author.username + " changed the 'game being playing' to: " + suffix); } }
			} else { bot.setPlayingGame("with " + msg.author.username); }
		}
	},
	"setnickname": {
		desc: "SleepyBot gets the nickname: DJ-SleepyBot",
		usage: "[nickname]", cooldown: 10, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			var args = suffix.split(" ");
			bot.setNickname("95634659290906624", args[0]);
			bot.sendMessage(msg, "`Success`!\nMy nickname is now **" + args[0] + "**.");
		}
	},
	"setdj": {
		desc: "SleepyBot gets the nickname: DJ-SleepyBot",
		usage: "", cooldown: 10, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			bot.setNickname("95634659290906624", "DJ-SleepyBot");
			bot.sendMessage(msg, "`SleepyBot is best DJ! Now I am a DJ.`");
		}
	},
	"setnormal": {
		desc: "SleepyBot goes back to his old name.",
		usage: "", cooldown: 10, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			bot.setNickname("95634659290906624", "");
			bot.sendMessage(msg, "`My name has returned to normal`. :thumbsup:");
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of SleepyBot messages 1-100>",
		cooldown: 10, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix)) { //if suffix has digits
				if (msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
					bot.getChannelLogs(msg.channel, 100, (error, messages) => {
						if (error) { console.log(colors.cWarn(" WARN ") + "Something went wrong while fetching logs."); return; }
						if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Cleaning bot messages..."); }
						var todo = parseInt(suffix),
						delcount = 0;
						for (var i = 0; i < 100; i++) {
							if (todo <= 0 || i == 99) {
								bot.sendMessage(msg, "<:Bot:230821190648856577> Successfully cleaned up " + delcount + " messages.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "COMPLETE! Deleted " + delcount + " messages."); }
								return;
							}
							if (messages[i].author == bot.user) {
								bot.deleteMessage(messages[i]);
								delcount++;
								todo--;
							}
						}
					});
				} else { bot.sendMessage(msg, "⚠ You don't have permission to do this. ⚠", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			} else { bot.sendMessage(msg, correctUsage("clean"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"prune": {
		desc: "Cleans the specified number of messages from the channel.",
		usage: "<1-100> [if it contains this] | <1-100> user <username> | <1-100> images",
		cooldown: 10, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix.split(" ")[0]) && suffix.split(" ")[0].length < 4) {
				if (!msg.channel.isPrivate) {
					if (msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
						if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
							bot.getChannelLogs(msg.channel, 100, { "before": msg }, (error, messages) => {
								if (error) { console.log(colors.cWarn(" WARN ") + "Something went wrong while fetching logs."); return; }
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Pruning messages..."); }
								var todo = parseInt(suffix.split(" ")[0]);
								var hasTerm = false, hasUser = false, hasImages = false;
								var term = "", username = "";
								if (suffix.split(" ").length > 1 && suffix.split(" ")[1].toLowerCase() !== "user" && suffix.split(" ")[1].toLowerCase() !== "images" && suffix.split(" ")[1].toLowerCase() !== "image") { hasTerm = true; term = suffix.substring(suffix.indexOf(" ") + 1);
								} else if (suffix.split(" ").length > 2 && suffix.split(" ")[1].toLowerCase() === "user") {
									if (msg.mentions.length < 1) { hasUser = true; username = suffix.replace(/\d+ user /, "").toLowerCase();
									} else if (msg.mentions.length > 1) { bot.sendMessage(msg, "⚠ Can only prune one user at a time", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return;
									} else { username = msg.mentions[0].username.toLowerCase(); hasUser = true; }
								} else if (suffix.split(" ").length == 2 && (suffix.split(" ")[1].toLowerCase() === "images" || suffix.split(" ")[1].toLowerCase() === "image")) { hasImages = true;
								} else if (suffix.split(" ").length > 1) { bot.sendMessage(msg, correctUsage("prune"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return; }
								var delcount = 0;
								for (var i = 0; i < 100; i++) {
									if (todo <= 0 || i == 99) {
										if (!hasImages && !hasTerm && !hasUser) { bot.sendMessage(msg, "<:Bot:230821190648856577> Alright, " + msg.sender + ", I've successfully deleted " + delcount + " messages.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
										} else if (hasImages) { bot.sendMessage(msg, "<:Bot:230821190648856577> Alright, " + msg.sender + ", I've successfully deleted " + delcount + " images", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
										} else if (hasTerm) { bot.sendMessage(msg, "<:Bot:230821190648856577> Alright, " + msg.sender + ", I've successfully deleted " + delcount + " messages containing " + term, (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
										} else if (hasUser) { bot.sendMessage(msg, "<:Bot:230821190648856577> Alright, " + msg.sender + ", I've successfully deleted " + delcount + " messages from " + username + ".", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
										if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "COMPLETE! Deleted " + delcount + " messages."); }
										return;
									}
									if (hasTerm && messages[i].content.indexOf(term) > -1) {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									} else if (hasUser && messages[i].author.username.toLowerCase() == username) {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									} else if (hasImages && messages[i].attachments && JSON.stringify(messages[i].attachments) !== "[]") {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									} else if (!hasTerm && !hasUser && !hasImages) {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									}
								}
							});
						} else { bot.sendMessage(msg, "⚠ SleepyBot doesn't have the right permissions. You must give it's role the ability to delete messages in this channel. ⚠", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					} else { bot.sendMessage(msg, "⚠ I'm affraid you don't have permission to do that. ⚠", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				} else { bot.sendMessage(msg, "⚠ Not possible in Direct Messages. ⚠"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }; }
			} else { bot.sendMessage(msg, correctUsage("prune"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"addrole": {
		desc: "Add the specified member to the specified role.",
		usage: "[user] [role]",
		deleteCommand: false,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				/*if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "⚠ SleepyBot can't manage roles. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else*/ if (suffix && msg.mentions.length > 0) {
					var args = suffix.split(" ");
					var role = msg.channel.server.roles.get('name', args[1])
					if (role) {
						msg.mentions.map((user) => {
							bot.addMemberToRole(user, role);
						});
					} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Role `" + suffix + "` is non-existent dude. This could be due to the fact that it is case sensitive.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					giveRole(bot, msg, msg.mentions, role);
					bot.sendMessage(msg, "<:Bot:230821190648856577> Role: `" + role.name + "` Successfully added.");
				} else { bot.sendMessage(msg, correctUsage("addrole")); }
			} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Must execute command in a server."); }
		}
	},
	"kick": {
		desc: "Kick a user with a message",
		usage: "[user] [reason]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("kickMembers")) { bot.sendMessage(msg, "⚠ SleepyBot can't kick members. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0) {
				var kickMessage = suffix.replace(/<@\d+>/g, "").trim();
				msg.mentions.map((unlucky) => {
					msg.channel.server.kickMember(unlucky);
					if (kickMessage) { bot.sendMessage(unlucky, kickMessage); }
				});
				bot.sendMessage(msg, "<:Bot:230821190648856577> Okay, " + msg.sender + ", They've been kicked from SleepyTown!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else { bot.sendMessage(msg, correctUsage("kick"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"ban": {
		desc: "Ban a user with the reason.",
		usage: "[user] [reason]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!msg.channel.permissionsOf(msg.author).hasPermission("banMembers") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("banMembers")) { bot.sendMessage(msg, "⚠ SleepyBot can't kick members. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0) {
				var banMessage = suffix.replace(/<@\d+>/g, "").trim();
				msg.mentions.map((unlucky) => {
					msg.channel.server.banMember(unlucky, 1);
					if (banMessage) { bot.sendMessage(unlucky, banMessage); }
				});
				bot.sendMessage(msg, "<:SleepyBan:210155487570690048> Okay, " + msg.sender + ", he is banished from ever enter this town.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else { bot.sendMessage(msg, correctUsage("ban"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"jail": {
		desc: "jail users for specified time.",
		usage: "[user] [time in minutes]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			/*if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id && !bot.memberHasRole(msg.author, "215231289375064064")) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "⚠ SleepyBot can't manage roles. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else*/ if (suffix && msg.mentions.length > 0 && /^(<@\d+>( ?)*)*( ?)*(\d+(.\d+)?)$/.test(suffix.trim())) {
				var time = parseFloat(suffix.replace(/<@\d+>/g, "").trim());
				var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "jailed" });
				if (role) {
					msg.mentions.map((user) => {
						if (!bot.memberHasRole(user, role)) {
							bot.addMemberToRole(user, role);
						}
					});
					unJail(bot, msg, msg.mentions, time, role);
					bot.sendMessage(msg, "<:Bot:230821190648856577> Alright, " + msg.sender + ", I've jailed this criminal.");
					bot.sendFile(msg, "./images/jirachi_get_jailed.png");
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Role 'Jailed' not found.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("jail"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"unjail": {
		desc: "Unjail the specified user.",
		usage: "[user]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			/*if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "⚠ SleepyBot can't manage roles. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else*/ if (suffix && msg.mentions.length > 0) {
				var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "jailed" });
				if (role) {
					msg.mentions.map((user) => {
						if (bot.memberHasRole(user, role)) {
							bot.removeMemberFromRole(user, role);
						}
					});
					bot.sendMessage(msg, "<:Bot:230821190648856577> Alrighty, " + msg.sender + ", I released them from prison.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Role `Jailed` not found.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("unjail"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"bad": {
		desc: "This m*ther f*cker has some sh*tty opinions dude. BAD SAUCE.",
		usage: "[user] [time in minutes]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "⚠ SleepyBot can't manage roles. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0 && /^(<@\d+>( ?)*)*( ?)*(\d+(.\d+)?)$/.test(suffix.trim())) {
				var time = parseFloat(suffix.replace(/<@\d+>/g, "").trim());
				var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "bad opinions" });
				if (role) {
					msg.mentions.map((user) => {
						var toSend = [], count = 0;
							toSend.push("Okay, @" + user.username + ", your opinions are far out dude.");
						if (!bot.memberHasRole(user, role)) {
							bot.addMemberToRole(user, role);
						}
					});
					unJail(bot, msg, msg.mentions, time, role);
					bot.sendMessage(msg, "<:Bot:230821190648856577> Dude, " + msg.sender + ", you're right. That fam had some shitty opinions... :fire:", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> The role 'Bad Opinions' is not found.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("bad"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"unbad": {
		desc: "Remove users from the bad opinions.",
		usage: "[user]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "⚠ You don't have permission to do that. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "⚠ SleepyBot can't manage roles. Give it's role the right permissions to do so. ⚠", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0) {
				var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "bad opinions" });
				if (role) {
					msg.mentions.map((user) => {
						var toSend = [], count = 0;
							toSend.push("@" + user.username + ", it's all good. I hope you don't make any bad opinions in the future...");
						if (bot.memberHasRole(user, role)) {
							bot.removeMemberFromRole(user, role);
						}
					});
					bot.sendMessage(msg, "<:Bot:230821190648856577> It's done, Lord " + msg.sender + ". His opinions are okay, i guess. For now....", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> The role `Bad Opinions` isn't found dude.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("unbad"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"users": {
		desc: "How many users of the specified role.",
		usage: "[role]",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			try{
				var args = suffix.split(" ");
				var role = msg.channel.server.roles.get('name', suffix.replace(/ #?[a-f0-9]{6}/i, ""))
				if (role) {
					bot.sendMessage(msg, "<:SleepyHype:211160529132191744> There is a total of `" + msg.channel.server.usersWithRole(role).length + "` members with the *role* __**" + suffix + "**__.");
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Role `" + suffix + "` is non-existent dude. This could be due to the fact that it is case sensitive.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			}catch(e){
				bot.sendMessage(msg, "`ERROR` Please report it to <@95687096504680448>! ```js\n" + e.message + " " + e.stack.split("\n")[4] + "```");
			}
		}
	},
	"testcmd": {
		desc: "For testing",
		usage: "",
		deleteCommand: true,
		cooldown: 5,
		process: function(bot, msg, suffix) {
			
			const dateobj = new Date();
			var month = dateobj.getMonth() + 1;
			var day = dateobj.getDate();
			var year = dateobj.getFullYear();
	
			var temperature = degrees[Math.floor(Math.random() * (degrees.length))];

			var weatherstatus = weather[Math.floor(Math.random() * (weather.length))];
		
			var cuteJpics = jpics[Math.floor(Math.random() * (jpics.length))];

			bot.channels.get("id", 187977241487998976).sendMessage("<:Bot:230821190648856577> **Good Afternoon** town!\nI was sleeping in because of internet!\nThe date is: `" + month + "/" + day + "/" + year + "`.\nIt's `" + temperature + "` outside and currently " + weatherstatus + ".\n__**TODAY'S QUOTE**__\n" + quotes[Math.floor(Math.random() * (quotes.length))] + ".\nHave a nice rest of the day! <:SleepyHype:211160529132191744>");
			setTimeout(() => {
				bot.channels.get("id", 187977241487998976).sendMessage("Also, here's a *really cute* random __Jirachi__!");
			},200); 
			setTimeout(() => {
				bot.channels.get("id", 187977241487998976).sendFile(cuteJpics);
			},250);
		}
	},
	"leave": {
		desc: "SleepyBot will leave the server.",
		usage: "", deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") || msg.author.id == config.admin_id) {
					bot.sendMessage(msg, "<:Bot:230821190648856577> What?! But, " + msg.sender + "!? This must be a mistake! I love SleepyTown!").then(
					msg.channel.server.leave());
					console.log(colors.cYellow("Just left server by request of " + msg.sender.username + ". ") + "Currently in only " + bot.servers.length + " servers.");
				} else {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Uh, " + msg.sender + ", How about no... **(Dude, you can't kick people...)**");
					console.log(colors.cYellow("Non-privileged user: " + msg.sender.username) + " tried to make me leave the server.");
				}
			} else { bot.sendMessage(msg, "⚠ I, like, can't leave a Direct Message, so... ⚠", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"announce": {
		desc: "Send a PM to all users in a server. Admin only",
		deleteCommand: false, usage: "[message]", cooldown: 1,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "<:Bot:230821190648856577> Specify a message to announce.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (msg.channel.isPrivate && msg.author.id != config.admin_id) { bot.sendMessage(msg, "<:Bot:230821190648856577> Command not available outside of a SleepyTown.",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.isPrivate) { if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "Mayor's only...", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; } }
			if (!msg.channel.isPrivate) {
				if (/^\d+$/.test(suffix)) {
					var index = confirmCodes.indexOf(parseInt(suffix));
					if (index == -1) { bot.sendMessage(msg, "Code not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "<:Bot:230821190648856577> Working on it, this might take a bit...");
					msg.channel.server.members.forEach((usr) => {
						setTimeout(() => {
							bot.sendMessage(usr, "📣 " + announceMessages[index] + " - from " + msg.author + " on " + msg.channel.server.name);
						}, 1000);
					});
					if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Announced \"" + announceMessages[index] + "\" to members of " + msg.channel.server.name); }
				} else {
					announceMessages.push(suffix);
					var code = Math.floor(Math.random() * 100000);
					confirmCodes.push(code);
					bot.sendMessage(msg, "⚠ This sends a message to *all* users in the server. If you're sure you want to do this say `" + config.mod_command_prefix + "announce " + code + "`");
				}
			} else if (msg.channel.isPrivate && msg.author.id == config.admin_id) {
				if (/^\d+$/.test(suffix)) {
					var index = confirmCodes.indexOf(parseInt(suffix));
					if (index == -1) { bot.sendMessage(msg, "Code not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Working on it, this might take a bit...");
					bot.servers.forEach((svr) => {
						setTimeout(() => {
							bot.sendMessage(svr.defaultChannel, "📣 " + announceMessages[index] + " - from your mayor, " + msg.author.username);
						}, 1000);
					});
					if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Announced \"" + announceMessages[index] + "\" to all servers"); }
				} else {
					announceMessages.push(suffix);
					var code = Math.floor(Math.random() * 100000);
					confirmCodes.push(code);
					bot.sendMessage(msg, "⚠ This sends a message to *all* servers where I can speak in general. If you're sure you want to do this say `" + config.mod_command_prefix + "announce " + code + "`");
				}
			}
		}
	},
	"changelog": {
		desc: "See recent changes to SleepyBot.",
		deleteCommand: true, usage: "", cooldown: 30,
		process: function(bot, msg, suffix) {
			var chanelogChannel = bot.channels.get("id", "162763537452630017");
			if (!chanelogChannel) { bot.sendMessage(msg, "<:Bot:230821190648856577> Changelog can only be shown in SleepyBot's Official Server.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				bot.getChannelLogs(chanelogChannel, 2, function(err, messages) {
					if (err) { bot.sendMessage(msg, "<:Bot:230821190648856577> There is an error getting the changelogs. It seems that the Channel ID isn't defined. Ask PrimalMew. ERROR CODE: " + err); return; }
					var toSend = ["**|Changelogs|**"];
					toSend.push("|━━━━━━━━━━━━━━━━|");
					toSend.push(messages[1]);
					toSend.push("|━━━━━━━━━━━━━━━━|");
					toSend.push(messages[0]);
					bot.sendMessage(msg, "<:Bot:230821190648856577>\n" + toSend);
				});
			}
		}
	},
	"color": {
		desc: "Change a role's color",
		usage: "[role name] [color in hex]",
		deleteCommand: true, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (/^(.*) #?[A-F0-9]{6}$/i.test(suffix)) {
				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Can only be done in a server!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission to do that. You can't edit roles.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "SleepyBot doesn't have the permissions to edit roles.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				var role = msg.channel.server.roles.get("name", suffix.replace(/ #?[a-f0-9]{6}/i, ""));
				if (role) { bot.updateRole(role, {color: parseInt(suffix.replace(/(.*) #?/, ""), 16)}); bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "The role \"" + suffix.replace(/ #?[a-f0-9]{6}/i, "") + "\" is not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("color"),function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"givecolor": {
		desc: "Give a user a color",
		usage: "[user] [color in hex]",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can only be done in a server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!/^<@(.*)> #?[a-f0-9]{6}$/i.test(suffix)) { bot.sendMessage(msg, correctUsage("givecolor"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission to do that. You can't edit roles.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "SleepyBot doesn't have the permissions to edit roles.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.mentions.length < 1) { bot.sendMessage(msg, "Please mention the user of whose color you want to change.",(erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			var role = msg.channel.server.roles.get("name", "#" + suffix.replace(/(.*) #?/, "").toLowerCase());
			var roleExists = (role) ? true : false;
			msg.mentions.map((user) => {
				msg.channel.server.rolesOfUser(user).map((r) => {
					if (/^#[a-f0-9]{6}$/i.test(r.name)) {
						if (r.name != "#" + suffix.replace(/(.*) #?/, "").toLowerCase()) { bot.removeMemberFromRole(user, r, () => {setTimeout(() => {if (msg.channel.server.usersWithRole(r).length < 1) { bot.deleteRole(r, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }) }},500);}); }
					}
				});
				if (roleExists) {
					bot.addMemberToRole(user, role, (e) => { if (e) { bot.sendMessage(msg, "Error giving member role: " + e); return; } });
					bot.sendMessage(msg, msg.author.username + "It is done.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else {
					msg.channel.server.createRole({color: parseInt(suffix.replace(/(.*) #?/, ""), 16), hoist: false, permissions: [], name: "#" + suffix.replace(/(.*) #?/, "").toLowerCase()}, (e, rl) => {
						if (e) { bot.sendMessage(msg, "Error creating role: " + e); return; }
						role = rl;
						roleExists = true;
						bot.addMemberToRole(user, role, (e) => { if (e) { bot.sendMessage(msg, "Error giving member role: " + e); return; } });
						bot.sendMessage(msg, msg.author.username + "It is done.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					});
				}
			});
		}
	},
	"removecolor": {
		desc: "Clean unused colors | Remove a user's color | Remove a color",
		usage: "clean | user | #hexcolor",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can only be done in a server!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission to do that. You can't edit roles.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "SleepyBot doesn't have the permissions to edit roles.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.mentions.length > 0) {
				msg.mentions.map((user) => {
					msg.channel.server.rolesOfUser(user).map((r) => {
						if (/^#[a-f0-9]{6}$/.test(r.name)) {
							bot.removeMemberFromRole(user, r);
							setTimeout(() => {if (msg.channel.server.usersWithRole(r).length < 1) { bot.deleteRole(r, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }); }},500);
						}
					});
				});
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (/^#?[a-f0-9]{6}$/i.test(suffix.trim())) {
				var role = msg.channel.server.roles.get("name", "#" + suffix.trim().replace(/(.*) #?/, "").toLowerCase());
				if (!role) { bot.sendMessage(msg, "Color not found",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				bot.deleteRole(role, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; } });
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix.trim() == "clean") {
				msg.channel.server.roles.map((role) => {
					if (/^#?[a-f0-9]{6}$/.test(role.name)) {
						if (msg.channel.server.usersWithRole(role).length < 1) { bot.deleteRole(role, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }); }
					}
				});
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else { bot.sendMessage(msg, correctUsage("removecolor"),function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	}
}

exports.commands = commands;
exports.aliases = aliases;

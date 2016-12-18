var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var colors = require("./colors.js");
var request = require("request");
var xml2js = require("xml2js");
var osuapi = require("osu-api");
var ent = require("entities");
var waifus = require("./waifus.json");
var quotes = require("./quotes.json").quotes;
var request = require("request");
var mysql = require("mysql");
var async = require("async");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var pokeapi = require("pokeapi");
var JsonDB = require("node-json-db");

var db = new JsonDB("./database/Sleepybase", true, true);

//POKEDEX VARIABLE temporarily out of service until i figure out how to make it work

/*var pokedex = require("./pokedex.json");*/

var pAPI = pokeapi.v1();

var jailVotes = 0;
var jailIP = 0;

var VoteDB = {}
	,LottoDB = {}
	,Ratings = {};
const IMGUR_CLIENT_ID = (config.use_env) ? process.env.IMGUR_CLIENT_ID: config.imgur_client_id;
const OSU_API_KEY = (config.use_env) ? process.env.osu_api_key : config.osu_api_key;
const OWM_API_KEY = (config.use_env) ? process.env.weather_api_key : config.weather_api_key;
const MAL_USER = (config.use_env) ? process.env.mal_user : config.mal_user;
const MAL_PASS = (config.use_env) ? process.env.mal_pass : config.mal_pass;

/*====================
Functions
====================*/

function correctUsage(cmd) {
	return (commands.hasOwnProperty(cmd)) ? "Usage: `" + config.command_prefix + "" + cmd + " " + commands[cmd].usage + "`": "This should display the correct usage but the bot maker made a mistake";
}

function findUser(members, query) {
	var usr = members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase() == query.toLowerCase() });
	if (!usr) { usr = members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase().indexOf(query.toLowerCase()) == 0 }); }
	if (!usr) { usr = members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase().indexOf(query.toLowerCase()) > -1 }); }
	return usr || false;
}

function autoEndVote(bot, msg) {
	setTimeout(() => {
		if (VoteDB.hasOwnProperty(msg.channel.id)) { commands["vote"].process(bot, msg, "end"); }
	}, 600000); //10 minutes = 600,000
}

function autoEndLotto(bot, msg) {
	setTimeout(() => {
		if (LottoDB.hasOwnProperty(msg.channel.id)) { commands["lotto"].process(bot, msg, "end"); }
	}, 600000);
}

function generateRandomRating(fullName, storeRating) {
	var weightedNumber = Math.floor((Math.random() * 20) + 1); //between 1 and 20
	var score, moreRandom = Math.floor(Math.random() * 4);
	if (weightedNumber < 5) { score = Math.floor((Math.random() * 3) + 1); } //between 1 and 3
	else if (weightedNumber > 4 && weightedNumber < 16) { score = Math.floor((Math.random() * 4) + 4); } //between 4 and 7
	else if (weightedNumber > 15) { score = Math.floor((Math.random() * 3) + 8); } //between 8 and 10
	if (moreRandom === 0 && score !== 1) { score -= 1;
	} else if (moreRandom == 3 && score != 10) { score += 1; }
	if (storeRating) { Ratings[fullName.toLowerCase()] = score; }
	return score;
}

function generateUserRating(bot, msg, fullName) {
	var user = msg.channel.server.members.get("username", fullName);
	if (user === undefined) { return generateRandomRating(); }
	var score = generateRandomRating() - 1;
	try {
		var joined = new Date(msg.channel.server.detailsOfUser(user).joinedAt), now = new Date();
		if (now.valueOf() - joined.valueOf() >= 2592000000) { score += 1; } //if user has been on the server for at least one month +1
	} catch (e) { console.log(colors.cError(" ERROR ") + e.stack); }
	if (msg.channel.permissionsOf(user).hasPermission("manageServer")) { score += 1; } //admins get +1 ;)
	var count = 0;
	bot.servers.map((server) => { if (server.members.get("id", user.id)) { count += 1; } }); //how many servers does the bot share with them
	if (count > 2) { score += 1; } //if we share at least 3 servers
	if (!user.avatarURL) { score -= 1; } //gotta have an avatar
	if (user.username.length > 22) { score -= 1; } //long usernames are hard to type so -1
	if (score > 10) { score = 10; } else if (score < 1) { score = 1; } //keep it within 1-10
	Ratings[fullName.toLowerCase()] = score;
	return score;
}

function generateJSONRating(fullName) {
	var ranking = waifus[fullName];
	var ranges = {
		"1": "1-4", "2": "2-4",
		"3": "4-8", "4": "4-8",
		"5": "5-8", "6": "6-9",
		"7": "7-10", "8": "8-10",
		"9": "10-10",
	};
	var score = Math.floor((Math.random() * ((parseInt(ranges[ranking].split("-")[1], 10) + 1 - parseInt(ranges[ranking].split("-")[0], 10)))) + parseInt(ranges[ranking].split("-")[0], 10))
	var moreRandom = Math.floor(Math.random() * 4); //0-3
	if (score > 1 && moreRandom === 0) { score -= 1; } else if (score < 10 && moreRandom == 3) { score += 1; }
	Ratings[fullName.toLowerCase()] = score;
	return score;
}

/*function jailTrial(bot, msg) {
	setTimeout(() => {
		bot.channels.get("id", 98250343757938688).sendMessage("`25` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
	}, 300000);
	setTimeout(() => {
		bot.channels.get("id", 98250343757938688).sendMessage("`20` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
	}, 600000);
	setTimeout(() => {
		bot.channels.get("id", 98250343757938688).sendMessage("`15` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
	}, 900000);
	setTimeout(() => {
		bot.channels.get("id", 98250343757938688).sendMessage("`10` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
	}, 1200000);
	setTimeout(() => {
		bot.channels.get("id", 98250343757938688).sendMessage("`5` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
	}, 1500000);
	setTimeout(() => {
		bot.channels.get("id", 98250343757938688).sendMessage("`2` minutes and `30` seconds left until the *accused*, **" + usr.username +"**, gets their sentence.");
	}, 1650000);
	setTimeout(() => {
		if (jailVotes <= 9) {
			bot.channels.get("id", 98250343757938688).sendMessage("__The results are in.__\n**" + usr.username + "** is `NOT GUILTY`.\nThey will not be sent to jail.");
			bot.sendFile(msg, body, "./images/objection.png");
			jailVotes = 0;
		} else if (jailVotes >= 10) {
			var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "jailed" });
			if (!bot.memberHasRole(usr, role)) {
				bot.addMemberToRole(usr, role);
			}
			setTimeout(() => {
				bot.channels.get("id", 98250343757938688).sendMessage("__The results are in.__\n**" + usr.username + "** is `GUILTY`.\nThey have been placed in jail. Lord <@95618471806636032> shall decide their fate.");
				bot.sendFile(msg, body, "./images/objection_lost.png");
			}, 500);
			setTimeout(() => {
				jailVotes = 0;
			}, 1000);
		} else { return }
	}, 1800000);
}*/

/*====================
Commands
====================*/

var aliases = {
	"h": "help", "commands": "help",
	"server": "botserver",
	"backwards": "reverse",
	"myid": "id",
	"p": "ping",
	"j": "join", "joins": "join",
	"i": "info",
	"a": "avatar",
	"pick": "choose", "c": "choose",
	"v": "vote",
	"coin": "coinflip", "flip": "coinflip",
	"poll": "strawpoll", "straw": "strawpoll",
	"8": "8ball", "ball": "8ball",
	"w": "weather",
	"g": "google", "lmgtfy": "google",
	"number": "numberfacts", "num": "numberfacts",
	"cat": "catfacts", "meow": "catfacts", "neko": "catfacts",
	"r": "ratewaifu", "rate": "ratewaifu", "waifu": "ratewaifu",
	"imgur": "image", "im": "image"
};

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		deleteCommand: true, shouldDisplay: false, cooldown: 1,
		process: function(bot, msg, suffix) {
			var toSend = [];
			if (!suffix) {
				toSend.push("Use '*help [command]' to get info on a specific command.");
				toSend.push("Mod commands can be found with '-help [command]'.");
				toSend.push("**| Commands |**\n");
				toSend.push("`@" + bot.user.username + " text`\n		Talk to SleepyBot!");
				Object.keys(commands).forEach(function(cmd) {
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { toSend.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n		" + commands[cmd].desc); }
					} else { toSend.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n		" + commands[cmd].desc); }
				});
				var helpMessage = toSend.join("\n");
				var helpPart2 = helpMessage.substring(helpMessage.indexOf("`]lotto`"));
				var helpPart1 = helpMessage.substring(0, helpMessage.indexOf("`]lotto`") - 1);
				bot.sendMessage(msg.author, "<:Bot:230821190648856577> " + helpPart1);
				bot.sendMessage(msg.author, "<:Bot:230821190648856577>" + helpPart2);
			} else {
				if (commands.hasOwnProperty(suffix)) {
					toSend.push("**" + config.command_prefix + "" + suffix + ":** " + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { toSend.push("**Usage:** `" + config.command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { toSend.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { toSend.push("*Delete Command: true*"); }
					bot.sendMessage(msg, "<:Bot:230821190648856577> " + toSend);
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Command `" + suffix + "` not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"server": {
		desc: "Get a link to SleepyBot's Official Server.",
		cooldown: 10, usage: "",
		process: function(bot, msg, suffix) {
			bot.sendMessage(msg, "<:Bot:230821190648856577> An invite to my home: *https://discord.gg/0uMmASW7OYifdsIt*");
		}
	},
	"reverse": {
		desc: "Return's the text backwards.",
		usage: "[text]", deleteCommand: true, cooldown: 5, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			var allowChannel = bot.channels.get("id", "95687096504680448");
			if (!allowChannel) { bot.sendMessage(msg, "<:Bot:230821190648856577> `You can only reverse words in` __**#post-office**__", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				if (suffix) { bot.sendMessage(msg, "\u202e " + suffix); }
			}
		}
	},
	"id": {
		desc: "Returns your ID (or the channel's)",
		usage: "[channel]", deleteCommand: true, cooldown: 2, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix && suffix.trim().replace("\"", "") === "channel") { bot.sendMessage(msg, "<:Bot:230821190648856577> Channel ID: `" + msg.channel.id + "`");
			} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Your ID: " + msg.author.id); }
		}
	},
	"beep": {
		desc: "boop", usage: "", deleteCommand: false, cooldown: 2,
		process: (bot, msg, suffix) => { bot.sendMessage(msg, "<:Bot:230821190648856577>boop!\nTime taken: " + (new Date() - msg.timestamp) + "ms"); }
	},
	"ping": {
		desc: "Replies with pong.",
		cooldown: 2, shouldDisplay: false, usage: "",
		process: function(bot, msg) {
			var timeTaken = new Date();
			var n = Math.floor(Math.random() * 6);
			if (n === 0) { bot.sendMessage(msg, "<:Bot:230821190648856577> pong!\nHere's how long it took me to pong you: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 1) { bot.sendMessage(msg, "<:Bot:230821190648856577> Ping-Pong.\nHere's how long it took me to pong you: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 2) { bot.sendMessage(msg, "<:Bot:230821190648856577> pong.\nHere's how long it took me to pong you: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 3) { bot.sendMessage(msg, "<:Bot:230821190648856577> dude, like, pong.\nHere's how long it took me to pong you: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 4) { bot.sendMessage(msg, "<:Bot:230821190648856577> uh...pong?\nHere's how long it took me to pong you: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 5) { bot.sendMessage(msg, config.command_prefix + "ping! Hah!\nHere's how long it took me to pong you: " + (timeTaken - msg.timestamp) + "ms"); }
		}
	},
	"about": {
		desc: "About SleepyBot.",
		deleteCommand: true, cooldown: 10, usage: "",
		process: function(bot, msg, suffix) {
			bot.sendMessage(msg, "<:Bot:230821190648856577> Hey! I'm " + bot.user.username + "! I was created by PrimalMew in service to Sleepy. Lord of all.");
		}
	},
	"quote": {
		desc: "Make SleepyBot say one of the listed quotes!",
		deleteCommand: false,
		usage: "[none] or specify [number]",
		cooldown: 3,
		process: function (bot, msg, suffix) {
			if (suffix === "0") {
				bot.sendMessage(msg, "<:Bot:230821190648856577> `QUOTE`: Hey - SleepyJirachi [Super Mario Sunshine] `[11/04/2015]`");
			}else if (suffix && /^\d+$/.test(suffix) && quotes.length >= parseInt(suffix) - 1) {bot.sendMessage(msg, quotes[suffix - 1]);}
			else {bot.sendMessage(msg, "<:Bot:230821190648856577> " + quotes[Math.floor(Math.random() * (quotes.length))]);}
			
		}
	},
	"dice": {
		desc: "Rolls a dice.",
		deleteCommand: true,
		usage: "[(rolls)d(sides)]",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var dice = "1d6";
			if (suffix && /\d+d\d+/.test(suffix) && suffix.indexOf('.') == -1) { dice = suffix; }
			request("https://rolz.org/api/?" + dice + ".json", function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					if (roll.details == null) { bot.sendMessage(msg, "<:Bot:230821190648856577> " + roll.result, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (roll.details.length <= 100) { bot.sendMessage(msg, "🎲 Your **" + roll.input + "** resulted in " + roll.result + " " + roll.details);
					} else { bot.sendMessage(msg, "🎲 Your **" + roll.input + "** resulted in " + roll.result); }
				} else { console.log(colors.cWarn(" WARN ") + "Got an error: " + err + ", status code: ", response.statusCode); }
			});
		}
	},
	"roll": {
		desc: "Pick a random number",
		deleteCommand: true,
		usage: "[max]",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var roll = 100;
			try {
				if (suffix && /\d+/.test(suffix)) { roll = parseInt(suffix.replace(/[^\d]/g, "")); }
			} catch (err) { console.log(colors.cError(" ERROR ") + err); bot.sendMessage(msg, "⚠ Error parsing suffix into int", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			bot.sendMessage(msg, "<:Bot:230821190648856577> " + msg.author.username + " rolled **1-" + roll + "** and got " + Math.floor((Math.random() * (roll)) + 1));
		}
	},
	"pgostatus": {
		desc: "Checks and announces Pok�mon Go server status.",
		deleteCommand: false,
		usage: "",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var goURL = "sso.pokemon.com";
			//130.211.188.132 | pgorelease.niaticlabs.com
			var xhr = new XMLHttpRequest();
			xhr.open("GET", goURL, false);
			xhr.send(null);
			if (xhr.status == 200) {
				bot.sendMessage(msg, "<:Bot:230821190648856577> Checking...", (e, sentMsg) => {
					bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")});
			} else {
				var choice = Math.floor(Math.random() * 6);
				if (choice == 0) {
					bot.sendMessage(msg, "<:Bot:230821190648856577>Checking...", (e, sentMsg) => {
						setTimeout(() => {
							bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")
						},2500);
					});
				} else if (choice == 1) {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Checking...", (e, sentMsg) => {
						setTimeout(() => {
							bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")
						},2500);
					});
				} else if (choice == 2) {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Checking...", (e, sentMsg) => {
						setTimeout(() => {
							bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")
						},2500);
					});
				} else if (choice == 3) {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Checking...", (e, sentMsg) => {
						setTimeout(() => {
							bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")
						},2500);
					});
				} else if (choice == 4) {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Checking...", (e, sentMsg) => {
						setTimeout(() => {
							bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")
						},2750);
					});
				} else if (choice == 5) {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Checking...", (e, sentMsg) => {
						setTimeout(() => {
							bot.updateMessage(sentMsg, "<:Bot:230821190648856577> **Google **__**Pokemon Go**__ server status: `Online`\n\n**PTC** __**Pokemon Go**__ server status: `Online`")
						},3000);
					});
				}
			}
		}
	},
	"pgo": {
		desc: "Choose your team! POKEMON GO!",
		deleteCommand: true,
		usage: "[team]",
		cooldown: 10,
		process: function(bot, msg, suffix) {
			if (suffix) {
				setTimeout(() => {
					var roleExplore = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "explorer" });
					if (!bot.memberHasRole(msg.author, roleExplore)) {
						bot.addMemberToRole(msg.author, roleExplore, err => {
							if(err) console.log(err);
						});
						bot.sendMessage(msg, "<:Bot:230821190648856577> *You've been given the* `Explorer` *role*.\nTalk about **Pokemon GO** in <#200409918069669899>.", function(erro, message) { bot.deleteMessage(message, {"wait": 20000}); });
					}
				},1000); 
				
				//~~~~~ VALOR//Team Valor = 201803051906891776
				if (suffix === "valor") {
					
					if (bot.memberHasRole(msg.author, "201803224641044480")) {
						bot.sendMessage(msg, "<:Bot:230821190648856577> You can't become <:goValor:210768762591379456> `Team Valor`!\n*You're already in <:goMystic:210768814349090816> `Team Mystic`.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
						return;
					}
					
					
					
					if (bot.memberHasRole(msg.author, "201803270321209345")) {
						bot.sendMessage(msg, "<:Bot:230821190648856577> You can't become <:goValor:210768762591379456> `Team Valor`!\n*You're already in <:goInstinct:210768863070126082> `Team Instinct`.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
						return;
					}
					
					setTimeout(() => {
						if (!bot.memberHasRole(msg.author, "201803051906891776")) {
							bot.addMemberToRole(msg.author, "201803051906891776", err => {
								if(err) console.log(err);
							});
							bot.sendMessage(msg, "<:Bot:230821190648856577> __Welcome__ to <:goValor:210768762591379456> `Team Valor`, **" + msg.author.name + "**!", function(erro, message) { bot.deleteMessage(message, {"wait": 20000}); });
						} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Dude, you're already part of another team!", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); }); }
					},500); 
				}
				//VALOR END ~~~~~~~~~~//
				
				//
				
				//~~~~~ MYSTIC//Team Mystic = 201803224641044480
				if (suffix === "mystic") {
					
					if (bot.memberHasRole(msg.author, "201803051906891776")) {
						bot.sendMessage(msg, "<:Bot:230821190648856577> You can't become <:goMystic:210768814349090816> `Team Mystic`!\n*You're already in <:goValor:210768762591379456> `Team Valor`.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
						return;
					}
					
					if (bot.memberHasRole(msg.author, "201803270321209345")) {
						bot.sendMessage(msg, "<:Bot:230821190648856577> You can't become <:goMystic:210768814349090816> `Team Mystic`!\n*You're already in <:goInstinct:210768863070126082> `Team Instinct`.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
						return;
					}
					
					setTimeout(() => {
						if (!bot.memberHasRole(msg.author, "201803224641044480")) {
							bot.addMemberToRole(msg.author, "201803224641044480", err => {
								if(err) console.log(err);
							});
							bot.sendMessage(msg, "<:Bot:230821190648856577> __Welcome__ to <:goMystic:210768814349090816> `Team Mystic`, **" + msg.author.name + "**!", function(erro, message) { bot.deleteMessage(message, {"wait": 20000}); });
						} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Dude, you're already part of another team!", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); }); }
					},500); 
				}
				//MYSTIC END ~~~~~~~~~~//
				
				//
				
				//~~~~~ INSTINCT//Team Instinct = 201803270321209345
				if (suffix === "instinct") {
					
					if (bot.memberHasRole(msg.author, "201803051906891776")) {
						bot.sendMessage(msg, "<:Bot:230821190648856577> You can't become <:goInstinct:210768863070126082> `Team Instinct`!\n*You're already in <:goValor:210768762591379456>  `Team Valor`.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
						return;
					}
					
					
					
					if (bot.memberHasRole(msg.author, "201803224641044480")) {
						bot.sendMessage(msg, "<:Bot:230821190648856577> You can't become <:goInstinct:210768863070126082> `Team Instinct`!\n*You're already in <:goMystic:210768814349090816> `Team Mystic`.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
						return;
					}
					
					setTimeout(() => {
						if (!bot.memberHasRole(msg.author, "201803270321209345")) {
							bot.addMemberToRole(msg.author, "201803270321209345", err => {
								if(err) console.log(err);
							});
							bot.sendMessage(msg, "<:Bot:230821190648856577> __Welcome__ to <:goInstinct:210768863070126082> `Team Instinct`, **" + msg.author.name + "**!", function(erro, message) { bot.deleteMessage(message, {"wait": 20000}); });
						} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Dude, you're already part of another team!", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); }); }
					},500); 
				}
				//INSTINCT END ~~~~~~~~~~//
				
				//~~~~~ HELP WITH COMMAND
				if (suffix === "help") {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Hey, " + msg.sender + "!\nYou've executed the `*pgo` help command.\n```Here's some information you may need:```\n**1.** __If you'd like to join__ `Team Valor` __type__ `*pgo valor`.\n**2.** __If you'd like to join__ `Team Mystic` __type__ `*pgo mystic`.\n**3.** __If you'd like to join__ `Team Instinct` __type__ `*pgo instinct`.\n**4.** __You can't join more than one team. Not possible. Just try it.__\n**5.** __If you want to change teams for some weird reason, consult with lord Sleepy.__\n**6.** __Use__ `*pgo suggest [your suggestion]` __to submit a suggestion about the__ `*pgo` __command__.");
				}
				//END HELP ~~~~~~~~~~//
				
				//~~~~~ Who on what teams
				if (suffix === "teams") {
					var roleValor = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "team valor" });
					var roleMystic = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "team mystic" });
					var roleInstinct = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "team instinct" });
					var roleExp = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "explorer" });
					bot.sendMessage(msg, "<:Bot:230821190648856577> \n<:goValor:230678492176580609> **Team Valor**: `" + msg.channel.server.usersWithRole(roleValor).length + "`\n<:goMystic:230678530961178624> **Team Mystic**: `" + msg.channel.server.usersWithRole(roleMystic).length + "`\n<:goInstinct:230678550347382784> **Team Instinct**: `" + msg.channel.server.usersWithRole(roleInstinct).length + "`\n**Total Explorers**: `" + msg.channel.server.usersWithRole(roleExp).length + "`");
				}
				//TEAMS end ~~~~~~~~~~//
			} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Please specify which team you are in, **" + msg.author.name + "**!\n|\n**Example**: `*pgo valor`", function(erro, message) { bot.deleteMessage(message, {"wait": 15000}); }); }
		}
	},
	
	//SUN AND MOON STUFF //
	
	"sun": {
		desc: "You have sun?",
		deleteCommand: true,
		usage: "",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (bot.memberHasRole(msg.author, "249274967500259329")) {
				bot.sendMessage(msg, "<:Bot:230821190648856577> **You've already stated that you got Moon.** `Ask Sleepy if you'd like to switch.`", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
				return;
			}
			
			setTimeout(() => {
				if (!bot.memberHasRole(msg.author, "249274769495556096")) {
					bot.addMemberToRole(msg.author, "249274769495556096", err => {
						if(err) console.log(err);
					});
					bot.sendMessage(msg, "<:Bot:230821190648856577> **You've chosen Sun!**\nWelcome to the light, " + msg.author.name + "!", function(erro, message) { bot.deleteMessage(message, {"wait": 20000}); });
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> *But you're already Sun dude.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); }); }
			},500); 
		}
	},
	"moon": {
		desc: "You have moon?",
		deleteCommand: true,
		usage: "",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (bot.memberHasRole(msg.author, "249274769495556096")) {
				bot.sendMessage(msg, "<:Bot:230821190648856577> **You've already stated that you got Sun.** `Ask Sleepy if you'd like to switch.`", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); });
				return;
			}
			
			setTimeout(() => {
				if (!bot.memberHasRole(msg.author, "249274967500259329")) {
					bot.addMemberToRole(msg.author, "249274967500259329", err => {
						if(err) console.log(err);
					});
					bot.sendMessage(msg, "<:Bot:230821190648856577> **You've chosen Moon!**\nWelcome to the darkness, " + msg.author.name + "!", function(erro, message) { bot.deleteMessage(message, {"wait": 20000}); });
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> *But you're already Moon dude.*", function(erro, message) { bot.deleteMessage(message, {"wait": 5000}); }); }
			},500); 
		}
	},
	
	"sunvsmoon": {
		desc: "Who's winning?",
		deleteCommand: true,
		usage: "",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var roleSun = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "sun" });
			var roleMoon = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "moon" });
			bot.sendMessage(msg, "<:Bot:230821190648856577> \n<:Sun:231085009593696256> **Sun**: `" + msg.channel.server.usersWithRole(roleSun).length + "`\n<:Moon:231085042347016194> **Moon**: `" + msg.channel.server.usersWithRole(roleMoon).length + "`");
	
		}
	},
	"moonvssun": {
		desc: "Who's winning?",
		deleteCommand: true,
		usage: "",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var roleSun = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "sun" });
			var roleMoon = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "moon" });
			bot.sendMessage(msg, "<:Bot:230821190648856577> \n<:Sun:231085009593696256> **Sun**: `" + msg.channel.server.usersWithRole(roleSun).length + "`\n<:Moon:231085042347016194> **Moon**: `" + msg.channel.server.usersWithRole(roleMoon).length + "`");
	
		}
	},
	
	// SUN AND MOON STUFF END //
	
	"artsuggest": {
		desc: "Suggest your art to be used by SleepyBot in the morning.",
		deleteCommand: true,
		usage: "[attached art]",
		cooldown: 600,
		process: function(bot, msg, suffix) {
			try{
				var args = suffix.split(" ");
				var attachments = msg.attachments[0];
				bot.channels.get("id", 146685904654696448).sendMessage("<:Bot:230821190648856577> [**MORNING ART SUGGESTION**]\n[**"+ msg.author.name + "**](*" + msg.author.id + "*) in channel `" + msg.channel.name + "`(`" + msg.channel.id + "`)\n__**Their Art**__\n" + msg.attachments[0].url);
				setTimeout(() => {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Your art suggestion has been sent. :ok:");
				},2000);
			}catch(e){
				bot.sendMessage(msg, "`ERROR` Please report it to <@95687096504680448>! ```js\n"+ e.message + " " + e.stack.split("\n")[4] + "```");
			}
		}
	},
	"suggest": {
		desc: "Make a general suggestion about SleepyBot!",
		deleteCommand: true,
		usage: "[message]",
		cooldown: 600,
		process: function(bot, msg, suffix) {
			var args = suffix.split(" ");
			if(args.length >= 2){
				try{
					var args = suffix.split(" ");
					var message = args.splice(null, args.length).join(" ");
					bot.channels.get("id", 146685904654696448).sendMessage("<:Bot:230821190648856577> [**GENERAL SUGGESTION**]\n[**"+ msg.author.name+ "**](*" +msg.author.id+ "*) in channel `" +msg.channel.name+ "`(`" +msg.channel.id+ "`)\n**They said**: `"+ message + "`");
					setTimeout(() => {
						bot.sendMessage(msg, "<:Bot:230821190648856577> Your suggestion has been sent. :ok:");
					},500);
				}catch(e){
					bot.sendMessage(msg, "`ERROR` Please report it to <@95687096504680448>! ```js\n"+ e.message + " " + e.stack.split("\n")[4] + "```");
				}
			}
		}
	},
	"pgosuggest": {
		desc: "Make a suggestion about pokemon go to SleepyBot!",
		deleteCommand: true,
		usage: "[message]",
		cooldown: 600,
		process: function(bot, msg, suffix) {
			var args = suffix.split(" ");
			if(args.length >= 2){
				try{
					var args = suffix.split(" ");
					var message = args.splice(null, args.length).join(" ");
					bot.channels.get("id", 146685904654696448).sendMessage("<:Bot:230821190648856577> [**POKEMON GO SUGGESTION**]\n[**"+ msg.author.name+ "**](*" +msg.author.id+ "*) in channel `" +msg.channel.name+ "`(`" +msg.channel.id+ "`)\n**They said**: `"+ message + "`");
					setTimeout(() => {
						bot.sendMessage(msg, "<:Bot:230821190648856577> Your `*pgo` suggestion has been sent. :ok:");
					},500);
				}catch(e){
					bot.sendMessage(msg, "`ERROR` Please report it to <@95687096504680448>! ```js\n"+ e.message + " " + e.stack.split("\n")[4] + "```");
				}
			}
		}
	},
	"jailvote": {
		desc: "Vote for a criminal to be sent to jail!",
		deleteCommand: true,
		usage: "[user]",
		cooldown: 1800,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (suffix) {
					msg.mentions.map(function(usr) {
						if (msg.mentions.length > 0) {
							try {
								var chnl = bot.channels.get("name", "town-hall").id;
								
								if (jailIP == 1) {
									jailVotes += 1;
									bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\nThanks, " + msg.sender + "!\n__Your vote has been counted__.\n**Total Votes Now**: `" + jailVotes + "`\n**Accused**: `" + usr.username + "`");
								} else {
									jailVotes += 1;
									jailIP = 1;
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\nA trial against `" + usr.username + "` is now in session, thanks to " + msg.sender + ".\n*The trial will be held for* `30` *minutes*.\nPlease use `*jailvote @" + usr.username + "` to cast your vote against the accused.");
									}, 500);
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n`25` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
									}, 300000);
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n`20` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
									}, 600000);
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n`15` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
									}, 900000);
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n`10` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
									}, 1200000);
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n`5` minutes left until the *accused*, **" + usr.username +"**, gets their sentence.");
									}, 1500000);
									setTimeout(() => {
										bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n`2` minutes and `30` seconds left until the *accused*, **" + usr.username +"**, gets their sentence.");
									}, 1650000);
									setTimeout(() => {
										if (jailVotes <= 9) {
											bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n__The results are in.__\nThere were `" + jailVotes + "` total votes.\n**" + usr.username + "** is `NOT GUILTY`.\nThey will not be sent to jail.");
											bot.sendFile(msg, body, "./images/objection.png");
											jailVotes = 0;
											jailIP = 0;
										} else if (jailVotes >= 10) {
											var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "jailed" });
											if (!bot.memberHasRole(usr, role)) {
												bot.addMemberToRole(usr, role);
											}
											setTimeout(() => {
												bot.channels.get("id", chnl).sendMessage("```SLEEPYBOT COURT```\n__The results are in.__\nThere were `" + jailVotes + "` total votes.\n**" + usr.username + "** is `GUILTY`.\nThey have been placed in jail. Lord <@95618471806636032> shall decide their fate.");
												bot.sendFile(msg, body, "./images/objection_lost.png");
											}, 500);
											setTimeout(() => {
												jailVotes = 0;
												jailIP = 0;
											}, 1000);
										} else { return }
									}, 1800000);
								}
								//jailTrial(bot, msg);
							} catch (err) { console.log(colors.cError(" ERROR ") + err); }
						} else { bot.sendMessage(msg, "<:Bot:230821190648856577> __Please specify the user.__"); }
					});
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> **Total Votes**: `" + jailVotes + "`\n**Accused**: `" + usrr.username + "`"); }
			} else { bot.sendMessage(msg, "`DENIED` - You must do this is Sleepy Town, dude."); }
		}
	},
	"dbtest": {
		desc: "test",
		deleteCommand: true, cooldown: 10, usage: "",
		process: function(bot, msg, suffix) {
			try{
				var data = db.getData("/test2/my/test");
			} catch(e) {
				console.log(e);
			}
			db.push("/fcdb/users/" + msg.author.id, msg.author.id);
			db.push("/fcdb/usernames/" + msg.author.name, msg.author.id);
			db.push("/fcdb/" + msg.author.id + "/", "Not known. Ask them to specify with *fc define [their FC]");
		}
	},
	"votefor": {
		desc: "Vote for Sun or Moon!",
		deleteCommand: false,
		cooldown: 30,
		usage: "[sun or moon]",
		process: function(bot, msg, suffix) {
			if (suffix === "sun") {
				try{
					var datausers = db.getData("/smvote/users/" + msg.author.id);
				} catch(e) {
					console.log(e);
				}
				
				if (msg.author.id == datausers) {
					var datasun = db.getData("/smvote/sun/votes");
					bot.sendMessage(msg, "<:Bot:230821190648856577> **Thanks** but you already *voted*, " + msg.author.name + ".\nTotal votes for **Sun** so far: `" + datasun + "`");
				} else {
					try{
						var datasun = db.getData("/smvote/sun/votes");
					} catch(e) {
						console.log(e);
					}
					var user = msg.author.id;
					db.push("/smvote/sun/votes", datasun + 1);
					db.push("/smvote/users/" + msg.author.id, msg.author.id);
					try{
						var datasun = db.getData("/smvote/sun/votes");
					} catch(e) {
						console.log(e);
					}
					setTimeout(() => {
						bot.sendMessage(msg, "<:Bot:230821190648856577> **Thank you** for your *vote*, " + msg.author.name + "!\n__You voted for__ `Sun`.\nTotal votes for **Sun** so far: `" + datasun + "`");
					}, 1500);
				}
			} else if (suffix === "moon") {
				try{
					var datausers = db.getData("/smvote/users/" + msg.author.id);
				} catch(e) {
					console.log(e);
				}
				
				if (msg.author.id == datausers) {
					var datamoon = db.getData("/smvote/moon/votes");
					bot.sendMessage(msg, "<:Bot:230821190648856577> **Thanks** but you already *voted*, " + msg.author.name + ".\nTotal votes for **Moon** so far: `" + datamoon + "`");
				} else {
					try{
						var datamoon = db.getData("/smvote/moon/votes");
					} catch(e) {
						console.log(e);
					}
					var user = msg.author.id;
					db.push("/smvote/moon/votes", datamoon + 1);
					db.push("/smvote/users/" + msg.author.id, msg.author.id);
					try{
					var datamoon = db.getData("/smvote/moon/votes");
					} catch(e) {
						console.log(e);
					}
					setTimeout(() => {
						bot.sendMessage(msg, "<:Bot:230821190648856577> **Thank you** for your *vote*, " + msg.author.name + "!\n__You voted for__ `Moon`.\nTotal votes for **Moon** so far: `" + datamoon + "`");
					}, 1550);
				}
			} else if (suffix === "votes") {
				try{
					var datamoon = db.getData("/smvote/moon/votes");
				} catch(e) {
					console.log(e);
				}
				
				try{
					var datasun = db.getData("/smvote/sun/votes");
				} catch(e) {
					console.log(e);
				}
				var toSend = [];
				toSend.push("<:Bot:230821190648856577> __Total votes__ for **Pokemon Moon** *so far*: `" + datamoon + "`");
				toSend.push("<:Bot:230821190648856577> __Total votes__ for **Pokemon Sun** so far: `" + datasun + "`");
				bot.sendMessage(msg, toSend);
			}
		}
	},
	"fc": {
		desc: "Get another user or your Friend Code.",
		deleteCommand: false,
		cooldown: 30,
		usage: "[user] or [define]",
		process: function(bot, msg, suffix) {
			var args = suffix.split(" ");
			if (suffix.length > 1) {
				try{
					var datausers = db.getData("/fcdb/users/" + msg.author.id);
				} catch(e) {
					console.log(e);
				}
				
				if (msg.author.id == datausers) {
					var datafc = db.getData("/fcdb/" + msg.author.id + "/");
					bot.sendMessage(msg, "<:Bot:230821190648856577> " + msg.author.name + "'s FC is `" + datafc + "`");
				} else {
					try{
						var datafc = db.getData("/fcdb/" + msg.author.id + "/");
					} catch(e) {
						console.log(e);
					}
					var user = msg.author.id;
					db.push("/fcdb/" + msg.author.id + "/", "Not known. Ask them to specify with *fc define [their FC]");
					db.push("/fcdb/users/" + msg.author.id, msg.author.id);
					setTimeout(() => {
						db.push("/fcdb/usernames/" + msg.author.name, msg.author.id);
					}, 500);
					try{
						var datafc = db.getData("/fcdb/" + msg.author.id + "/");
					} catch(e) {
						console.log(e);
					}
					setTimeout(() => {
						bot.sendMessage(msg, "<:Bot:230821190648856577> They haven't specified their FC yet. Ask them to use the command `*fc define [their FC]`.");
					}, 1500);
				}
			} else if (suffix === "define") {
				
				if(args.length >= 3){
					bot.sendMessage(msg, "<:Bot:230821190648856577> *Please use the following format when submitting your FC.*\n`*fc define 0000-0000-0000`");
				} else {
					try{
						var datausers = db.getData("/fcdb/users/" + msg.author.id);
					} catch(e) {
						console.log(e);
					}
				
					if (msg.author.id == datausers) {
						var datafc = db.getData("/fcdb/" + msg.author.id + "/");
						bot.sendMessage(msg, "<:Bot:230821190648856577> FC not yet defined. **Please define it.**");
					} else {
						try{
							var datafc = db.getData("/fcdb/" + msg.author.id + "/");
						} catch(e) {
							console.log(e);
						}
						var args = suffix.split(" ");
						var user = msg.author.id;
						db.push("/fcdb/" + msg.author.id + "/", "Not known. Ask them to specify with *fc define [their FC]");
						db.push("/fcdb/users/" + msg.author.id, msg.author.id);
						setTimeout(() => {
							db.push("/fcdb/usernames/" + msg.author.name, msg.author.id);
						}, 500);
						try{
							var datafc = db.getData("/fcdb/" + msg.author.id + "/");
						} catch(e) {
							console.log(e);
						}
						setTimeout(() => {
							bot.sendMessage(msg, "<:Bot:230821190648856577> FC set to `" + datafc +"`");
						}, 1500);
				 	}
				}
			} else { return; }
		}
	},
	//POKEINFO command temporarily out of service until i figure out how to make it work.
	
	/*"pokeinfo": {
		desc: "Get information about the specified Pokemon from the Pokedex.",
		usage: "[pokemon]",
		deleteCommand: false,
		cooldown: 2,
		shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix) >= parseInt(suffix) - 1) {
				//bot.sendMessage(msg, quotes[suffix - 1]);
				var toSend = [];
				toSend.push("**Name**: `" + pokedex.suffix.ename + ".`");
				toSend.push("**Type(s)**: `" + pokedex.suffix.type + "`");
				toSend.push("**Dex #**: `" + pokedex.suffix.id + "`");
				toSend.push("**Base Stats**:");
				toSend.push("    __HP__: `" + pokedex.suffix.base.HP + "`");
				toSend.push("    __Attack__: `" + pokedex.suffix.base.Attack + "`");
				toSend.push("    __Defense__: `" + pokedex.suffix.base.Defense + "`");
				toSend.push("    __Sp. Attack__: `" + pokedex.suffix.base.Sp.Atk + "`");
				toSend.push("    __Sp. Defense__: `" + pokedex.suffix.base.Sp.Def + "`");
				toSend.push("    __Speed__: `" + pokedex.suffix.base.Speed + "`");
				
				bot.sendMessage(msg, toSend);
			} else { bot.sendMessage(msg, correctUsage("pokeinfo"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},*/
	
	"info": {
		desc: "Gets info on the server or a user if mentioned.",
		usage: "[username]",
		deleteCommand: true,
		cooldown: 10,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (suffix) {
					if (msg.mentions.length > 0) {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "<:Bot:230821190648856577> Woah, " + msg.author.username + ", calm down please. You can't get details on everyone at the same time, dude!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						if (msg.mentions.length > 4) { bot.sendMessage(msg, "<:Bot:230821190648856577> 4 user limit.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						msg.mentions.map(function(usr) {
							var toSend = [], count = 0;
							toSend.push("ℹ on " + usr.username + " (" + usr.discriminator + ")");
							toSend.push("**User ID:** " + usr.id);
							if (usr.game && usr.game.name !== undefined && usr.game.name !== null && usr.game.name !== "null") toSend.push("**Status:** " + usr.status + " **last played** " + usr.game.name);
							else toSend.push("**Status:** " + usr.status);
							var detailsOf = msg.channel.server.detailsOfUser(usr);
							if (detailsOf) toSend.push("**Joined on:** " + new Date(msg.channel.server.detailsOfUser(usr).joinedAt).toUTCString());
							else toSend.push("**Joined on:** Error");
							var roles = msg.channel.server.rolesOfUser(usr.id).map((role) => { return role.name; });
							if (roles) {
								roles = roles.join(", ").replace("@", "");
								if (roles && roles !== "")
									if (roles.length <= 1500) { toSend.push("**Roles:** `" + roles + "`"); } else { toSend.push("**Roles:** `" + roles.split(", ").length + "`"); }
								else
									toSend.push("**Roles:** `no roles`");
							} else toSend.push("**Roles:** Error");
							bot.servers.map((server) => { if (server.members.indexOf(usr) > -1) { count += 1; } });
							if (count > 1) { toSend.push("Playing on **" + count + "** other servers."); }
							if (usr.avatarURL != null) { toSend.push("**Avatar:** `" + usr.avatarURL + "`"); }
							bot.sendMessage(msg, "<:Bot:230821190648856577>\n" + toSend);
						});
					} else {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "<:Bot:230821190648856577> Woah, " + msg.author.username + ", calm down dude", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						var users = suffix.split(/, ?/);
						if (users.length > 4) { bot.sendMessage(msg, "<:Bot:230821190648856577> 4 user limit.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						users.map(function(user) {
							var usr = findUser(msg.channel.server.members, user);
							if (usr) {
								var toSend = [], count = 0;
								toSend.push("ℹ on " + usr.username + " (" + usr.discriminator + ")");
								toSend.push("**User ID:** " + usr.id);
								if (usr.game && usr.game.name !== undefined && usr.game.name !== null && usr.game.name !== "null") toSend.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
								else toSend.push("**Status:** " + usr.status);
								var detailsOf = msg.channel.server.detailsOfUser(usr);
								if (detailsOf) toSend.push("**Joined on:** " + new Date(msg.channel.server.detailsOfUser(usr).joinedAt).toUTCString());
								else toSend.push("**Joined on:** Error");
								var roles = msg.channel.server.rolesOfUser(usr.id).map((role) => { return role.name; });
								if (roles) {
									roles = roles.join(", ").replace("@", "");
									if (roles && roles !== "")
										if (roles.length <= 1500) { toSend.push("**Roles:** `" + roles + "`"); } else { toSend.push("**Roles:** `" + roles.split(", ").length + "`"); }
									else
										toSend.push("**Roles:** `none`");
								} else toSend.push("**Roles:** Error");
								bot.servers.map((server) => { if (server.members.indexOf(usr) > -1) { count += 1; } });
								if (count > 1) { toSend.push("Playing on **" + count + "** other servers."); }
								if (usr.avatarURL != null) { toSend.push("**Avatar:** `" + usr.avatarURL + "`"); }
								bot.sendMessage(msg, "<:Bot:230821190648856577>\n" + toSend);
							} else bot.sendMessage(msg, "<:Bot:230821190648856577> User \"" + user + "\" not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); });
						});
					}
				} else {
					var toSend = [];
					toSend.push("ℹ **about** " + msg.channel.server.name);
					toSend.push("**Server ID:** " + msg.channel.server.id);
					toSend.push("**Server Owner:** " + msg.channel.server.owner.username + " (**ID:** " + msg.channel.server.owner.id + ")");
					toSend.push("**Server Region:** " + msg.channel.server.region);
					toSend.push("**Current Members:** " + msg.channel.server.members.length + " **Channels:** " + msg.channel.server.channels.length);
					var roles = msg.channel.server.roles.map((role) => { return role.name; });
					roles = roles.join(", ").replace("@", "");
					if (roles.length <= 1500) toSend.push("**Roles:** `" + roles + "`");
					else toSend.push("**Roles:** `" + roles.split(", ").length + "`");
					toSend.push("**Default Channel:** " + msg.channel.server.defaultChannel);
					toSend.push("**Current Channel's ID:** " + msg.channel.id);
					toSend.push("**Server Icon:** `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, "<:Bot:230821190648856577>\n" + toSend);
				}
			} else bot.sendMessage(msg, "<:Bot:230821190648856577> Unavailable in Direct Messages...", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); });
		}
	},
	"avatar": {
		desc: "Get a link to a user's avatar. Can use a comma for multiple users.",
		usage: "[@user]",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) {
				if (msg.author.avatarURL != null) { bot.sendMessage(msg, "<:Bot:230821190648856577> I can get your avatar only in the DMs. Here you go: " + msg.author.avatarURL); return; }
				if (msg.author.avatarURL == null) { bot.sendMessage(msg, "<:Bot:230821190648856577> I can get your avatar only in the DMs, but you don't have one with me."); return; }
			}
			if (msg.mentions.length == 0 && !suffix) { (msg.author.avatarURL != null) ? bot.sendMessage(msg, "<:Bot:230821190648856577> " + msg.author.username + "'s avatar is: " + msg.author.avatarURL) : bot.sendMessage(msg, "<:Bot:230821190648856577> " + msg.author.username + " has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else if (msg.mentions.length > 0) {
				if (msg.everyoneMentioned) { bot.sendMessage(msg, "<:Bot:230821190648856577> Woah, " + msg.author.username + ", could you calm down?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.mentions.length > 6) { bot.sendMessage(msg, "<:Bot:230821190648856577> 6 user limit.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				msg.mentions.map(function(usr) {
					(usr.avatarURL != null) ? bot.sendMessage(msg, "<:Bot:230821190648856577> **" + usr.username + "**'s avatar is: " + usr.avatarURL + "") : bot.sendMessage(msg, "<:Bot:230821190648856577> **" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				});
			} else {
				if (msg.everyoneMentioned) { bot.sendMessage(msg, "<:Bot:230821190648856577> Woah, " + msg.author.username + ", calm down yo.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var users = suffix.split(/, ?/);
				if (users.length > 6) { bot.sendMessage(msg, "<:Bot:230821190648856577> 6 user limt.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				users.map(function(user) {
					var usr = findUser(msg.channel.server.members, user);
					if (usr) { (usr.avatarURL != null) ? bot.sendMessage(msg, "<:Bot:230821190648856577> **" + usr.username + "**'s avatar is: " + usr.avatarURL + "") : bot.sendMessage(msg, "<:Bot:230821190648856577> **" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					} else { bot.sendMessage(msg, "<:Bot:230821190648856577> User \"" + user + "\" not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 20000}); }); }
				});
			}
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
		usage: "[option 1], [option 2], (option), (option)",
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (!suffix || /(.*), ?(.*)/.test(suffix) == false) { bot.sendMessage(msg, correctUsage("choose"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var choices = suffix.split(/, ?/);
			if (choices.length < 2) {
				bot.sendMessage(msg, correctUsage("choose"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				var choice = Math.floor(Math.random() * (choices.length));
				bot.sendMessage(msg, "<:Bot:230821190648856577> This was a hard decision, but I chose **" + choices[choice] + "**");
			}
		}
	},
	"lotto": {
		desc: "Lottery picks a random entered user.",
		usage: "end | enter | new [max entries] | (mentions to pick from) (pick from the users mentioned) | everyone",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var currentchannel = msg.channel.id;
			if (msg.everyoneMentioned || suffix.toLowerCase() == "everyone") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (LottoDB.hasOwnProperty(msg.channel.id)) { bot.sendMessage(msg, "<:Bot:230821190648856577> There can only be one lottery running at a time. There is one currently running.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.sendMessage(msg, "<:Bot:230821190648856577> Out of " + msg.channel.server.members.length + " members on this server, " + msg.channel.server.members.random().username + " won the lottery! Congratulations!");

			} else if (suffix.split(" ")[0] == "new") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (suffix.length > 1) {
					var maxentries = (/^\d+$/.test(suffix.split(" ")[1])) ? parseInt(suffix.split(" ")[1]) : 1;
				}
				if (LottoDB.hasOwnProperty(currentchannel)) {
					bot.sendMessage(msg.channel, "<:Bot:230821190648856577> There can only be one lottery running at a time. There is one currently running.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				} else {
					bot.sendMessage(msg, "<:Bot:230821190648856577> Lottery has been started by **" + msg.author.username + "** with ***" + maxentries + "*** max entries. Use ***-*lotto enter*** to enter this lottery.");
					var object = {"max": maxentries, "msg": msg, "entries": "", "starter": msg.author.id};
					LottoDB[currentchannel] = [];
					LottoDB[currentchannel][0] = object;
					if (suffix.indexOf("-noautoend") == -1) { autoEndLotto(bot, msg); }
				}

			} else if (suffix.replace(" ", "") == "end") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (LottoDB.hasOwnProperty(msg.channel.id)) {
					if (msg.author.id == LottoDB[currentchannel][0].starter || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
						if (LottoDB[currentchannel][0].entries.split(",").length < 3) {
							bot.sendMessage(msg, "<:Bot:230821190648856577> The lottery has ended, however, only one person entered! What?! No winner.");
							delete LottoDB[currentchannel];
						} else {
							var winner = msg.channel.server.members.get("id", LottoDB[currentchannel][0].entries.split(",")[Math.floor((Math.random() * (LottoDB[currentchannel][0].entries.split(",").length - 1)) + 1)]);
							bot.sendMessage(msg, "<:Bot:230821190648856577> From **" + (LottoDB[currentchannel][0].entries.split(",").length - 1) + "** entries the winner of this lottery is " + winner);
							delete LottoDB[currentchannel];
						}
					} else { bot.sendMessage(msg, "<:Bot:230821190648856577> You didn't start this lottery. Only the one who started it can end it.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> No lottery in progress at the moment.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (suffix.replace(" ", "") == "enter") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (LottoDB.hasOwnProperty(currentchannel)) {
					if (LottoDB[currentchannel][0].entries.split(",").indexOf(msg.author.id) > -1) {
						if (LottoDB[currentchannel][0].max < 2) { bot.sendMessage(msg.channel, "<:Bot:230821190648856577> You can only enter this lottery **1** time.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						if (LottoDB[currentchannel][0].entries.split(",").filter(function(value) { return value == msg.author.id; }).length >= LottoDB[currentchannel][0].max) { bot.sendMessage(msg.channel, "<:Bot:230821190648856577> You can only enter this lottery **" + LottoDB[currentchannel][0].max + "** times.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						LottoDB[currentchannel][0].entries = LottoDB[currentchannel][0].entries + "," + msg.author.id;
						bot.sendMessage(msg.channel, "<:Bot:230821190648856577> **" + msg.author.username + "** has been given a lottery ticket!" + msg.author.username + "has been added into the lottery draw.");
					} else {
						LottoDB[currentchannel][0].entries = LottoDB[currentchannel][0].entries + "," + msg.author.id;
						bot.sendMessage(msg.channel, "<:Bot:230821190648856577> **" + msg.author.username + "** has been given a lottery ticket!" + msg.author.username + "has been added into the lottery draw.");
						return;
					}
				} else { bot.sendMessage(msg.channel, "<:Bot:230821190648856577> No lottery in progress at the moment.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (msg.mentions.length > 0) {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (msg.mentions.length < 2) { bot.sendMessage(msg, "<:Bot:230821190648856577> You need to enter multiple users!"); return; }
				var choice = Math.floor(Math.random() * msg.mentions.length);
				bot.sendMessage(msg, "<:Bot:230821190648856577> From **" + msg.mentions.length + "** entries the winner of this lottery is " + msg.mentions[choice]);

			} else { bot.sendMessage(msg, correctUsage("lotto"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); } //wrong usage
		}
	},
	"vote": {
		desc: "Start / end a vote, or vote on one.",
		usage: "+/- | new <topic> [-noautoend] | end",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			var currentChannel = msg.channel.id;
			if (suffix.split(" ")[0] == "new") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (VoteDB.hasOwnProperty(currentChannel)) { bot.sendMessage(msg, "<:Bot:230821190648856577> There is already a vote pending!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var topic = (suffix.replace(" -noautoend", "").split(" ").length > 1) ? suffix.replace(" -noautoend", "").substring(4) : "None";
				bot.sendMessage(msg, "<:Bot:230821190648856577> New vote started by **" + msg.author.username + "**. Topic: `" + topic + "`. To vote say `" + config.command_prefix + "vote +/-`\nUpvotes: 0\nDownvotes: 0", function(err, message) {
					if (err) { bot.sendMessage(msg, err); return; }
					var object = {"topic": topic, "annMsg": message, "upvoters": "", "downvoters": "", "upvotes": 0, "downvotes": 0, "starter": msg.author.id};
					VoteDB[currentChannel] = [];
					VoteDB[currentChannel][0] = object;
					if (suffix.indexOf("-noautoend") == -1) { autoEndVote(bot, msg); }
				});

			} else if (suffix.replace(" ", "") == "end") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (!VoteDB.hasOwnProperty(currentChannel)) { bot.sendMessage(msg, "<:Bot:230821190648856577> No vote running to end!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.author.id == VoteDB[currentChannel][0].starter || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
					bot.deleteMessage(VoteDB[currentChannel][0].annMsg);
					bot.sendMessage(msg, "<:Bot:230821190648856577> **The results of last vote:**\nTopic: `" + VoteDB[currentChannel][0].topic + "`\nUpvotes: `" + VoteDB[currentChannel][0].upvotes + " " + Math.round((VoteDB[currentChannel][0].upvotes / (VoteDB[currentChannel][0].upvotes + VoteDB[currentChannel][0].downvotes)) * 100) + "%`\nDownvotes: `" + VoteDB[currentChannel][0].downvotes + " " + Math.round((VoteDB[currentChannel][0].downvotes / (VoteDB[currentChannel][0].upvotes + VoteDB[currentChannel][0].downvotes)) * 100) + "%`");
					delete VoteDB[currentChannel];
				} else { bot.sendMessage(msg, "<:Bot:230821190648856577> Only the one who started the vote can end the vote!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (suffix.replace(" ", "") == "+" || suffix.replace(" ", "") == "-") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "<:Bot:230821190648856577> Not possible in Direct Messages."); return; }
				if (VoteDB.hasOwnProperty(currentChannel) == false) { bot.sendMessage(msg, "<:Bot:230821190648856577> No running vote to vote on!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (suffix.replace(" ", "") == "+") {
					if (VoteDB[currentChannel][0].upvoters.indexOf(msg.author.id) > -1) { return; }
					if (VoteDB[currentChannel][0].downvoters.indexOf(msg.author.id) > -1) {
						VoteDB[currentChannel][0].upvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].upvotes += 1;
						VoteDB[currentChannel][0].downvoters = VoteDB[currentChannel][0].upvoters.replace("," + msg.author.id, "");
						VoteDB[currentChannel][0].downvotes -= 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					} else {
						VoteDB[currentChannel][0].upvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].upvotes += 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					}
				} else if (suffix.replace(" ", "") == "-") {
					if (VoteDB[currentChannel][0].downvoters.indexOf(msg.author.id) > -1) { return; }
					if (VoteDB[currentChannel][0].upvoters.indexOf(msg.author.id) > -1) {
						VoteDB[currentChannel][0].downvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].downvotes += 1;
						VoteDB[currentChannel][0].upvoters = VoteDB[currentChannel][0].upvoters.replace("," + msg.author.id, "");
						VoteDB[currentChannel][0].upvotes -= 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					} else {
						VoteDB[currentChannel][0].downvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].downvotes += 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					}
				}
			} else { bot.sendMessage(msg, correctUsage("vote"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 12000}); }); }
		}
	},
	"strawpoll": {
		desc: "Creates a strawpoll",
		deleteCommand: true,
		usage: "<option1>, <option2>, [option3], [option4], ...",
		cooldown: 15,
		process: function(bot, msg, suffix) {
			if (suffix && /^[^, ](.*), ?(.*)[^, ]$/.test(suffix)) {
				suffix = msg.cleanContent.substring(msg.cleanContent.indexOf(" ") + 1).split(/, ?/);
				request.post(
					{
						"url": "https://strawpoll.me/api/v2/polls",
						"headers": {"content-type": "application/json"},
						"json": true,
						body: {
							"title": "" + msg.author.username + "'s Poll",
							"options": suffix
						}
					},
					function(error, response, body) {
						if (!error && response.statusCode == 201) {
							bot.sendMessage(msg, msg.author.username + " has created a strawpoll! Vote at this link: http://strawpoll.me/" + body.id);
						} else if (error) { bot.sendMessage(msg, error);
						} else if (response.statusCode != 201) { bot.sendMessage(msg, "Got status code " + response.statusCode); }
					}
				);
			} else { bot.sendMessage(msg, correctUsage("strawpoll"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"8ball": {
		desc: "8ball answers",
		usage: "[question]",
		cooldown: 4,
		process: function(bot, msg) {
			var responses = ["It is certain.", "Without a doubt.", "You may rely on it.", "Probably.", "Yeah.", "The sign points to yes. I guess.", "Better not tell you now.", "Don't count on it.", "Nah.", "My sources say nope.", "Not so good.", "Doubtful."];
			var choice = Math.floor(Math.random() * (responses.length));
			bot.sendMessage(msg, "🎱 " + responses[choice]);
		}
	},
	"anime": {
		desc: "Gets details on an anime from MAL.",
		usage: "<anime name>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				if (!MAL_USER || !MAL_PASS || MAL_USER == "" || MAL_PASS =="") { bot.sendMessage(msg, "MAL login not configured by bot owner", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/anime/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": MAL_USER, "pass": MAL_PASS, "sendImmediately": false}}, function(error, response, body) {
					if (error) { console.log(error); }
					if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function(err, result) {
							var title = result.anime.entry[0].title;
							var english = result.anime.entry[0].english;
							var ep = result.anime.entry[0].episodes;
							var score = result.anime.entry[0].score;
							var type = result.anime.entry[0].type;
							var status = result.anime.entry[0].status;
							var synopsis = result.anime.entry[0].synopsis.toString();
							var id = result.anime.entry[0].id;
							synopsis = synopsis.replace(/<br \/>/g, " "); synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.replace(/\r?\n|\r/g, " "); synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); synopsis += "..."; }
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Episodes:** " + ep + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis + "\n**www.myanimelist.net/anime/" + id + "**");
						});
					} else { bot.sendMessage(msg, "\"" + suffix + "\" isn't found. Blame the MAL search API.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});
				bot.stopTyping(msg.channel);
			} else { bot.sendMessage(msg, correctUsage("anime"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"manga": {
		desc: "Gets details on a manga from MAL.",
		usage: "<manga/novel name>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				if (!MAL_USER || !MAL_PASS || MAL_USER == "" || MAL_PASS =="") { bot.sendMessage(msg, "MAL login not configured by bot owner", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/manga/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": MAL_USER, "pass": MAL_PASS, "sendImmediately": false}}, function(error, response, body) {
					if (error) { console.log(error); }
					if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function(err, result) {
							var title = result.manga.entry[0].title;
							var english = result.manga.entry[0].english;
							var chapters = result.manga.entry[0].chapters;
							var volumes = result.manga.entry[0].volumes;
							var score = result.manga.entry[0].score;
							var type = result.manga.entry[0].type;
							var status = result.manga.entry[0].status;
							var synopsis = result.manga.entry[0].synopsis.toString();
							var id = result.manga.entry[0].id;
							synopsis = synopsis.replace(/<br \/>/g, " "); synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.replace(/\r?\n|\r/g, " "); synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); }
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Chapters:** " + chapters + " **| Volumes: **" + volumes + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis + "\n**www.myanimelist.net/manga/" + id + "**");
						});
					} else { bot.sendMessage(msg, "\"" + suffix + "\" isn't found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});
				bot.stopTyping(msg.channel);
			} else { bot.sendMessage(msg, correctUsage("manga"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"coinflip": {
		desc: "Flip a coin",
		usage: "",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var side = Math.floor(Math.random() * (2));
			if (side == 0) { bot.sendMessage(msg, "<:Bot:230821190648856577> **" + msg.author.username + "** has flipped a coin. It's ***Heads***!");
			} else { bot.sendMessage(msg, "<:Bot:230821190648856577> **" + msg.author.username + "** has flipped a coin. It's **Tails**!"); }
		}
	},
	"osu": {
		desc: "Osu! commands. Use *help osu",
		usage: "sig [username] [hex] | best [username] | user [username] | recent [username]",
		deleteCommand: true,
		cooldown: 5,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("osu"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return; }
			if (suffix.split(" ")[0] === "sig") {

				var color = "ff66aa",
					username = msg.author.username;
				suffix = suffix.trim().split(" ");
				suffix.shift();
				if (suffix && suffix.length >= 1) {
					if (/(.*) #?[A-Fa-f0-9]{6}$/.test(suffix.join(" "))) {
						username = suffix.join("%20").substring(0, suffix.join("%20").lastIndexOf("%20"));
						if (suffix[suffix.length - 1].length == 6) { color = suffix[suffix.length - 1];
						} else if (suffix[suffix.length - 1].length == 7) { color = suffix[suffix.length - 1].substring(1); }
					} else if (/#?[A-Fa-f0-9]{6}$/.test(suffix.join(" "))) {
						username = msg.author.username;
						if (suffix[0].length == 6) { color = suffix[0];
						} else if (suffix[0].length == 7) { color = suffix[0].substring(1); }
					} else { username = suffix.join("%20"); }
				}
				request({url: "https://lemmmy.pw/osusig/sig.php?colour=hex" + color + "&uname=" + username + "&pp=2&flagshadow&xpbar&xpbarhex&darktriangles", encoding: null}, function(err, response, body) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (response.statusCode != 200) { bot.sendMessage(msg, "⚠ Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Here's your osu signature for **" + username + "**! Get a live version at `lemmmy.pw/osusig/`");
					bot.sendFile(msg, body, "sig.png");
				});

			} else if (suffix.split(" ")[0] == "user") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Service currently unavailable.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(OSU_API_KEY);
				osu.getUser(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					if (data.playcount === null) { bot.sendMessage(msg, "User has no data", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
					toSend.push("Osu stats for: **" + data.username + "**:");
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					toSend.push("**Play Count**: " + data.playcount.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Ranked Score**: " + data.ranked_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Total Score**: " + data.total_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Level**: " + data.level.substring(0, data.level.split(".")[0].length + 3));
					toSend.push("**PP**: " + data.pp_raw.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Rank**: #" + data.pp_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Country Rank**: #" + data.pp_country_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Accuracy**: " + data.accuracy.substring(0, data.accuracy.split(".")[0].length + 3) + "%");
					toSend.push("**300**: " + data.count300.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **100**: " + data.count100.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **50**: " + data.count50.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **SS**: " + data.count_rank_ss + " | **S**: " + data.count_rank_s + " | **A**: " + data.count_rank_a.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
					bot.sendMessage(msg, toSend);
				});

			} else if (suffix.split(" ")[0] === "best") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(OSU_API_KEY);
				osu.getUserBest(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0] || !data[1] || !data[2] || !data[3] || !data[4]) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found or user doesn't have 5 plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					toSend.push("Top 5 osu scores for: **" + username + "**:");
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					osu.getBeatmap(data[0].beatmap_id, function(err, map1) {
						toSend.push("**1.** *" + map1.title + "* *(☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[0].pp.split(".")[0]) + " **| Score:** " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[0].countmiss + " **| Date:** " + data[0].date);
						osu.getBeatmap(data[1].beatmap_id, function(err, map2) {
							toSend.push("**2.** *" + map2.title + "* *(☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[1].pp.split(".")[0]) + " **| Score:** " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[1].countmiss + " **| Date:** " + data[1].date);
							osu.getBeatmap(data[2].beatmap_id, function(err, map3) {
								toSend.push("**3.** *" + map3.title + "* *(☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[2].pp.split(".")[0]) + " **| Score:** " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[2].countmiss + " **| Date:** " + data[2].date);
								osu.getBeatmap(data[3].beatmap_id, function(err, map4) {
									toSend.push("**4.** *" + map4.title + "* *(☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[3].pp.split(".")[0]) + " **| Score:** " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[3].countmiss + " **| Date:** " + data[3].date);
									osu.getBeatmap(data[4].beatmap_id, function(err, map5) {
										toSend.push("**5.** *" + map5.title + "* *(☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[4].pp.split(".")[0]) + " **| Score:** " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[4].countmiss + " **| Date:** " + data[4].date);
										bot.sendMessage(msg, toSend);
					});});});});});
				});

			} else if (suffix.split(" ")[0] === "recent") {

				var username = (suffix.split(" ").length < 2) ? msg.author.username : suffix.substring(7);
				if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(OSU_API_KEY);
				osu.getUserRecent(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0]) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found or no recent plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					toSend.push("5 most recent plays for: **" + username + "**:");
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					osu.getBeatmap(data[0].beatmap_id, function(err, map1) {
						if (!map1 || !map1.title) { bot.sendMessage(msg, toSend); return; }
						toSend.push("**1.** *" + map1.title + "* *(☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[0].countmiss);
						if (!data[1]) { bot.sendMessage(msg, toSend); return; }
						osu.getBeatmap(data[1].beatmap_id, function(err, map2) {
							if (!map2 || !map2.title) { bot.sendMessage(msg, toSend); return; }
							toSend.push("**2.** *" + map2.title + "* *(☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[1].countmiss);
							if (!data[2]) { bot.sendMessage(msg, toSend); return; }
							osu.getBeatmap(data[2].beatmap_id, function(err, map3) {
								if (!map3 || !map3.title) { bot.sendMessage(msg, toSend); return; }
								toSend.push("**3.** *" + map3.title + "* *(☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[2].countmiss);
								if (!data[3]) { bot.sendMessage(msg, toSend); return; }
								osu.getBeatmap(data[3].beatmap_id, function(err, map4) {
									if (!map4 || !map4.title) { bot.sendMessage(msg, toSend); return; }
									toSend.push("**4.** *" + map4.title + "* *(☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[3].countmiss);
									if (!data[4]) { bot.sendMessage(msg, toSend); return; }
									osu.getBeatmap(data[4].beatmap_id, function(err, map5) {
										if (!map5 || !map5.title) { bot.sendMessage(msg, toSend); return; }
										toSend.push("**5.** *" + map5.title + "* *(☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[4].countmiss);
										bot.sendMessage(msg, toSend);
					});});});});});
				});

			} else { bot.sendMessage(msg, correctUsage("osu"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); }
		}
	},
	"rps": {
		desc: "Play Rock Paper Scissors",
		usage: "<rock/paper/scissors>",
		cooldown: 2,
		process: function(bot, msg, suffix) {
			//if (!suffix) { bot.sendMessage(msg, correctUsage("rps")); return; }
			var choice = Math.floor(Math.random() * 3);
			if (choice == 0) { bot.sendMessage(msg, "I choose **rock**!");
			} else if (choice == 1) { bot.sendMessage(msg, "I think I'll go **paper**.");
			} else if (choice == 2) { bot.sendMessage(msg, "Hah! I've chosen **scissors**!"); }
		}
	},
	"weather": {
		desc: "Get the weather",
		usage: "<City/City,Us> or <zip/zip,us>	example: ]weather 12345,us",
		deleteCommand: true,
		cooldown: 7,
		process: function(bot, msg, suffix) {
			if (OWM_API_KEY == null || OWM_API_KEY == "") { bot.sendMessage(msg, "⚠ Service not available at this time.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix) { suffix = suffix.replace(" ", ""); }
			if (!suffix) { bot.sendMessage(msg, correctUsage("weather"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var rURL = (/\d/.test(suffix) == false) ? "http://api.openweathermap.org/data/2.5/weather?q=" + suffix + "&APPID=" + OWM_API_KEY : "http://api.openweathermap.org/data/2.5/weather?zip=" + suffix + "&APPID=" + OWM_API_KEY;
			request(rURL, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					if (!body.hasOwnProperty("weather")) { return; }
					var tempF = Math.round(parseInt(body.main.temp) * (9 / 5) - 459.67) + " °F";
					var tempC = Math.round(parseInt(body.main.temp) - 273.15) + " °C";
					var windspeedUS = Math.round(parseInt(body.wind.speed) * 2.23694) + " mph";
					var windspeed = body.wind.speed + " m/s";
					var emoji = "☀";
					if (body.weather[0].description.indexOf("cloud") > -1) { emoji = "☁"; }
					if (body.weather[0].description.indexOf("snow") > -1) { emoji = "❄"; }
					if (body.weather[0].description.indexOf("rain") > -1 || body.weather[0].description.indexOf("storm") > -1 || body.weather[0].description.indexOf("drizzle") > -1) { emoji = "☔"; }
					bot.sendMessage(msg, emoji + "**Weather** for " + body.name + "__:\n**Conditions:** " + body.weather[0].description + " **Temp:** " + tempF + " / " + tempC + "\n**Humidity:** " + body.main.humidity + "% **Wind:** " + windspeedUS + " / " + windspeed + " **Cloudiness:** " + body.clouds.all + "%");
				} else { console.log(error); }
			});
		}
	},
	"google": {
		desc: "Allow me to Google that for you...",
		deleteCommand: true,
		usage: "<search>",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "**http://www.lmgtfy.com/?q=lmgtfy**"); return; }
			suffix = suffix.split(" ");
			for (var i = 0; i < suffix.length; i++) { suffix[i] = encodeURIComponent(suffix[i]); }
			bot.sendMessage(msg, "🔍 **http://www.lmgtfy.com/?q=" + suffix.join("+") + "**");
		}
	},
	"numberfacts": {
		desc: "Get facts about dem numbers.",
		deleteCommand: true,
		usage: "[number]",
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var number = "random";
			if (suffix && /^\d+$/.test(suffix)) { number = suffix; }
			request("http://numbersapi.com/" + number + "/trivia?json", function(error, response, body) {
				if (error) { bot.sendMessage(msg, "Error: " + error, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					bot.sendMessage(msg, body.text);
				}
			});
		}
	},
	"catfacts": {
		desc: "Facts about cats.",
		usage: "",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			request("http://catfacts-api.appspot.com/api/facts", function(error, response, body) {
				if (error) { bot.sendMessage(msg, "Error: " + error, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					bot.sendMessage(msg, "🐱 Hey, **" + msg.author.username + "**, did you know that " + body.facts[0]);
				}
			});
		}
	},
	"ratewaifu": {
		desc: "waifu rater dude",
		usage: "<name>",
		deleteCommand: false,
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("ratewaifu"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (msg.mentions.length > 1) { bot.sendMessage(msg, "Multiple mentions aren't allowed!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (suffix.toLowerCase().replace("-", " ") == bot.user.username.toLowerCase().replace("-", " ")) { bot.sendMessage(msg, "I'd rate myself **10/10**"); return; }
			var fullName = "", user = false;
			if (!msg.channel.isPrivate) { user = msg.channel.server.members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase() == suffix.toLowerCase() }); } else { user = false; }
			if (!user && msg.mentions.length < 1) {
				Object.keys(waifus).map(function(name) {if (name.toLowerCase() == suffix.toLowerCase()) { fullName = name; return; }});
				if (!fullName) { Object.keys(waifus).map(function(name) {if (name.split(" ")[0].toLowerCase() == suffix.toLowerCase()) {fullName = name; return;}}); }
				if (!fullName) { Object.keys(waifus).map(function(name) {if (name.split(" ").length > 1) {for (var i = 1;i < name.split(" ").length;i++) {if (name.split(" ")[i].toLowerCase() == suffix.toLowerCase()) {fullName = name; return;}}}}); }
			} else {
				if (msg.mentions.length > 0) { fullName = msg.mentions[0].username; if (msg.mentions[0].username == bot.user.username) { bot.sendMessage(msg, "I'd rate myself **10/10**"); return; }
				} else if (user) { fullName = user.username; }
			}
			if (fullName) {
				if (Ratings.hasOwnProperty(fullName.toLowerCase())) { bot.sendMessage(msg, "I gave " + fullName + " a **" + Ratings[fullName.toLowerCase()] + "/10**"); } //already rated
				else {
					if (user || msg.mentions.length > 0) { bot.sendMessage(msg, "I'd rate " + fullName + " **" + generateUserRating(bot, msg, fullName) + "/10**");
					} else { bot.sendMessage(msg, "I'd rate " + fullName + " **" + generateJSONRating(fullName) + "/10**"); }
				}
			} else {
				if (Ratings.hasOwnProperty(suffix.toLowerCase())) { bot.sendMessage(msg, "I gave " + suffix + " a **" + Ratings[suffix.toLowerCase()] + "/10**"); return; } //already rated
				bot.sendMessage(msg, "I give " + suffix + " a **" + generateRandomRating(suffix.toLowerCase(), true) + "/10**");
			}
		}
	},
	"twitchinfo": {
		usage: "[Twitch Username]",
		desc: "Information on the specified Twitch User.",
		process: function(bot, msg, suffix) {
			if (!suffix) {
				bot.sendMessage(msg.channel, "*Please specify a Twitch Username.*");
				return;
			} else {
				console.log("Retreiving Twitch Stats of " + suffix + "...");
				request("https://api.twitch.tv/kraken/streams/" + suffix, function(err, res, body) {
					if (res.statusCode == 404 || err) {
						console.log(colors.cRed("Couldn't retrieve Twitch Stats of " + suffix + "."));
						bot.sendMessage(msg.channel, "__Couldn't find information on that user.__");
						return;
					}
					if (!err && res.statusCode == 200) {
						console.log(colors.cGreen("Success! ") + suffix + "'s Twitch status has been found. Displaying.");
						var stream = JSON.parse(body);
						if (stream.stream) {
							bot.sendMessage(msg.channel, "Well, " + msg.sender + ", " + suffix + " is online, they are playing " + stream.stream.game + "\n" + stream.stream.channel.status + "\n" + stream.stream.channel.url);
						} else {
							bot.sendMessage(msg.channel, suffix + " is currently offline, and not streaming.");
						}
					}
				});
			}
		}
	},
	"image": {
		desc: "Get an image from Imgur",
		usage: "<subreddit> [--nsfw] [--day | --week | --month | --year | --all]",
		deleteCommand: false, cooldown: 10,
		process: function(bot, msg, suffix) {
			if (!IMGUR_CLIENT_ID || IMGUR_CLIENT_ID == "") { bot.sendMessage(msg, "⚠ Service not available at this time.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix && /^[^-].*/.test(suffix)) {
				var time = (/(--day|--week|--month|--year|--all)/.test(suffix)) ? /(--day|--week|--month|--year|--all)/.exec(suffix)[0] : '--week';
				request({
						url: 'https://api.imgur.com/3/gallery/r/' + suffix.replace(/(--day|--week|--month|--year|--all|--nsfw|\/r\/| )/g, '') + '/top/' + time.substring(2) + '/50',
						headers: {'Authorization': 'Client-ID ' + IMGUR_CLIENT_ID}
				}, (error, response, body) => {
					if (error) { console.log(error); bot.sendMessage(msg, "Oh no! There was an error!"); }
					else if (response.statusCode != 200) bot.sendMessage(msg, "Got status code " + response.statusCode, (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					else if (body) {
						body = JSON.parse(body);
						var sendNSFW = (/ ?--nsfw/i.test(suffix)) ? true : false;
						if (body.hasOwnProperty("data") && body.data.length !== 0) {
							for (var i = 0; i < 100; i++) {
								var toSend = body.data[Math.floor(Math.random() * (body.data.length))];
								if (!sendNSFW && toSend.nsfw != true) { bot.sendMessage(msg, toSend.link); break; }
								else if (sendNSFW && toSend.nsfw == true) { bot.sendMessage(msg, toSend.link + '**(NSFW)**'); break; }
							}
						} else bot.sendMessage(msg, "Nothing found!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					}
				});
			} else bot.sendMessage(msg, correctUsage("image"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
		}
	},
	"reminder": {
		desc: "Set a reminder for SleepyBot to remind you of. - `Proper use:` __**Remove:**__ Remove a reminder containing the text input.\n__**List:**__ Gives a list of your reminders.\n__**Add:**__ Add a reminder with this format - *[text] in [0 days] [00 hours] [00 minutes] [000 seconds]* ",
		usage: "remove [text in reminder] | list | [text] in <[0 days] [00 hours] [00 minutes] [000 seconds]>",
		deleteCommand: false, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (/^remove/i.test(suffix)) {

				if (suffix.length > 7) {
					remind.removeReminder(suffix.replace(/^remove /i, ''), msg.author.id, ()=>{
						bot.sendMessage(msg, "Reminder removed, " + msg.sender + ".");
					}, ()=>{
						bot.sendMessage(msg, "The reminder you specified doesn't exist or hasn't been set yet, dude.");
					});
				} else {
					var list = remind.listForUser(msg.author.id);
					if (list && list.length > 0) bot.sendMessage(msg, "__Please use `" + config.command_prefix + "reminder [remove] [text]` to remove any reminder.__\n`Reminders:\n```" + list.join('\n') + "```");
					else bot.sendMessage(msg, "You haven't set any reminders, " + msg.sender + ".");
				}

			} else if (suffix.toLowerCase() === 'list') {

				var list = remind.listForUser(msg.author.id);
				if (list && list.length > 0) bot.sendMessage(msg, "`Reminders:`\n```" + list.join('\n') + "```");
				else bot.sendMessage(msg, "You haven't set any reminders, " + msg.sender + ".");

			} else if (/^.* in( ((\d|a|one|two|three) ?d[ays]*)( and| &)?)?( ((\d\d?\d?|a|an|one|two|three) ?h[ours]*)( and| &)?)?( ((\d\d?\d?|a|one|two|three) ?m[inutes]*)( and| &)?)?( (\d\d?\d?|a|one|two|three) ?s[econds]*)?$/i.test(suffix)) {

				if (remind.countForUser(msg.author.id) >= 5) {
					bot.sendMessage(msg, "No more reminders can be added. You have reached the max limit of `5`. Please, remove a reminder with `" + config.command_prefix + "reminder [remove] [text]` to make more available spots.");
					return;
				}

				var millisecs = 0
					,timeString = suffix.replace(/.* in /i, '');
				if (/ ((\d\d?\d?\d?\d?|a|one|two|three) ?s[econds]*)$/i.test(suffix)) {
					millisecs += timeParser(/((\d\d?\d?\d?\d?|a|one|two|three) ?s[econds]*)$/i.exec(suffix)[2] + "", 1000);
					suffix = suffix.replace(/( and| &)? ((\d\d?\d?\d?\d?|a|one|two|three) ?s[econds]*)$/i, '');
				}
				if (/ ((\d\d?\d?|a|one|two|three) ?m[inutes]*)$/i.test(suffix)) {
					millisecs += timeParser(/((\d\d?\d?|a|one|two|three) ?m[inutes]*)$/i.exec(suffix)[2] + "", 60000);
					suffix = suffix.replace(/( and| &)? ((\d\d?\d?|a|one|two|three) ?m[inutes]*)$/i, '');
				}
				if (/ ((\d\d?\d?|a|an|one|two|three) ?h[ours]*)$/i.test(suffix)) {
					millisecs += timeParser(/((\d\d?\d?|a|an|one|two|three) ?h[ours]*)$/i.exec(suffix)[2] + "", 3600000);
					suffix = suffix.replace(/( and| &)? ((\d\d?\d?|a|an|one|two|three) ?h[ours]*)$/i, '');
				}
				if (/ ((\d|a|one|two|three) ?d[ays]*)$/i.test(suffix)) {
					var hours = /((\d|a|one|two|three) ?d[ays]*)$/i.exec(suffix)[2];
					if (/\d/.test(hours)) {
						if (hours > 7) { bot.sendMessage(msg, "__Reminders expire after 7 days.__ `Don't set your reminder for longer than that.`", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});}); return; }
					}
					millisecs += timeParser(hours + "", 86400000);
					suffix = suffix.replace(/( and| &)? ((\d|a|one|two|three) ?d[ays]*)$/i, '');
				}
				if (millisecs > 604800000) { bot.sendMessage(msg, "__Reminders expire after 7 days.__ `Don't set your reminder for longer than that.`", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});}); return; }
				else if (millisecs <= 0) { bot.sendMessage(msg, "Please specify a time for me to remind you.", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});}); return; }

				var reminder = suffix.replace(/^(me )?(to )?/i, '').replace(/in ?$/i, '').trim();
				remind.addReminder(msg.author.id, Date.now() + millisecs, reminder);
				bot.sendMessage(msg, "Alright, "+ msg.sender + ", I'll reminder you in" + timeString);

			} else correctUsage("reminder", this.usage, msg, bot, 15000);
		}
	}
};

exports.commands = commands;
exports.aliases = aliases;

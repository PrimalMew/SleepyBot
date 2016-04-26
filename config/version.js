var request = require("request");
var version = require("../package.json").version;
var colors = require("./colors.js");

exports.checkForUpdate = function(callback) {
	request("https://raw.githubusercontent.com/PrimalMew/SleepyBot/master/package.json", function(err, response, body) {
		if (err) {
			console.log(colors.cWarn(" WARN ") + "Version check error: " + err);
			return callback(null);
		}
		if (response.statusCode == 200) {
			var latest = JSON.parse(body).version;
			if ((version.split(".").join("")) < (latest.split(".").join(""))) { return callback("Bot out of date! (Current: v" + version + ") (Latest: v" + latest + ")"); }
			if ((version.split(".").join("")) > (latest.split(".").join(""))) { return callback("Bot is a development version (v" + version + ")"); }
			return callback("SleepyBot's version is up-to-date (v" + version + ")");
		} else {
			console.log(colors.cWarn(" WARN ") + "Failed to check for new version. Status code: " + response.statusCode);
			return callback(null);
		}
	});
};

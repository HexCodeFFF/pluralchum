const path = require("path");
const fs = require("fs");
const bdFolder = (process.platform == "win32" ? process.env.APPDATA : process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" :  process.env.XDG_CONFIG_HOME ? process.env.XDG_CONFIG_HOME : process.env.HOME + "/.config") + "/BetterDiscord/";
const code = require("@babel/core").transformFileSync("pluralchum.jsx", {
    presets: ["@babel/preset-react"],
}).code;
fs.writeFileSync(path.join(bdFolder, "plugins", "pluralchum.plugin.js"), code);
fs.writeFileSync("pluralchum.plugin.js", code);
console.log("wrote to BD folder and current folder")
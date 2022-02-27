/**
 * @name Pluralchum
 * @version 1.0.0
 * @description PluralKit integration for BetterDiscord. Inexplicably Homestuck-themed.
 * @author Ash Taylor
 *
 */
const baseEndpoint = "https://api.pluralkit.me/v2";
const React = BdApi.React;
const MessageHeader = BdApi.findModule(m => m?.default?.toString().indexOf("showTimestampOnHover") > -1);

class PKBadge extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let linkStyle = {
      color: "#ffffff"
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
      style: linkStyle,
      onClick: () => this.props.onClick(this.props.pk_id)
    }, "PK"));
  }

}

module.exports = class Pluralchum {
  profileMap = {};
  idMap = {};
  currentRequests = 0;
  patches = [];
  eula = false; // "eula" aka tell people what this shit does

  doColourText = true;
  contrastTestColour = "#000000";
  doContrastTest = true;
  contrastThreshold = 3;
  memberColourPref = 0;
  tagColourPref = 1;

  getSettingsPanel() {
    const Settings = ZLibrary.Settings;
    let settingsPanel = new Settings.SettingPanel(); // Logo

    let logo = document.createElement("img");
    logo.src = "https://media.discordapp.net/attachments/846781793834106902/946425651634765824/overkill_logo_final.png";
    logo.style = "max-width: 100%; height: auto;";
    let subtitle = document.createElement("p");
    subtitle.innerHTML = "PluralKit integration for BetterDiscord<br>- by <b><span style=\"color: #ff002a;\">ash taylor</span></b> -";
    subtitle.style = "text-align: center; color: var(--header-primary);";
    settingsPanel.append(logo);
    settingsPanel.append(subtitle); // Preferences

    let preferencesPanel = new Settings.SettingGroup("Preferences", {
      shown: false
    });
    preferencesPanel.append(new Settings.Switch("Colored proxy text", "", this.doColourText, val => {
      this.doColourText = val;
      this.saveSettings();
    }));
    preferencesPanel.append(new Settings.Dropdown("Default member name color", "", this.memberColourPref, [{
      label: "Member",
      value: 0
    }, {
      label: "System",
      value: 1
    }, {
      label: "Theme",
      value: 2
    }], val => {
      this.memberColourPref = val;
      this.saveSettings();
    }));
    preferencesPanel.append(new Settings.Dropdown("Default system tag color", "", this.tagColourPref, [{
      label: "Member",
      value: 0
    }, {
      label: "System",
      value: 1
    }, {
      label: "Theme",
      value: 2
    }], val => {
      this.saveSettings();
      this.tagColourPref = val;
    })); // Contrast test settings

    let accessibilityPanel = new Settings.SettingGroup("Accessibility", {
      shown: false
    });
    accessibilityPanel.append(new Settings.Switch("Enable text contrast test", "Uses the theme's default color if the proxy's contrast is too low", this.doContrastTest, val => {
      this.doContrastTest = val;
      this.saveSettings();
    }));
    accessibilityPanel.append(new Settings.ColorPicker("Contrast test color", "The background color that proxy text will be tested against (black for dark themes, white for light themes)", this.contrastTestColour, hex => {
      this.contrastTestColour = hex;
      this.saveSettings();
    }));
    accessibilityPanel.append(new Settings.Slider("Contrast ratio threshold", "Minimum contrast ratio for proxy colors (default: 3)", 1, 21, this.contrastThreshold, val => {
      this.contrastThreshold = val;
      this.saveSettings();
    }, {
      markers: [1, 2, 3, 4.5, 7, 14, 21]
    })); // Cache

    let cachePanel = new Settings.SettingGroup("Cache", {
      shown: false
    });
    let resetCacheBtn = document.createElement("button");
    resetCacheBtn.className = "button-f2h6uQ lookFilled-yCfaCM colorBrand-I6CyqQ sizeSmall-wU2dO- grow-2sR_-F";
    resetCacheBtn.innerHTML = "Delete Cache";

    resetCacheBtn.onclick = () => {
      this.profileMap = {};
      this.idMap = {};
      this.saveSettings();
    };

    cachePanel.append(resetCacheBtn).class;
    settingsPanel.append(preferencesPanel);
    settingsPanel.append(accessibilityPanel);
    settingsPanel.append(cachePanel);
    return settingsPanel.getElement();
  }

  constructor() {}

  load() {}

  stop() {
    for (let i = this.patches.length - 1; i >= 0; i--) this.patches[i]();

    this.purgeOldCachedContent();
    ZLibrary.Utilities.saveSettings(this.getName(), this.getSettings());
    BdApi.Patcher.unpatchAll(this.getName());
    ZLibrary.DOMTools.removeStyle(this.getName());
  }

  purgeOldCachedContent() {
    if (!this.profileMap) return;
    const expirationTime = 1000 * 60 * 60 * 24 * 30;
    let now = Date.now();

    for (const id of Object.keys(this.profileMap)) {
      if (this.profileMap[id].hasOwnProperty("lastUsed")) {
        let lastUsed = this.profileMap[id].lastUsed;
        if (now - lastUsed > expirationTime) delete this.profileMap[id];
      } else {
        this.profileMap[id].lastUsed = now;
      }
    }
  }

  start() {
    if (!global.ZeresPluginLibrary) return window.BdApi.alert("Library Missing", `The library plugin needed for ${this.getName()} is missing.<br /><br /> <a href="https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js" target="_blank">Click here to download the library!</a>`);
    let settings = ZLibrary.Utilities.loadSettings(this.getName(), this.getDefaultSettings());
    console.log("[PLURALCHUM] Loaded settings:");
    console.log(settings);
    this.applySettings(settings);
    if (!this.profileMap) this.profileMap = {};
    if (!this.idMap) this.idMap = {};
    console.log("[PLURALCHUM] Loaded PK data:");
    console.log(this.profileMap);
    console.log("IDMAP:");
    console.log(this.idMap);

    if (!this.eula) {
      BdApi.showConfirmationModal('Heads up!', /*#__PURE__*/React.createElement("div", {
        align: "center",
        style: {
          color: "#eeeeee"
        }
      }, "This plugin uses the PluralKit API to fetch system and member data. ", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), "Because of technical limitations, this data is cached on your computer between sessions. None of this data is ever shared, collected or uploaded, but you still ought to know.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("b", null, "You can clear this cache at any time in the plugin settings"), ", and unused cache data is automatically deleted after 30 days."), {
        confirmText: 'Gotcha',
        cancelText: 'No thanks',
        onConfirm: () => {
          this.eula = true;
          ZLibrary.Utilities.saveSettings(this.getName(), this.getSettings());
        }
      });

      if (!this.eula) {
        BdApi.Plugins.disable(this.getName());
        return;
      }
    }

    const MessageContent = BdApi.findModule(m => m.type?.displayName === "MessageContent"); //Patch message content

    BdApi.Patcher.after(this.getName(), MessageContent, "type", function (_, [props], ret) {
      const channel = ZLibrary.DiscordModules.ChannelStore.getChannel(props.message.channel_id);
      if (!channel || !channel.guild_id) return; //No webhooks here lol

      if (this.doColourText) {
        this.callbackIfMemberReady(props, function (member) {
          // Set message text colour
          if (member.color) {
            let textContrast = this.contrast(this.hexToRgb(member.color), this.hexToRgb(this.contrastTestColour));
            if (!this.doContrastTest || textContrast >= this.contrastThreshold) ret.props.style = {
              color: member.color
            };
          }
        }.bind(this));
      }
    }.bind(this)); //Patch message header

    BdApi.Patcher.after(this.getName(), MessageHeader, "default", this.messageHeaderUpdate.bind(this));
    this.forceMessageRefresh();
  }

  forceMessageRefresh() {
    // Force message update on channel changed??? somehow??????? idk i found this code online just accept it
    const Modules = ZLibrary.WebpackModules.getModules(m => ~["ChannelMessage", "InboxMessage"].indexOf(m?.type?.displayName));

    for (const Module of Modules) {
      BdApi.Patcher.after(this.getName(), Module, "type", (_, __, ret) => {
        const tree = ZLibrary.Utilities.findInReactTree(ret, m => m?.childrenHeader);
        if (!tree) return;
        const originalType = tree.childrenHeader.type.type;
        tree.childrenHeader.type.type = MessageHeader.default;
        this.patches.push(() => {
          tree.childrenHeader.type.type = originalType;
        });
      });
    }
  }

  messageHeaderUpdate(_, [props], ret) {
    const tree = ZLibrary.Utilities.getNestedProp(ret, "props.username.props.children");
    if (!Array.isArray(tree)) return;
    this.callbackIfMemberReady(props, function (member) {
      if (!props.message.author.hasOwnProperty("username_real")) {
        props.message.author.username_real = props.message.author.username.slice();
        props.message.author.username = member.name;
      }

      tree.length = 0; //loser

      let member_tag = member.tag;
      let userProps = {
        user: props.message.author,
        className: "username-h_Y3Us",
        type: "member_name"
      };
      let tagProps = {
        user: props.message.author,
        className: "username-h_Y3Us",
        type: "system_tag"
      };
      const BotTag = ZeresPluginLibrary.WebpackModules.find(m => m.default.displayName === "BotTag");
      const BotTagTypes = BotTag.default.Types || BotTag.BotTagTypes;
      const botTagClasses = ZeresPluginLibrary.WebpackModules.getByProps("botTagCozy");
      let pkBadge = React.createElement(BotTag.default, {
        type: BotTagTypes.BOT,
        verified: false,
        useRemSizes: true,
        className: `${botTagClasses.botTagCozy} ${botTagClasses.botTagCompact}`
      }); // Preferences
      // 0 - Member
      // 1 - System
      // 2 - Theme (do nothing)

      let member_colour;
      let tag_colour;

      if (this.memberColourPref === 0) {
        member_colour = member.color;
        if (!member_colour) member_colour = member.system_color; // Fallback
      } else if (this.memberColourPref === 1) {
        member_colour = member.system_color;
        if (!member_colour) member_colour = member.color; // Fallback
      }

      if (this.tagColourPref === 0) {
        tag_colour = member.color;
        if (!tag_colour) tag_colour = member.system_color; // Fallback
      } else if (this.tagColourPref === 1) {
        tag_colour = member.system_color;
      } // Color testing and stuff


      if (member_colour) {
        let textContrast = this.contrast(this.hexToRgb(member_colour), this.hexToRgb(this.contrastTestColour));
        if (!this.doContrastTest || textContrast >= this.contrastThreshold) userProps.style = {
          color: member_colour
        };
      }

      if (tag_colour) {
        let textContrast = this.contrast(this.hexToRgb(tag_colour), this.hexToRgb(this.contrastTestColour));
        if (!this.doContrastTest || textContrast >= this.contrastThreshold) tagProps.style = {
          color: tag_colour
        };
      }

      if (!member_tag || typeof member_tag !== 'string') member_tag = "";

      if (props.compact) {
        tree.push(pkBadge);
        tree.push(React.createElement("span", userProps, " " + member.name.toString()));
        tree.push(React.createElement("span", tagProps, " " + member_tag.toString() + " "));
      } else {
        tree.push(React.createElement("span", userProps, member.name.toString()));
        tree.push(React.createElement("span", tagProps, " " + member_tag.toString()));
        tree.push(pkBadge);
      }
    }.bind(this));
  }

  updateMemberByMsg(msg, hash) {
    this.profileMap[hash] = {
      status: "REQUESTING"
    };
    this.httpGetAsync("/messages/" + msg, this.createPKCallback(hash).bind(this));
  }

  httpGetAsync(theUrl, callback) {
    let xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function () {
      if (xmlHttp.readyState == 4) {
        callback(xmlHttp.responseText, xmlHttp.status);
        this.currentRequests -= 1;
      }
    }.bind(this);

    this.currentRequests += 1;
    console.log("Sending request with delay ", this.currentRequests * 600);
    setTimeout(function () {
      xmlHttp.open("GET", baseEndpoint + theUrl, true); // true for asynchronous 

      xmlHttp.send(null);
    }.bind(this), this.currentRequests * 600);
  }

  createPKCallback(hash) {
    return function (response, status) {
      if (status == 200) {
        console.log("RESPONSE");
        let data = JSON.parse(response);
        console.log(data); // Map profile hash to member data...

        this.profileMap[hash] = {
          name: data.member.name,
          color: "#" + data.member.color,
          tag: data.system.tag,
          id: data.member.id,
          system: data.system.id,
          status: "DONE",
          system_color: "#" + data.system.color
        };
        if (data.member.color === null) this.profileMap[hash].color = "";
        if (data.system.color === null) this.profileMap[hash].system_color = "";

        if (data.member.display_name) {
          this.profileMap[hash].name = data.member.display_name;
        } // ...and map member ID to hash


        this.idMap[data.member.id] = hash;
        this.forceMessageRefresh();
      } else if (status == 404) {
        this.profileMap[hash] = {
          status: "NOT_PK"
        };
      }

      this.saveSettings();
    }.bind(this);
  }

  saveSettings() {
    ZLibrary.Utilities.saveSettings(this.getName(), this.getSettings());
  }

  getUserHash(author) {
    let username = author.username;
    if (author.hasOwnProperty("username_real")) username = author.username_real;
    return this.hashCode(username + author.avatar);
  }

  callbackIfMemberReady(props, callback) {
    if (!props.hasOwnProperty("message")) {
      return;
    }

    if (props.message.author.discriminator !== "0000") return;
    let message = props.message;
    let username = message.author.username;
    if (message.author.hasOwnProperty("username_real")) username = message.author.username_real;
    let userHash = this.getUserHash(message.author);

    if (this.profileMap[userHash]) {
      if (this.profileMap[userHash].status === "DONE") callback(this.profileMap[userHash]);
    } else {
      console.log("Requesting data for member " + username + " (" + userHash + ")");
      this.updateMemberByMsg(message.id, userHash);
    }
  }

  hashCode(text) {
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      let char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash;
  }

  getName() {
    return "Pluralchum";
  }

  getDefaultSettings() {
    return {
      profileMap: {},
      idMap: {},
      eula: false,
      doColourText: true,
      contrastTestColour: "#000000",
      doContrastTest: true,
      contrastThreshold: 3,
      memberColourPref: 0,
      tagColourPref: 1
    };
  }

  getSettings() {
    return {
      profileMap: this.getFilteredProfileMap(),
      idMap: this.idMap,
      eula: this.eula,
      doColourText: this.doColourText,
      contrastTestColour: this.contrastTestColour,
      doContrastTest: this.doContrastTest,
      contrastThreshold: this.contrastThreshold,
      memberColourPref: this.memberColourPref,
      tagColourPref: this.tagColourPref
    };
  }

  applySettings(settings) {
    this.profileMap = settings.profileMap;
    this.idMap = settings.idMap;
    this.eula = settings.eula;
    this.doColourText = settings.doColourText;
    this.contrastTestColour = settings.contrastTestColour;
    this.doContrastTest = settings.doContrastTest;
    this.contrastThreshold = settings.contrastThreshold;
    this.memberColourPref = settings.memberColourPref;
    this.tagColourPref = settings.tagColourPref;
  }

  getFilteredProfileMap() {
    const asArray = Object.entries(this.profileMap);
    const filtered = asArray.filter(([_, profile]) => profile.status === "DONE");
    return Object.fromEntries(filtered);
  }

  luminance(r, g, b) {
    let a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  contrast(rgb1, rgb2) {
    let lum1 = this.luminance(rgb1.r, rgb1.g, rgb1.b);
    let lum2 = this.luminance(rgb2.r, rgb2.g, rgb2.b);
    let brightest = Math.max(lum1, lum2);
    let darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF"	)
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

};
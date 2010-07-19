var XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
var HTMLNS = "http://www.w3.org/1999/xhtml";
var SVGNS = "http://www.w3.org/2000/svg";
var XLINKNS = "http://www.w3.org/1999/xlink";
const MINE_SOUND = "chrome://pmog/skin/sounds/mine.mp3";
const NICK_SOUND = "chrome://pmog/skin/sounds/stnick.mp3";
const PORT_SOUND = "chrome://pmog/skin/sounds/portal.mp3";

/*
* Add a capitalize method to the string class so we can use it on any string.
* */
String.prototype.capitalize = function(){
    return this.replace(/\w+/g, function(a){
        return a.charAt(0).toUpperCase() + a.substr(1).toLowerCase();
    });
};


String.prototype.truncate = function(length){
  if (this.length > length) {
    return this.slice(0, length - 3) + "...";
  } else {
    return this;
  }
};

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
};
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
};
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
};

function fixLinks(string) {
  var regex = /<\s*\w*\s*href\s*=\s*"?'?\s*([\w\s%#\/\.;:_-]*)\s*"?'?.*?>/g;
  var regex2 = /<a href='(.*)'>/g;
  //var regex3 = /<a href\s*=\s*([\w\s%#\/\.;:_-]*)\s*"?'?.*?>/g;
  string = string.replace(regex, "<a href=\"$1\">");
  string = string.replace(regex2, "<a href=\"$1\">");
  return string;
  //return string.replace(regex3, "<a href=\"$1\">");
};

/**
  Start SVG helpers
*/
var ATTR_MAP = {
  "className": "class",
  "svgHref": "href"
}

var NS_MAP = {
  "svgHref": XLINKNS
};

/**
  See: https://developer.mozilla.org/en/Code_snippets/SVG_General#Dynamic_scripting_helper
  
  Examples: 
  
  var circle = makeSVG("circle", {id: "circle1", cx: "60", cy: "60", r: "50"});

  var img = makeSVG("image", {id: "img1", x: "110", y: "110", width: "100", height: "100", svgHref: "bubbles.png"});

  var text = makeSVG("text", {id: "text1", x: "60", y: "60"});
  text.textContent = "Hello World";
*/
function makeSVG(tag, attributes) {
  var elem = document.createElementNS(SVGNS, tag);
  for (var attribute in attributes) {
      var name = (attribute in ATTR_MAP ? ATTR_MAP[attribute] : attribute);
      var value = attributes[attribute];
      if (attribute in NS_MAP)
      elem.setAttributeNS(NS_MAP[attribute], name, value);
      else
      elem.setAttribute(name, value);
  }
  return elem;
}
/**
  End SVG helpers
*/


function log(msg) {
  if (!this._console) {
    this._console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
  }
  this._console.logStringMessage(msg);
}

toJSONString = function(aJSObject, aKeysToDrop) {
    // we use a single string builder for efficiency reasons
    var pieces = [];

    // this recursive function walks through all objects and appends their
    // JSON representation (in one or several pieces) to the string builder
    function append_piece(aObj) {
        if (typeof aObj == "string") {
            aObj = aObj.replace(/[\\"\x00-\x1F\u0080-\uFFFF]/g,
            function($0) {
                // use the special escape notation if one exists, otherwise
                // produce a general unicode escape sequence
                switch ($0) {
                case "\b":
                    return "\\b";
                case "\t":
                    return "\\t";
                case "\n":
                    return "\\n";
                case "\f":
                    return "\\f";
                case "\r":
                    return "\\r";
                case '"':
                    return '\\"';
                case "\\":
                    return "\\\\";
                }
                return "\\u" + ("0000" + $0.charCodeAt(0).toString(16)).slice( - 4);
            });
            pieces.push('"' + aObj + '"');
        }
        else if (typeof aObj == "boolean") {
            pieces.push(aObj ? "true": "false");
        }
        else if (typeof aObj == "number" && isFinite(aObj)) {
            // there is no representation for infinite numbers or for NaN!
            pieces.push(aObj.toString());
        }
        else if (aObj === null) {
            pieces.push("null");
        }
        // if it looks like an array, treat it as such - this is required
        // for all arrays from either outside this module or a sandbox
        else if (aObj instanceof Array ||
        typeof aObj == "object" && "length" in aObj &&
        (aObj.length === 0 || aObj[aObj.length - 1] !== undefined)) {
            pieces.push("[");
            for (var i = 0; i < aObj.length; i++) {
                arguments.callee(aObj[i]);
                pieces.push(",");
            }
            if (aObj.length > 0) {
                pieces.pop();
                // drop the trailing colon
            }
            pieces.push("]");
        }
        else if (typeof aObj == "object") {
            pieces.push("{");
            for (var key in aObj) {
                // allow callers to pass objects containing private data which
                // they don't want the JSON string to contain (so they don't
                // have to manually pre-process the object)
                if (aKeysToDrop && aKeysToDrop.indexOf(key) != -1) {
                    continue;
                }

                arguments.callee(key.toString());
                pieces.push(":");
                arguments.callee(aObj[key]);
                pieces.push(",");
            }
            if (pieces[pieces.length - 1] == ",") {
                pieces.pop();
                // drop the trailing colon
            }
            pieces.push("}");
        }
        else {
            throw new TypeError("No JSON representation for this object!");
        }
    }
    append_piece(aJSObject);

    //log(pieces.join(""));

    return pieces.join("");
};

function third_party_cookies_enabled() {
  /*
  0 All cookies are allowed. (Default)
  1 Only cookies from the originating server are allowed.
  2 No cookies are allowed.
  3 Cookies are allowed based on the cookie P3P policy (Mozilla Suite and SeaMonkey only).
  */
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
  if (prefs.getIntPref("network.cookie.cookieBehavior") !== 0) {
    return false;
  }
  return true;
};

/**
* Takes an HTML <a> element and turns it into a clickable link that will
* open the url of the link in a new tab and not a new window or even worse,
* in the XUL parent itself.
* @param Object linkElement the DOM link element to manipulate
* @returns The link element with the href removed and an onclick listener meant
*          to open the target in a new tab
* @type Object
*/
function prepareLink(linkElement) {
  link = jQuery(linkElement).css("font-weight", "bold")
                            .attr("lnk", jQuery(linkElement).attr("href"))
                            .removeAttr("href").click(function () { Pmog.hud.openAndReuseOneTabPerURL(jQuery(linkElement).attr("lnk")); });
  return link;
};

function strip(str) {
  return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

function commaFormatted(nStr, pre) {
  var prefix = pre || '';
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return prefix + x1 + x2;
};

function stripHTML(str) {
  var reTag = /<(?:.|\s)*?>/g;
  return str.replace(reTag, "");
};

function escapeSpecial(str) {
  return str.replace("&", "&amp;");
};

function shortenURL(url) {
  var su = jQuery.ajax({
    url: "http://bit.ly/api",
    type: "GET",
    dataType: "html",
    async: false,
    data: {
      "url": url
    }
  }).responseText;
  return su;
};

function urlToShortLink(url) {
  var shortURL = this.shortenURL(url);
  return '<a href="' + shortURL + '">' + shortURL + '</a>';
};

function urlToLink(url) {
  return '<a href="' + url + '">' + url.truncate(30) + '</a>';
};

function pmailButton(target) {
  return '<span class="centerblock"><img src="chrome://pmog/skin/images/icons/pmail-16.png" target="' + target + '" class="pmail actionbutton" /></span>';
};

function stnickButton(target) {
  return '<span class="centerblock"><img src="chrome://pmog/skin/images/icons/st_nick-16.png" target="' + target + '" class="stnick actionbutton" /></span>';
};

function grenadeButton(target) {
  return '<span class="centerblock"><img src="chrome://pmog/skin/images/icons/grenade-16.png" target="' + target + '" class="grenade actionbutton" /></span>';
};

function crateButton(target) {
  return '<span class="centerblock"><img src="chrome://pmog/skin/images/icons/crate-16.png" target="' + target + '" class="crateform actionbutton" /></span>';
};

function rivalButton(target) {
  return '<span class="centerblock"><img src="chrome://pmog/skin/images/icons/rival-16.png" target="' + target + '" class="rival actionbutton" /></span>';
};

function allyButton(target) {
  return '<span class="centerblock"><img src="chrome://pmog/skin/images/icons/ally-16.png" target="' + target + '" class="ally actionbutton" /></span>';
};

function actionBarSpacer() {
  return '<span style="display: inline-block; width: 5px;" />';
};

function buttonPlaceholder() {
  return '<span style="display: inline-block; width: 16px;" />';
};
/*
  Class: Cache
  This class will store attributes to the Firefox preference system 
*/
/*
  Constructor: Cache
  Initializes the Object

  Parameters:

    prefs_branch - The instance of the desired prefs branch to query against. For example:
    Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService).getBranch("extensions.pmog.");
*/
function Cache(prefs_branch) {
    this.cache_prefix = Cache.preference_prefix;
    this.prefs = prefs_branch;
}

Cache.preference_prefix = 'PMOG_pref_';

/*
  Function: User
  Store attributes of a user to the preference system using the name parameter as an index value.

  Parameters:

    name - String to use an an idex (typically the user's login)
    obj  - Hash to store
*/
Cache.prototype.user = function(name, obj) {
    try {
        this.prefs.setCharPref(this.cache_prefix + name.toLowerCase(), this.to_string(obj));
    } catch(e) {
        // Pmog.logger.error(e, "Could not cache user");
        Components.utils.reportError(e);
    }
};

/*
  Function: to_string
  Converts a JavaScript object into a JSON string.
  From(http://mxr.mozilla.org/mozilla/source/js/src/xpconnect/loader/JSON.jsm)

  Parameters:

    aJSObject - is the object to be converted
    aKeysToDrop - is an optional array of keys which will be
    ignored in all objects during the serialization

  Returns:
  The object's JSON representation

  Note:
  aJSObject MUST not contain cyclic references.
*/
Cache.prototype.to_string = function(aJSObject, aKeysToDrop) {
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
            }
            // drop the trailing colon
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
            }
            
            // drop the trailing colon
            pieces.push("}");
        }
        else {
            throw new TypeError("No JSON representation for this object!");
        }
    }
    append_piece(aJSObject);

    return pieces.join("");
};

/*
  Class: Cached
  This class will retrieve attributes to the Firefox preference system 
*/
/*
  Constructor: Cached
  Initializes the Object

  Parameters:

    prefs_branch - The instance of the desired prefs branch to query against. For example:
    Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService).getBranch("extensions.pmog.");

*/
function Cached(prefs_branch) {
    this.cache_prefix = Cache.preference_prefix;
    this.prefs = prefs_branch;
}

/*
  Function: User
  Retrieve attributes of a user associated with the name.

  Parameters:

    name - The name of the user to return

  Returns: A json object corresponding to the user or null.
*/
Cached.prototype.user = function(name) {
    try {
        if (this.prefs.prefHasUserValue(this.cache_prefix + name)) {
            var user = this.prefs.getCharPref(this.cache_prefix + name);
            return this.from_string(user);
        } else {
            return null;
        }
    } catch(e) {
        // Pmog.logger.error(e, "Could not get cached user");
        Components.utils.reportError(e);
        return null;
    }
};

/*
  Function: from_string
  Convert a JSON string into a JavaScript object.

  Parameters:

    aJSONString - is the string to be converted

 Return: 
 A JavaScript object for the given JSON representation
*/
Cached.prototype.from_string = function(aJSONString) {
    if (!this.is_mostly_harmless(aJSONString)) {
      throw new SyntaxError("No valid JSON string!");
    }
    
    var s = new Components.utils.Sandbox("about:blank");
    return Components.utils.evalInSandbox("(" + aJSONString + ")", s);
};

/*
  Function: is_mostly_harmless
  Checks whether the given string contains potentially harmful
  content which might be executed during its evaluation
  (no parser, thus not 100% safe! Best to use a Sandbox for evaluation)

  Parameters:

    aString -  is the string to be tested

  Returns: 
  a boolean
 */
Cached.prototype.is_mostly_harmless = function(aString) {
    const maybeHarmful = /[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/;
    const jsonStrings = /"(\\.|[^"\\\n\r])*"/g;

    return ! maybeHarmful.test(aString.replace(jsonStrings, ""));
};

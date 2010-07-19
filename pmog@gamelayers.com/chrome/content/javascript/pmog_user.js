/*
  Class: PmogUser
  This class stores all the attributes needed by the player during the normal course
  of play.
*/

/*
  Constructor: PmogUser
  Initializes the Object
*/
PmogUser = function() {
    // Boolean: The user is logged in
    this.armored = '';
    this.authenticated = false;
    this.authenticity_token = '';
    this.auth_token = '';
    this.avatar_mini = '';
    this.bacon = '';
    this.buddies = [];
    this.can_overclock = false;
    this.classpoints = '';
    this.class_name = "PmogUser";
    this.datapoints = '';
    this.disarm_on = '';
    this.dodge_on = '';
    this.id = '';
    this.level = '';
    this.levels = '';
    this.levelup_requirements = Pmog.prop('level_up');
    this.level_percentage = '';
    this.login = '';
    this.motto = '';
    this.next_level = '';
    this.primary_association = '';
    this.queued_missions = [];
    this.recent_badges = [];
    this.recent_events = [];
    this.secondary_association = '';
    this.tertiary_association = '';
    this.total_datapoints = '';
    this.type = '';
    this.vengeance_on = '';
    
    this.listeners = [];

    // Used for checking for new messages from users on the server.
    this.etag = null;
    this.if_modified_since = null;
    
    this.qm_if_modified_since = null;
};

/*
  Function: update
  This method updates the player with any properties provided by the obj parameter

  Parameters:

    obj - An object of attributes to assign to the player.
*/
PmogUser.prototype.update = function(obj) {
    //Pmog.logger.debug(toJSONString(obj));
    for (var i in obj) {
        this[i] = obj[i];
    }
    
    this.notifyListeners();
};

/*
  Function: has_at_least_one
  This method determines if the user has at least one item in their inventory that
  matches the name of the tool passed in as the parameter.

  Parameters:

    tool - String of the name of the tool to search the inventory for.

  Returns:

    true or false
*/
PmogUser.prototype.has_at_least_one = function(tool) {
    return (parseInt(this.inventory[tool],10) > 0) ? true: false;
};

/*
  Function: is_playing
  Check the preferences to determine if the user is playing.

  Returns:

    returns true or false
*/
PmogUser.prototype.is_playing = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.pmog.");

    if (prefs.getBoolPref("playing") === true) {
        return true;
    } else {
        return false;
    }
};

PmogUser.prototype.login_label = function() {
    return this.login;
};

PmogUser.prototype.primary_association_label = function() {
    return this.primary_association + " - primary association";
};

PmogUser.prototype.secondary_association_label = function() {
    return this.secondary_association + " - secondary association";
};

PmogUser.prototype.tertiary_association_label = function() {
    return this.tertiary_association + " - tertiary association";
};

PmogUser.prototype.armor_label = function() {
    return 'Armor ' + commaFormatted(this.armor) + " (" + ((this.armored) ? "On": "Off") + ")";
};

PmogUser.prototype.dodge_label = function() {
    return 'Dodge ' + commaFormatted(this.dodge) + " (" + ((this.dodge_on) ? "On": "Off") + ")";
};

PmogUser.prototype.disarm_label = function() {
    return 'Dodge & Disarm ' + commaFormatted(this.disarm) + " (" + ((this.disarm_on) ? "On": "Off") + ")";
};

PmogUser.prototype.datapoints_label = function() {
    return 'Datapoints ' + commaFormatted(this.datapoints);
};

PmogUser.prototype.watchdogs_label = function() {
    return "Watchdogs " + commaFormatted(this.inventory.watchdogs);
};

PmogUser.prototype.mines_label = function() {
    return "Mines " + commaFormatted(this.inventory.mines);
};

PmogUser.prototype.grenades_label = function() {
    return "Grenades " + Pmog.comma_formatted(this.inventory.grenades);
};

PmogUser.prototype.skeleton_keys_label = function() {
    return "Skeleton Keys " + commaFormatted(this.inventory.skeleton_keys);
};

PmogUser.prototype.st_nicks_label = function() {
    return "St. Nicks " + commaFormatted(this.inventory.st_nicks);
};

PmogUser.prototype.lightposts_label = function() {
    return "Lightposts " + commaFormatted(this.inventory.lightposts);
};

PmogUser.prototype.portals_label = function() {
    return "Portals " + commaFormatted(this.inventory.portals);
};

PmogUser.prototype.crates_label = function() {
    return "Crates " + commaFormatted(this.inventory.crates);
};

PmogUser.prototype.classpoints_label = function() {
    return this.classpoints;
};

PmogUser.prototype.level_label = function() {
    return 'Level ' + this.level;
};

PmogUser.prototype.next_level_label = function() {
    return this.next_level;
};

PmogUser.prototype.addListener = function(listener) {
  if (this.listeners.indexOf(listener) === -1) {
    this.listeners.push(listener);
  }
}

PmogUser.prototype.removeListener = function(listener) {
  if (this.listeners.indexOf(listener) !== -1) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }
}

PmogUser.prototype.notifyListeners = function() {
  for (var i = this.listeners.length - 1; i >= 0; i--){
    try {
      this.listeners[i].userNotify(this);
    } catch(e) {
      //ignore it since it's not a method in the listener.
    }
  }
}

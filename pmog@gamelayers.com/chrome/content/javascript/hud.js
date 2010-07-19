/*
  Class: Hud
  The class that controls most of the direct manipulation tasks available
  within the extension.
*/

/*
  Constructor: Hud
  Initializes the Object
*/
Hud = function() {
  this.main_window = null;
  this.toolbar = null;
  this.signupDialog = null;

  // Toolbar for users with sessions.
  //this.pmog_login_toolbar_xul = null;
  // Toolbar for users without sessions.
  this.user_level_percentage_meter = null;
  this.pmog_game_notice = null;
  this.toolbarThrobber = null;
  this.session_manager = null;
  this.class_name = "Hud";
  this.prefs = null;

  this.os = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;

  // Contains browser.name and browser.version
  this.browser = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

  this.renderQueue = new Queue();
};

/*
 Function: init
 This function initialize the hud with its default attributes; and checks
 to see if this is the first time the extension has been used by the
 player. It also creates an instance of the <PmogSessionManager> to
 handle auto login if the user allowed their login credientials to be
 saved by Firefox.
*/
Hud.prototype.init = function() {
  this.initDOMReferences();

  this.checkSessionStatus();

  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
  this.main_window = wm.getMostRecentWindow("navigator:browser");

  // If this is a new install open pmog.com
  this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
  getService(Components.interfaces.nsIPrefService);
  this.prefs = this.prefs.getBranch("extensions.pmog.");

  // Start a new PMOG Session Manager
  this.session_manager = new PmogSessionManager(Pmog.private_url() + '/session.json');

  for (var y = 0; y < jQuery(".pmog_version").length; y++) {
    jQuery(".pmog_version")[y].setAttribute("label", Pmog.propf('pmog_version', [Pmog.version]));
  }

  // Try to login, which will only succeed if the user decided to store
  // their username and password.
  try {
    if (this.prefs.getBoolPref("playing") === true && !Pmog.user) {
      this.auto_login();
    }
  } catch(e) {
    // Pmog.logger.error(e, "Could not set a pref");
    Components.utils.reportError(e);
  }

  // Initally hide the tool portions of the hud until someone logs in.
  this.toolbar.setAttribute('hidden', false);

  this.update_switch_users_menu(null, this.session_manager.find_all_logins().logins);
  this.loaded = true;

  // This is the action notification panel. We need to open it up here on init
  // or it shows an empty white box to the player when first opened on an action.
  // Opening it here will allow us to seamlessly show the notices
  jQuery('#notepanel')[0].openPopup(Pmog.hud.attachToFirefox(), "after_start", 0, 0, null, null);
  
  
  // Add an event listener to all the toolbar buttons in The Nethernet toolbar so that when clicked, they hide the tooltip
  jQuery('#pmog-toolbar toolbarbutton').click(function() {
    Pmog.setTooltipState(false);
  });
  
  return this;
};

Hud.prototype.isHidden = function() {
  return Pmog.hud.toolbar.collapsed;
};

/*
  Function: toggle_hud
  Toggles the hud visible or hidden depending on the hud's current
  setting.
*/
Hud.prototype.toggle_hud = function() {
  Pmog.hud.toolbar.collapsed = this.isHidden() ? false: true;

  if (!this.isHidden()) {
    Pmog.renderAllOverlaysForPage(Pmog.get_page());
  }
};

/*
  Function: help
  This function will open a tab in the browser to the help url on the
  PMOG server.
*/
Hud.prototype.help = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/help");
};

/*
  Function: shoppe
  This function will open a tab in the browser to the shoppe url on the
  PMOG server.
*/
Hud.prototype.shoppe = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/shoppe");
};

/*
  Function: buy
  This function opens the shoppe to the page of the supplied tool
  Parameters:

    tool - String representing the tool to buy
*/
Hud.prototype.buy = function(tool) {
  switch (tool) {
  case 'mines':
  case 'crates':
  case 'armor':
  case 'lightposts':
  case 'st_nicks':
  case 'portals':
  case 'grenades':
    this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/shoppe#" + tool);
    break;
  }
};
/*
  Function: learn_about
  This function opens the correct page of the codex associated with the topic passed in

  Parameters:

    topic - String representing the topic to learn about
*/
Hud.prototype.learn_about = function(topic) {
  switch (topic) {
  case 'key_commands':
    this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/support/keycommands/");
    break;
  case 'mines':
  case 'crates':
  case 'armor':
  case 'lightposts':
  case 'st_nicks':
  case 'portals':
  case 'grenades':
  case 'watchdogs':
  case 'skeleton_keys':
    this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/tools/" + topic + "/");
    break;

  case 'bedouins':
  case 'destroyers':
  case 'pathmakers':
  case 'benefactors':
  case 'shoats':
  case 'seers':
  case 'vigilantes':
    this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/classes/" + topic + "/");
    break;
  case 'appendices':
    this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/rules/");
    break;
  }
};

/*
  Function: deploy
  This function will initiate a deploy request for whatever tool is provided as a parameter.

  Parameters:

    tool - The tool to deploy
*/
Hud.prototype.deploy = function(tool) {
  switch (tool) { //FIXME delete this now that we don't have special cases?
  default:
    Pmog.request_deploy_action(tool);
    break;
  }
};

/*
  Function: edit_lightpost
  This function opens a browser window to the player's lightpost page.

*/
Hud.prototype.edit_lightpost = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/users/" + Pmog.user.login + "/lightposts");
};

/*
  Function: visit_forums
  Opens a browser tab to the help forums page.
*/
Hud.prototype.visit_forums = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/posts/latest");
};

/*
  Function: visit_blog
  Opens a browser tab to the Community News Weblog.
*/
Hud.prototype.visit_blog = function() {
  this.openAndReuseOneTabPerURL("http://news.thenethernet.com/");
};

/*
  Function: visit_toolbar_help
  Opens a browser tab to the toolbar help page.
*/
Hud.prototype.visit_toolbar_help = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/support/toolbar");
};

/*
  Function: visit_mailbox
  Opens a browser tab to the players mailbox
*/
Hud.prototype.visit_mailbox = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/users/" + Pmog.user.login + "/messages");
};

/*
  Function: visit_events
  Opens a browser tab to the players events
*/
Hud.prototype.visit_events = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/users/" + Pmog.user.login + "/events");
};

/*
  Function: visit_contacts
  Opens a browser tab to the friends page
*/
Hud.prototype.visit_contacts = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/acquaintances/" + Pmog.user.login);
};

Hud.prototype.forgot_password = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/sessions/find/");
};

/*
  Function: preferences
  This function opens a xul preference window.
*/
Hud.prototype.preferences = function() {
  window.open("chrome://pmog/content/options/options.xul", "Pmog Preferences", "hidechrome=true,chrome,width=600,height=350", jQuery);
};

Hud.prototype.openSignupForm = function() {
  if(this.signupDialog == null || this.signupDialog.closed)
  /* if the pointer to the window object in memory does not exist
     or if such pointer exists but the window was closed */

  {
    this.signupDialog = window.open("chrome://pmog/content/signup/signup.xul", "tnnSignup", "chrome,titlebar,centerscreen");
    /* then create it. The new window will be created and
       will be brought on top of any other window. */
  }
  else
  {
    this.signupDialog.focus();
    /* else the window reference must exist and the window
       is not closed; therefore, we can bring it back on top of any other
       window with the focus() method. There would be no need to re-create
       the window or to reload the referenced resource. */
  };
};

/*
  Function: ignored_sites
  This function opens a xul window displaying sites for PMOG to ignore.
*/
Hud.prototype.ignored_sites = function() {
  window.open("chrome://pmog/content/ignore/ignore.xul", "_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar", Pmog);
};

/*
  Function: Make Mission
*/
Hud.prototype.make_mission = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/missions/new/");
};

/*
  Function: Find Mission
*/
Hud.prototype.find_mission = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/missions/");
};

/*
  Function: report a bug
  This function opens a xul window to submit a bug to pmog.
*/
Hud.prototype.report_a_bug = function() {
  var bug_report = {
    dump: '',
    email: '',
    description: ''
  };
  try {
    bug_report.dump += new ObjectParser().parse_object(Pmog.user);
  } catch(e) {}

  try {
    bug_report.dump += new ObjectParser().parse_object(Pmog.get_page());
  } catch(e) {}

  var params = {
    inn: {
      core_dump: bug_report.dump,
      pmog: Pmog
    },
    out: null
  };

  window.openDialog("chrome://pmog/content/bug_report/bug_report.xul", "", "chrome, dialog, modal, resizable=yes", params).focus();
  if (params.out) {
    var uri = Pmog.BASE_URL + '/exceptions/' + Pmog.user.login + '/bug_report.json?' + Pmog.user_verification_params();
    uri += "&exception[dump]=" + escape(bug_report.dump);

    if (params.out.email) {
      uri += "&exception[email]=" + params.out.email;
    }

    if (params.out.description) {
      uri += "&exception[description]=" + params.out.description;
    }

    uri += '&' + Pmog.user_verification_params();

    jQuery.ajax({
      url: uri,
      type: 'POST',
      data: '',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      success: function(response_obj) {

        if (response_obj.table) {
          response_obj = response_obj.table;
        }

        try {
          var panel_id = Pmog.get_display().tab.panel_id;
          Pmog.parse_page_objects({
            page_objects: response_obj,
            panel_id: panel_id
          });
        } catch(e) {
          // Pmog.logger.error(e, 'Could not get panel_id');
          Components.utils.reportError(e);
        }
      }
    });
  }
};

/*
  Function: manage_profiles
  This function displays a dialog that allows users to manage their preferences by clearing
  passwords and preferences at will.
*/
Hud.prototype.manage_profiles = function() {
  var params = {
    inn: {
      clear_passwords: true,
      clear_preferences: true
    },
    out: null
  };
  window.openDialog("chrome://pmog/content/profiles/manage.xul", "", "chrome, dialog, modal, resizable=yes", params).focus();
  if (params.out) {
    if (params.out.clear_preferences === true) {
      this.reset_all_preferences();
    }

    if (params.out.clear_passwords === true) {
      this.session_manager.delete_all_logins();
    }

    // We have to reset if the user didn't clear passwords.
    if (params.out.clear_passwords === true || params.out.clear_preferences === true) {
      this.session_manager.sign_out();
      this.updateToolbarTxt(Pmog.prop('please_restart_your_browser'));
    }
  }
};

/*
  Function: profile
  This function opens a browser window to the current player's profile
  page.
*/
Hud.prototype.profile = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/users/" + Pmog.user.login);
};

/*
  Function: register
  This function opens a browser window to pmog registration page.

*/
Hud.prototype.register = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/toolbarlanding?toolbar");
};

/*
  Function: visit_pmog
  This function opens a browser window to the root pmog url.
*/
Hud.prototype.visit_pmog = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL);
};

/*
  Function: acquaintances
  This function opens a browser window to the current player's
  acquaintances page.
*/
Hud.prototype.acquaintances = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/acquaintances/" + Pmog.user.login);
};

/*
  Function: missions
  This function opens a browser window to the current player's missions
  page.
*/
Hud.prototype.missions = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/missions/");
};

/*
  Function: switch_users
  This function logs the current user out and brings down the login box
  so that a user can log in as someone else.

  Parameters:

    user - String containing the login of the user to switch to. If user
    is null it will display the login prompt.

    force_prompt - Force a prompt to be displayed.
*/
Hud.prototype.switch_users = function(user, force_prompt) {
  if (user && force_prompt !== true) {
    this.session_manager.sign_out();
    this.login(user);
  } else {
    this.login_obj = new Object();
    var target = this;
    this.login_obj.handleEvent = function(user, response_obj) {
      target.login_result(user, response_obj);
    };

    this.clearToolbarTxt();
    this.session_manager.login_as(this.login_obj.handleEvent, force_prompt);
  }
};

/*
  Function: level_up_help
  This function opens a browser to a page, that contains explainations of
  how to level up.
*/
Hud.prototype.level_up_help = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/rules/levels");
};

/*
  Function: codex_pmogeus
  This function opens a browser to the codex page on pmog.com
*/
Hud.prototype.codex_pmogeus = function() {
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide");
};

/*
  Function: play
  Resume play of the game and unhide the hidden pmog tools and event
  windows.
*/
Hud.prototype.resume_play = function() {
  Pmog.prefs.setBoolPref("playing", true);
};

/*
  Function: pause
  Pause the game playback, hide the pmog toolbar and event windows.
*/
Hud.prototype.pause = function() {
  Pmog.prefs.setBoolPref("playing", false);
};

/*
  Function: updateToolbarTxt
  This function displays a text message in the status message element.

  Parameters:

    msg - A string of text to display in the main toolbox.
*/
Hud.prototype.updateToolbarTxt = function(msg) {
  jQuery(this.pmog_game_notice).show().attr('value', msg);
};

Hud.prototype.updateAndFadeToolbarTxt = function(msg) {
  this.updateToolbarTxt(msg);
  jQuery(this.pmog_game_notice).fadeOut(4000,
  function() {
    Pmog.hud.clearToolbarTxt();
  });
};

Hud.prototype.clearToolbarTxt = function() {
  jQuery(this.pmog_game_notice).stop().css("opacity", 1.0).attr('value', '').hide();
};

/*
  Function: auto_login
  If the player's credentials are stored withing firefox then this method
  will attempt to use them to automatically log the user into PMOG and 
  start playing the page.
*/
Hud.prototype.auto_login = function() {
  // See if the user has stored their username and password.
  var p = this.session_manager.find_login_credintials();
  if (p.user && p.password && Pmog.prefs.getBoolPref("auto_login") === true) {
    try {
      var target = this;
      this.session_manager.login(p.user, p.password,
      function(user, response_obj) {
        target.login_result(user, response_obj);
      });
    } catch(e) {
      // Pmog.logger.error(e);
      Components.utils.reportError(e);
    }
  } else {
    this.clearToolbarTxt();
  }
};

/*
  Function: login
  This function allows the player to attempt to sign into Pmog only after
  they've supplied a username and password to the extension through a 
  message prompt.

  Parameters:
    user - String of the username to log in as, if a string is not provided
    it will attempt to log in using the current_user preference if available.
*/
Hud.prototype.login = function(user) {

  // Update the pref so we confirm they are now playing.
  Pmog.prefs.setBoolPref("playing", true);

  var p = this.session_manager.find_login_credintials(user);
  var target = this;
  if (p.user && p.password) {
    this.session_manager.login(p.user, p.password,
    function(user, response_obj) {
      target.login_result(user, response_obj);
    });
  } else {
    this.session_manager.login_as(function(user, response_obj) {
      target.login_result(user, response_obj);
    },
    true);
  }
};

/*
  Function: login_result
  This function is used as a callback for the login attempt. The 
  <PmogSessionManager> will call this function and pass back the user 
  object and the JSON object containing all other information sent as 
  part of the login process.

  Parameters:

    user - Contains an instance of the <PmogUser> class.
    response_obj - contains other info for login like the MOTD
*/
Hud.prototype.login_result = function(user, response_obj) {
  if (user.authenticated) {
    var panel_id;
    this.clearToolbarTxt();

    // we need the login to be lowercase at all times.
    user.login = user.login.toLowerCase();

    Pmog.cache.user(user.login, response_obj.user);

    Pmog.passive_record = new PassiveRecord("pmog_" + user.login + ".sqlite");

    Pmog.white_list = Pmog.passive_record.find_all('whitelists');

    this.prefs.setCharPref("current_user", user.login);
    this.prefs.setBoolPref("playing", true);

    Pmog.user = user;

    this.update_pmog_toolbar(user);

    // Update the avatar image used in the hud
    jQuery('#profile-button').css('list-style-image', 'url("' + Pmog.BASE_URL + user.avatar_mini + '")');
    this.update_acquaintances_menu(user);
    this.update_venture_menu(user);
    this.update_missions_menu(user);

    // Display any page objects
    try {
      panel_id = Pmog.get_display().tab.panel_id;
      Pmog.parse_page_objects({
        page_objects: response_obj,
        panel_id: panel_id
      });
    } catch(e) {
      // Pmog.logger.error(e, 'during login_result could not get panel_id');
      Components.utils.reportError(e);
    }
    // We're calling the method inside the observer that responds when we change
    // pages. Essentially tricking it into thinking we've changed URLs and thus
    // it should send a track request to PMOG. This way PMOG should be in a state
    // ready to play when the user first opens / logs into the toolbar.
    Pmog.urlListener.processNewURL(gBrowser.currentURI);

  }

  // Check to see if we should be showing or hiding.
  this.checkSessionStatus();
};

/*
  Function: update_venture_menu
  This function will display a button to take a user on a random mission from their queue.

  Parameters:

    user - The user object, which contains the login to use.
    auto_take - True or False to automatically take the mission or just visit the mission page.
*/
Hud.prototype.update_venture_menu = function(user) {
  try {
    if (user.queued_missions && user.queued_missions.length > 0) {
      jQuery('#explore_venture').get(0).setAttribute('hidden', false);
    }
  } catch(e) {}
};

/*
  Function: add_venture
  Take a user to either the landing page or the first branch of a mission in their queue.

  Parameters:
  
    auto_take - True or False to automatically take the mission or just visit the mission page.
*/
Hud.prototype.add_venture = function(take) {
  var take = take || false;
  var dotake = (take === true) ? 'take': '';
  
  var branch = jQuery('branch')[0];
  if (branch.parentNode.state === "open") {
    branch.abandon();
    setTimeout(null, 2000);
  }
  
  try {
    if (Pmog.user.queued_missions.length > 0) {
      var random_mission = Pmog.user.queued_missions[Math.floor(Math.random() * Pmog.user.queued_missions.length)];
      this.openAndReuseOneTabPerURL(random_mission.url + '/' + dotake);
      return true;
    } else {
      Pmog.notice('You have no queued missions.');
      return false;
    }
  } catch(e) {
    Pmog.notice('You have no queued missions.');
    return false;
  }
};

/*
  Function: play
  When the player hits presses "Play", the toolbar randomly load a Jaunt or Venture Forth action.

*/
Hud.prototype.play = function() {
  this.toolbarThrobber.collapsed = false;
  jQuery.ajax({
    url: Pmog.private_url() + '/users/' + Pmog.user.login + '/play.json?' + Pmog.user_verification_params(),
    type: 'POST',
    data: '',
    dataType: 'json',
    contentType: "application/json; charset=utf-8",
    panel_id: Pmog.tab_observer.selected_tab().panel_id,
    success: function(response_obj) {
      //log("play type: " + response_obj.play_type);
      gBrowser.contentDocument.location = response_obj.url;
    },
    error: function(data) {
      Pmog.portalHandleError(data.status, data.responseText);
    },
    complete: function() {
      Pmog.hud.toolbarThrobber.collapsed = true;
    }
  });
};

/*
  Function: update_switch_users_menu
  This function will display the currently logged in user next to the switch users menu item
  in the "P" menu.

  Parameters:

    user - The user object, which contains the login to use.
*/
Hud.prototype.update_switch_users_menu = function(user, other_logins) {
  jQuery(".user-login-item").remove();
  for (var i = other_logins.length - 1; i >= 0; i--){
    var cached_user = Pmog.cached.user(other_logins[i]);
    var item = document.createElement("menuitem");
    if (cached_user) {
      var label = other_logins[i] + " - Level " + cached_user.level;
      item.setAttribute("label", label);
      item.setAttribute("image", Pmog.BASE_URL + cached_user.avatar_mini);
    } else {
      item.setAttribute("label", other_logins[i]);
    }
    item.setAttribute("id", "menuitem_for_" + other_logins[i]);
    item.setAttribute("class", "menuitem-iconic pmog_menu_item user-login-item");
    item.setAttribute("login", other_logins[i]);
    item.setAttribute("oncommand", "Pmog.login(this.getAttribute('login'))");
    if (user && (user.login == other_logins[i])) {
      item.setAttribute("class", "menuitem-iconic pmog_menu_item current_user");
    }

    jQuery(item).insertBefore(".switch-user-stop");
  }
};

/*
  Function: update_acquaintances_menu
  This function will query the pmog server for the info for each of their buddies,
  which will be displayed in the IM window menu.

  Parameters:

    user - The user object, which contains an array of buddies.
*/
Hud.prototype.update_acquaintances_menu = function(user) {
  var user = user || undefined;
  var menu_label = 'pmog_im_acquaintances_popup_vbox';
  contactsMenu = jQuery('#' + menu_label)[0];
  while (contactsMenu.childNodes.length > 0) {
    contactsMenu.removeChild(contactsMenu.childNodes[0]);
  }

  for (var x = 0; x < user.buddies.length; x++) {
    try {
      // Only add a new user's to the menu items.
      var id = menu_label + '_menuitem_for_acquaintance_' + user.buddies[x].id;
      if (!jQuery(id)[0]) {
        var item = document.createElement("menuitem");
        item.setAttribute("id", id);
        item.setAttribute("image", Pmog.BASE_URL + user.buddies[x].avatar_mini);
        item.setAttribute("label", user.buddies[x].login);

        item.setAttribute("class", "menuitem-iconic pmog_menu_item");
        item.setAttribute("login", user.buddies[x].login);
        //item.setAttribute("command", "cmd_open_messageform");
        item.setAttribute("oncommand", "Pmog.hud.openReply(this.getAttribute('login'))");
        contactsMenu.appendChild(item);
      }
    } catch(e) {
      // Pmog.logger.error(e, 'could not add buddie to im menu');
      Components.utils.reportError(e);
    }
  }
};

Hud.prototype.update_missions_menu = function(user) {
  var menu_label = 'pmog_missions_menu_popup';
  missionsMenu = jQuery('#' + menu_label)[0];
  while (missionsMenu.childNodes.length > 2) {
    missionsMenu.removeChild(missionsMenu.childNodes[2]);
  }
  for (var x = 0; x < user.queued_missions.length; x++) {
    try {
      // Only add a new user's to the menu items.
      var id = menu_label + '_menuitem_for_mission_' + x;
      if (!jQuery(id)[0] && user.queued_missions[x]) {
        var item = document.createElement("menuitem");
        item.setAttribute("id", 'queued_mission_' + x);
        item.setAttribute("label", user.queued_missions[x].name);
        item.setAttribute("tooltiptext", user.queued_missions[x].url);
        item.setAttribute("url", user.queued_missions[x].url);
        item.setAttribute("class", "menuitem-iconic missions_icon pmog_menu_item");
        item.setAttribute("oncommand", "Pmog.hud.openAndReuseOneTabPerURL(this.getAttribute('url'));");
        missionsMenu.appendChild(item);
      }
    } catch(e) {
      // Pmog.logger.error(e, 'could not add queued mission to menu menu');
      Components.utils.reportError(e);
    }
  }

};
/*
  Function: openAndReuseOneTabPerURL
  This function will open a url in a new or existing tab depending if 
  a tab is already open containing the requested url.

	This addition will add a global URL suffix: var url = url + "?origin=xpi";

  Parameters:

    url - String containing url to load in the browser
*/
Hud.prototype.openAndReuseOneTabPerURL = function(url) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
  var browserEnumerator = wm.getEnumerator("navigator:browser");

  // Check each browser instance for our URL
  var found = false;
  while (!found && browserEnumerator.hasMoreElements()) {
    var browserInstance = browserEnumerator.getNext().getBrowser();

    // Check each tab of this browser instance
    var numTabs = browserInstance.tabContainer.childNodes.length;
    for (var index = 0; index < numTabs; index++) {
      var currentBrowser = browserInstance.getBrowserAtIndex(index);
      try {
        if (url == currentBrowser.currentURI.spec) {

          // The URL is already opened. Select this tab.
          browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];

          // Focus *this* browser
          browserInstance.focus();
          found = true;
          break;
        }
      } catch(e) {
       // Pmog.logger.error(e, "Could not open the browser window.");
       Components.utils.reportError(e);
      }
    }
  }

  // Our URL isn't open. Open it now.
  if (!found) {
    var recentWindow = wm.getMostRecentWindow("navigator:browser");
    if (recentWindow) {
      // Use an existing browser window
      recentWindow.delayedOpenTab(url, null, null, null, null);
    }
  }
};

/* 
  Function: initDOMReferences
  Extract the location of important items of the hud into variables
  so that we only have to look them up once.
*/
Hud.prototype.initDOMReferences = function() {
  this.toolbar = jQuery('#pmog-toolbar').get(0);
  this.toolbarThrobber = jQuery('#pmog-toolbar-throbber').get(0);
  this.pmog_game_notice = jQuery('#toolbar-message').get(0);
};

Hud.prototype.updateAutoPollContextMenu = function() {
  var mi = jQuery('#toggle_pmail_polling')[0];
  if (Pmog.prefs.getBoolPref("auto_poll_pmail")) {
    mi.setAttribute("checked", true);
  } else {
    mi.removeAttribute("checked");
  }
};

/*
  Function: update_pmog_toolbar
  Find the xul element for the pmog toolbar and iterate over the 
  child nodes looking for elements which match attributes of the user
  object. If the element exists then assign it the correct value from 
  the user object

  Parameters:

    user - Instance of the <PmogUser> class.
*/
Hud.prototype.update_pmog_toolbar = function(user) {
  jQuery('#datapoint-button')[0].label = commaFormatted(user.datapoints);
  jQuery('#bacon-button')[0].label = commaFormatted(user.bacon);
  jQuery('#messageform-button')[0].label = user.unread_messages ? user.unread_messages : "0";
  
  jQuery('#armor-button')[0].label = user.inventory.armor;
  jQuery('#dodge-button')[0].label = user.inventory.dodge;
  jQuery('#disarm-button')[0].label = user.inventory.disarm;
  jQuery('#vengeance-button')[0].label = user.inventory.vengeance;
  
  for (var x in user) {
    try {
      var element = jQuery('#pmog_' + x)[0];
      if (element) {
        element.setAttribute('label', user[x + "_label"]());
      }
    } catch(e) {
      // Pmog.logger.error(e, 'Could not find element: pmog_' + x);
      Components.utils.reportError(e);
    }
  }

  var armoredButton = jQuery('#armor-button')[0];
  if (user.armored && armoredButton !== undefined) {
    armoredButton.setAttribute('status', "on");
  } else if (armoredButton !== undefined) {
    armoredButton.setAttribute('status', "off");
  }

  var dodgeButton = jQuery('#dodge-button')[0];
  if (user.dodge_on) {
    dodgeButton.setAttribute('status', "on");
  } else {
    dodgeButton.setAttribute('status', "off");
  }

  var disarmButton = jQuery('#disarm-button')[0];
  if (user.disarm_on) {
    disarmButton.setAttribute('status', "on");
  } else {
    disarmButton.setAttribute('status', "off");
  }
  
  var vengeanceButton = jQuery('#vengeance-button')[0];
  if (user.vengeance_on) {
    vengeanceButton.setAttribute('status', "on");
  } else {
    vengeanceButton.setAttribute('status', "off");
  }

  var mineToolbarButton = jQuery('#mine-upgrade-button')[0];

  var stealthMenuItem = jQuery('#attack-stealth-mine')[0];
  var stealthMinePref = Pmog.prefs.getBoolPref("stealth_mine");
  
  var abundantMenuItem = jQuery('#attack-abundant-mine')[0];
  var abundantMinePref = Pmog.prefs.getBoolPref("abundant_mine");
  
  if (stealthMinePref) {
    stealthMenuItem.setAttribute("checked", true);
    jQuery(mineToolbarButton).addClass('stealth_mine_icon');
  } else {
    stealthMenuItem.removeAttribute("checked");
    jQuery(mineToolbarButton).removeClass('stealth_mine_icon');
  }
  
  if (abundantMinePref) {
    abundantMenuItem.setAttribute("checked", true);
    jQuery(mineToolbarButton).addClass('abundant_mine_icon');
  } else {
    abundantMenuItem.removeAttribute("checked");
    jQuery(mineToolbarButton).removeClass('abundant_mine_icon');
  }
  
  if (abundantMinePref && stealthMinePref) {
    jQuery(mineToolbarButton).addClass('super_mine_icon');
  } else {
    jQuery(mineToolbarButton).removeClass('super_mine_icon');
  }
  
  window.updateCommands("PmogStateChange");
};

/*
  Function: parse_user_associations
  This function styles the childnodes of a xul element to match the
  player's associations.

  Parameters:

    xul - XUL node containg child nodes where the user associations are
    to be displayed.
    user - Instance of the <PmogUser> class.
*/
Hud.prototype.parse_user_associations = function(xul, user) {

  // Assign the menu the primary associations values.
  xul.setAttribute('image', "chrome://pmog/skin/" + this.skin + "/icons/associations/" + user.primary_association.toLowerCase() + "-16.png");

  var popup = xul.firstChild;
  var classes = ['primary', 'secondary', 'tertiary'];
  for (var x = 0; x < popup.childNodes.length; x++) {

    // Assign the correct label to the menu item.
    popup.childNodes[x].setAttribute('label', user[classes[x] + '_association_label']());

    // Assign the correct association image to the menu item.
    popup.childNodes[x].setAttribute('image', "chrome://pmog/skin/" + this.skin + "/icons/associations/" + user[classes[x] + '_association'].toLowerCase() + "-16.png");
  }
};

/*
  Function: show_association_page
  This function opens a browser to the association of the provided 
  parameter.

  Parameters:

    association - String containing the assocation to display.
*/
Hud.prototype.show_association_page = function(association) {

  // Receive the association and put out the right URL
  this.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide/classes/" + Pmog.user[association] + "s");
};

/*
  Function: pmog_reset
  This function reboots PMOG as if the user just logged in.
*/
// Hud.prototype.pmog_reset = function() {
//     Pmog.do_reset();
//     this.init();
// };
/*
  Function: delete_all_logins
  Delete all the logins stored for the PMOG domain, and then log out. 
*/
Hud.prototype.delete_all_logins = function() {
  if (this.session_manager.delete_all_logins()) {
    this.session_manager.sign_out();
  }
};

/*
  Function: reset_all_preferences
  Reset all the logins stored for the PMOG domain, and then log out. 
*/
Hud.prototype.reset_all_preferences = function() {
  var items = this.prefs.getChildList("", []);
  for (var i = 0; i < items.length; i++) {
    try {
      if (this.prefs.prefHasUserValue(items[i])) {
        this.prefs.clearUserPref(items[i]);
      }
    } catch(e) {
      // Pmog.logger.error(e);
      Components.utils.reportError(e);
    }
  }
};

Hud.prototype.toggleOverlayForm = function(overlay, options) {
  var options = options || {};
  var panel = jQuery('#' + overlay)[0];

  var button = "#";
  if (options.buttonId) {
    button = button + options.buttonId;
  } else {
    button = button + overlay + "-button";
  }

  if (panel.state === "open") {
    this.fadeOverlay(overlay);
    return false;
  } else {
    panel.openPopup(jQuery(button)[0], 'after_start', 0, 0, false, false);
    
    try {
      panel.firstChild.show(options.showArg);
    } catch(e) {
      // Pmog.logger.debug('overlay has no show method, skipping');
    }
  }

  if (options.callback) {
    eval(options.callback);
  }

  return panel;
};

Hud.prototype.resetOverlayObject = function(overlayName) {
  var newOvrlay = document.createElementNS(XULNS, overlayName);
  var oldOvrlay = jQuery(overlayName)[0];
  var panel = oldOvrlay.parentNode;

  panel.style.opacity = 0;

  panel.removeChild(oldOvrlay);
  panel.appendChild(newOvrlay);
  newOvrlay.setAttribute("id", overlayName);

  panel.hidePopup();

  panel.style.opacity = 1;

  return this;
};

Hud.prototype.showOverlayForm = function(overlay) {
  var panel = jQuery('#' + overlay)[0];

  try {
    panel.firstChild.show();
  } catch(e) {
    // Pmog.logger.debug('overlay has no show method, skipping');
  }
};

Hud.prototype.checkSessionStatus = function() {
  if (Pmog.user && Pmog.user.authenticated) {
    Pmog.hud.toolbar.collapsed = false;
    jQuery('#pmog-logged-out')[0].collapsed = true;
    jQuery('#loginTxt, #passwordTxt').each(function() { this.reset() })
  } else {
    //jQuery('#logged_out_message')[0].value = Pmog.prop('default_logged_out_message');
    Pmog.hud.toolbar.collapsed = true;
    jQuery('#pmog-logged-out')[0].collapsed = false;
  }
};

Hud.prototype.addEventOverlay = function(overlay) {
  var panel = overlay.parentNode;

  panel.setAttribute("open", true);

  overlay.style.opacity = 0;

  return overlay;
};

Hud.prototype.attachToFirefox = function() {
  var attachTo;

  if (jQuery("#content")[0].mStrip.collapsed) {
    attachTo = jQuery('#navigator-toolbox')[0];
  } else {
    attachTo = jQuery("#content")[0].mStrip;
  }

  return attachTo;
};

Hud.prototype.removeEventOverlay = function(overlay) {

  var overlay = overlay || undefined;

  var panel = overlay.parentNode;

  panel.setAttribute("open", false);

  this.fadeOverlay(overlay.tagName);
};

Hud.prototype.fadeOverlay = function(overlayName) {
  jQuery(overlayName).fadeTo("fast", 0.1,
  function() {
    Pmog.hud.repositionEventOverlays();
    Pmog.hud.resetOverlayObject(overlayName);
  });
};

Hud.prototype.repositionEventOverlays = function() {
  if (!Pmog.hud.repositioning) {
    Pmog.hud.repositioning = true;
  } else {
    return false;
  }

  // Find the rest of the panel XUL elements that have a type attribute equal to event
  var panels = jQuery('panel[type=event][open=true]');

  panels.each(function(i) {

    if (this.state === "open") {
      this.hidePopup();
    }

    if (i === 0) {
      this.openPopup(Pmog.hud.attachToFirefox(), "after_end", -15, 0, false, false);
    } else {
      this.openPopup(panels[i - 1], "after_end", 0, 10, false, false);
    }
  });
  Pmog.hud.repositioning = false;

  return true;
};

// Removes all the event overlays from the view. Called when a new URL is loaded or the Tab is changed.
Hud.prototype.removeVolatile = function(callback) {
  jQuery('panel[type=event][open=true]').each(function() {
    if (this.firstChild.isVolatile) {
      this.firstChild.close();
    }
  });

  if (callback) {
    callback.call(this);
  }
};

Hud.prototype.openReply = function(player, message) {
  var player = player || undefined;
  var message = message || undefined;

  if (player === undefined) {
    return false;
  }

  Pmog.hud.toggleOverlayForm('messageform');
  jQuery('messageform')[0].recipient = player;
  if (message !== undefined) {
    jQuery("messageform")[0].message = message;
  }

  return true;
};

Hud.prototype.hideAll = function() {
  jQuery('.pmog-panel').each(function() {
    if (this.state === "open") {
      this.firstChild.close();
    }
  })
};

Hud.prototype.signInFromToolbar = function() {
  var target = this;
  this.session_manager.login(jQuery('#loginTxt')[0].value, jQuery('#passwordTxt')[0].value, function(user, response_obj) {
    target.login_result(user, response_obj);
  }, jQuery('#rememberLogin')[0].checked);
};
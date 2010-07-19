/*
  Class: PmogSessionManager
  This class handles the authentication, the storing and retrieving of local
  login credentials and session handling of Pmog players.

  This class supports login credential storage for both Firefox two and three.
*/

/*
  Constructor: PmogSessionManager
  Initializes the Object
*/
PmogSessionManager = function(session_url) {
  this.session_url = session_url;
  this.class_name = "PmogSessionManager";
  this.login_manager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
  this.nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
};

PmogSessionManager.prototype.init = function() {};

/*
  Function: find_login_credintials
  This function determines which manager to use to retrieve the stored passwords.

  Parameters:

    user - String containing the login of the user whose credentials we want to find.
    If user is null it will try to use the current_user preference if available.

  Returns:
    Hash containing the username and password or a list of other logins
*/
PmogSessionManager.prototype.find_login_credintials = function(user) {

  if (Pmog.prefs.prefHasUserValue("current_user") && !user) {
    user = Pmog.prefs.getCharPref("current_user");

  }
  return this.use_login_manager(user);
};

/*
  Function: find_all_logins
  This function returns a list of all logins saved by The Nethernet

  Returns: Hash containing list of all logins that have logged into The Nethernet at least once.
*/
PmogSessionManager.prototype.find_all_logins = function() {
  return this.use_login_manager();
};

/*
  Function: use_login_manager
  This function is used by at least Firefox three, and will find all usernames and passwords
  for the The Nethernet domain.

  Parameters:
    user - string of the last user to login or nil.
*/
PmogSessionManager.prototype.use_login_manager = function(user) {
  // Find users for the given parameters
  var logins = this.login_manager.findLogins({},
  Pmog.BASE_URL, Pmog.BASE_URL, null);

  var other_logins = [];
  // Find user from returned array of nsILoginInfo objects
  for (var i = 0; i < logins.length; i++) {
    if (logins[i].username.toLowerCase() == user) {
      return {
        user: logins[i].username,
        password: logins[i].password
      };
    } else {
      // some other The Nethernet user
      other_logins.push(logins[i].username);
    }
  }
  // No credentials were found
  return {
    logins: other_logins
  };
};

/*
  Function: use_password_manager
  This function is used by Firefox two, and will find all usernames and passwords
  for the The Nethernet domain.

  Parameters:
    user - string of the last user to login or nil

*/
PmogSessionManager.prototype.use_password_manager = function(user) {
  // Ask the password manager for an enumerator:
  var e = this.password_manager.enumerator;
  // This preference must be globally scoped because of the way FF2 works.
  Pmog.other_logins = [];
  // step through each password in the password manager until we find the one we want:
  while (e.hasMoreElements()) {
    try {
      // get an nsIPassword object out of the password manager.
      // This contains the actual password...
      var p = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
      if (p.host == Pmog.BASE_URL) {
        // found it!
        if (user && (p.user.toLowerCase() == user.toLowerCase())) {
          return {
            user: p.user,
            password: p.password
          };
        } else {
          // Some other The Nethernet user
          Pmog.other_logins.push(p.user);
        }
      }
    } catch(ex) {
      log(ex, "Password exists but could not be decrypted.");
    }
  }
  return {
    logins: Pmog.other_logins
  };
};

/*
  Function: login
  The login function makes the remote login attempt on the The Nethernet server.

  Parameters:

    user - String designating the username
    pass - String designating the password
    callback - Function to invoke when the The Nethernet server returns a result
    remember_me - Boolean value that if true means the user wants to store their
    username and password within Firefox to allow The Nethernet to log them in
    automatically in the future.
*/
PmogSessionManager.prototype.login = function(user, pass, callback, remember_me) {
  jQuery('#logged_out_message')[0].value = "Logging you into The Nethernet...";
  jQuery('#logged_out_throbber')[0].collapsed = false;
  var sessionManager = this;
  jQuery.ajax({
    url: this.session_url + '?version='+ Pmog.version + '&login=' + escape(user) + '&password=' + escape(pass),
    //url: this.session_url + '?login=' + escape(user) + '&password=' + escape(pass),
    type: 'POST',
    data: '',
    dataType: 'json',
    contentType: "application/json; charset=utf-8",
    timeout: 10000,
    login_options: new Object({
      remember_me: remember_me,
      domain: Pmog.BASE_URL,
      target: this,
      user: user,
      pass: pass,
      callback: callback
    }),
    complete: function(res) {
      jQuery('#logged_out_throbber')[0].collapsed = true;
    },
    success: function(obj) {
      jQuery('#logged_out_message').removeClass("errorStatus");
      var returned_user = new PmogUser();
      returned_user.addListener(Pmog);
      if (typeof(obj) == 'object') {
        if (obj.table) {
          obj = obj.table;
        }
        returned_user.update(obj.user);
        if (!obj.errors || obj.errors.length === 0) {
          returned_user.authenticated = true;
          if (this.login_options.remember_me) {
            // Ok to store password because login was successful.
            this.login_options.target.save_login(this.login_options.domain, this.login_options.user, this.login_options.pass);
          }
        }
        this.login_options.callback(returned_user, obj);
        gBrowser.getNotificationBox().removeAllNotifications();
        Pmog.startQueuedMissionPolling();
        Pmog.prefs.setBoolPref("auto_login", true);
        jQuery('#pmog-toolbar').attr("toolbarname", Pmog.prop("toolbarname"));
        jQuery('#logged_out_message')[0].value = "";
      } else {
        Pmog.notice('The Nethernet Server could not be contacted. Please try again later.', 'critical');
      }
    },
    error: function(response_obj) {
      try {
        jQuery('#logged_out_message').addClass("errorStatus");
        // Set the logged out toolbar message to the same error in case the user misses the notice above.
        jQuery('#logged_out_message')[0].value = jQuery.evalJSON(response_obj.responseText).errors[0].body.content;
      } catch(e) {
        jQuery('#logged_out_message')[0].value = "There was a login error. Please try again in a few minutes.";
      }
    }
  });
};

PmogSessionManager.prototype.process_login = function(obj) {
  var returned_user = new PmogUser();
  returned_user.addListener(Pmog);
  if (typeof(obj) == 'object') {
    if (obj.table) {
      obj = obj.table;
    }
    returned_user.update(obj.user);
    if (!obj.errors || obj.errors.length === 0) {
      returned_user.authenticated = true;
    }
    Pmog.hud.login_result(returned_user, obj);
    gBrowser.getNotificationBox().removeAllNotifications();
    Pmog.startQueuedMissionPolling();
    if (obj.user && obj.user.password) {
      Pmog.prefs.setBoolPref("auto_login", true);
      this.save_login(Pmog.BASE_URL, obj.user.login, obj.user.password);
    }
    jQuery('#pmog-toolbar').attr("toolbarname", Pmog.prop("toolbarname"));
  } else {
    Pmog.notice('The Nethernet Server could not be contacted. Please try again later.', 'critical');
  }
};

/*
  Function: save_login
  This function tries to save the player's credentials within Firefox.

  Parameters:

    domain - The domain to associate the username and password with.
    user - String designating the username
    pass - String designating the password
*/
PmogSessionManager.prototype.save_login = function(domain, user, pass) {
  try {
    var logins = this.login_manager.findLogins({},
    Pmog.BASE_URL, Pmog.BASE_URL, null);

    // Find user from returned array of nsILoginInfo objects
    for (var i = 0; i < logins.length; i++) {
      if (logins[i].username === user) {
        if (logins[i].password === pass) {
          // This password is already stored.
          return false;
        } else {
          this.login_manager.modifyLogin(logins[i], new this.nsLoginInfo(domain, domain, null, user, pass, "login", "password"));
          return false;
        }
      }
    }
    // This is a new username and password combo so go ahead and save.
    var extLoginInfo = new this.nsLoginInfo(domain, domain, null, user, pass, "login", "password");
    try {
      this.login_manager.addLogin(extLoginInfo);
      Pmog.prefs.setBoolPref("auto_login", true);
    } catch(e) {}
    
    Pmog.hud.update_switch_users_menu(null, this.find_all_logins().logins);
  } catch(e) {
    log(e, "Could not save password");
  }
  return false;
};

/*
  Function: login_as
  Display a prompt screen for the user to enter their The Nethernet credientials.

  Parameters:
    callback - A function to invoke when the prompt screen is closed.
    ignore_stored_credentials - if false the function will force the player to use
    the prompt window to enter their username and password.
*/
PmogSessionManager.prototype.login_as = function(callback, ignore_stored_credentials) {
  var user = {
    value: ""
  };
  var pass = {
    value: ""
  };
  var remember_me = {
    value: true
  };
  var invalid_user = true;
  if (ignore_stored_credentials !== true) {
    var credintial_obj = this.find_login_credintials();
    if (credintial_obj.user && credintial_obj.password) {
      invalid_user = false;
      user.value = credintial_obj.user;
      pass.value = credintial_obj.password;
    }
  }
  // Get the user's credentials and ask them if they want firefox to remember them.
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

  while (invalid_user) {
    var ok = prompts.promptUsernameAndPassword(window, "Login to The Nethernet", "", 
    user, pass, 
    "Do you want Firefox to remember your password?", 
    remember_me);
    // The user hit the cancel button.
    if (!ok) {
      return false;
    }
    // It might be useful to validate the format of the username and password before returning.
    invalid_user = false;
  }

  // Before returning save the password to the password manager if the user requested it.
  store_pass = false;
  if (remember_me.value) {
    store_pass = true;
    Pmog.prefs.setBoolPref("auto_login", true);
  }

  if (user.value === "" || pass.value === "") {
    // User was invalid so just return that state.
    var returned_user = new PmogUser();
    returned_user.authenticated = false;
    Pmog.notice("You did not supply a username and password.");
    callback(returned_user, {});
  } else {
    this.login(user.value.toLowerCase(), pass.value, callback, store_pass);
    // Will return the user's record or an error.
  }
  return false;
};

/*
  Function: delete_login
  Delete the stored credientials for a particular user.

  Parameters:

    login - the name of the user to delete
    confirm - Boolean which determines whether or not to show a confirmation screen.

  Returns:
    Boolean true if successful or false if not.
*/
PmogSessionManager.prototype.delete_login = function(login, confirm) {
  if (typeof(confirm) == undefined) {
    confirm = true;
  }
  user = this.use_login_manager(login);
  try {
    var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var msg = "Are you sure you want to delete the stored password for " + login + "?";
    var result = undefined;
    if (confirm) {
      result = prompt.confirm(window, "The Nethernet", msg);
    } else {
      result = true;
    }
    if (result) {
      var logins = this.login_manager.findLogins({},
      Pmog.BASE_URL, Pmog.BASE_URL, null);

      // Find user from returned array of nsILoginInfo objects
      for (var i = 0; i < logins.length; i++) {
        if (logins[i].username == login) {
          this.login_manager.removeLogin(logins[i]);
          return true;
        }
      }
    }
    return false;
  } catch(e) {
    log(e, "Could not remove login for :" + login);
    return false;
  }
};

/*
  Function: sign_out
  This function signs the user out of the extension and the website by
  making an asynchronous call to the The Nethernet server. It also sets a boolean
  preference to specify the user is no longer playing and hides all the
  presently open event windows.
*/
PmogSessionManager.prototype.sign_out = function(removeAutoLogin) {
  var removeAutoLogin = removeAutoLogin || true;
  Pmog.prefs.setBoolPref("playing", false);

  var usrLogin = Pmog.user.login;

  // Now sign out of the website too.
  if (Pmog.user && Pmog.user.authenticated) {
    jQuery.ajax({
      url: this.session_url,
      type: 'DELETE',
      data: '',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      beforeSend: function() {
        //log("Logged out");
        },
      complete: function() {
        //log("Stopping pmail checking...");
        // Stop polling for pmail
        //Pmog.stopPmailPolling();
        },
      error: function(response) {
        //log("Error signing out of The Nethernet");
        //logToString(response.responseText);
        }
    });
  }

  this.process_logout();
  Pmog.prefs.setBoolPref("auto_login", !removeAutoLogin);

};

PmogSessionManager.prototype.process_logout = function() {
  // Hide all the open event windows
  delete Pmog.user;
  //Pmog.hud.update_switch_users_menu(null, this.find_all_logins().logins);
  Pmog.stopQueuedMissionPolling();
  Pmog.updateCommands();

  Pmog.hud.checkSessionStatus();

  jQuery('#logged_out_message')[0] = Pmog.prop('you_have_signed_out');
  jQuery('#pmog-toolbar').attr("toolbarname", "");
  jQuery(Pmog.hud.pmog_game_notice).fadeTo(8000, 0, 
  function() {
    jQuery('#logged_out_message')[0] = Pmog.prop('default_logged_out_message');
  });
};

/*
  Function: delete_all_logins
  This function will delete all logins and passwords stored for the The Nethernet domain.

  Returns:
    Boolean true if successful and false if not.
*/
PmogSessionManager.prototype.delete_all_logins = function() {
  var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
  var msg = "Are you sure you want to delete all your stored The Nethernet passwords?";
  var result = prompt.confirm(window, "The Nethernet", msg);
  if (result) {
    var logins = this.find_all_logins().logins;
    if (logins) {
      for (var x = 0; x < logins.length; x++) {
        this.delete_login(logins[x], false);
      }
    }
    return true;
  }
  return false;
};
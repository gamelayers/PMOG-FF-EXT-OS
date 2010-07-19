const FRESH_INSTALL_URL = 'http://thenethernet.com/toolbarlanding?restart';

var loadedOnce = false;
function loadSuccessPage(url) {
  var newTab;

  if (!loadedOnce) {
    loadedOnce = true;
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var mainWindow = wm.getMostRecentWindow("navigator:browser");

    // Check each browser instance for our URL
    var found = false;

    var tabbrowser = mainWindow.getBrowser();
    // Check each tab of this browser instance
    var numTabs = tabbrowser.browsers.length;

    for (var index = 0; index < numTabs; index++) {
      var currentBrowser = tabbrowser.getBrowserAtIndex(index);
      if (currentBrowser.currentURI.spec == FRESH_INSTALL_URL) {
        newTab = tabbrowser.addTab(url);
        tabbrowser.selectedTab = newTab;
        tabbrowser.focus();

        found = true;

      }
    }

    if (!found) {
      newTab = tabbrowser.addTab(url);
      tabbrowser.selectedTab = newTab;
      tabbrowser.focus();
    }
  }
}

function baseURL() {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pmog.");
  var base;

  try {
    base = prefs.getCharPref("server");
  } catch(e) {
    // Pmog.logger.error(e);
    Components.utils.reportError(e);
    base = 'http://thenethernet.com';
    prefs.setCharPref("server", base);
  }

  if (base.indexOf('pmog') !== -1) {
    base = 'http://thenethernet.com';
    prefs.setCharPref("server", base);
  }

  return base;
}
function setBaseURL(url) {
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pmog.");
  try {
    prefs.setCharPref("server", url);
    Pmog.BASE_URL = url;
    if (Pmog.user) {
      Pmog.logout(false);
    }
    Pmog.hud = new Hud();
    Pmog.hud.init();
    //Pmog.hud.update_switch_users_menu(null, Pmog.hud.session_manager.find_all_logins().logins);
    gBrowser.getNotificationBox().appendNotification("Use the login menu to log in to " + url, "loginmessage", null, 5, null);
  } catch(e) {
    // Pmog.logger.error("Error setting the base URL: " + e);
    Components.utils.reportError(e);
  }
  return this;
}
var Pmog = {
  PMOG_IDLE: 0,
  PMOG_ACTIVE: 1,
  CAN_TRACK: false,
  BASE_URL: baseURL(),
  prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pmog."),
  osString: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS,
  tab_observer: null,
  page: null,
  toolbar: null,
  hud: null,
  pmog_conn: null,
  user: null,
  version: "0.0.0",
  class_name: "Pmog",
  message_poll_timeout: 300000,
  queued_mission_poll_timeout: 600000,
  _idle: this.PMOG_ACTIVE,
  tabChanged: false,

  init: function() {
    // Assigns a logging object to the Pmog object for hot wundersecks logging.
    Pmog.logger = PMOG.Service._log;
    Pmog.show_events = true;

    if (third_party_cookies_enabled()) {
      jQuery.ajaxSetup({
        data: 'origin=extension',
        timeout: 12000,
        beforeSend: function(request) {
          try {
            ovrlay.overlay.clearErrors();
          } catch(e) {
            // Components.utils.reportError(e);
          }
          try {
            ovrlay.overlay.spinner.show();
          } catch(ex) {
            try {
              ovrlay.spinner.show();
            } catch(ez) {
              // Components.utils.reportError(ez);
            }
          }
        },
        complete: function(data) {
          try {
            ovrlay.overlay.spinner.hide();
          } catch(e) {
            try {
              ovrlay.spinner.hide();
            } catch(ex) {
              // Components.utils.reportError(ex);
            }
          }
          delete ovrlay;
        }
      });
      this.cached = new Cached(this.prefs);
      this.cache = new Cache(this.prefs); // Extract extension version from the install.rdf
      var install_rdf = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).getItemForID('pmog@gamelayers.com');
      this.version = install_rdf.version;
      this.tab_observer = new TabObserver(true);
      this.hud = new Hud();
      this.prefs.setBoolPref("playing", true);
      this.hud.init(); // If no prefs have been found then set up the defaults.
      if (!this.prefs.prefHasUserValue("fresh_install")) {
        this.prefs.setBoolPref("fresh_install", true);
        this.prefs.setBoolPref("playing", true);
      }

      Pmog.urlListener.init();

      gBrowser.addEventListener("unload",
      function() {
        Pmog.urlListener.uninit();
      },
      false);

      gBrowser.addEventListener("load",
      function() {
        pmogPrefListener.register();
      },
      false);

      gBrowser.addEventListener('load',
      function() {
        if (Pmog.prefs.getBoolPref("fresh_install")) {

          try {
            loadSuccessPage(FRESH_INSTALL_URL);
          } catch(e) {
            // Pmog.logger.error(e);
            Components.utils.reportError(e);
          }

          Pmog.prefs.setBoolPref("fresh_install", false);

        }

      },
      false);
      
      gBrowser.addEventListener('load',
        function() {
          Pmog.checkCurrentSet();
        }, false);

      try {
        var idleService = Components.classes["@mozilla.org/widget/idleservice;1"].getService(Components.interfaces.nsIIdleService);
        idleService.addIdleObserver(this, 5 * 60); // 5 minutes.
      } catch(e) {}

      this.detectPmogChat();
      //this.checkWebSession();
    } else {
      jQuery('#pmog-logged-out toolbarbutton').hide();
      jQuery('#pmog-logged-out').addClass('logged-out-error');
      jQuery('#logged_out_message')[0].value = "Third-party cookies must be enabled to play on The Nethernet. Enable Third-party cookies and then restart your browser.";
    }
  },
  getEventsWindow: function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    return wm.getMostRecentWindow("TNN:Events");
  },
  userNotify: function(user) {
    this.hud.update_pmog_toolbar(user);

    var tabcontainer = jQuery('tabbrowser')[0].tabContainer;
    var buffPanels = jQuery("panel[type=buff]");

    if (user.buffs) {
      var index = 0;
      var buffHeight = 60;
      buffPanels.each(function() {
        if (user.buffs[this.firstChild.id] && user.buffs[this.firstChild.id].charges > 0) {
          this.firstChild.charges = user.buffs[this.firstChild.id].charges;
          this.firstChild._source = user.buffs[this.firstChild.id].source;
          this.firstChild._timestamp = user.buffs[this.firstChild.id].timestamp;
          this.firstChild.avatar = user.buffs[this.firstChild.id].avatar;

          if (this.state == "closed") {
            // This below takes the tabbar into account. Since it's acting up depending on how many tabs are
            // open, we're going to bypass it and just ensure it's always assumes the tabbar is there.
            //var positionY = gBrowser.boxObject.screenY + tabcontainer.boxObject.height;
            var positionY = gBrowser.boxObject.screenY + 30;

            if (index > 0) {
              positionY = positionY + (buffHeight * index);
            }

            this.openPopupAtScreen(gBrowser.boxObject.screenX, positionY);
            index++;
          }
        } else {
          this.hidePopup();
        }
      });
    } else {
      buffPanels.each(function() {
        this.hidePopup();
      });
    }
  },
  observe: function(subject, topic, data) {
    switch (topic) {
    case "idle":
      this._idle = this.PMOG_IDLE;
      break;
    case "back":
      this._idle = this.PMOG_ACTIVE;
      break;
    }
  },
  to_string: function() {},
  setServer: function(url) {
    setBaseURL(url);
  },
  prop: function(name) {
    try {
      return document.getElementById("strings_pmog").getString(name);
    } catch(e) {
      // Pmog.logger.error("Error getting extension property strings: " + e);
      Components.utils.reportError(e);
      return undefined;
    }
  },
  propf: function(name, args) {
    return document.getElementById("strings_pmog").getFormattedString(name, args);
  },
  logout: function(deleteAutoLogin) {
    var removeAutoLogin = deleteAutoLogin || true;
    Pmog.hud.session_manager.sign_out(removeAutoLogin);
    this.closeAll(function() {
      //delete Pmog.hud.session_manager;
      //delete Pmog.hud;
    });
  },
  login: function(userName) {
    if (Pmog.hud !== undefined) {
      delete Pmog.hud.session_manager;
      delete Pmog.hud;
    }
    Pmog.hud = new Hud();
    Pmog.hud.init();
    Pmog.hud.login(userName);
  },
  openURL: function(url, newTab) {
    try {
      newTab = newTab || false;
      var uri = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(url, null, null);
      if (newTab) {
        Application.activeWindow.open(uri);
      } else {
        Application.activeWindow.activeTab.load(uri);
      }
    } catch(e) { // could not open the uri
    }
  },
  handleSuccess: function(responseText, overlay, panelID, icon, opts) { // For now i have disabled pinning the notice to the xul overlay because
    // the overlays are closed immediately, which make it hard to even read the message.
    overlay = overlay || null;
    opts = opts || {
      close: true
    };
    this.notice(responseText.flash.notice, 'info', null, icon);
    Pmog.handle_server_response(responseText, panelID);
    if (overlay !== null && opts.close) {
      overlay.close();
    }
  },
  handleError: function(statusCode, responseText, overlay, icon) {
    var responseMsg = null;
    overlay = overlay || null;
    switch (statusCode) {
    case 406:
      responseMsg = "Sorry, we cannot find information about the current page, try reloading your browser.";
      break;
    default:
      responseMsg = jQuery.evalJSON(responseText).flash.error;
      break;
    }
    this.notice(responseMsg, 'critical', overlay, icon);
  },
  notice: function(message, lvl, attachTarget, icn) {
    var level = lvl || 'info';
    var icon = icn || null;
    var anchor = 'after_start';
    var attachTo = attachTarget || null;
    if (attachTo === null) {
      var tabsCollapsed = jQuery("tabbrowser[id=content]").anonymousNodes()[1].childNodes[1].collapsed;
      if (tabsCollapsed) {
        attachTo = jQuery('#navigator-toolbox')[0];
      } else {
        attachTo = jQuery("tabbrowser[id=content]").anonymousNodes()[1].childNodes[1];
      }
    }
    var panel = jQuery('#notepanel')[0];
    var note = jQuery('#notebox')[0];
    var severity = null;
    switch (level) {
    case 'warning':
      severity = note.PRIORITY_WARN_LOW;
      break;
    case 'critical':
      severity = note.PRIORITY_CRITICAL_LOW;
      break;
    case 'info':
    default:
      severity = note.PRIORITY_INFO_LOW;
      break;
    }
    // if (panel.state === "open") {
    //   panel.hidePopup();
    // }
    // Generate a uuid to keep a handle on our notice.
    var noticeId = jQuery.uuid();
    var newNotification = note.appendNotification(message, noticeId, icon, severity, null);
    panel.openPopup(attachTo, anchor, 0, 0, null, null);
    closePanel = function() {
      note.removeNotification(note.getNotificationWithValue(noticeId));
      if (note.childNodes.length === 0) {
        note.parentNode.hidePopup();
      }
    };
    setTimeout(closePanel, 3000);
  },
  mainWindow: function() {
    mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
    return mainWindow;
  },
  executeSoon: function(aFunc) {
    var tm = Components.classes["@mozilla.org/thread-manager;1"].getService(Components.interfaces.nsIThreadManager);
    tm.mainThread.dispatch({
      run: function() {
        aFunc();
      }
    },
    Ci.nsIThread.DISPATCH_NORMAL);
  },
  getAvatar: function(player, callback) {
    var cb = callback;
    var p = player;
    jQuery.ajax({
      url: Pmog.private_url() + '/users/' + player + '.json?authenticity_token=' + Pmog.user.authenticity_token,
      type: 'GET',
      data: '',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      success: function(data, statusText) {
        var path = Pmog.private_url() + data.avatar_mini;
        cb(p, path);
      },
      error: function(data, statusText, errorObject) {
        var path = Pmog.private_url() + "/images/shared/elements/user_default_mini.jpg";
        cb(p, path);
      }
    });
  },
  private_url: function() {
    var url = this.BASE_URL;
    switch (this.BASE_URL) {
    case 'http://thenethernet.com':
      url = this.BASE_URL.replace('thenethernet', 'ff.thenethernet');
      break;
    default:
      break;
    }
    return url;
  },
  private_track_url: function() {
    return this.private_url() + '/track.json?version=' + this.version + '&' + this.user_verification_params() + '&url=';
  },
  private_interesting_url: function() {
    return this.private_url() + '/interesting.json?version=' + this.version + '&' + this.user_verification_params() + '&url=';
  },
  page_loaded: function(tab) { // Remove any overlays specific to the previous page
    var ready = this.hud.removeVolatile();
    try {
      if (tab === undefined) {
        throw ("ArgumentError in pmog.js#page_loaded. Tab is undefined.");
      }
      if (this.user && this.user.authenticated && this.user.is_playing()) {
        tab.display = new Display(tab);
        tab.display.init();
        this.track_uri(tab.getLocation(), tab.panel_id);
      }
    } catch(e) {
      // Pmog.logger.error("page_loaded error: " + e);
      Components.utils.reportError(e);
    }
  },
  track_uri: function(a, panel_id) {
    if (this.paused || this._idle === this.PMOG_IDLE) {
      return;
    }
    try {
      if (a === undefined) {
        throw new PmogException("ArgumentError - Location object is undefined in track_uri");
      }
      if (panel_id === undefined) {
        throw new PmogException("ArgumentError - panel_id object is undefined in track_uri");
      }
      if (a.href === null) {
        throw new PmogException("ArgumentError - The location href is null in track_uri");
      }
      this.toggle_hud_for_protocol(a.protocol); //Ignore sites blocked in the whitelist
      if (this.site_blocked()) {
        return;
      } //Ignore HTTPS requests.
      if (a.protocol != 'https:') {
        this.sendTrackRequest(a, panel_id);
        //this.isInterestingRequest(a, panel_id);
      }
    } catch(e) {
      // Pmog.logger.error("Error in track_uri: " + e);
      Components.utils.reportError(e);
    }
    return this;
  },
  updateCommands: function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("TNN:Events");

    window.updateCommands("PmogTrack");

    if (win) {
      win.updateCommands("PmogTrack");
    }
  },
  isInterestingRequest: function(a, panel_id) {
    var url = this.private_interesting_url() + encodeURI(a.href);
    jQuery.ajax({
      url: url,
      dataType: "json",
      data: '',
      panel_id: panel_id,
      beforeSend: function() {
        Pmog.hud.toolbarThrobber.collapsed = false;
      },
      success: function(responseText) {
        // Pmog.logger.debug(toJSONString(responseText));

        if (responseText.is_interesting === true) {
          Pmog.sendTrackRequest(a, panel_id);
        } else {
          Pmog.handle_server_response(responseText, panel_id, true);
        } // else {
        //           Pmog.updateCommands();
        //           Pmog.parse_page_objects({
        //             page_objects: {},
        //             panel_id: panel_id,
        //             clobber: false
        //           });
        //         }
      },
      error: function(xhrReq, textStatus, errorThrown) {
        if (textStatus === "timeout") {
          Pmog.hud.updateToolbarTxt("The Tubes is clogged - try again later!");
          return;
        }
        try {
          switch (xhrReq.status) {
          case 503:
            jQuery('#pmog-toolbar toolbarbutton, #pmog-toolbar toolbarseparator').each(function() {
              this.hidden = true;
            });
            break;
          default:
            Pmog.hud.updateToolbarTxt(Pmog.prop('page_track_error'));
            break;
          }
        } catch(e) {
          Components.utils.reportError(e);
        }
      },
      complete: function(obj) {
        Pmog.hud.toolbarThrobber.collapsed = true;
      }
    });
  },
  sendTrackRequest: function(a, panel_id) {
    var url = this.private_track_url() + encodeURI(a.href);
    jQuery.ajax({
      url: url,
      dataType: "json",
      data: '',
      panel_id: panel_id,
      beforeSend: function() {
        Pmog.hud.updateToolbarTxt(Pmog.prop('finding_items_for_this_page'));
        Pmog.hud.toolbarThrobber.collapsed = false;
      },
      success: function(responseText) {
        Pmog.logger.debug(toJSONString(responseText));
        Pmog.handle_server_response(responseText, panel_id, true);
        Pmog.hud.clearToolbarTxt();
        jQuery('#pmog-toolbar toolbarbutton, #pmog-toolbar toolbarseparator').each(function() {
          this.hidden = false;
        });
      },
      error: function(xhrReq, textStatus, errorThrown) {
        if (textStatus === "timeout") {
          Pmog.hud.updateToolbarTxt("The Tubes is clogged - try again later!");
          return;
        }
        try {
          switch (xhrReq.status) {
          case 503:
            Pmog.hud.updateToolbarTxt(Pmog.prop('pmog_updating_message'));
            jQuery('#pmog-toolbar toolbarbutton, #pmog-toolbar toolbarseparator').each(function() {
              this.hidden = true;
            });
            break;
          default:
            Pmog.hud.updateToolbarTxt(Pmog.prop('page_track_error'));
            break;
          }
        } catch(e) {
          // Pmog.logger.error("Error in sendTrackRequest: " + e);
          Components.utils.reportError(e);
        }
      },
      complete: function(obj) {
        Pmog.hud.toolbarThrobber.collapsed = true;
        Pmog.updateCommands();
      }
    });
  },
  site_blocked: function() {
    var isBlocked = false;
    var url = gBrowser.selectedTab.linkedBrowser.currentURI;
    var sites = Pmog.passive_record.db.find_records("whitelists", {
      conditions: ["url LIKE ?", '%' + url.host + '%']
    });
    if (sites.length > 0) {
      for (var i = sites.length - 1; i >= 0; i--) {
        if (sites[i].block_all_pages === "true") {
          isBlocked = true;
          continue;
        } else if (sites[i].url === url.spec) {
          isBlocked = true;
          continue;
        }
      };
      if (isBlocked === true) {
        Pmog.hud.updateToolbarTxt(Pmog.prop('no_items_available_because_you_asked_us_not_to_track_this_page'));
        Pmog.CAN_TRACK = false;
      }
    }
    Pmog.updateCommands();
    return isBlocked;
  },
  toggle_hud_for_protocol: function(protocol) {
    var shouldBlock = false;
    if (protocol != 'https:') {
      Pmog.CAN_TRACK = true;
      jQuery('#main-window')[0].setAttribute('pmog_protocol', 'http');
      shouldBlock = false;
    } else {
      Pmog.CAN_TRACK = false;
      jQuery('#main-window')[0].setAttribute('pmog_protocol', 'https');
      this.hud.updateToolbarTxt(this.prop('pmog_does_not_track_secure_pages'));
      shouldBlock = true;
    }
    Pmog.updateCommands();
    return shouldBlock;
  },
  get_page: function() {
    try {
      var tab = this.tab_observer.selected_tab();
      return tab.page;
    } catch(e) {
      // Pmog.logger.error(e, "Could not get the page object from the selected tab.");
      Components.utils.reportError(e);
      return null;
    }
  },
  get_page_by_panel_id: function(panel_id) {
    try {
      var tab = this.tab_observer.find_tab_by_panel_id(panel_id);
      return tab.page;
    } catch(e) {
      // Pmog.logger.error(e, "Could not get the page object from the tab using panel_id: " + panel_id);
      Components.utils.reportError(e);
      throw ("Could not get the page object from the tab using panel_id: " + panel_id);
    }
  },
  get_display_by_panel_id: function(panel_id) {
    try {
      var tab = this.tab_observer.find_tab_by_panel_id(panel_id);
      return tab.display;
    } catch(e) {
      e.message = "Could not get the display object from the tab using panel_id: " + panel_id + ": " + e.message;
      // Pmog.logger.error("Error in get_display_panel_id: " + e);
      Components.utils.reportError(e);
      return null;
    }
  },
  get_display: function() {
    try {
      return this.tab_observer.selected_tab().display;
    } catch(e) {
      // Pmog.logger.error(e, "Could not get the display object from the selected tab.");
      Components.utils.reportError(e);
      return null;
    }
  },
  handle_server_response: function(obj, panel_id, clobber) {
    try {
      this.hud.toolbarThrobber.collapsed = true;

      if (obj.user && this.user) {
        this.user.update(obj.user);
      }
      this.parse_page_objects({
        page_objects: obj,
        panel_id: panel_id,
        clobber: clobber
      });
    } catch(e) {
      // Pmog.logger.error(e.toString(), "handle_server_response error");
      Components.utils.reportError(e);
    }
  },
  parse_page_objects: function(opts) {
    var page_objects = opts.page_objects || undefined;
    var user = page_objects.user || undefined;
    var the_page = null;
    try {
      if (opts === undefined) {
        throw new PmogException("ArgumentError - opts is undefined");
      }

      if (user && opts.page_objects.user.unread_system_messages_count > 0) {
        opts.page_objects.carousel = [];
        opts.page_objects.carousel[0] = {
          type: 'carousel',
          body: {
            messages: opts.page_objects.user.unread_system_messages,
            unread_count: opts.page_objects.user.unread_system_messages_count
          },
          id: "only"
        };
      }

      the_page = this.get_page_by_panel_id(opts.panel_id);
      if (the_page === null) {
        throw new PmogException("NullPointerException - the_page is null in parse_page_objects()");
      }
      url = the_page.url;
      the_page.page = new Page();
      the_page.url = url;
      the_page.loaded = true;
      the_page.panel_id = opts.panel_id;
      the_page.update(opts);
      var display = this.get_display_by_panel_id(opts.panel_id);
      if (user && this.user_playing() && display.tab.is_tab_selected()) {
        this.hud.update_acquaintances_menu(opts.page_objects.user);
        this.hud.update_venture_menu(opts.page_objects.user);

        this.renderAllOverlaysForPage(the_page);
      }
    } catch(e) {
      // Pmog.logger.error(e.toString(), "parse_page_objects error");
      Components.utils.reportError(e);
    }
  },
  renderAllOverlaysForPage: function(the_page) {
    try {
      if (the_page === undefined) {
        throw new PmogException("ArgumentError - the_page is undefined");
      }
      for (var overlayType in Page.OBJECTS) {
        if (the_page[Page.OBJECTS[overlayType]] && the_page[Page.OBJECTS[overlayType]].length > 0) {
          if (Pmog.show_events) {
            for (var i = 0; i < the_page[Page.OBJECTS[overlayType]].length; i++) {
              Pmog.hud.renderQueue.push({
                item: the_page[Page.OBJECTS[overlayType]][i],
                panel: the_page.panel_id
              });
            }
          } else {
            jQuery('#events-button').removeClass('events-button-default').addClass('events-button-events');
          }
        }
      }
      if (Pmog.show_events) {
        if (!Pmog.hud.renderQueue.empty()) {
          jQuery(Pmog.hud.renderQueue.toArray()).each(function() {
            Pmog.showOverlay(this);
          });

          function overlayDisplayComplete() {
            Pmog.hud.repositionEventOverlays();
            Pmog.hud.renderQueue.clear();
          }
          setTimeout(overlayDisplayComplete, 1000);
        }
      }
    } catch(e) {
      // Pmog.logger.error(e.toString(), "renderAllOverlaysForPage error");
      Components.utils.reportError(e);
    }
  },
  showOverlay: function(object) {
    var overlay = Pmog.notify(object.item, object.panel);
    if (overlay) {
      if (overlay.tagName === 'carousel') {
        Pmog.hud.repositionEventOverlays();
        overlay.show(object.item);
      }
      jQuery(overlay).animate({
        "opacity": 1.0
      },
      "normal");
    }
    return this;
  },
  showSystemEvents: function() {
    Pmog.hud.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/users/" + Pmog.user.login + "/messages/system");
  },
  notify: function(opts, panel_id) {
    try {
      if (opts === undefined) {
        throw new PmogException("ArgumentError - opts is undefined in notify()");
      }
      if (panel_id === undefined) {
        throw new PmogException("ArgumentError - panel_id is undefined in notify()");
      }
      var display = this.get_display_by_panel_id(panel_id);
      var overlay = display.update(opts);

      if (overlay && overlay !== "notice" && overlay.singular && overlay.parentNode.state === "open") {
        return false;
      }

      this.get_page().remove_page_object_by_id(opts.id);

    } catch(e) {
      // Pmog.logger.error(e.toString(), "notify error");
      Components.utils.reportError(e);
    }
    return overlay;
  },

  jaunt: function() {
    jQuery.ajax({
      url: this.private_url() + '/portals/jaunt.json',
      type: 'GET',
      dataType: 'json',
      data: '',
      beforeSend: Pmog.hud.toolbarThrobber.collapsed = false,
      success: function(data, textStatus) {
        // Pmog.logger.debug(toJSONString(data));
        gBrowser.contentDocument.location = jQuery.evalJSON(data.portals[0]).location_url;
      },

      error: function(xmlHttpReq, textStatus, errorThrown) {
        Pmog.notice(jQuery.evalJSON(xmlHttpReq).flash.error, "critical");
      },

      complete: function() {
        Pmog.hud.toolbarThrobber.collapsed = true;
      }
    });
  },

  request_deploy_action: function(type) {
    try {
      if (type === undefined) {
        throw new PmogException("ArgumentError - type is undefined");
      }
      if (this.user_playing()) {
        var target = this; // Ensure the callback obj has the correct reference.
        this.hud.toolbarThrobber.collapsed = false;
        switch (type) {
        case 'armor':
          jQuery.ajax({
            url:
            this.private_url() + '/users/' + this.user.login + '/ability_status/toggle_armor.json?' + this.user_verification_params(),
            type: 'PUT',
            data: '',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            panel_id: this.tab_observer.selected_tab().panel_id,
            success: function(response_obj) {
              Pmog.hud.updateAndFadeToolbarTxt(response_obj.flash.notice);
              Pmog.handle_server_response(response_obj, this.panel_id);
            },
            error: function(data) {
              Pmog.hud.updateAndFadeToolbarTxt(jQuery.evalJSON(data.responseText).flash.notice);
              Pmog.armorHandleError(data.status, data.responseText);
            },
            complete: function() {
              Pmog.hud.toolbarThrobber.collapsed = true;
            }
          });
          break;
        case 'dodge':
          jQuery.ajax({
            url:
            this.private_url() + '/users/' + this.user.login + '/ability_status/toggle_dodge.json?' + this.user_verification_params(),
            type: 'PUT',
            data: '',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            panel_id: this.tab_observer.selected_tab().panel_id,
            success: function(response_obj) {
              Pmog.hud.updateAndFadeToolbarTxt(response_obj.flash.notice);
              Pmog.handle_server_response(response_obj, this.panel_id);
            },
            error: function(data) {
              Pmog.hud.updateAndFadeToolbarTxt(jQuery.evalJSON(data.responseText).flash.notice);
              Pmog.dodgeHandleError(data.status, data.responseText);
            },
            complete: function() {
              Pmog.hud.toolbarThrobber.collapsed = true;
            }
          });
          break;
        case 'disarm':
          jQuery.ajax({
            url:
            this.private_url() + '/users/' + this.user.login + '/ability_status/toggle_disarm.json?' + this.user_verification_params(),
            type: 'PUT',
            data: '',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            panel_id: this.tab_observer.selected_tab().panel_id,
            success: function(response_obj) {
              Pmog.hud.updateAndFadeToolbarTxt(response_obj.flash.notice);
              Pmog.handle_server_response(response_obj, this.panel_id);
            },
            error: function(data) {
              Pmog.hud.updateAndFadeToolbarTxt(jQuery.evalJSON(data.responseText).flash.notice);
              Pmog.disarmHandleError(data.status, data.responseText);
            },
            complete: function() {
              Pmog.hud.toolbarThrobber.collapsed = true;
            }
          });
          break;
        case 'vengeance':
          jQuery.ajax({
            url:
            this.private_url() + '/users/' + this.user.login + '/ability_status/toggle_vengeance.json?' + this.user_verification_params(),
            type: 'PUT',
            data: '',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            panel_id: this.tab_observer.selected_tab().panel_id,
            success: function(response_obj) {
              Pmog.hud.updateAndFadeToolbarTxt(response_obj.flash.notice);
              Pmog.handle_server_response(response_obj, this.panel_id);
            },
            error: function(data) {
              Pmog.hud.updateAndFadeToolbarTxt(jQuery.evalJSON(data.responseText).flash.notice);
              Pmog.armorHandleError(data.status, data.responseText);
            },
            complete: function() {
              Pmog.hud.toolbarThrobber.collapsed = true;
            }
          });
          break;
        case 'watchdog':
          if (this.page_validated(type) && this.has_inventory('watchdogs')) {
            jQuery.ajax({
              url: this.private_url() + '/locations/' + this.get_page().id + '/watchdogs/attach.json?' + this.user_verification_params(),
              type: 'POST',
              data: '',
              dataType: 'json',
              contentType: "application/json; charset=utf-8",
              panel_id: this.tab_observer.selected_tab().panel_id,
              success: function(response_obj) {
                target.handle_server_response(response_obj, this.panel_id);
              },
              complete: function(response_obj) {
                var obj = new Function("return " + response_obj.responseText)();
                jQuery('#notepanel')[0].openPopup(Pmog.toolbar, "after_start", 0, 0, null, null);
                switch (response_obj.status) { // Deploy Success
                case 201:
                  Pmog.watchdog_notice(obj.flash.notice, "warning");
                  break; // Deploy failed for some other reason.
                case 422:
                  Pmog.watchdog_notice(obj.flash.error, "critical");
                  break;
                }
                Pmog.hud.toolbarThrobber.collapsed = true;
              }
            });
          }
          break;
        case 'giftcard':
          if (this.page_validated(type)) {
            jQuery.ajax({
              url:
              this.private_url() + '/locations/' + this.get_page().id + '/giftcards.json?' + this.user_verification_params(),
              type: 'POST',
              data: '',
              dataType: 'json',
              contentType: "application/json; charset=utf-8",
              panel_id: this.tab_observer.selected_tab().panel_id,
              success: function(data) {
                // Pmog.logger.debug(toJSONString(data));
                Pmog.user.update(data.user);
                Pmog.giftcard_notice(data.flash.notice, "warning");
              },
              error: function(data) {
                Pmog.giftcard_notice(jQuery.evalJSON(data.responseText).flash.error, "critical");
              },
              complete: function(response_obj) {
                Pmog.hud.toolbarThrobber.collapsed = true;
              }
            });
          }
          break;
        case 'mine':
          if (this.page_validated(type) && this.has_inventory('mines')) {
            
            jQuery.ajax({
              url: this.private_url() + '/locations/' + this.get_page().id + '/mines.json?' + this.user_verification_params(),
              type: 'POST',
              data: '',
              dataType: 'json',
              contentType: "application/json; charset=utf-8",
              panel_id: this.tab_observer.selected_tab().panel_id,
              success: function(response_obj) {
                target.handle_server_response(response_obj, this.panel_id);
              },
              complete: function(response_obj) {
                var obj = new Function("return " + response_obj.responseText)();
                jQuery('#notepanel')[0].openPopup(Pmog.toolbar, "after_start", 0, 0, null, null);
                switch (response_obj.status) {
                case 201:
                  // Deploy Success
                  Pmog.mine_notice(obj.flash.notice, "warning");
                  break;
                case 422:
                  // Deploy failed for some other reason.
                  if (obj.flash.error.search(/foiled your attempt/) > -1) {
                    SpecialEffect.prototype.take_damage();
                    Pmog.play_sound(NICK_SOUND);
                    Pmog.st_nick_notice(obj.flash.error, "critical");
                  } else if (obj.flash.error.search(/chased you away/) > -1) {
                    SpecialEffect.prototype.take_damage();
                    Pmog.play_sound(NICK_SOUND);
                    //FIXME UNIQUE
                    Pmog.watchdog_notice(obj.flash.error, "critical");
                  } else {
                    Pmog.mine_notice(obj.flash.error, "critical");
                  }
                  break;
                }
                Pmog.hud.toolbarThrobber.collapsed = true;
              }
            });
          }
          break;
          case 'upgraded_mine':
            if (this.page_validated(type)) {
              mineData = {};
              
              mineData.upgraded = true;
              
              if (Pmog.prefs.getBoolPref("abundant_mine")) {
                mineData.abundant = true;
              } else {
                mineData.abundant = false;
              }
              
              if (Pmog.prefs.getBoolPref("stealth_mine")) {
                mineData.stealth = true;
              } else {
                mineData.stealth = false;
              }

              JSONmine = jQuery.toJSON(mineData);

              jQuery.ajax({
                url: this.private_url() + '/locations/' + this.get_page().id + '/mines.json?' + this.user_verification_params(),
                type: 'POST',
                data: JSONmine,
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                panel_id: this.tab_observer.selected_tab().panel_id,
                success: function(response_obj) {
                  target.handle_server_response(response_obj, this.panel_id);
                },
                complete: function(response_obj) {
                  var obj = new Function("return " + response_obj.responseText)();
                  jQuery('#notepanel')[0].openPopup(Pmog.toolbar, "after_start", 0, 0, null, null);
                  switch (response_obj.status) {
                  case 201:
                    // Deploy Success
                    Pmog.mine_notice(obj.flash.notice, "warning");
                    break;
                  case 422:
                    // Deploy failed for some other reason.
                    if (obj.flash.error.search(/foiled your attempt/) > -1) {
                      SpecialEffect.prototype.take_damage();
                      Pmog.play_sound(NICK_SOUND);
                      Pmog.st_nick_notice(obj.flash.error, "critical");
                    } else if (obj.flash.error.search(/chased you away/) > -1) {
                      SpecialEffect.prototype.take_damage();
                      Pmog.play_sound(NICK_SOUND);
                      //FIXME UNIQUE
                      Pmog.watchdog_notice(obj.flash.error, "critical");
                    } else {
                      Pmog.mine_notice(obj.flash.error, "critical");
                    }
                    break;
                  }
                  Pmog.hud.toolbarThrobber.collapsed = true;
                }
              });
            }
            break;
        default:
          break;
        }
      }
    } catch(e) {
      // Pmog.logger.error(e, "request_deploy_action error");
      Components.utils.reportError(e);
    }
  },
  has_inventory: function(type) {
    if (this.user.has_at_least_one(type)) {
      return true;
    } else {
      Pmog.notice(this.propf('empty_inventory_for', [type]));
      return false;
    }
  },
  user_verification_params: function() {
    return 'auth_token=' + this.user.auth_token + '&authenticity_token=' + this.user.authenticity_token;
  },
  setExtensionPresence: function(aId) {
    //*** aId is id of element in the PMOG web page to add data to.
    //*** content.document is document of current page
    var doc = content.document;
    var elm = doc.getElementById(aId);
    if (elm && "createEvent" in doc) {
      jQuery(elm).append('<span id="installed">true</span>').append('<span id="logged_in">' + (Pmog.user && Pmog.user.authenticated) + '</span>').append('<span id="version">' + Pmog.version + '</span>').hide();
      //*** fire the PMOGInstalledEvent on said element so that the web page knows
      //*** that we're here and ready to party.
      var evt = doc.createEvent("Events");
      evt.initEvent("PmogInstalledEvent", true, false);
      elm.dispatchEvent(evt);
    }
  },
  user_playing: function() {
    if (this.user && this.user.authenticated && this.user.auth_token && this.user.is_playing()) {
      return true;
    } else {
      return false;
    }
  },
  page_validated: function(type) {
    try {
      if (typeof(type) == 'undefined') {
        type = 'undefined';
        throw "type is undefined;";
      }
      if (this.get_page() && this.get_page().id) {
        return true;
      }
      throw ("page not valid");
    } catch(e) {
      Pmog.notice(this.propf('could_not_deploy', [type]));
      return false;
    }
    return true;
  },
  play_sound: function(sound) {
    if (Pmog.user.sound_preference != "false") {
      var fSound = Components.classes["@mozilla.org/sound;1"].createInstance();
      if (fSound) {
        fSound.QueryInterface(Components.interfaces.nsISound);
      }
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      var sndFile = ioService.newURI(sound, null, null);
      fSound.play(sndFile);
    }
  },

  /* TOOLTIPS: Special tooltips for preference items.
*
* Timer:     return value from |setTimeout| whenever used. There is only
*            ever one timer going for the tooltips.
* Showing:   stores visibility of the tooltip.
* ShowDelay: ms delay which them mouse must be still to show tooltips.
* HideDelay: ms delay before the tooltips hide themselves.
    */
  tooltipTimer: 0,
  tooltipShowing: false,
  tooltipShowDelay: 400,
  tooltipHideDelay: 20000,
  tooltipBug418798: false,
  setTooltipState: function(visible) { // Shortcut: if we're already in the right state, don't bother.
    if (Pmog.tooltipShowing == visible) {
      return;
    }
    var tt = document.getElementById("pmogTooltip"); // If we're trying to show it, and we have a reference object
    if (visible && Pmog.tooltipObject && Pmog.tooltipText) {
      /* Get the boxObject for the reference object, as we're going to
    * place to tooltip explicitly based on this.
            */
      //var tipobjBox = Pmog.tooltipObject.boxObject;
      // Adjust the width to that of the reference box.
      //tt.sizeTo(tipobjBox.width, tt.boxObject.height);
      /* show tooltip using the reference object, and it's screen
    * position. NOTE: Most of these parameters are supposed to affect
    * things, and they do seem to matter, but don't work anything like
    * the documentation. Be careful changing them.
            */
      tt.openPopup(Pmog.tooltipObject, "after_start", 0, 10, null, null); // Set the timer to hide the tooltip some time later...
      // (note the fun inline function)
      Pmog.tooltipTimer = setTimeout(Pmog.setTooltipState, Pmog.tooltipHideDelay, this, false);
      Pmog.tooltipShowing = true;
    } else {
      /* We're here because either we are meant to be hiding the tooltip,
  * or we lacked the information needed to show one. So hide it.
            */
      tt.hidePopup();
      Pmog.tooltipText = undefined;
      Pmog.tooltipObject = undefined;
      tt.firstChild.value = "";
      Pmog.tooltipShowing = false;
    }
  },
  /** Tooltips' event handlers **/
  onTBBMouseOver: function(object, event) {
    var evt = event || undefined;
    if (evt && evt.target.id != object.id) {
      return;
    }
    
    Pmog.tooltipObject = object;
    var toolcount;
    switch (object.id) {
    case "attack-button":
      toolcount = Pmog.user.inventory.mines;
      break;
    case "mine-upgrade-button":
      toolcount = Pmog.user.inventory.upgraded_mines
      break;
    case "crateform-button":
      toolcount = Pmog.user.inventory.crates;
      break;
    case "lightpostform-button":
      toolcount = Pmog.user.inventory.lightposts;
      break;
    case "portalform-button":
      toolcount = Pmog.user.inventory.portals;
      break;
    case "abundantportalform-button":
      toolcount = Pmog.user.inventory.abundant_portals;
      break;
    case "stnickform-button":
      toolcount = Pmog.user.inventory.st_nicks;
      break;
    case "stswatterform-button":
      toolcount = Pmog.user.inventory.st_swatters;
      break;
    case "overweightcanaryform-button":
      toolcount = Pmog.user.inventory.overweight_canaries;
      break;
    case "grenadeform-button":
      toolcount = Pmog.user.inventory.grenades;
      break;
    case "watchdog-button":
      toolcount = Pmog.user.inventory.watchdogs;
      break;
    case "armor-button":
      toolcount = Pmog.user.armored ? "Equipped" : "Unequipped";
      break;
    case "disarm-button":
      toolcount = Pmog.user.disarm_on ? "Equipped" : "Unequipped";
      break;
    case "dodge-button":
      toolcount = Pmog.user.dodge_on ? "Equipped" : "Unequipped";
      break;
    case "vengeance-button":
      toolcount = Pmog.user.vengeance_on ? "Equipped" : "Unequipped";
      break;
    default:
      break;
    }
    Pmog.tooltipText = object.getAttribute("tiptext");
    if (toolcount !== undefined) {
      Pmog.tooltipText = Pmog.tooltipText + " (" + toolcount + ")";
    } // Reset the timer now we're over a new item
    clearTimeout(Pmog.tooltipTimer);
    Pmog.tooltipTimer = setTimeout(Pmog.setTooltipState, Pmog.tooltipShowDelay, this, true);
  },
  onTBBMouseMove: function(object) { // If the tooltip isn't showing, we need to reset the timer.
    if (!Pmog.tooltipShowing) {
      clearTimeout(Pmog.tooltipTimer);
      Pmog.tooltipTimer = setTimeout(Pmog.setTooltipState, Pmog.tooltipShowDelay, this, true);
    }
  },
  onTBBMouseOut: function(object) { // Left the pref! Hide tooltip, and clear timer.
    Pmog.setTooltipState(false);
    clearTimeout(Pmog.tooltipTimer);
  },
  onTooltipPopupShowing: function(popup) {
    if (!Pmog.tooltipText) {
      return false;
    }
    var fChild = popup.firstChild;
    var diff = popup.boxObject.height - fChild.boxObject.height; // Setup the label...
    var ttl = document.getElementById("pmogTooltipLabel");
    ttl.value = Pmog.tooltipText;
    /* In Gecko 1.9, the popup has done no layout at this point, unlike in
  * earlier versions. As a result, the box object of all the elements
  * within it are 0x0. It also means the height of the labels isn't
  * updated. To deal with this, we avoid calling sizeTo with the box
  * object (as it's 0) and instead just force the popup height to 0 -
  * otherwise it will only ever get bigger each time, never smaller.
        */
    if (popup.boxObject.width == 0) Pmog.tooltipBug418798 = true;
    if (Pmog.tooltipBug418798) popup.height = 0;
    else popup.sizeTo(popup.boxObject.width, fChild.boxObject.height + diff);
    return true;
  },
  togglePause: function() {
    if (this.paused) {
      this.paused = false;
      this.hud.clearToolbarTxt();
    } else {
      this.paused = true;
      this.hud.updateToolbarTxt(this.prop('pmog_game_paused'));
      if (this.prefs.getBoolPref("auto_poll_pmail")) {
        this.stopPmailPolling();
      }
      this.closeAll();
    }
    jQuery('#menu_pmog_pause_pmog')[0].label = !this.paused ? "Pause The Nethernet": "Unpause The Nethernet";
    this.CAN_TRACK = !this.paused;
    Pmog.updateCommands();
  },
  markMessageRead: function(message) {
    var msg = message;
    jQuery.ajax({
      url: Pmog.private_url() + '/users/' + Pmog.user.login + '/messages/' + msg.params.body.id + '/read.json?authenticity_token=' + Pmog.user.authenticity_token,
      type: 'PUT',
      dataType: 'json',
      data: '',
      global: false,
      success: function(data) {
        Pmog.user.update(data.user);
      }
    });
  },
  startPmailPolling: function() {
    if (jQuery('#pmog-toolbar')[0].$timers === undefined || jQuery('#pmog-toolbar')[0].$timers.pmail === undefined) {
      jQuery('#pmog-toolbar').everyTime(Pmog.message_poll_timeout, "pmail",
      function() {
        Pmog.getUserMessages();
      },
      0);
      Pmog.getUserMessages();
    }
  },
  stopPmailPolling: function() {
    jQuery('#pmog-toolbar').stopTime("pmail");
  },
  togglePmailPollingPref: function() {
    this.prefs.setBoolPref("auto_poll_pmail", !this.prefs.getBoolPref("auto_poll_pmail"));
  },
  startQueuedMissionPolling: function() {
    if (jQuery('#pmog-toolbar')[0].$timers === null || jQuery('#pmog-toolbar')[0].$timers === undefined || jQuery('#pmog-toolbar')[0].$timers.queued_missions === undefined) {
      jQuery('#pmog-toolbar').everyTime(Pmog.queued_mission_poll_timeout, "queued_missions",
      function() {
        Pmog.getUserQueuedMissions();
      },
      0);
      Pmog.getUserQueuedMissions();
    }
  },
  stopQueuedMissionPolling: function() {
    jQuery('#pmog-toolbar').stopTime("queued_missions");
  },
  detectPmogChat: function() {
    var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);

    var addon = em.getItemForID("pmog_chat@gamelayers.com");

    if (addon) {
      gBrowser.getNotificationBox().appendNotification("You have the 2008 PMOG Chat installed. Please uninstall the PMOG Chat extension and re-install The Nethernet for better integrated chat.", "", null, 5, null);
    }
  },
  closeAll: function(runAfter) {
    var callback = runAfter || undefined;
    var panels = jQuery('panel.pmog-panel').filter(function() {
      return this.state === "open";
    });
    panels.each(function(i) {
      this.firstChild.close();
      if (callback !== undefined && i === panels.length - 1) {
        setTimeout(callback, 1000);
      }
    });
  },
  makeContactRequest: function(opts) {
    var options = opts || {};
    var user = options.user || undefined;
    var contactType = options.contactType || undefined;
    var ovrlay = options.overlay || undefined;

    jQuery.ajax({
      url: Pmog.BASE_URL + '/acquaintances/add/' + user + '?type=' + contactType,
      type: 'POST',
      dataType: 'json',
      data: '',
      beforeSend: function() {
        ovrlay.overlay.spinner.show();
      },
      complete: function() {
        ovrlay.overlay.spinner.hide();
      },
      success: function(xhrReq) {
        Pmog.notice(xhrReq.flash.notice);

        if (ovrlay) {
          switch (contactType) {
          case 'ally':
            ovrlay.allyButton.hidden = true;
            break;
          case 'rival':
            ovrlay.rivalButton.hidden = true;
            break;
          case 'acquaintance':
            ovrlay.contactButton.hidden = true;
            break;
          }
        }
      },
      error: function(xhrReq, critical) {
        Pmog.notice(jQuery.evalJSON(xhrReq.responseText).flash.error, "critical");
      }
    });
  },
  addAlly: function(login, opts) {
    var options = opts || {};
    this.makeContactRequest(login, 'ally', options);
  },
  addContact: function(login, opts) {
    var options = opts || {};
    this.makeContactRequest(login, 'acquaintance', options);
  },
  addRival: function(login, opts) {
    var options = opts || {};
    this.makeContactRequest(login, 'rival', options);
  },
  attachStNick: function(login, opts) {
    var options = opts || {};
    var ovrlay = options.overlay || undefined;
    var callback = options.callback || {};
    var ballistic = options.ballistic || false;

    stNickData = {};

    if (ballistic) {
      stNickData.upgrade = {};
      stNickData.upgrade.ballistic = true;
    }

    stNickData = jQuery.toJSON(stNickData);

    jQuery.ajax({
      url: Pmog.private_url() + '/users/' + login + '/st_nicks/attach.json?authenticity_token=' + Pmog.user.authenticity_token,
      type: 'PUT',
      dataType: 'json',
      data: stNickData,
      whenDone: callback,
      contentType: "application/json; charset=utf-8",
      success: function(data) {
        Pmog.st_nick_notice(data.flash.notice);
        try {
          this.whenDone();
        } catch(e) {
          // no callback
        }
      },
      error: function(data) {
        var errorMsg = jQuery.evalJSON(data.responseText).flash.error;
        if (ovrlay !== undefined) {
          ovrlay.overlay.addError(errorMsg);
        } else {
          Pmog.notice(errorMsg, "critical");
        }
      }
    });
  },
  swatNicks: function(login, opts) {
    var options = opts || {};
    var ovrlay = options.overlay || undefined;
    var callback = options.callback || {};

    jQuery.ajax({
      url: Pmog.private_url() + '/users/' + login + '/st_swatters/swat.json?authenticity_token=' + Pmog.user.authenticity_token,
      type: 'POST',
      dataType: 'json',
      data: {},
      whenDone: callback,
      contentType: "application/json; charset=utf-8",
      success: function(data) {
        Pmog.notice(data.flash.notice);
        try {
          this.whenDone();
        } catch(e) {
          // no callback
        }
      },
      error: function(data) {
        var errorMsg = jQuery.evalJSON(data.responseText).flash.error;
        if (ovrlay !== undefined) {
          ovrlay.overlay.addError(errorMsg);
        } else {
          Pmog.notice(errorMsg, "critical");
        }
      }
    });
  },
  sendCanary: function(url, opts) {
    var options = opts || {};
    var ovrlay = options.overlay || undefined;
    var callback = options.callback || {};

    canaryData = {};
    canaryData.url = url;
    canaryData = jQuery.toJSON(canaryData);

    jQuery.ajax({
      url: Pmog.private_url() + '/overweight_canaries.json?authenticity_token=' + Pmog.user.authenticity_token,
      type: 'POST',
      dataType: 'json',
      data: canaryData,
      whenDone: callback,
      contentType: "application/json; charset=utf-8",
      success: function(data) {
        Pmog.notice(data.flash.notice);
        try {
          this.whenDone();
        } catch(e) {
          // no callback
        }
      },
      error: function(data) {
        var errorMsg = jQuery.evalJSON(data.responseText).flash.error;
        if (ovrlay !== undefined) {
          ovrlay.overlay.addError(errorMsg);
        } else {
          Pmog.notice(errorMsg, "critical");
        }
      }
    });
  },
  tossGrenade: function(login, opts) {
    var options = opts || {};
    var callback = options.callback || {};

    jQuery.ajax({
      url: Pmog.private_url() + '/users/' + login + '/grenades/attach.json?authenticity_token=' + Pmog.user.authenticity_token,
      type: 'PUT',
      data: '',
      dataType: 'json',
      whenDone: callback,
      contentType: "application/json; charset=utf-8",
      success: function(data) {
        Pmog.grenade_notice(data.flash.notice, "warning");
        try {
          this.whenDone();
        } catch(e) {
          // no callback
        }
      },
      error: function(data) {
        errorMessage = jQuery.evalJSON(data.responseText).flash.error;

        if (errorMessage.search(/foiled your attempt/) > -1) {
          SpecialEffect.prototype.take_damage();
          Pmog.play_sound(NICK_SOUND);
          Pmog.st_nick_notice(errorMessage, "critical");
        } else {
          Pmog.grenade_notice(errorMessage, "critical");
        }

        try {
          this.whenDone();
        } catch(e) {
          // no callback?
        }
      }
    });
  },
  // createSkeletonKey: function(howMany, opts) {
  //   var options = opts || {};
  //   var callback = options.callback || {};
  //   var overlay = options.overlay || undefined;
  // 
  //   var skeletonKeyData = {};
  //   skeletonKeyData.count = howMany;
  //   skeletonKeyData = jQuery.toJSON(skeletonKeyData);
  // 
  //   jQuery.ajax({
  //     url: Pmog.private_url() + '/users/' + Pmog.user.login + '/skeleton_keys/create.json?authenticity_token=' + Pmog.user.authenticity_token,
  //     type: 'PUT',
  //     dataType: 'json',
  //     data: skeletonKeyData,
  //     whenDone: callback,
  //     contentType: "application/json; charset=utf-8",
  //     success: function(data) {
  //       Pmog.skeleton_key_notice(data.flash.notice);
  //       try {
  //         this.whenDone();
  //       } catch(e) {
  //         // no callback
  //       }
  //     },
  //     error: function(data) {
  //       if (overlay) {
  //         overlay.overlay.addError(jQuery.evalJSON(data.responseText).flash.error);
  //       }
  //     }
  //   });
  // 
  // },
  overclockPlayer: function(user) {
    jQuery.ajax({
      url: Pmog.private_url() + '/status_effect/overclock/' + user + '.json',
      type: 'GET',
      data: '',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      success: function(data) {
        Pmog.notice(data.flash.notice, "warning");
      },
      error: function(data) {
        errorMessage = jQuery.evalJSON(data.responseText).flash.error;
        Pmog.notice(errorMessage, "critical");
      }
    });
  },
  impedePlayer: function(user) {
    jQuery.ajax({
      url: Pmog.private_url() + '/status_effect/impede/' + user + '.json',
      type: 'GET',
      data: '',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      success: function(data) {
        Pmog.notice(data.flash.notice, "warning");
      },
      error: function(data) {
        errorMessage = jQuery.evalJSON(data.responseText).flash.error;
        Pmog.notice(errorMessage, "critical");
      }
    });
  },
  getUserLocationId: function(user) {
    var lid = jQuery.evalJSON(jQuery.ajax({
      url: Pmog.BASE_URL + '/locations/search.json?login=' + user,
      type: 'GET',
      dataType: 'json',
      data: '',
      async: false
    }).responseText).id;

    return lid;
  },
  getUserMessages: function() {
    if (this._idle === this.PMOG_IDLE || !this.user_playing) {
      return false;
    }
    if (Pmog.user && Pmog.user.authenticated) {
      jQuery.ajax({
        url: Pmog.private_url() + '/users/' + Pmog.user.login + '/messages.json?version=' + Pmog.version + "&" + Pmog.user_verification_params(),
        type: 'GET',
        dataType: 'json',
        panel_id: Pmog.get_display().tab.panel_id,
        ifModified: true,
        global: false,
        beforeSend: function(xhr) {
          // Pmog.logger.debug("Polling for Messages. " + new Date());
          Pmog.hud.updateToolbarTxt("Getting latest PMail...");
          Pmog.hud.toolbarThrobber.collapsed = false;
          if (Pmog.user && Pmog.user.if_modified_since !== null) {
            xhr.setRequestHeader("If-Modified-Since", Pmog.user.if_modified_since);
          }
        },
        success: function(xhrReq, textStatus) {
          // Pmog.logger.debug(toJSONString(xhrReq));
          Pmog.handle_server_response(xhrReq, this.panel_id);
        },
        error: function(xhrReq, textStatus, errorThrown) {
          // Pmog.logger.error("Error getting pmail!");
        },
        complete: function(xhrReq, textStatus) {
          Pmog.hud.clearToolbarTxt();
          Pmog.hud.toolbarThrobber.collapsed = true;
          Pmog.user.if_modified_since = xhrReq.getResponseHeader("Last-Modified");
        }
      });
    }

    return this;
  },
  getUserQueuedMissions: function() {
    if (this._idle === this.PMOG_IDLE || !this.user_playing) {
      return false;
    }
    jQuery.ajax({
      url: Pmog.private_url() + '/queued_mission.json?' + Pmog.user_verification_params(),
      type: 'GET',
      dataType: 'json',
      panel_id: Pmog.get_display().tab.panel_id,
      ifModified: true,
      global: false,
      beforeSend: function(xhr) {
        // Pmog.logger.debug("Polling for Queued Missions. " + new Date());
        if (Pmog.user && Pmog.user.qm_if_modified_since !== null) {
          xhr.setRequestHeader("If-Modified-Since", Pmog.user.qm_if_modified_since);
        }
      },
      success: function(xhrReq, textStatus) {
        // Pmog.logger.debug(Log4Moz.enumerateProperties(xhrReq).join(","));
        Pmog.user.queued_missions = xhrReq.queued_missions;
      },
      error: function(xhrReq, textStatus, errorThrown) {
        switch (xhrReq.status) {
        case 304:
          // Pmog.logger.debug("no new missions");
          break;
        }
      },
      complete: function(xhrReq, textStatus) {
        // Pmog.logger.debug("QM Last Modified: " + xhrReq.getResponseHeader("Last-Modified"));
        Pmog.user.qm_if_modified_since = xhrReq.getResponseHeader("Last-Modified");
      }
    });

    return this;
  },
  setShowEvents: function(boo) {
    var wasHidden = !this.show_events;
    this.show_events = boo;
    if (!boo) {
      this.hud.hideAll();
    } else if (boo && wasHidden) {
      var curr_page = this.get_page();
      this.renderAllOverlaysForPage(curr_page);
      jQuery('#events-button').removeClass('events-button-events').addClass('events-button-default');
    }
  },
  addActionButtons: function(item, target) {
    var html = "";
    switch (item.context) {
    case "crate_looted":
    case "giftcard_looted":
      html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + allyButton(target);
      break;
    case "mine_tripped":
    case "grenade_tripped":
      html += grenadeButton(target) + actionBarSpacer() + stnickButton(target) + actionBarSpacer() + rivalButton(target);
      break;
    case "acquaintance_added":
    case "ally_added":
      html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + crateButton(target);
      break;
    case "rival_added":
      html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + grenadeButton(target);
      break;
    case "mine_deflected":
    case "mine_disarmed":
    case "mine_dodged":
    case "grenade_deflected":
    case "grenade_disarmed":
    case "grenade_dodged":
    case "exploding_crate_detonated":
      html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + grenadeButton(target);
      break;
    case "st_nick_activated":
    case "watchdog_activated":
    case "ballistic_st_nick_attached":
    case "mine_vengeance":
      html += buttonPlaceholder() + actionBarSpacer() + grenadeButton(target) + actionBarSpacer() + stnickButton(target);
      break;
    case "puzzle_crate_looted":
    case "signup":
    case "mission_completed":
      html += pmailButton(target) + actionBarSpacer() + allyButton(target) + actionBarSpacer() + rivalButton(target);
      break;
    case "exploding_crate_deflected":
      html += buttonPlaceholder() + actionBarSpacer() + buttonPlaceholder() + actionBarSpacer() + stnickButton(target);
    default:
      break;
    };

    return html;
  },
  checkWebSession: function() {
    jQuery.ajax({
      url: Pmog.BASE_URL + "/status.json",
      type: 'GET',
      dataType: 'json',
      data: '',
      success: function(xhrReq) {
        // Pmog.logger.debug('Already logged in!');
        // Pmog.logger.debug(toJSONString(xhrReq));
        Pmog.hud.session_manager.process_login(xhrReq);
      },
      error: function() {
        // Pmog.logger.debug('NOT logged in!');
        if (Pmog.user && Pmog.user.authenticated) {
          Pmog.hud.session_manager.process_logout();
        }
      }
    });
  },
  checkCurrentSet: function() {  
    var preference_key = "reset_current_set_" + this.version.replace(/\./g, "_");
    if (!Pmog.prefs.getBoolPref(preference_key)) {
      Pmog.resetToolbar();
      Pmog.prefs.setBoolPref(preference_key, true);
    }
  },
  resetToolbar: function() {
    try {
      var tb = jQuery('#pmog-toolbar')[0];
      var curSet = tb.currentSet;
      var defSet = tb.getAttribute("defaultset");
      if (curSet !== defSet) {
        tb.setAttribute("currentset", defSet);
        tb.currentSet = defSet;
        document.persist("pmog-toolbar", "currentset");
        // If you don't do the following call, funny things happen
        try {
          BrowserToolboxCustomizeDone(true);
        }
        catch (e) { }
      }
    }
    catch(e) { }
  }
};
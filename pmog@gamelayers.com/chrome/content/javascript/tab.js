/*
  Class: Tab
  This class inject Pmog featurees into the Firefox tab.
*/
/*
  Constructor: Tab
  Initializes the Object

  Parameters:

    panel_id - the id corresponding to the Tab in firefox to associate this 
    instance with.
    browser - The browser xul element inside firefox.
    tab_observer - The instance of the <TabObserver> class that created this tab.
*/
Tab = function(panel_id, browser, tab_observer) {
  this.panel_id = panel_id;
  this.location = browser.contentDocument.location;
  this.document = browser.contentDocument;
  this.display = new Display(this);
  this.page = new Page();
  this.page.url = browser.contentDocument.location;
  this.browser = browser;
  this.tab_observer = tab_observer;
  this.uri = browser.currentURI.spec;
  this.index = 0;
  this.topLevelDocumentsOnly = true;
  this.pmog_notified = false; // Create a callback event which fires each time this browser loads a new webpage.
  var container = gBrowser.tabContainer;
  this.handle_loaded_page(this.document); // Create the listener array if it doesn't already exist.
  if (typeof(container.pmog_tab_listeners) == 'undefined') {
    container.pmog_tab_listeners = new Array();
  }
  if (this.browser) { // Create unique listener objects for each tab to monitor the page load process.
    container.pmog_tab_listeners.push({
      target: this,
      //this will be the index of the object in the listener array once added.
      listener_index: container.pmog_tab_listeners.length,
      handleEvent: function(evn) {
        this.target.whenPageLoad(evn, this.listener_index);
      }
    });
    this.browser.addEventListener("pageshow", container.pmog_tab_listeners[container.pmog_tab_listeners.length - 1], true);
  }
  this.class_name = "Tab";
};
/*
  Function: whenPageLoad
  This function is triggered when content of a tab loads. Once all the cotent of the
  tab is loaded it makes a callback

  Parameters:

    event - the object that triggered the onload event.
    listener_index - the position within the listener array that corresponds to the
    listener assigned to this tab.
*/
Tab.prototype.whenPageLoad = function(event, listener_index) {
  var doc = event.originalTarget; // doc is document that triggered "onload" event
  if (event.originalTarget.nodeName == "#document") {
    if (this.topLevelDocumentsOnly) { // When this becomes true it means that
      // all of the top level document's
      // subframes have also finished loading
      if (!this.isTopLevelDocument(doc)) {
        return;
      }
      this.handle_loaded_page(doc); // Remove the eventlistener
      var container = gBrowser.tabContainer;
      this.browser.removeEventListener("pageshow", container.pmog_tab_listeners[listener_index], true); // Now add it back (sort of forcing a reload in the listener)
      // FIXME: This may not be needed but was seeing strange loading problems in FF3, which lead me to
      // believe the listener was not being cleared out properly.
      this.browser.addEventListener("pageshow", container.pmog_tab_listeners[listener_index], true);
      if (this.is_tab_selected()) {
        this.notify_pmog();
      }
    }
  }
};
/*
  Function: handle_loaded_page
  This method is triggered when a page has been loaded.

  Parameters:

    doc - The document element of the loaded page.
*/
Tab.prototype.handle_loaded_page = function(doc) {
  this.uri = doc.location;
  this.location = doc.location;
  this.document = doc;
  this.display.init();
  this.pmog_notified = false;
};
/*
  Function: parse_selected_tab
  When a tab is loaded it notifies the <Pmog> class (only once).
*/
Tab.prototype.parse_selected_tab = function() {
  if (!this.pmog_notified) {
    this.notify_pmog();
  }
};
/*
  Function: notify_pmog
  Only tell Pmog about the tab once so that it doesn't get tracked repeatly.
*/
Tab.prototype.notify_pmog = function() {
  if (Pmog.user_playing()) {
    if (!this.pmog_notified) {
      this.pmog_notified = true;
    }
  }
};
/*
  Function: is_tab_selected
  Determine if this tab is the currently selected one.

  Returns:

    true or false
*/
Tab.prototype.is_tab_selected = function() {
  var browser = gBrowser.selectedTab.linkedBrowser; // The parentNode of the browser has a unique id we will use to link the open browser to the tabs.
  var panel_id = browser.parentNode.getAttribute('id');
  if (this.panel_id == panel_id) {
    return true;
  } else {
    return false;
  }
};
/*
  Function: isTopLevelDocument
  Determine if the document in question is the top most document  and not an iframe
  or similar.

  Parameters:

    aDocument - The document element to test.
*/
Tab.prototype.isTopLevelDocument = function(aDocument) { // Force the reload of gBrowser if it is not available.
  if (gBrowser === null) {
    this.chromeWindow.getBrowser();
  }
  var browsers = gBrowser.browsers;
  for (var i = 0; i < browsers.length; i++) {
    if (aDocument == browsers[i].contentDocument) {
      return true;
    }
  }
  return false;
};
/*
  Function: getLocation
  Get as many attributes about the current location as possible.

  Returns:
    An object containing attributes for "host", "hostname", "href", "pathname", 
    "port", "protocol", and "search".

*/
Tab.prototype.getLocation = function() {
  var obj = {
    host: null,
    hostname: null,
    href: null,
    pathname: null,
    port: null,
    protocol: null,
    search: null
  };
  try {
    return {
      host: this.location.host,
      hostname: this.location.hostname,
      href: this.location.href,
      pathname: this.location.pathname,
      port: this.location.port,
      protocol: this.location.protocol,
      search: this.location.search
    };
  } catch(e) { //log("Could not get location for tab.");
    return obj;
  }
};
/*
  Function: getDocument

  Returns the document element associated with this tab.
*/
Tab.prototype.getDocument = function() {
  return this.document;
};
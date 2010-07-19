Pmog.urlBarListener = {
  alreadyChecked: false,
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) || aIID.equals(Components.interfaces.nsISupportsWeakReference) || aIID.equals(Components.interfaces.nsISupports)) {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  },
  onLocationChange: function (aProgress, aRequest, aURI) { // Check for the user to be playing first please.
    if (Pmog.user_playing() && aURI) {
      Pmog.urlListener.processNewURL(aURI);
    }
    this.alreadyChecked = false;
  },
  onStateChange: function (aWebProgress, aRequest, aFlag, aStatus) {
    
    //*** Fire this event to let The Nethernet know the ext is installed.
    if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
      if (gBrowser.currentURI.spec.indexOf('thenethernet.com') !== -1 && this.alreadyChecked === false) {
        if (!Pmog.user || !Pmog.user.authenticated) {
          Pmog.checkWebSession();
        }
        Pmog.setExtensionPresence("pmog_installed");
        this.alreadyChecked = true;
      }
    }
    
  },
  onProgressChange: function () {},
  onStatusChange: function () {},
  onSecurityChange: function () {},
  onLinkIconAvailable: function () {}
};

Pmog.urlListener = {
  oldURL: null,
  
  init: function () { // Listen for webpage loads
    gBrowser.addProgressListener(Pmog.urlBarListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  },
  uninit: function () {
    gBrowser.removeProgressListener(Pmog.urlBarListener);
  },
  processNewURL: function (aURI) { 
    // Check to make sure that the tab has a loaded page and isn't a new blank page.
    if (aURI) {
      this.oldURL = aURI.spec;
      if (Pmog.get_display()) {
        jQuery('#events-button').removeClass('events-button-events').addClass('events-button-default');
        Pmog.page_loaded(Pmog.get_display().tab);
      }
    }
  }
};
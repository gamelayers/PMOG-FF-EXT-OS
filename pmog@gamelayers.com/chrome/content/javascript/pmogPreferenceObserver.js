function PrefListener(branchName, func) {
  var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  var branch = prefService.getBranch(branchName);
  branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  this.register = function() {
    branch.addObserver("", this, false);
    branch.getChildList("", {}).forEach(function(name) {
      func(branch, name);
    });
  };
  this.unregister = function unregister() {
    if (branch) branch.removeObserver("", this);
  };
  this.observe = function(subject, topic, data) {
    if (topic == "nsPref:changed") {
      func(branch, data);
      if (Pmog.user && Pmog.hud) {
        Pmog.hud.update_pmog_toolbar(Pmog.user);
      }
    }
  };
}

var pmogPrefListener = new PrefListener("extensions.pmog.",
function(branch, name) {
  switch (name) {
  case "auto_poll_pmail":
    //log(name + " has been changed");
    var isEnabled = Pmog.prefs.getBoolPref(name);
    if (isEnabled) {
      Pmog.startPmailPolling();
    } else {
      Pmog.stopPmailPolling();
    }
    Pmog.hud.updateAutoPollContextMenu();
    break;
  }
});
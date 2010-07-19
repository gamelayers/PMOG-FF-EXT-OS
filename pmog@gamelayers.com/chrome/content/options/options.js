function pmog_options_src() {
  var prefs    = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
  prefs        = prefs.getBranch("extensions.pmog.");
  var url_path = "/hud.ext";
  document.getElementById('pmog-options-iframe').setAttribute('src', opener.Pmog.BASE_URL + url_path);
}


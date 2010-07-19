let ioSvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
let resProt = ioSvc.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler);

if (!resProt.hasSubstitution("pmog")) {
  let extMgr = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
  let loc = extMgr.getInstallLocation("pmog@gamelayers.com");
  let extD = loc.getItemLocation("pmog@gamelayers.com");
  extD.append("modules");
  resProt.setSubstitution("pmog", ioSvc.newFileURI(extD));
}

// We import them into throwaway objects so they don't pollute the global
// namespace.
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", {});
Components.utils.import("resource://pmog/constants.js", {});
Components.utils.import("resource://pmog/log4moz.js", {});
Components.utils.import("resource://pmog/util.js", {});
Components.utils.import("resource://pmog/service.js", {});

// These are the only ones we *really* need in this file.
// We import them into the global namespace because the symbols they export
// are carefully named to minimize the risk of conflicts.
Components.utils.import("resource://pmog/log4moz.js");
Components.utils.import("resource://pmog/service.js");

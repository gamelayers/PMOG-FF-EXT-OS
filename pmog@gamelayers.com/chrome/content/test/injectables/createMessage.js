var XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
var msg = document.createElementNS(XULNS, "message");
msg.setAttribute("body", "Lorem ipsum dolor.");
msg.setAttribute("from", "from marc, less than a minute ago");
msg.setAttribute("avatar", "http://localhost:3000/classic/shared/elements/user_default.jpg");
jQuery('#pmog_dock')[0].appendItem(msg);
/*
  Class: Display
  Used by the extension to handle the rendering of overlays and events to the browser viewport. 
*/
/*
  Constructor: Display
  Initializes the object

  Parameters: 

    tab - An Instance of a <Tab> class.
*/
Display = function(tab) {
  this.tab = tab;
  this.ready = false;
  this.class_name = "Display";
};
/*
  Function: init
*/
Display.prototype.init = function() {
  this.ready = true;
};
/*
  Function: update
  This method takes the contents of the obj parameter and determines if it should render to the DOM or a XUL panel.

  Parameters:
    obj - An instance of either a <SpecialEffect>, <HudWindow>, or <Message>.

*/
Display.prototype.update = function(obj) { // Don't update if there is no object provided.
  if (!this.ready || typeof(obj) === 'undefined') {
    return undefined;
  }
  var overlay = this.create_xul_overlay(obj);
  if (overlay && overlay !== "notice" && overlay.tagName !== "carousel") {
    overlay.show(obj);
  }
  return overlay;
};
/*
  Function: create_xul_overlay
  This function will create a xul overlay for the page object.

  parameters:

    record - the data to display in the xul overlay.
*/
Display.prototype.create_xul_overlay = function(obj) {
  var record = obj || {};
  var overlay = null;
  var context;
  if (record === {}) {
    throw ("ArgumentError - No record to create a XUL overlay from");
  }
  type = record.type.toLowerCase();
  if (typeof(record.body) != 'object') {
    record.body = new Function("return " + record.body)();
  }
  switch (type) {
  case 'carousel':
    overlay = jQuery('#carousel')[0];
    break;
  case 'minefield':
  case 'mine_damage':
    overlay = jQuery('#minedamage')[0];
    break;
  case 'mine_vengeance':
    overlay = jQuery('#minevengeance')[0];
    break;
  case 'mine_armor_destroyed':
  case 'mine_deflected':
    overlay = jQuery('#minearmor')[0];
    overlay.setAttribute('armorbroken', true);
    break;
  case 'mine_dodged':
    overlay = jQuery('#minedodge')[0];
    break;
  case 'mine_disarmed':
    overlay = jQuery('#minedisarm')[0];
    break;
  case 'nick_damage':
    overlay = jQuery('#ballisticnickdamage')[0];
    break;
  case 'nick_armor':
    overlay = jQuery('#ballisticnickarmor')[0];
    break;
  case 'nick_dodged':
    overlay = jQuery('#ballisticnickdodge')[0];
    break;
  case 'nick_disarmed':
    overlay = jQuery('#ballisticnickdisarm')[0];
    break;
  case 'grenade_damage':
    overlay = jQuery('#grenadedamage')[0];
    break;
  case 'grenade_vengeance':
    overlay = jQuery('#grenadevengeance')[0];
    break;
  case 'grenade_armor_destroyed':
  case 'grenade_deflected':
    overlay = jQuery('#grenadearmor')[0];
    overlay.setAttribute('armorbroken', true);
    break;
  case 'grenade_dodged':
    overlay = jQuery('#grenadedodge')[0];
    break;
  case 'grenade_disarmed':
    overlay = jQuery('#grenadedisarm')[0];
    break;
  case 'error':
  case 'message':
    if (record.body.context && record.body.context !== null) {
      switch (record.body.context) {
      case 'taunt':
      case 'summon_receipt':
      case 'summon_confirmation':
        record.body.tiny_urls = false;
        context = 'message';
        break;
      case 'summon':
      case 'default':
        context = record.body.context;
        break;
      }
      overlay = jQuery('#' + context)[0];
    } else {
      overlay = jQuery('#message')[0];
    }
    break;
  case 'crate':
    if (record.body.context && record.body.context !== null) {
      switch (record.body.context) {
      case 'puzzle':
        context = record.body.context;
        break;
      default:
        context = type;
        break;
      }
      overlay = jQuery('#' + context)[0];
    } else {
      overlay = jQuery('#' + type)[0];
    }
    break;
  case 'giftcard':
    overlay = jQuery('#giftcard')[0];
    break;
  case 'portal':
    overlay = jQuery('#' + type)[0];
    break;
  case 'portalrating':
    overlay = jQuery('#portalrating')[0];
    break;
  case 'portaltest':
    Pmog.portal_notice("Your portal works, thanks for testing!");
    overlay = "notice";
    break;
  case 'mission':
    overlay = jQuery('#missionfound')[0];
    break;
  case 'branch':
    overlay = jQuery('#branch')[0]; // Don't open it if it's already open
    if (overlay.parentNode.state === "open") {
      overlay = undefined;
    }
    break;
  case 'info':
    Pmog.notice(record.body.content);
    overlay = "notice";
    break;
  case 'warn':
    Pmog.notice(record.body.content, 'warning');
    overlay = "notice";
    break;
  case 'critical':
    Pmog.notice(record.body.content, 'critical');
    overlay = "notice";
    break;
  case 'overclock':
    overlay = jQuery('overclock')[0];
    break;
  case 'impede':
    overlay = jQuery('impede')[0];
    break;
  }
  
  if (overlay === undefined || overlay === null) {
    return null;
  }
  if (overlay !== "notice") {
    overlay = Pmog.hud.addEventOverlay(overlay);
  }
  return overlay;
};
/*
Class: trackController
This class implements the methods needed for a command controller in Firefox. These commands
are the commands that can only be called when PMOG is able to track the current loaded page.
If PMOG is unable to track the current loaded page then these commands will be disabled.
*/
var trackController = {

  /*
  Function: init
  Initializes the command controller. Unused currently but in place as a placeholder in case we
  want to use it.
  */
  init : function() {

  },

  /*
  Function: supportsCommand
  Returns a boolean response for whether or not this controller supports the supplied command ID string.

  Parameters:

  cmd - The command ID string.
  */
  supportsCommand : function(cmd) {
    var isSupported = false;

    switch (cmd) {
      case "cmd_pmog_summon":
      case "cmd_toggle_armor":
      case "cmd_toggle_dodge":
      case "cmd_toggle_disarm":
      case "cmd_toggle_vengeance":
      case "cmd_toggle_stealth_mine":
      case "cmd_toggle_abundant_mine":
      case "cmd_deploy_mine":
      case "cmd_deploy_upgraded_mine":
      case "cmd_deploy_watchdog":
      case "cmd_deploy_giftcard":
      case "cmd_toggle_crateform":
      case "cmd_toggle_portalform":
      case "cmd_toggle_abundantportalform":
      case "cmd_toggle_lightpostform":
      case "cmd_toggle_puzzlepostform":
      // case "cmd_toggle_skeletonkeyform":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },

  /*
  Function: isCommandEnabled
  Returns a boolean that tells Firefox if the supplied command should be enabled.

  Parameters:

  cmd - The command ID string.
  */
  isCommandEnabled : function(cmd) {
    var enabled = false;

    if (Pmog.user === null || !Pmog.CAN_TRACK || Pmog.paused) {
      return enabled;
    }

    switch(cmd) {
    case "cmd_deploy_watchdog":
      enabled = Pmog.user && Pmog.user.levels.vigilante >= 7 && Pmog.user.inventory.watchdogs > 0;
      break;
    case "cmd_deploy_mine":
      enabled = Pmog.user && Pmog.user.inventory.mines > 0;
      break;
    case "cmd_deploy_upgraded_mine":
      enabled = Pmog.user && Pmog.user.inventory.mines > 0 && Pmog.user.levels.destroyer >= 7;
      break;
    case "cmd_toggle_stealth_mine":
      enabled = Pmog.user && Pmog.user.inventory.upgraded_mines > 0 && Pmog.user.levels.destroyer >= 8;
    case "cmd_toggle_abundant_mine":
      enabled = Pmog.user && Pmog.user.inventory.upgraded_mines > 0 && Pmog.user.levels.destroyer >= 7;
      break;
    case "cmd_toggle_lightpostform":
      enabled = Pmog.user && Pmog.user.inventory.lightposts > 0;
      break;
    case "cmd_toggle_puzzlepostform":
      enabled = Pmog.user && Pmog.user.inventory.puzzle_posts > 0;
      break;
    case "cmd_toggle_crateform":
      enabled = Pmog.user && Pmog.user.levels.benefactor >= 3 && Pmog.user.inventory.crates > 0;
      break;
    case "cmd_toggle_portalform":
      enabled = Pmog.user && Pmog.user.inventory.portals > 0;
      break;
    case "cmd_toggle_abundantportalform":
      enabled = Pmog.user && Pmog.user.inventory.abundant_portals > 0 && Pmog.user.levels.seer >= 5;
      break;
    case "cmd_deploy_giftcard":
      enabled = Pmog.user && Pmog.user.datapoints >= 10;
      break;
    case "cmd_toggle_armor":
      enabled = Pmog.user && Pmog.user.inventory.armor > 0;
      break;
    case "cmd_toggle_dodge":
      enabled = Pmog.user && Pmog.user.levels.bedouin >= 5 && Pmog.user.inventory.dodge > 0;
      break;
    case "cmd_toggle_disarm":
      enabled = Pmog.user && Pmog.user.levels.bedouin >= 12 && Pmog.user.inventory.disarm > 0;
      break;
    case "cmd_toggle_vengeance":
      enabled = Pmog.user && Pmog.user.levels.bedouin >= 15 && Pmog.user.inventory.vengeance > 0;
      break;
    default:
      enabled = Pmog.CAN_TRACK;
      break;
    }
    return enabled;
  },

  /*
  Function: doCommand
  The action to perform if the command is enabled and the oncommand is called.

  Parameters:

  cmd - The command ID string.
  */
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_pmog_summon":
        //Pmog.dockManager().toggleItem('summonform');
        Pmog.hud.toggleOverlayForm('summonform');
        break;
      case "cmd_toggle_armor":
        Pmog.hud.deploy('armor');
        break;
      case "cmd_toggle_dodge":
        Pmog.hud.deploy('dodge');
        break;
      case "cmd_toggle_disarm":
        Pmog.hud.deploy('disarm');
        break;
      case "cmd_toggle_vengeance":
        Pmog.hud.deploy('vengeance');
        break;
      case "cmd_deploy_mine":
        Pmog.hud.deploy('mine');
        break;
      case "cmd_deploy_upgraded_mine":
        Pmog.hud.deploy('upgraded_mine');
        break;
      case "cmd_toggle_stealth_mine":
        Pmog.prefs.setBoolPref("stealth_mine", !Pmog.prefs.getBoolPref("stealth_mine"));
        break;
      case "cmd_toggle_abundant_mine":
        Pmog.prefs.setBoolPref("abundant_mine", !Pmog.prefs.getBoolPref("abundant_mine"));
        break;
      case "cmd_deploy_watchdog":
        Pmog.hud.deploy('watchdog');
        break;
      case "cmd_deploy_giftcard":
        Pmog.hud.deploy('giftcard');
        break;
      case "cmd_toggle_crateform":
        //Pmog.dockManager().toggleItem('crateform');
        Pmog.hud.toggleOverlayForm('crateform');
        break;
      case "cmd_toggle_portalform":
        //Pmog.dockManager().toggleItem('portalform');
        Pmog.hud.toggleOverlayForm('portalform');
        break;
      case "cmd_toggle_abundantportalform":
        Pmog.hud.toggleOverlayForm('abundantportalform');
        break;
      case "cmd_toggle_lightpostform":
        Pmog.hud.toggleOverlayForm('lightpostform');
        break;
      case "cmd_toggle_puzzlepostform":
        Pmog.hud.toggleOverlayForm("puzzlepostform");
        break;
    }
  }
};


/*
Class: pmogController
This class implements the methods needed for a command controller in Firefox. These commands
are specific to PMOG but outside the context of the trackable commands.
*/
var pmogController = {

  /*
  Function: init
  Initializes the command controller. Unused currently but in place as a placeholder in case we
  want to use it.
  */
  init : function() {

  },

  /*
  Function: supportsCommand
  Returns a boolean response for whether or not this controller supports the supplied command ID string.

  Parameters:

  cmd - The command ID string.
  */
  supportsCommand : function(cmd) {
    var isSupported = false;

    switch (cmd) {
      case "cmd_toggle_pmog":
      case "cmd_pmog_preferences":
      case "cmd_pmog_help":
      case "cmd_pmog_key_commands":
      case "cmd_pmog_visit_pmog":
      case "cmd_pmog_visit_contacts":
      case "cmd_pmog_visit_forums":
      case "cmd_pmog_visit_blog":
      case "cmd_pmog_visit_toolbar_help":
      case "cmd_pmog_visit_profile":
      case "cmd_pmog_reset":
      case "cmd_report_a_bug":
      case "cmd_pmog_manage_profiles":
      case "cmd_pmog_play":
      case "cmd_pmog_invite":
      case "cmd_pmog_toggle_shoppe":
      case "cmd_pmog_toggle_profile":
      case "cmd_toggle_stnickform":
      case "cmd_toggle_bnickform":
      case "cmd_toggle_stswatterform":
      case "cmd_toggle_overweightcanaryform":
      case "cmd_toggle_grenadeform":
      case "cmd_toggle_overclockform":
      case "cmd_toggle_impedeform":
      case "cmd_signout":
      case "cmd_pause":
      case "cmd_ignored_sites":
      case "cmd_make_mission":
      case "cmd_resume_play":
      case "cmd_navbar_play":
      case "cmd_pmog_contacts":
      case "cmd_open_messageform":
      case "cmd_get_messages":
      case "cmd_toggle_pmail_poll":
      case "cmd_open_events_window":
      case "cmd_queue_or_jaunt":
      case "cmd_visit_guide":
      case "cmd_mine_upgrades":
      case "cmd_pmog_shoppe_bacon":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },

  /*
  Function: isCommandEnabled
  Returns a boolean that tells Firefox if the supplied command should be enabled.

  Parameters:

  cmd - The command ID string.
  */
  isCommandEnabled : function(cmd) {
    var enabled = false;

    switch(cmd) {
    case "cmd_toggle_stnickform":
      enabled = Pmog.user && Pmog.user.inventory.st_nicks > 0;
      break;
    case "cmd_toggle_bnickform":
      enabled = Pmog.user && Pmog.user.inventory.ballistic_nicks > 0;
      break;
    case "cmd_toggle_stswatterform":
      enabled = Pmog.user && Pmog.user.inventory.st_swatters > 0;
      break;
    case "cmd_toggle_overweightcanaryform":
      enabled = Pmog.user && Pmog.user.inventory.overweight_canaries > 0;
      break;
    case "cmd_toggle_grenadeform":
      enabled = Pmog.user && Pmog.user.inventory.grenades > 0;
      break;
    case "cmd_toggle_overclockform":
      enabled = Pmog.user && Pmog.user.can_overclock && Pmog.user.daily_invite_buffs > 0;
      if (Pmog.user && !Pmog.user.can_overclock) {
        jQuery('#overclockform-button').attr("tiptext", Pmog.prop('invite_5_to_unlock_tooltip'));
      } else {
        jQuery('#overclockform-button').attr("tiptext", Pmog.prop('overclock_tooltip'));
      }
      if (Pmog.user.faction === "chaos") {
        jQuery('#overclockform-button')[0].hidden = true;
      } else {
        jQuery('#overclockform-button')[0].hidden = false;
      }
      break;
    case "cmd_toggle_impedeform":
      enabled = Pmog.user && Pmog.user.can_impede && Pmog.user.daily_invite_buffs > 0;
      if (Pmog.user && !Pmog.user.can_impede) {
        jQuery('#impedeform-button').attr("tiptext", Pmog.prop('invite_5_to_unlock_tooltip'));
      } else {
        jQuery('#impedeform-button').attr("tiptext", Pmog.prop('impede_tooltip'));
      }
      if (Pmog.user.faction === "order") {
        jQuery('#impedeform-button')[0].hidden = true;
      } else {
        jQuery('#impedeform-button')[0].hidden = false;
      }
      break;
    case "cmd_get_messages":
      enabled = Pmog.user && Pmog.user.unread_messages > 0;
      break;
    case "cmd_toggle_pmog":
      enabled = Pmog.user && Pmog.user.authenticated;
      break;
    case "cmd_pmog_visit_profile":
      enabled = Pmog.user && Pmog.user.authenticated;
      break;
    case "cmd_mine_upgrades":
      enabled = Pmog.user && Pmog.user.inventory.upgraded_mines > 0;
      break;
    default:
      enabled = true;
      break;
    }

    return enabled;
  },

  /*
  Function: doCommand
  The action to perform if the command is enabled and the oncommand is called.

  Parameters:

  cmd - The command ID string.
  */
  doCommand : function(cmd) {
    switch (cmd) {
      case "cmd_toggle_pmog":
        Pmog.hud.toggle_hud();
        break;
      case "cmd_pmog_preferences":
        Pmog.hud.preferences();
        break;
      case "cmd_pmog_help":
        Pmog.hud.help();
        break;
      case "cmd_pmog_key_commands":
        Pmog.hud.learn_about('key_commands');
        break;
      case "cmd_pmog_help_pings":
        Pmog.hud.help_pings();
        break;
      case "cmd_pmog_visit_pmog":
        Pmog.hud.visit_pmog();
        break;
      case "cmd_pmog_contacts":
        Pmog.hud.toggleOverlayForm("contactsform", { buttonId: "pmog-toolbar" });
        break;
      case "cmd_pmog_visit_forums":
        Pmog.hud.visit_forums();
        break;
      case "cmd_pmog_visit_profile":
        Pmog.hud.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/users/" + Pmog.user.login);
        break;
      case "cmd_pmog_visit_blog":
        Pmog.hud.visit_blog();
        break;
      case "cmd_pmog_visit_toolbar_help":
        Pmog.hud.visit_toolbar_help();
        break;
      case "cmd_pmog_reset":
        Pmog.hud.pmog_reset();
        break;
      case "cmd_report_a_bug":
        Pmog.hud.report_a_bug();
        break;
      case "cmd_pmog_manage_profiles":
        Pmog.hud.manage_profiles();
        break;
      case "cmd_pmog_play":
        Pmog.hud.play();
        break;
      case "cmd_pmog_invite":
        //Pmog.dockManager().toggleItem('inviteform');
        Pmog.hud.toggleOverlayForm('inviteform', { buttonId: "pmog-toolbar"})
        break;
      case "cmd_pmog_toggle_shoppe":
        Pmog.hud.openAndReuseOneTabPerURL(Pmog.BASE_URL + '/shoppe');
        break;
      case "cmd_pmog_shoppe_bacon":
        Pmog.hud.openAndReuseOneTabPerURL(Pmog.BASE_URL + '/shoppe/bacon');
        break;
      case "cmd_pmog_toggle_profile":
        var profileOverlay = jQuery('profile')[0];
        if (profileOverlay.parentNode.state === "open") {
          if (profileOverlay.player !== Pmog.user.login) {
            profileOverlay.setPlayer(Pmog.user.login);
          } else {
            profileOverlay.close();
          }
        } else {
          Pmog.hud.toggleOverlayForm('profile');
          profileOverlay.setPlayer(Pmog.user.login);
        }
        break;
      case "cmd_toggle_stnickform":
        Pmog.hud.toggleOverlayForm("stnickform");
        //Pmog.dockManager().toggleItem('stnickform');
        break;
      case "cmd_toggle_bnickform":
        Pmog.hud.toggleOverlayForm("ballisticstnickform");
        break;
      case "cmd_toggle_stswatterform":
        Pmog.hud.toggleOverlayForm("stswatterform");
        break;
      case "cmd_toggle_overweightcanaryform":
        Pmog.hud.toggleOverlayForm("overweightcanaryform");
        break;
      case "cmd_toggle_grenadeform":
        Pmog.hud.toggleOverlayForm("grenadeform");
        break;
      case "cmd_toggle_overclockform":
        Pmog.hud.toggleOverlayForm("overclockform");
        break;
      case "cmd_toggle_impedeform":
        Pmog.hud.toggleOverlayForm("impedeform");
        break;
      case "cmd_pause":
        Pmog.hud.pause();
        break;
      case "cmd_signout":
        Pmog.logout();
        break;
      case "cmd_ignored_sites":
        Pmog.hud.ignored_sites();
        break;
      case "cmd_make_mission":
        Pmog.hud.make_mission();
        break;
      case "cmd_resume_play":
        Pmog.hud.resume_play();
        break;
      case "cmd_open_messageform":
        Pmog.hud.toggleOverlayForm('messageform');
        break;
      case "cmd_navbar_play":
        if (Pmog.get_page().overlay_count() > 0) {
          Pmog.renderAllOverlaysForPage(Pmog.get_page());
          goUpdatePmogNavbar();
        } else {
          goDoCommand("cmd_pmog_play");
        }
        break;
      case "cmd_get_messages":
        Pmog.getUserMessages();
        break;
      case "cmd_toggle_pmail_poll":
        Pmog.togglePmailPollingPref();
        break;
      case "cmd_open_events_window":
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
        var eventWindow = wm.getMostRecentWindow("TNN:Events");

        if (eventWindow !== null) {
          eventWindow.focus();
        } else {
          var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
          var win = ww.openWindow(null, "chrome://pmog/content/pmog-events.xul", "pmogEventsWindow", "chrome,centerscreen,resizable=yes", null);
        }
        break;
      case "cmd_queue_or_jaunt":
        if (Pmog.user && Pmog.user.queued_missions && Pmog.user.queued_missions.length > 0) {
          Pmog.hud.add_venture(true);
        } else {
          Pmog.jaunt();
        }
        break;
      case "cmd_visit_guide":
        Pmog.hud.openAndReuseOneTabPerURL(Pmog.BASE_URL + "/guide");
        break;
    }
  }
};

// This adds our trackController to the collection of controllers so that Firefox can find it.
window.controllers.appendController(pmogController);
window.controllers.appendController(trackController);


function goUpdatePmogTrackCommands(aCommandSet) {
  for (var i = 0; i < aCommandSet.childNodes.length; i++) {
    goUpdateCommand(aCommandSet.childNodes[i].id);
  }
}

var eventCommandController = {

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
      case "cmd_my_events":
      case "cmd_nethernet_events":
      case "cmd_contacts_events":
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
    
    if (mainBrowser().Pmog.user && mainBrowser().Pmog.user.authenticated) {
      enabled = true;
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
    case "cmd_my_events":
      tabSelected('cmd_my_events');
      break;
    case "cmd_nethernet_events":
      tabSelected('cmd_nethernet_events');
      break;
    case "cmd_contacts_events":
      tabSelected('cmd_contacts_events');
      break;
    }
  }
};

window.controllers.appendController(eventCommandController);

function goUpdateTnnEventsCommands(aCommandSet) {
  for (var i = 0; i < aCommandSet.childNodes.length; i++) {
    goUpdateCommand(aCommandSet.childNodes[i].id);
  }
}
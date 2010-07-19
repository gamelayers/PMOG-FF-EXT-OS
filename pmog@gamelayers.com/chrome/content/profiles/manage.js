// Called once when the dialog displays
function onLoad() {
  // Use the arguments passed to us by the caller
  document.getElementById("clear_passwords").checked = window.arguments[0].inn.clear_passwords;
  document.getElementById("clear_preferences").checked = window.arguments[0].inn.clear_preferences;
}

// Called once if and only if the user clicks OK
function onOK() {
   // Return the changed arguments.
   // Notice if user clicks cancel, window.arguments[0].out remains null
   // because this function is never called
   window.arguments[0].out = { clear_passwords:document.getElementById("clear_passwords").checked,    
                               clear_preferences:document.getElementById("clear_preferences").checked };
   return true;
}
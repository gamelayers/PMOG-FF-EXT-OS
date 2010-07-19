/**
This is a plugin to allow jQuery to select anonymous elements so we don't have to
do document.getAnonymousElements or document.getAnonymousElementByAttribute

2008-09-18 Marc Adams (marc@gamelayers.com)
*/
(function($){ 
  $.xulselectors = {
    version: '1.0'
  }

  $.fn.anonymousNodes = function() {
    return document.getAnonymousNodes(this[0]);
  };
  
  $.fn.anonymousByAttr = function(value, attr) {
    attr = attr || "anonid";
    return document.getAnonymousElementByAttribute(this[0], attr, value);
  };

})(jQuery); 

/**
This is like the dimensions plugin only it works for XUL elements hence the
silly name 'xulmensions'

2008-09-17 Marc Adams (marc@gamelayers.com)
*/
(function($){ 
  $.xulmensions = {
    version: '1.0'
  }

  // Create innerHeight, innerWidth, outerHeight and outerWidth methods
  $.each([ "height", "width" ], function(i, name){

    var type = name.toLowerCase();

    jQuery.fn[ type ] = function( size ) {
      // Get window width or height
      return this[0] == window ?
      // Everyone else use document.documentElement or document.body depending on Quirks vs Standards mode
      document.compatMode == "CSS1Compat" && document.documentElement[ "client" + name ] ||
      document.body[ "client" + name ] :

      // Get or set width or height on the element
      size === undefined ?
      // Get width or height on the element
      this[0].namespaceURI === "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" ?

      (this.length ? this[0].boxObject[type] : null) : 

      (this.length ? jQuery.css( this[0], type ) : null) :

      // Set the width or height on the element (default to pixels if value is unitless)
      this.css( type, typeof size === "string" ? size : size + "px" );
    }
  });
})(jQuery); 

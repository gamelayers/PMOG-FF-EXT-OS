/*
  Class: SpecialEffects
  This class extends the animation class to allow special effects to be applied
  to the linear animations. The special effects can be other animations or external
  events like controling the placement and features of the player's browsers.
*/

/*
  Constructor: SpecialEffect
  Initializes the Object
*/
SpecialEffect = function(type) {
    this.class_name = "SpecialEffect";
    this.action = null;
};


/*
  Function: window_quake
  
  Shake the browser window *highly annoying*

  Parameters:

    n - Magnitude of the quake
*/
SpecialEffect.prototype.window_quake = function(n) {
    if (parent.moveBy) {
        var windowSizeMode = parent.windowState;
        for (i = 10; i > 0; i--) {
            for (j = n; j > 0; j--) {
                parent.moveBy(0, i);
                parent.moveBy(i, 0);
                parent.moveBy(0, -i);
                parent.moveBy( - i, 0);
            }
        }
        switch(windowSizeMode) {
        case parent.STATE_MAXIMIZED:
          parent.maximize();
          break;
        case parent.STATE_MINIMIZED:
          parent.minimize();
          break;
        default:
          parent.restore();
          break;
        }
    }
};

/*
  Function: take_damage
  
  Display a red translucent skrim over the browser viewport just for an instant
  and then fade it out.
*/
SpecialEffect.prototype.take_damage = function() {
    scrim = jQuery('scrim')[0];
    scrim.open();
};
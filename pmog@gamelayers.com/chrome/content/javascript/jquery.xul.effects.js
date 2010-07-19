/*
   Function: $
   Plugin to extend jQuery so we can do nifty effects in XUL
*/
(function($){
  
  /*
     Function: xulSlideUp

     Uses jQuery to animate the sliding of a XUL element from a hidden view,
     to the browser view. Also deviates from the standard easing effect included
     in jQuery by using a bounding effect that gives the animation elasticity.

     Parameters:

        speed - A long number in milliseconds that represents the time that the animation will take from start to finish.
        callback - An optional function to call when the animation is complete.
  */
  $.fn.xulSlideUp = function(speed, callback) {
    return speed ? 
    this.animate( { height: "show" }, speed, "easeOutBack", callback ) :
    this.filter(":hidden").each( 
      function() {
        this.oldblock = this.oldblock || jQuery.css(this,"display");
        this.style.display = "block";
      }).end();
  };

  /*
     Function: xulSlideDown

     Uses jQuery to animate the sliding of a XUL element from the browser view
     to being hidden. Also deviates from the standard easing effect included
     in jQuery by using a bounding effect that gives the animation elasticity.

     Parameters:

        speed - A long number in milliseconds that represents the time that the animation will take from start to finish.
        callback - An optional function to call when the animation is complete.
  */
  $.fn.xulSlideDown = function(speed, callback){
    return speed ?
    this.animate( { height: 'hide' }, speed, "easeInBack", callback ) :
    this.filter(":visible").each(
      function() {
        this.oldblock = this.oldblock || jQuery.css(this,"display");
        this.style.display = "none";
      }).end();
  };
  
  
  /*
     Function: xulScale

     Animates the size of the XUL element to double its current size (width and height)

     Parameters:

        speed - A long number in milliseconds that represents the time that the animation will take from start to finish.
        callback - An optional function to call when the animation is complete.
  */
  $.fn.xulScale = function(speed, callback) {
    speed = speed || 1000;
    this.animate( { width: $(this).width() * 2, height: $(this).height() * 2}, speed, callback);
  };
  
  $.ui.accordion.animations.superbounce = function(options) {
  	this.slide(options, {
  		easing: "bounceout",
  		duration: 700
  	});
  };
})(jQuery);
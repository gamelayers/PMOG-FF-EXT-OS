/*
 *
 * Copyright (c) 2006/2007 Sam Collett (http://www.texotela.co.uk)
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Version 2.0
 * Demo: http://www.texotela.co.uk/code/jquery/newsticker/
 *
 * $LastChangedDate$
 * $Rev$
 *
 */

(function($) {
  /*
 * A basic news ticker.
 *
 * @name     newsticker (or newsTicker)
 * @param    delay      Delay (in milliseconds) between iterations. Default 4 seconds (4000ms)
 * @author   Sam Collett (http://www.texotela.co.uk)
 * @example  $("#news").newsticker(); // or $("#news").newsTicker(5000);
 *
 */
  $.fn.newsTicker = $.fn.newsticker = function(options)
  {
    options = options || {};
    delay = options.delay || 4000;

    initTicker = function(el)
    {
      stopTicker(el);
      //el.items = $("li", el);
      loadItems(el);
      // hide all items (except first one)
      el.items.not(":eq(0)").hide().end();
      // current item
      el.currentitem = 0;
      startTicker(el);
    };
    loadItems = function(el) {
      el.items = $("li", el);
    };
    startTicker = function(el)
    {
      el.tickfn = setInterval(function() { doTick(el) }, delay)
    };
    stopTicker = function(el)
    {
      clearInterval(el.tickfn);
    };
    pauseTicker = function(el)
    {
      el.pause = true;
    };
    resumeTicker = function(el)
    {
      el.pause = false;
    };
    doTick = function(el)
    {
      // don't run if paused
      if(el.pause) return;
      // pause until animation has finished
      el.pause = true;
      // hide current item
      $(el.items[el.currentitem]).fadeOut("slow",
        function()
        {
          $(this).hide();
          // move to next item and show
          el.currentitem = ++el.currentitem % (el.items.size());
          $(el.items[el.currentitem]).fadeIn("slow",
            function()
            {
              el.pause = false;
            }
          );
        }
      );
    };
    this.each(
      function()
      {
        if(this.nodeName.toLowerCase()!= "ul") return;
        initTicker(this);
      }
    )
    .addClass("newsticker")
    .hover(
      function()
      {
        // pause if hovered over
        pauseTicker(this);
      },
      function()
      {
        // resume when not hovered over
        resumeTicker(this);
      }
    )
    .bind("DOMNodeInserted", function() {
      loadItems(this); 
    });
    return this;
  };

})(jQuery);
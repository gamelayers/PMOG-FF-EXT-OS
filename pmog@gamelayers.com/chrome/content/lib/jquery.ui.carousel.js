/**
 * jQuery UI Carousel 1.0.0
 * 
 * (based on jCarouselLite 1.0.1)
 *
 * Copyright (c) 2008 Chris Leishman (chrisleishman.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 */
(function($) {

  $.widget('ui.carousel', {
    _init: function() {
      var self = this,
      o = this.options,
      div = this.element;
      
      this.running = false;
      this.curr = o.start;

      o.animCss = o.vertical ? 'top': 'left';
      o.sizeCss = o.vertical ? 'height': 'width';

      var ul = $("ul", div),
      tLi = $("li", ul),
      tl = tLi.size(),
      v = o.visible;

      if (o.circular) {
        ul.prepend(tLi.slice(tl - v).clone()).append(tLi.slice(0, v).clone());
        o.start += v;
      }

      var li = $("li", ul);
      o.itemLength = li.size();
      
      var liArray = [];
      $(li).each(function() {
        liArray.push(jQuery(this).height());
      });
      
      var liHeight = liArray.sort()[liArray.length - 1];

      div.css("visibility", "visible");

      li.css({
        overflow: "hidden",
        float: o.vertical ? "none": "left"
      });
      ul.css({
        margin: "0",
        padding: "0",
        position: "relative",
        "list-style-type": "none",
        "z-index": "1"
      });
      div.css({
        overflow: "hidden",
        position: "relative",
        "z-index": "2",
        left: "5px"
      });
      
      o.liSize = o.vertical ? this._height(li) : this._width(li); // Full li size(incl margin)-Used for animation
      //o.liSize = liHeight;
      var ulSize = o.liSize * o.itemLength; // size of full ul(total length, not just for the visible items)
      var divSize = o.liSize * v; // size of entire div(total length for just the visible items)
      
      li.css({
        width: li.width(),
        //height: li.height()
        height: liHeight + "px"
      });
      ul.css(o.sizeCss, ulSize + "px").css(o.animCss, -(this.curr * o.liSize));

      div.css(o.sizeCss, divSize + "px"); // Width of the DIV. length of visible images
      if (o.auto) {
        setInterval(function() {
          self.next();
        },
        o.auto + o.speed);
      }
    },

    prev: function() {
      return this._go(this.curr - this.options.scroll);
    },

    next: function() {
      return this._go(this.curr + this.options.scroll);
    },

    visible: function(from) {
      if (from == undefined) from = this.curr;
      return this.element.find('li').slice(from).slice(0, this.options.visible);
    },

    at: function() {
      return this.curr;
    },

    view: function(item) {
      var o = this.options,
      curr = this.curr;
      if (o.circular) item = item + o.visible;
      if (item >= curr && item < curr + o.visible) return;
      var s = o.scroll;
      return this._go((item < curr) ? (curr - (Math.floor((curr - item) / s) * s + s)) : (curr + (Math.floor((item - curr) / s) * s)));
    },

    reset: function() {
      var o = this.options;
      if (this.curr == o.start) return;
      this.curr = o.start;
      ul.css(o.animCss, -(this.curr * o.liSize));
    },

    _go: function(to) {
      var self = this,
      o = this.options,
      e = this.element;
      var v = o.visible,
      ul = this.element.find('ul');

      if (!self.running) {
        var prev = self.curr;
        var next;

        if (o.circular) { // If circular we are in first or last, then goto the other end
          if (to == self.curr) return;
          if (to <= o.start - v - 1) { // If first, then goto last
            ul.css(o.animCss, -((o.itemLength - (v * 2)) * o.liSize) + "px");
            // If "scroll" > 1, then the "to" might not be equal to the condition; it can be lesser depending on the number of elements.
            next = to == o.start - v - 1 ? o.itemLength - (v * 2) - 1 : o.itemLength - (v * 2) - o.scroll;
          } else if (to >= o.itemLength - v + 1) { // If last, then goto first
            ul.css(o.animCss, -((v) * o.liSize) + "px");
            // If "scroll" > 1, then the "to" might not be equal to the condition; it can be greater depending on the number of elements.
            next = to == o.itemLength - v + 1 ? v + 1 : v + o.scroll;
          } else {
            next = to;
          }
        } else {
          if (to > o.itemLength - v) to = o.itemLength - v;
          if (to < 0) to = 0;
          // If non-circular and to points to first or last, we just return.
          if (to == self.curr) return;
          else next = to;
        }

        o.beforeStart.call(e, self.visible(self.curr), self.visible(next));
        self.running = true;
        self.curr = next;

        ul.animate(
        o.animCss == "left" ? {
          left: -(self.curr * o.liSize)
        }: {
          top: -(self.curr * o.liSize)
        },
        o.speed, o.easing,
        function() {
          self.running = false;
          o.afterEnd.call(e, self.visible(self.curr), self.visible(prev));
        });
      }
      return false;
    },

    _css: function(el, prop) {
      return parseInt($.css(el[0], prop)) || 0;
    },
    _width: function(el) {
      return el[0].offsetWidth + this._css(el, 'marginLeft') + this._css(el, 'marginRight');
    },
    _height: function(el) {
      return el[0].offsetHeight + this._css(el, 'marginTop') + this._css(el, 'marginBottom');
    }
  });

  $.extend($.ui.carousel, {
    defaults: {
      auto: null,
      speed: 200,
      easing: null,
      vertical: false,
      circular: true,
      visible: 1,
      start: 0,
      scroll: 1,
      beforeStart: function(visibleBefore, visibleAfter) {},
      afterEnd: function(visibleAfter, visibleBefore) {}
    }
  });

})(jQuery);
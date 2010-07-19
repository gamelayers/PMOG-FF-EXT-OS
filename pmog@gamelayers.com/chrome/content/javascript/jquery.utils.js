(function($) {
  jQuery.fn.autolink = function() {
    return this.each(function() {
      var re = /(^|\s)((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;
      var matches = $(this).html().match(re);
      for (var m in matches) {
        if (matches[m] != "http://www.w3.org/1999/xhtml") {
          $(this).html($(this).html().replace(matches[m], urlToLink(matches[m])));
        }
      }
    });
  };

  jQuery.fn.pluralize = function(count, singular, plural) {
    c = parseInt((count || 0), 10);
    return (count == 1) ? singular: (plural || singular + 's');
  };

  $.fn.toggleFade = function(settings)
  {
    settings = jQuery.extend(
    {
      speedIn: "normal",
      speedOut: settings.speedIn
    },
    settings
    );
    return this.each(function()
    {
      var isHidden = jQuery(this).is(":hidden");
      jQuery(this)[isHidden ? "fadeIn": "fadeOut"](isHidden ? settings.speedIn: settings.speedOut);
    });
  };
})(jQuery);
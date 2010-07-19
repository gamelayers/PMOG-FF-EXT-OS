var jXML = {
  getCount: function(xml, nodes) {
    var response = {};
    for (var node in nodes) {
      response[node] = jQuery(nodes[node], xml).length;
    }
    return response;
  },
  getAttribute: function(xml, nodes) {
    var response = {};
    for (var node in nodes) {
      if (nodes[node][2] == null) {
        response[node] = jQuery(nodes[node][0] + "[" + nodes[node][1] + "]", xml);
      } else {
        if (jQuery(nodes[node][0], xml).attr(nodes[node][1]) == nodes[node][2]) {
          response[node] = jQuery(nodes[node][0], xml);
        }
      }
    }
    return response;
  },
  getRandomObj: function(xml, nodes) {
    var response = {};
    for (var node in nodes) {
      var a = [];
      var b = [];
      jQuery(nodes[node][0], xml).each(function(i) {
        b[i] = this;
      });
      var c = b.length;
      if (nodes[node][1] != null && nodes[node][1] < c) {
        c = nodes[node][1];
      }
      for (i = 0; i < c; i++) {
        var e = Math.floor(Math.random() * b.length);
        a[i] = b[e];
        b.splice(e, 1);
      }
      response[node] = a;
    }
    return response;
  }
};

function getEventStream(url, tbod) {

  jQuery.getFeed({
    url: url,
    beforeSend: function() {
      throbberLayer.hidden = false;
    },
    complete: function() {
      throbberLayer.hidden = true;
    },
    success: function(feed) {
      jQuery(tbod).empty();

      try {

      var html = '';

      for (var i = 0; i < feed.items.length; i++) {

        var item = feed.items[i];
        var firstregex = new RegExp("^" + mainBrowser().Pmog.user.login);
        var secondregex = new RegExp("\s*" + mainBrowser().Pmog.user.login + "\'s");
        var thirdregex = new RegExp("^([a-zA-Z0-9]*) ");

        item.title = item.title.replace(firstregex, "You");
        item.title = item.title.replace(secondregex, "your");

        var matches = item.title.match(thirdregex);
        if (matches && matches[1] !== 'You') {
          item.title = item.title.replace(matches[1], '<a href="' + mainBrowser().Pmog.BASE_URL + '/users/' + matches[1] + '">' + matches[1] + '</a>');
        }
        
        var theirRegex = new RegExp(/(You \w+) their/);
        item.title = item.title.replace(theirRegex, "$1 your");
        
        var eventDate = new Date(item.updated);
        html += '<tr>' + '<td class="icon event_list">' + '<img src="' + mainBrowser().Pmog.BASE_URL + '/images/shared/clear.png" class="' + item.context + ' icon32" />' + '</td>' + '<td class="copy">' + '<div class="cellContent">' + mainBrowser().escapeSpecial(fixLinks(item.title)) + '<br />' + '<span class="small-text">' + jQuery.timeago(eventDate) + '</span>'; + '<br />'
        if (item.context === "signup") {
          html += '<div style="border-top: 1px dashed; margin-top: 5px; text-align: right;">';
          html += '<span style="margin-right: 5px; width: 100px; display: inline-block; text-align: left;"><a href="' + mainBrowser().Pmog.BASE_URL + '/users/' + item.author.trim() +'">' + item.author.trim() + '</a></span>';  
          html += addActionButtons(item, item.author);
          html += '</div>';
        }
        if (item.target !== "" && item.author !== mainBrowser().Pmog.user.login) {
          html += '<div style="border-top: 1px dashed; margin-top: 5px; text-align: right;">';
          html += '<span style="margin-right: 5px; width: 100px; display: inline-block; text-align: left;"><a href="' + mainBrowser().Pmog.BASE_URL + '/users/' + item.author.trim() +'">' + item.author.trim() + '</a></span>';  
          html += addActionButtons(item, item.author);
          html += '</div>';
        }
        if (item.target !== "" && item.target !== mainBrowser().Pmog.user.login && item.target != item.author) {
          html += '<div style="border-top: 1px dashed; margin-top: 5px; text-align: right;">';
          html += '<span style="margin-right: 5px; width: 100px; display: inline-block; text-align: left;"><a href="' + mainBrowser().Pmog.BASE_URL + '/users/' + item.target.trim() +'">' + item.target.trim() + '</a></span>';  
          html += addActionButtons(item, item.target);
          html += '</div>';
        }
        html += '</div>' + '</td>' + '</tr>';
      }

      jQuery(tbod).append(html);

    } catch (e) {
      // mainBrowser().Pmog.logger.error(e);
      Components.utils.reportError(e);
    }

      jQuery('.bottomNav').empty().append(playerEventLink(url));

      jQuery('a').each(function() {
        this.setAttribute("link", this.getAttribute('href'));
        this.removeAttribute("href");
      });

      jQuery('a').bind("mouseover",
      function() {
        jQuery(this).css("cursor", "pointer");
      }).click(function() {
        openInBrowser(this.getAttribute("link"));
      });

      jQuery('.poptip, .actionbutton').hover(
      function() {
        this.style.cursor = "pointer";
      },
      function() {
        this.style.cursor = "auto";
      }).tooltip({
        track: false,
        delay: 0,
        showURL: false,
        showBody: " - ",
        fixPNG: true,
        opacity: 0.95,
        fade: "toggle",
        duration: 200,
        extraClass: "poptip"
      });

      jQuery('img.pmail').click(function() {
        openReply(this.getAttribute('target'));
      });

      jQuery('img.stnick').click(function() {
        attachStNick(this.getAttribute('target'));
      });

      jQuery('img.grenade').click(function() {
        tossGrenade(this.getAttribute('target'));
      });

      jQuery('img.crateform').click(function() {
        openCrateForm(this.getAttribute('target'));
      });

      jQuery('img.rival').click(function() {
        rivalPlayer(this.getAttribute('target'));
      });

      jQuery('img.ally').click(function() {
        allyPlayer(this.getAttribute('target'));
      });

      jQuery("table.stripeMe tr:nth-child(odd)").addClass("whiteEven");

      var config = {
        sensitivity: 3,
        // number = sensitivity threshold (must be 1 or higher)    
        interval: 250,
        // number = milliseconds for onMouseOver polling interval    
        over: function() {
          jQuery(this).find("div.hidden").fadeIn(200);
        },
        // function = onMouseOver callback (REQUIRED)    
        timeout: 10,
        // number = milliseconds delay before onMouseOut    
        out: function() {
          jQuery(this).find("div.hidden").fadeOut(200);
        } // function = onMouseOut callback (REQUIRED)    
      };

      jQuery("table tr").hoverIntent(config);

      jQuery(".blueMe tr").mouseover(
      function() {
        jQuery(this).addClass("overEvent");
      }).mouseout(
      function() {
        jQuery(this).removeClass("overEvent");
      });
    },
    error: function() {
      mainBrowser().Pmog.logger.error("Error getting main event feed");
    }
  });
};

function addActionButtons(item, target) {
  var html = "";
  switch (item.context) {
  case "crate_looted":
  case "giftcard_looted":
    html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + allyButton(target);
    break;
  case "mine_tripped":
  case "grenade_tripped":
    html += grenadeButton(target) + actionBarSpacer() + stnickButton(target) + actionBarSpacer() + rivalButton(target);
    break;
  case "acquaintance_added":
  case "ally_added":
    html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + crateButton(target);
    break;
  case "rival_added":
    html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + grenadeButton(target);
    break;
  case "mine_deflected":
  case "mine_disarmed":
  case "mine_dodged":
  case "grenade_deflected":
  case "grenade_disarmed":
  case "grenade_dodged":
  case "exploding_crate_detonated":
    html += buttonPlaceholder() + actionBarSpacer() + pmailButton(target) + actionBarSpacer() + grenadeButton(target);
    break;
  case "st_nick_activated":
  case "watchdog_activated":
  case "ballistic_st_nick_attached":
  case "mine_vengeance":
    html += buttonPlaceholder() + actionBarSpacer() + grenadeButton(target) + actionBarSpacer() + stnickButton(target);
    break;
  case "puzzle_crate_looted":
  case "signup":
  case "mission_completed":
    html += pmailButton(target) + actionBarSpacer() + allyButton(target) + actionBarSpacer() + rivalButton(target);
    break;
  case "exploding_crate_deflected":
    html += buttonPlaceholder() + actionBarSpacer() + buttonPlaceholder() + actionBarSpacer() + stnickButton(target);
  default:
    break;
  };
  
  return html
};

function htmlspecialchars(string) {
  var regex = /<\s*\w*\s*href\s*=\s*"?'?\s*([\w\s%#\/\.;:_-]*)\s*"?'?.*?>/;
  return string.replace(regex, "<a href=\"$1\">");

};

function mainBrowser() {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
  return browserWindow = wm.getMostRecentWindow("navigator:browser");
};

function openInBrowser(url) {
  mainBrowser().Pmog.hud.openAndReuseOneTabPerURL(url);
}

function stripHTML(str) {
  var reTag = /<(?:.|\s)*?>/g;
  return str.replace(reTag, "");
};

function setTabpanelDesc(descString) {
  var desc = jQuery('#selectedTabDescription')[0];
  desc.value = descString;
};

function tabSelected(tabId) {

  var section = tabId;

  var url;
  switch (tabId) {
  case "cmd_nethernet_events":
    url = mainBrowser().Pmog.private_url() + "/events.rss";
    break;
  case "cmd_my_events":
    url = mainBrowser().Pmog.private_url() + "/users/" + mainBrowser().Pmog.user.login + ".rss";
    section = "cmd_my_combined";
    break;
  case "cmd_contacts_events":
    url = mainBrowser().Pmog.private_url() + "/users/" + mainBrowser().Pmog.user.login + "/events/contacts.rss";
    break;
  case "cmd_my_combined":
    url = mainBrowser().Pmog.private_url() + "/users/" + mainBrowser().Pmog.user.login + "/events/combined.rss";
    break;
  case "cmd_from_me":
    url = mainBrowser().Pmog.private_url() + "/users/" + mainBrowser().Pmog.user.login + "/events/triggered.rss";
    section = "cmd_my_combined";
    break;
  }

  if (section === "cmd_my_combined") {
    jQuery('#filterType').show();
  } else {
    jQuery('#filterType').hide();
  }

  jQuery('#filterType span').each(function() {
    if (this.id === tabId) {
      jQuery(this).attr("selected", "true");
    } else {
      jQuery(this).attr("selected", "false");
    }
  });

  jQuery('*[command=' + section + ']').attr("active", "true");
  jQuery('*:not([command=' + section + '])').attr("active", "false");

  var tb = jQuery('#addEventsHere')[0];
  getEventStream(url, tb);
};

function changeFilterEvent(aId, aExtra) {
  //*** aId is id of element
  //*** aExtra is passed as attribute "myextra" of element
  //*** content.document is document of current page
  var doc = jQuery('#content-body')[0].contentDocument;
  var elm = doc.getElementById(aId);
  if (elm && "createEvent" in doc) {
    //*** set myextra atteribute on elm
    elm.setAttribute("filter", aExtra);
    jQuery(elm).append("<span>" + aExtra + "</span>");
    //*** fire myevent on elm
    var evt = doc.createEvent("Events");
    evt.initEvent("filterEvent", true, false);
    elm.dispatchEvent(evt);
  }
};

function openReply(login) {
  mainBrowser().Pmog.hud.openReply(login);
};

function attachStNick(login) {
  mainBrowser().Pmog.attachStNick(login);
};

function tossGrenade(login) {
  mainBrowser().Pmog.tossGrenade(login);
};

function rivalPlayer(login) {
  mainBrowser().Pmog.addRival(login);
};

function allyPlayer(login) {
  mainBrowser().Pmog.addAlly(login);
};

function openCrateForm(login) {
  mainBrowser().Pmog.hud.toggleOverlayForm('crateform', {
    showArg: login
  });
};

function playerEventLink(url) {
  if (url.indexOf('users') !== -1) {
    return "<a href='" + mainBrowser().Pmog.BASE_URL + "/users/" + mainBrowser().Pmog.user.login + "/events/'>Visit " + mainBrowser().Pmog.user.login + "'s Events</a>";
  } else {
    return "<a href='" + mainBrowser().Pmog.BASE_URL + "/events'>See all Events</a>";
  }
};

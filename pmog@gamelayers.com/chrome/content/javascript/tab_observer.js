/*
  Class: TabObserver
  The purpose of this class is to keep track of all tabs loaded by firefox.
  This class will allow other objects to subscribe to tab events.
  This class will track these tab events:
  Add / Remove Tab
  Select / Unselect Tab

  *Usage*

  Monitoring tabs are especially important for extensions that:
  1. Manipulate the DOM of the loaded page.
  2. Set states of the extension relative to the selected tab.
*/

/*
  Constructor: TabObserver
  Initializes the Object

  Parameters: 

    force - boolean. In some cases we may need to restart the extension when the browser is already loaded in these cases
    pass force = true to bypass the normal window load listener.
*/
TabObserver = function(force) {
    this.tabs = [];
    this.tab_listeners = [];
    // An array which contains interval ideas we are to remove.
    this.browser_container = null;
    this.uninitialized = true;
    this.tab_check = null;
    this.class_name = "TabObserver";
    this.load_listener = new Object();
    this.load_listener.target = this;

    if (force === true) {
        this.init();
    } else {
        this.load_listener.handleEvent = function() {
            this.target.init();
        };

        // Do not try to add a callback until the browser window has
        // been initialised. We add a callback to the tabbed browser
        // when the browser's window gets loaded.
        window.addEventListener("load", this.load_listener, false);
    }
};

/*
  Function: init
  Initialize the listeners for all the various tab events and forcefully add a tab 
  to the tab_observer if there are no other tabs open.
*/
TabObserver.prototype.init = function() {
    if (this.uninitialized) {

        // Only set up the event listeners once.
        this.uninitialized = false;

        this.browser_container = gBrowser.tabContainer;

        this.tab_select_listener = new Object();
        this.tab_select_listener.target = this;
        this.tab_select_listener.handleEvent = function(event) {
            this.target.tab_selected(event);
        };

        this.tab_open_listener = new Object();
        this.tab_open_listener.target = this;
        this.tab_open_listener.handleEvent = function(event) {
            this.target.tab_added(event);
        };

        this.tab_move_listener = new Object();
        this.tab_move_listener.target = this;
        this.tab_move_listener.handleEvent = function(event) {
            this.target.tab_moved(event);
        };

        this.tab_close_listener = new Object();
        this.tab_close_listener.target = this;
        this.tab_close_listener.handleEvent = function(event) {
            this.target.tab_removed(event);
        };

        // Tab event listeners
        this.browser_container.addEventListener("TabSelect", this.tab_select_listener, false);
        this.browser_container.addEventListener("TabOpen", this.tab_open_listener, false);
        this.browser_container.addEventListener("TabMove", this.tab_move_listener, false);
        this.browser_container.addEventListener("TabClose", this.tab_close_listener, false);

        // Only forcefully add a tab to the tab_observer if there are no other tabs open.
        if (gBrowser.browsers.length == 1) {
            this.add_tab(gBrowser.getBrowserAtIndex(0).parentNode.getAttribute('id'));
        }
    }
};

/*
  Function: tab_selected
  Find the selected tab from the tabs array.
  *Special Note:* In some cases the AddTab event will fire after the TabSelect
  event, which means the newly selected tab has not been added to the tabs array 
  yet.

  Parameters:

    event - The event that triggered the tab_select event 
*/
TabObserver.prototype.tab_selected = function(event) {
    var browser = gBrowser.selectedTab.linkedBrowser;

    // Remove isVolatile XUL overlays
    Pmog.hud.removeVolatile();

    // The parentNode of the browser has a unique id we will use to link the open browser to the tabs.
    var panel_id = browser.parentNode.getAttribute('id');
    for (var i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].panel_id == panel_id) {
            this.tabs[i].notify_pmog();
        }
    }
};

/*
  Function: tab_added
  Called whenever a tab is added to the browser.

  Parameters:

    event - The event that triggered the tab_added event.
*/
TabObserver.prototype.tab_added = function(event) {
    this.tab_event(event, 'added');
};

/*
  Function: tab_moved
  Called whenever a tab is moved in the tab browser.

  Parameters:

    event - The event that triggered the tab_moved event.
*/
TabObserver.prototype.tab_moved = function(event) {
    this.tab_event(event, 'moved');
};

/*
  Function: tab_removed
  Called whenever a tab is removed from the browser.

  Parameters:

    event - The event that triggered the tab_removed event.
*/
TabObserver.prototype.tab_removed = function(event) {
    this.tab_event(event, 'removed');
};

/*
  Function: tab_event
  Generic event responder that is called by the various listeners.

  Parameters:

    event - The event that triggered the tab event.
    type - The type of tab event that occurred. 
*/
TabObserver.prototype.tab_event = function(event, type) {

    // Unfortunatly, we must use setInterval here to delay the execution because setting any variable during this event listener will
    // cause other extensions like firebug to vomit on the tab listing.
    var t = event.target.linkedBrowser.parentNode.getAttribute('id');
    gBrowser['pmog_' + t] = {
        target: this,
        panel_id: t
    };
    switch (type) {
    case 'added':
        gBrowser['pmog_' + t].interval = setInterval(function(that) {
            that.target.add_tab(that.panel_id);
            clearInterval(that.interval);
        },
        10, gBrowser['pmog_' + t]);
        break;
    case 'removed':
        gBrowser['pmog_' + t].interval = setInterval(function(that) {
            that.target.remove_tab(that.panel_id);
            clearInterval(that.interval);
        },
        10, gBrowser['pmog_' + t]);
        break;
    case 'moved':
        gBrowser['pmog_' + t].interval = setInterval(function(that) {
            that.target.move_tab(that.panel_id);
            that.target.add_tab(that.panel_id);
            clearInterval(that.interval);
            delete gBrowser['pmog_' + that.panel_id];
        },
        10, gBrowser['pmog_' + t]);
        break;
    }
    delete t;
};

/*
  Function: add_tab
  This method adds a new instance of the <Tab> class to the newly created Tab in 
  the firefox browser.

  Parameters:

    panel_id - The id that corresponds to the panel_id of a tab in the Firefox 
    browser. 
*/
TabObserver.prototype.add_tab = function(panel_id) {
    for (var i = 0; i < gBrowser.browsers.length; i++) {
        try {
            var b = document.getElementById(panel_id).childNodes[0];
            if (this.new_tab(panel_id)) {
                this.tabs.push(new Tab(panel_id, b, this));
                this.reindexTabs();
            }
        } catch(e) {
            clearInterval(this.tab_check);
        }
    }
};

/*
  Function: remove_tab
  This method removes an existing instance of the <Tab> class that was associated
  with the Tab removed from the firefox browser.

  Parameters:

    panel_id - The id that corresponds to the panel_id of a tab in the Firefox 
    browser. 
*/
TabObserver.prototype.remove_tab = function(panel_id) {
    for (var i = 0; i < this.tabs.length; i++) {
        try {
            if (this.tabs[i].panel_id == panel_id) {
                this.tabs.splice(i, 1);
                // Remove this item from the array of known tabs
                this.reindexTabs();
            }
        } catch(e) {}
    }
};

TabObserver.prototype.move_tab = function(panel_id) {
    // Tracking a moved tab is problematic.
    //log("Tab Moved");
    for (var i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].panel_id == panel_id) {
            this.tabs.splice(i, 1);
            // Remove this item from the array of known tabs
            this.reindexTabs();
        }
    }
};

/*
  Function: new_tab
  Determine if the tab that triggered the event was new or not.

  Returns:
  true or false depending on newness of tab
*/
TabObserver.prototype.new_tab = function(panel_id) {
    for (var tab in this.tabs) {
        if (this.tabs[tab].panel_id == panel_id) {
            return false;
        }
    }
    return true;
};

/*
  Function: reindexTabs
  Reindex the internal tab array to correspond with the indexs of their associated
  tabs in the Firefox tabbrowser array.
*/
TabObserver.prototype.reindexTabs = function() {
    for (var i in this.tabs) {
        this.tabs[i].index = i;
    }
};

/*
  Function: selected_tab
  This function will return the corresponding tab object that corresponds to the
  selected tab.

  Returns:

    tab instance
*/
TabObserver.prototype.selected_tab = function() {
    var browser = gBrowser.selectedTab.linkedBrowser;
    var panel_id = browser.parentNode.getAttribute('id');
    var selected_tab = this.find_tab_by_panel_id(panel_id);    
    return selected_tab;
};

/*
  Function: find_tab_by_panel_id
  The function will search for a tab based on a panel_id provided by a parameter.
  Parameters:

    panel_id - The id that corresponds to the panel_id of a tab in the Firefox 
    browser. 

  Returns:
    an instance of the <Tab> class.

*/
TabObserver.prototype.find_tab_by_panel_id = function(panel_id) {
    try {
        for (var tab in this.tabs) {
            if (panel_id == this.tabs[tab].panel_id) {
                return this.tabs[tab];
            }
        }
    }catch(e){}
    return undefined;
};


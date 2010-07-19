/*
  Class: Page
  The Page class is a container, which loads all of the elements that may
  appear on a loaded page. A page's content can include, crates, mines, 
  portals etc.
*/

/*
  Constructor: Page
  Initializes the Object
*/
Page = function() {
    this.empty_objects();
    this.id = null;
    this.panel_id = null;
    this.url = null;
    this.loaded = false;
    this.class_name = "Page";
};

/*
  Function: empty_object
  Empties all of the page objects of their contents.
*/
Page.prototype.empty_objects = function() {
    this.mines = [];
    this.grenades = [];
    this.messages = [];
    this.portals = [];
    this.portal_ratings = [];
    this.st_nicks = [];
    this.crates = [];
    this.giftcards= [];
    this.tags = [];
    this.errors = [];
    this.lightposts = [];
    this.missions = [];
    this.carousel = [];
    this.status_effects = [];
};

/*
  Function: update
  This function will update the instance of the page class with any page objects returned by the server
  
  Parameters:
    
    opts - A hash containing these properties
      opts.page_objects - Hash Contains the page objects returned from the server
      opts.panel_id - String Reference to the tab, which to render the page objects to.
      opts.clobber - Boolean If true then the method will create a new page object instead of appending the page objects to an array of exisiting items.
*/
Page.prototype.update = function(opts) {
    var o;
    var i;
    if (opts.page_objects.id) {
        this.id = opts.page_objects.id;
    }
    if (opts.clobber && opts.clobber === true) {
        // Look for page elements that can be rendered to the screen.
        for (o in Page.OBJECTS) {
            if (opts.page_objects[Page.OBJECTS[o]]) {
                this[Page.OBJECTS[o]] = opts.page_objects[Page.OBJECTS[o]];
            }
        }
    } else {
        for (o in Page.OBJECTS) {
            if (opts.page_objects[Page.OBJECTS[o]]) {
                for(i in opts.page_objects[Page.OBJECTS[o]]) {
                    // check for duplicates first.
                    var new_item = opts.page_objects[Page.OBJECTS[o]][i];
                    //log("LOOKING FOR ID: "+ new_item.id);
                    if(this.has_id(new_item.id)) {
                        this.remove_page_object_by_id(new_item.id);
                    }
                    this[Page.OBJECTS[o]].push(opts.page_objects[Page.OBJECTS[o]][i]);
                }
            }
        }
    }
};

Page.prototype.has_no_errors = function() {
  return this.errors.length === 0;
};

/*
  Function: ids
  This function returns an array of all the ids for the various page objects rendered 
  to this tab.

  Returns: an array of ids strings.
*/
Page.prototype.ids = function() {
    var ids = [];
    var x;
    var y;
    for (var o in Page.OBJECTS) {
        if (this[Page.OBJECTS[o]]) {
            x = this[Page.OBJECTS[o]];
            for (y = 0; y < x.length; y++) {
                if (x[y].hasOwnProperty('id')) {
                    ids.push(x[y].id);
                }

            }
        }
    }
    return ids;
};

/*
  Function: overlay_count
  This function returns the total number of overlays in use. This method is helpful for tracking down missing 
  overlays, or ones that should render but don't.
*/
Page.prototype.overlay_count = function() {
  var total = 0;
  for (var o in Page.OBJECTS) {
      if (this[Page.OBJECTS[o]]) {
          total += this[Page.OBJECTS[o]].length;
      }
  }
  return total;
};

/*
  Function: remove_page_object_by_id
  This function will remove an item from the list of page objects
  
  Parameters:
    
    id - The id of the overlay to find.
    
  Returns TRUE if the removal is successful and false otherwise.
*/
Page.prototype.remove_page_object_by_id = function(id) {
    var complete = false;
    
    for (var o in Page.OBJECTS) {
        if (this[Page.OBJECTS[o]]) {
            var x = this[Page.OBJECTS[o]];
            for (y = 0; y < x.length; y++) {
                if (x[y].hasOwnProperty('id')) {
                    if(id == x[y].id) {
                        var b = x.slice(0,y);
                        var c = x.slice(y+1);
                        //log("=======REMOVE THIS OVERLAY====== PRE:  " + this.overlay_count());
                        //logToString(x[y]);
                        
                        this[Page.OBJECTS[o]] = b.concat(c);
                        //log("================================ POST: " + this.overlay_count());
                        complete = true;
                    }
                }

            }
        }
    }
    return complete;
};
/*
  Function: has_id
  This function accepts an ID and returns true or false if it exists in the array of page objects.
  
  Parameters:
  
    id - The id to find.
*/
Page.prototype.has_id = function(id) {
    var ids = this.ids();
    var x;
    for(x = 0; x < ids.length; x++) {
        if(ids[x] == id) {
            return true;
        }
    }
    return false;
};

/*
  Constant: Page.OBJECTS
*/
Page.OBJECTS = ['messages', 'portals', 'portal_rating', 'st_nicks', 'lightposts', 'missions', 'mines', 'crates', 'tags', 'errors', 'giftcards', 'grenades', 'ballistic_nicks', 'carousel', 'status_effects'];

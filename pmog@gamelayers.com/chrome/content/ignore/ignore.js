/*
  Class: IgnoreList
  A class that manages the tree view widget for the list of sites for Pmog not to track.
*/

/*
  Constructor: IgnoreList
  Initializes the Object
*/

IgnoreList = function(pmog) {
    this.pmog = pmog;
    this.db = pmog.passive_record;
    this.tree = document.getElementById('pmog_whitelist');
    this.refresh_tree();
};

IgnoreList.prototype.refresh_tree = function() {
    this.records = this.db.find_all('whitelists');

    this.treeView = {
        records: this.records,
        rowCount: this.records.length,
        getCellText: this.cell_text,
        setTree: function(treebox) {
            this.treebox = treebox;
        },
        isContainer: function(row) {
            return false;
        },
        isSeparator: function(row) {
            return false;
        },
        isSorted: function() {
            return false;
        },
        getLevel: function(row) {
            return 0;
        },
        getImageSrc: function(row, col) {
            return null;
        },
        getRowProperties: function(row, props) {},
        getCellProperties: function(row, col, props) {},
        getColumnProperties: function(colid, col, props) {}
    };

    this.tree.view = this.treeView;

    this.pmog.white_list = this.records;
};

/*
  Function: add
  Adds a new record to the ignore list

  Parameters:

    url - string of the url to add.
    block_all_pages - true or false depending on the checkbox .

  Returns: It will return true if the site addition was successfully added, and false if not.

*/
IgnoreList.prototype.add = function(url, block_all_pages) {
    if (!block_all_pages === true) {
      block_all_pages = false;
    }
    
    results = this.db.create('whitelists', {
        attributes: {
            'url': url,
            'block_all_pages': block_all_pages
        }
    });
    
    if (!results.valid) {
        alert(results.errors_to_sentence());
    }
    this.refresh_tree();
};

/*
  function: onclick
  This function is bound to the onclick events of the tree widget. It is used to determine how to handle  the UI when various 
  columns are clicked.
*/
IgnoreList.prototype.onclick = function(event) {
    if (event && this.tree && event.type == "click") {
        var row = {},
        col = {},
        obj = {};
        this.tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, obj);

        var cellText = this.tree.view.getCellText(row.value, col.value);

        if (this.check_for_delete(cellText)) {
            var delete_url = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService)
            .confirm(window, "Delete URL from your ignore list?", "Are you sure you want to remove this web address from the list of sites The Nethernet will ignore?");
            if (delete_url) {
              this.remove(this.tree.view.getCellText(row.value, this.tree.columns.getColumnAt(0)));
            }
        }

        if (this.check_for_boolean(cellText)) {
            this.toggle_block_all_pages(cellText, this.tree.view.getCellText(row.value, this.tree.columns.getColumnAt(0)));
        }
    }
};

/*
  Function: on_key_pressed
  Check to see what keys were pressed and respond appropriately.

  Parameters:

    event - The key event that generated the keypress
*/
IgnoreList.prototype.on_key_pressed = function(event) {
    if (event.keyCode == 8) {
        // Delete key
        if (this.tree.currentIndex > -1) {
            this.remove(this.tree.view.getCellText(this.tree.currentIndex, this.tree.columns.getColumnAt(0)));
        }
    }

    if (event.keyCode == 13) {
        // Return Key
        this.add(document.getElementById('TextboxUrl').value, document.getElementById('block_sub_pages').checked);
        document.getElementById('TextboxUrl').value = '';
    }
};

IgnoreList.prototype.check_for_delete = function(str) {
    if (str && str.toLowerCase() == 'delete') {
        return true;
    } else {
        return false;
    }
};

IgnoreList.prototype.check_for_boolean = function(str) {
    if (str && (str.toLowerCase() == 'true' || str.toLowerCase() == 'false')) {
        return true;
    } else {
        return false;
    }
};

/*
  Function: remove
  Removes an existing record from the list

  Parameters: 

    id - The db id of the record to remove.

  Returns: 
  It will return true if the site removal was successfully added, and false if not.

*/
IgnoreList.prototype.remove = function(id) {
    if (this.db.destroy('whitelists', {
        conditions: ["`id` = ? ", id]
    })) {
        this.refresh_tree();
    } else {
        alert('could not delete record');
    }
};

/*
  Function: toggle_block_all_pages
  This method will toggle the boolean block all pages attribute between true or false
  depending on its current state.

  Parameters:

    str - string representing the current boolean value
    id - Id of the record to update.

  Returns: 
  It will return true if the update was successfully added, and false if not.

*/
IgnoreList.prototype.toggle_block_all_pages = function(str, id) {
    if (str.toLowerCase() == 'true') {
        toggle_val = false;
    } else {
        toggle_val = true;
    }

    if (this.db.update('whitelists', {
        attributes: {
            block_all_pages: toggle_val
        },
        conditions: ["`id` = ? ", id]
    })) {
        this.refresh_tree();
    }
};

IgnoreList.prototype.cell_text = function(row, column) {
    try {
        switch (column.id) {
        case 'id':
            return this.records[row]['id'];
            break;
        case 'name':
            return this.records[row]['url'];
            break;
        case 'block_all_pages':
            return this.records[row]['block_all_pages'];
            break;
        case 'action':
            return 'Delete';
            break;
        case 'date':
            return this.records[row]['created_at'];
            break;
        }
    } catch(e) {}
    return undefined;
};
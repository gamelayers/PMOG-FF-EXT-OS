/*
  Class: SQLiteConnector
  An simple implementation of the Mozilla SQLite Storage API.
*/
/*
  Constructor: SQLiteConnector
  Initializes the Object

  Parameters:

    db_name - The name of the database to find or create
*/
function SQLiteConnector(db_name) {
    this.namespace = Pmog;
    this.pragma_cache = {};
    // We keep a cache of non-record related calls here
    if (db_name) {
      this.use(db_name);
    }
    
    this.is_firefox_2 = false;
    if ("@mozilla.org/passwordmanager;1" in Components.classes) {
        this.is_firefox_2 = true;
    }
}

SQLiteConnector.prototype.adapter_name = function() {
    return 'SQLite';
};

/*
  Function: sqlite_version
  This function just returns the sqlite version
*/
SQLiteConnector.prototype.sqlite_version = function() {
    if (!this.pragma_cache['sqlite_version']) {
        try {
            // The select parameters become the key in the array of results returned.
            this.pragma_cache['sqlite_version'] = this.select({
                sql: 'select sqlite_version(*)'
            })[0]['sqlite_version(*)'];
        } catch(e) {
            this.on_sql_error(e, "could not retrieve SQLite version");
        }
    }
    return this.pragma_cache['sqlite_version'];
};

/*
  Function: table_info
  This function returns the pragma info for a table
  Generates a query like this: PRAGMA table_info(`whitelists`)

  Parameters:

    table_name - Name of the table to query on

  Returns:
    An array of hashes containing attributes of the columns for the particular table.

  Example Usage:
  Which returns an array like:
  [{"cid":"0","name":"id","type":"INTEGER","notnull":"99","dflt_value":null,"pk":"1"},
   {"cid":"1","name":"url","type":"VARCHAR","notnull":"0","dflt_value":"NULL","pk":"0"},
   {"cid":"2","name":"created_at","type":"DATETIME","notnull":"0","dflt_value":"NULL","pk":"0"}]
*/
SQLiteConnector.prototype.table_info = function(table_name) {
    this.required_arguments(1, arguments);
    if (!this.pragma_cache[table_name]) {
        try {
            this.pragma_cache[table_name] = this.select({
                sql: "PRAGMA table_info(`" + table_name + "`)"
            });
        } catch(e) {
            this.on_sql_error(e, "could not retrieve SQLite version");
        }
    }
    return this.pragma_cache[table_name];
};

/*
  Function: invalidate_pragma_cache_for
  This function clears the stored pragma cache for the table provided.
  
  Parameters:
  
    table_name - Name of the table to query on
  
  Returns:
    True or False depending if the cache could be invalidated.
*/
SQLiteConnector.prototype.invalidate_pragma_cache_for = function(table_name) {
    this.required_arguments(1, arguments);
    if (this.pragma_cache[table_name]) {
        return delete(this.pragma_cache[table_name]);
    }
    return false;
};
/*
  Function table_columns: Determine if a table has a particular column

  Parameters:

    table_name - String of the table 
    column_name - String of the column name

  Returns:

    true or false depending on if the table has the column in question.
*/
SQLiteConnector.prototype.has_column = function(table_name, column) {
    this.required_arguments(2, arguments);
    var the_column = column.toLowerCase();
    var table = this.table_info(table_name);
    try {
        for (var x in table) {
            if (table[x]["name"].toLowerCase() == the_column) {
                return true;
            }
        }
    } catch(e) {}
    return false;
};

/*
  Function: use
  Use a specific database specified by db_name. 
  If the database does not exist then it is created, though it will be empty.

  Parameters:

    db_name - The database to use.
*/
SQLiteConnector.prototype.use = function(db_name) {
    this.required_arguments(1, arguments);
    this.db = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);

    this.db.append(db_name);

    this.storage_service = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService);
    this.connect(this.db);
    return true;
};

/*
  Function: execute
  Execute anything except a select statement on the database.

  Parameters:

    queries - an array of hashes representing the queries to execute.
    A query hash contains these keys
    :sql - SQL String
    :params - hash of extra parameters

   Returns either true or false.
*/
SQLiteConnector.prototype.execute = function(queries) {
    this.required_arguments(1, arguments);
    
    // Ensure we are dealing with an array
    if (queries.constructor != Array) {
      queries = [queries];
    }
    
    this.new_transaction();
    for (var query = 0; query < queries.length; query++) {
        //log("SQL: " + queries[query].sql);
        this.statement = this.create_statement(queries[query]);
        try {
            this.statement.execute();
        } catch(e) {
            this.on_sql_error(e, "could not execute sql");
            this.rollback();
            return false;
        } finally {
            this.statement.reset();
        }
    }
    this.save_transaction();
    return true;
};

/*
  Function: select
  Create a select statement to perform on the Database.

  Parameters:

    query - A hash representing the query and parameters to execute

  Return: A 2D array of results if transaction succeeds
*/
SQLiteConnector.prototype.select = function(query) {
    this.required_arguments(1, arguments);
    
    var result = undefined;
    this.new_transaction();
    //log("SQL: " + query.sql);
    this.statement = this.create_statement(query);
    try {
        result = this.collect_results(this.statement);
    } catch(e) {
        this.on_sql_error(e, "could not execute sql");
        this.rollback();
        return [];
    } finally {
        this.statement.reset();
    }
    this.save_transaction();
    return result;
};

/*
  Function: create_statement
  This function creates a statement and the associated bind parameters for the query hash provided

  Parameters:

    query - Hash containing the query string and any parameters that are to be bound to the statement.
    A query hash contains these keys
    :sql - SQL String
    :params - hash of extra parameters

  Return: The instance of the Storage API Statement class.
*/
SQLiteConnector.prototype.create_statement = function(query) {
    this.required_arguments(1, arguments);
    try {
        var tmp_statement = this.connection.createStatement(query.sql);

        if (query.params) {
            for (var param in query.params) {
                this.bind_parameter(tmp_statement, param, query.params[param]);
            }
        }

        return tmp_statement;
    } catch(e) {
        this.on_sql_error(e, "could not create statement: ");
    }
    return undefined;
};

/*
  Function: bind_parameter
  Create a bind parameter for a storage statement

  Parameters:

    statement - Instance of the Storage API Statment  object
    key - string key to paramatize
    value - Value to insert through bindings
*/
SQLiteConnector.prototype.bind_parameter = function(statement, key, value) {
    this.required_arguments(3, arguments);
    var binding_key = null;
    try {
        if (this.is_firefox_2) {
            binding_key = statement.getParameterIndexes(":" + key, {})[0] - 1;
        } else {
            binding_key = statement.getParameterIndex(":" + key);
        }
        statement.bindUTF8StringParameter(binding_key, value);
    } catch(e) {
        this.on_sql_error(e, "could not bind parameter");
    }
};

/*
  Function: new_transaction
  Prepare the database by starting a transaction
*/
SQLiteConnector.prototype.new_transaction = function() {
    
    //Commit, if some leftover transaction is in progress
    if (this.connection.transactionInProgress) {
      this.connection.commitTransaction();
    }
    
    // Begin a transaction, if no transaction in progress
    if (!this.connection.transactionInProgress) {
      this.connection.beginTransactionAs(this.connection.TRANSACTION_DEFERRED);
    }
};

/*
  Function: save_transaction
  Commit the transaction for processing
*/
SQLiteConnector.prototype.save_transaction = function() {

    // Execute the transaction
    if (this.connection.transactionInProgress) {
      this.connection.commitTransaction();
    }
};

/*
  Function: collect_results
  This function iterates over the returned results from the sql statement call and 
  pushes the result into an array.

  Parameters:

    statement - statement containing results to process.

  Returns: Array of results
*/
SQLiteConnector.prototype.collect_results = function(statement) {
    this.required_arguments(1, arguments);
    var dataset = [];
    while (statement.executeStep()) {
        var row = {};
        for (var i = 0, k = statement.columnCount; i < k; i++) {
            row[statement.getColumnName(i)] = statement.getUTF8String(i);
        }
        dataset.push(row);
    }
    return dataset;
};

/*
  Function: find_records
  Searches a table of the database for any records that meet the query parameters

  Parameters:

    table - Table to run the select query on
    params - A hash of arguments that shape the sql call. Options are:
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

  Returns: An array of hashes constituing the records retrieved from the database.

*/
SQLiteConnector.prototype.find_records = function(table, params) {
    this.required_arguments(2, arguments);
    try {
        //var params = undefined
        var tmp_sql = "SELECT * FROM " + this.back_quote(table);
        fragment = this.query_fragment(params);
        tmp_sql += fragment.sql;
        return this.select({
            sql: tmp_sql,
            params: fragment.params
        });
    } catch(e) {
        this.on_sql_error(e, "could not find record");
    }
    return undefined;
};

/*
  Function: find_record
  Searches a table of the database for a particular record that matches the query parameters.

  Parameters:

    table - Table to run the select query on
    options - A hash of arguments that shape the sql call. Options are:
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

  Returns: An array of hashes constituing the records retrieved from the database.

*/
SQLiteConnector.prototype.find_record = function(table, options) {
    this.required_arguments(2, arguments);
    options['limit'] = 1;
    return this.find_records(table, options);
};

/*
  Function: create_record
  Creates a new record for a particular table

  Parameters

    table - The table to create the record on
    params - Hash of key , value pairs to insert into the table.
*/
SQLiteConnector.prototype.create_record = function(table, params) {
    this.required_arguments(2, arguments);
    try {
        // the params object is updated because it is passed by reference and not by value.
        var tmp_sql = this.insert_fragment(table, params);
        this.execute({
            sql: tmp_sql,
            params: params.attributes
        });
    } catch(e) {
        this.on_sql_error(e, "could not create record");
    }
};

/*
  Function: update_records
  Updates an existing record

  Parameters

    table - The table to create the record on
    params - A hash of arguments that shape the sql call. Options are:
      :attributes - Attributes to apply to the record
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

*/
SQLiteConnector.prototype.update_records = function(table, params) {
    this.required_arguments(2, arguments);
    try {
        var tmp_sql = this.update_fragment(table, params);
        fragment = this.query_fragment(params);

        // Because we have two type of binding params we need to merge the two of them
        // into one attributes hash so that we ensure we create the correct number of bindings.
        for (var x in fragment.params) {
            params.attributes[x] = fragment.params[x];
        }

        tmp_sql += fragment.sql;
        this.execute({
            sql: tmp_sql,
            params: params.attributes
        });
        return true;
    } catch(e) {
        this.on_sql_error(e, "could not update record");
        return false;
    }
};

/*
  Function: delete_records
  Delete an exiting record from the databse

  Parameters
    table - The table to create the record on
    params - A hash of arguments that shape the sql call. Options are:
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

*/
SQLiteConnector.prototype.delete_records = function(table, params) {
    this.required_arguments(2, arguments);
    var results = [];
    try {
        var tmp_sql = "DELETE FROM " + this.back_quote(table);
        var fragment = this.query_fragment(params);
        tmp_sql += fragment.sql;
        results = this.execute({
            sql: tmp_sql,
            params: fragment.params
        });
    } catch(e) {
        this.on_sql_error(e, "could not delete record");
    }
    return results;
};

/*
  Function: query_fragment
  Uses the options hash to create a query fragment used to create a complete sql statement.

  Parameters:

    params - A hash of arguments that shape the sql call. Options are:
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

  Returns: SQL fragment and params hash as a hash
*/
SQLiteConnector.prototype.query_fragment = function(params) {
    this.required_arguments(1, arguments);
    var tmp_sql = '';
    var formatted_params = undefined;
    if (params && params.conditions) {
        tmp_sql += " WHERE (" + this.conditions_to_binding_parameters(params.conditions) + ") ";
        if (this.is_array(params.conditions)) {

            // Remove the first conditions string from the params array.
            if (this.is_array(params.conditions)) {
                params.conditions.splice(0, 1);
                formatted_params = this.conditions_to_params(params.conditions);
            }
        }
    }
    
    if (params && params.limit) {
      tmp_sql += "LIMIT " + parseInt(params.limit, 10);
    }
    
    return {
        sql: tmp_sql,
        params: formatted_params
    };
};

/*
  Function: insert_fragment
  Creates an insert fragment used to create a database record

  Parameters:

    params - A hash of arguments that shape the sql call. Options are:
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

  Returns: SQL fragment
*/
SQLiteConnector.prototype.insert_fragment = function(table, params) {
    this.required_arguments(2, arguments);
    var tmp_sql = "INSERT INTO " + this.back_quote(table);

    // This function also updates params object, because it is passed by reference and not by value.
    params.attributes = this.timestamp(table, params.attributes);
    var tmp_key_bindings = this.keys_to_binding_parameters(params.attributes).join(', ');
    var tmp_sql_keys = this.keys_to_sql(params.attributes).join(', ');
    tmp_sql += "(" + tmp_sql_keys + ") VALUES (" + tmp_key_bindings + ")";
    return tmp_sql;
};

/*
  Function: update_fragment
  Creates an update fragment used to update a database record

  Parameters:

    params - A hash of arguments that shape the sql call. Options are:
      :conditions - Array, where the first index is a sql fragment with or without questionmarks where 
      :limit - Integer of the total number of records to return

  Returns: SQL fragment
*/
SQLiteConnector.prototype.update_fragment = function(table, params) {
    this.required_arguments(2, arguments);
    var tmp_sql = "UPDATE " + this.back_quote(table) + ' SET ';

    // This function also updates params object, because it is passed by reference and not by value.
    params.attributes = this.timestamp(table, params.attributes);
    var tmp_key_bindings = this.keys_to_binding_parameters(params.attributes);
    var tmp_sql_keys = this.keys_to_sql(params.attributes);
    var arr = [];
    for (var x = 0; x < tmp_key_bindings.length; x++) {
        arr.push(tmp_sql_keys[x] + " = " + tmp_key_bindings[x]);
    }
    tmp_sql += arr.join(', ');
    return tmp_sql;
};

/*
  Function: timestamp
  Automatically timestamp create and update operations if the table has fields
  named created_at/created_on or updated_at/updated_on.

  Parameters:

    table - The table to create the record on
    attributes - Hash of key , value pairs to insert into the table.  

  Returns: Attributes hash with dates applied if available.
*/
SQLiteConnector.prototype.timestamp = function(table, attributes) {
    this.required_arguments(2, arguments);
    var t = new Date();

    // If the record returns an id it assumed that it is not new.
    // This can be improved but for now we force the id to be the primary key anyway.
    if (this.has_column(table, 'created_at') && !attributes['id']) {
        attributes['created_at'] = t;
    }

    if (this.has_column(table, 'created_on') && !attributes['id']) {
        attributes['created_on'] = t;
    }

    if (this.has_column(table, 'updated_at')) {
        attributes['updated_at'] = t;
    }

    if (this.has_column(table, 'updated_on')) {
        attributes['updated_on'] = t;
    }
    return attributes;
};

/*
  Function: create_table
  Creates an SQLite table using the schema defined by the hash provided as a parameter

  Parameters:

    schema - Hash of keys and key types for the table to be created
    options - Additional options for the table creation process. The supported options are:
              force : boolen - It will drop the existing table (if found) before creating it.

  Example Usage:
    * posts = { title : 'string', published_on: 'datetime', allow_comments : 'boolean' }
    * options = { force : true }
    * create_table(posts, options)
*/
SQLiteConnector.prototype.create_table = function(schema, options) {
    this.required_arguments(2, arguments);
    try {
        this.sql_statement = 'CREATE TABLE ' + schema.table_name + '(';
        this.sql_statement += "\"id\" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, ";

        for (var x in schema.columns) {
            this.sql_statement += this.create_column(schema.columns[x]) + ', ';
        }

        // Trim off the last comma and enclose statement;
        this.sql_statement = this.trim_last_comma(this.sql_statement) + ')';
        if (options.force === true && this.connection.tableExists(schema.table_name)) {
            this.execute({
                sql: "drop table " + schema.table_name
            });
            this.invalidate_pragma_cache_for(schema.table_name);
        }

        if (!this.connection.tableExists(schema.table_name)) {
            return this.execute({
                sql: this.sql_statement
            });
        }
    } catch(e) {
        this.on_sql_error(e, "could not create table");
    }
    return undefined;
};

/*
  Function: create_column
  Takes a column hash and returns the sql needed to create the column

  Parameters:

    column - hash with attributes corresponding to the sql column to be created.

  Returns: string
*/
SQLiteConnector.prototype.create_column = function(column) {
    this.required_arguments(1, arguments);
    try {
        this.tmp_column_str = "\"" + column.name + "\" " + this.map_column_type(column) + " DEFAULT ";
        if (typeof(column.defaulted) == 'undefined') {
            this.tmp_column_str += 'NULL';
        } else {
            this.tmp_column_str += column.defaulted;
        }

        return this.tmp_column_str;

    } catch(e) {
        this.on_sql_error(e, "could not create column");
    }
  return undefined;
};

/*
  Function: map_column_type
  Uses the column hash to choose the best sqlite column type.

  Parameters:

    column - Hash containing the column type

  Returns: the correct column type or nothing
*/
SQLiteConnector.prototype.map_column_type = function(column) {
    this.required_arguments(1, arguments);
    /*
   We actually want something like this.
   :string      => { :name => "varchar", :limit => 255 },
   :text        => { :name => "text" },
   :integer     => { :name => "integer" },
   :float       => { :name => "float" },
   :decimal     => { :name => "decimal" },
   :datetime    => { :name => "datetime" },
   :timestamp   => { :name => "datetime" },
   :time        => { :name => "datetime" },
   :date        => { :name => "date" },
   :binary      => { :name => "blob" },
   :boolean     => { :name => "boolean" }

   */
    try {
        switch (column.type.toLowerCase()) {
        case 'string':
            return 'VARCHAR';
            break;
        case 'text':
        case 'integer':
        case 'float':
        case 'decimal':
        case 'boolean':
            return column.type.toUpperCase();
            break;
        case 'datetime':
        case 'time':
        case 'date':
            return 'DATETIME';
            break;
        case 'binary':
            return 'BLOB';
            break;
        }
    } catch(e) {
        this.on_sql_error(e, "could not map the column type");
    }
  return undefined;
};

/*
  Function: connect
  Open a database connection

  Parameters:

    db - An instance of the Mozilla directory service, which is the database to connect to.

  Returns: Boolean
*/
SQLiteConnector.prototype.connect = function(db) {
    this.required_arguments(1, arguments);
    this.disconnect();
    try {
        this.connection = this.storage_service.openDatabase(db);
    } catch(e) {
        this.on_sql_error(e, "Error in opening file " + db.leafName + " - perhaps, this is not an sqlite db file");
        return false;
    }

    return (this.connection === null) ? false : true;
};

/*
  Function: disconnect
  Frees up the resources currently used for the database connection
  
  Returns: Boolean
*/
SQLiteConnector.prototype.disconnect = function() {
    if (this.connection !== null) {
      this.connection = null;
      return true;
    }
    return false;
};

/*
  Function: rollback
  Rollback any transaction currently in progress
*/
SQLiteConnector.prototype.rollback = function() {
    if (this.connection.transactionInProgress) {
        return this.connection.rollbackTransaction();
    }
    return false;
};

/*
  Function: on_sql_error
  Report an error

  Parameters:

    e - the exception object for the error that occurred
    statement - annotation for this exception provided by the programmer
    sql_message - sql specific error message (optional)

  Returns: Boolean
*/
SQLiteConnector.prototype.on_sql_error = function(e, statement, sql_message) {
    this.required_arguments(2, arguments);
    if (sql_message !== null && sql_message !== undefined) { statement += " [ " + sql_message + " ]"; }
    log(e, statement); 
    return true;
};

/*
  Function: keys_to_sql
  Format keys of a hash into a sql string

  Parameters:

    attributes - hash containing attributes to format into SQL string

  Return: Array of formatted SQL keys
*/
SQLiteConnector.prototype.keys_to_sql = function(attributes) {
    this.required_arguments(1, arguments);
    var tmp_sql = [];
    for (x in attributes) {
        if (x.toLowerCase() != 'id') {
          tmp_sql.push(this.back_quote(x));
        }
    }
    return tmp_sql;
};

/*
  Function: conditions_to_params
  A condition array typically looks like: ['foo = ? AND baz = ?','bar','baz']. 
  The binding params (bar and baz) need to be mapped to the binding variables which replace the question marks.
  This method returns a hash with the keys mapped to the binding params for example:
  this.conditions_to_params(['foo = ? AND baz = ?','bar','baz'].splice(0, 1));
  { binding_0 : 'bar', binding_1 : 'baz' }

  Parameters:
    conditions - An array of variables that are to be bound to the conditions statement during the select statement

  Returns: A hash
*/
SQLiteConnector.prototype.conditions_to_params = function(conditions) {
    this.required_arguments(1, arguments);
    if (this.is_array(conditions)) {
        try {
            var tmp_params = {};
            for (var i = 0; i < conditions.length; i++) {
                tmp_params["binding_" + i] = conditions[i];
            }
            return tmp_params;
        } catch(e) {
            this.on_sql_error(e, "Could not turn condition into params.");
        }
    }
    return {};
};

/*
  Function: conditions_to_binding_parameters
  This function takes the conditions array and turns all instances of question marks in the first 
  index into binding parameters supplied by the remaining indexes.

  Parameters:

    conditions - Array, where the first index is a sql fragment with or without questionmarks where 
    binding parameters should go.

  Returns: A String with the questionmarks replaced with binding variables.

  Example:
    * this.conditions_to_binding_parameters(["foo = ? AND baz = ?", 'bar', 1]) becomes "foo = :binding_0 AND baz = :binding_1"
    * this.conditions_to_binding_parameters(["foo = 'bar'"]) becomes "foo = 'bar'"
    * this.conditions_to_binding_parameters("foo = 'bar'") becomes "foo = 'bar'"
*/
SQLiteConnector.prototype.conditions_to_binding_parameters = function(conditions) {
    this.required_arguments(1, arguments);

    // Ignore anything that is not an array
    if (!this.is_array(conditions)) {
        return conditions;
    }

    try {
        var tmp_array = conditions[0].split("?");
        for (var i = 0; i < tmp_array.length - 1; i++) {
            tmp_array[i] = tmp_array[i] + ":binding_" + i;
        }

        return tmp_array.join(' ');
    } catch(e) {
        this.on_sql_error(e, "Could not bind to this conditions array ");
    }
    return undefined;
};

/*
  Function: keys_to_binding_parameters
  Format keys into binding parameters used by the Storage API to insert values into the SQL
  We use binding_parameters instead of just adding values manually to prevent SQL injection.

  Parameters:

    attributes - hash containing keys to format into binding parameters

  Returns: An array for formated keys
*/
SQLiteConnector.prototype.keys_to_binding_parameters = function(attributes) {
    this.required_arguments(1, arguments);
    var tmp_sql = [];
    for (x in attributes) {
        if (x.toLowerCase() != 'id') {
            tmp_sql.push(":" + x.toLowerCase());
        }
    }
    return tmp_sql;
};

/*
  Function: back_quote
  Helper method to convert add back quotes to a string

  Parameters:

    str - String to return inside back quotes
*/
SQLiteConnector.prototype.back_quote = function(str) {
    this.required_arguments(1, arguments);
    return "`" + str + "`";
};

/*
  Function: double_quote
  Helper method to convert a string into a string enclosed in double quotes

  Parameters:

    str - String to return inside double quotes
*/
SQLiteConnector.prototype.double_quote = function(str) {
    this.required_arguments(1, arguments);
    var newStr = "";
    for (var i = 0; i < str.length; i++) {
        if (str[i] == '"') {
            newStr += '""';
        } else {
            newStr += str[i];
        }
    }
    return '"' + newStr + '"';
};

/*
  Function: trim_last_comma
  Helper method to remove the last comma and space of a string.

  Parameters:

    str - string to remove the last comment from

  Example:
    "foo, bar, baz, " becomes "foo, bar, baz"
*/
SQLiteConnector.prototype.trim_last_comma = function(str) {
    this.required_arguments(1, arguments);
    str = this.strip(str);
    return str.slice(0, str.lastIndexOf(','));
};

/*
  Function: strip
  Function for removing extra white space off the beginning and end of a string
  From: http://blog.stevenlevithan.com/archives/faster-trim-javascript

  Parameters:

    str - String to format
*/
SQLiteConnector.prototype.strip = function(str) {
    this.required_arguments(1, arguments);
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

/*
  Function: is_array
  Simple function that determines if an object is an array or not

  Parameters:

    arr - Object to analyze 
*/
SQLiteConnector.prototype.is_array = function(arr) {
    this.required_arguments(1, arguments);
    return (arr.constructor.toString().indexOf("Array") == -1) ? false : true;
};

SQLiteConnector.prototype.required_arguments = function(num, arguments) {
    if(num > arguments.length) {
        throw(new Error("ArgumentError: wrong number of arguments (" + arguments.length + " for " + num + ")"));
    }
};
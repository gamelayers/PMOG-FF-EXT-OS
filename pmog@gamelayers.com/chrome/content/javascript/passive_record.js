/*
  Class: PassiveRecord
  An simple implementation of the Mozilla SQLite Storage API wrapped in an ActiveRecord 'like'
  API. The functions are specially tuned for the needs of PMOG, hence the Passive in PassiveRecord.
*/
/*
  Constructor: PassiveRecord
  Initializes the Object

  Parameters:

    db_name - The name of the database to find or create
*/
function PassiveRecord(db_name) {
    this.db = new SQLiteConnector(db_name);
    this.bootstrap();
}

/*
  Function: find
  Basic Find statement using attributes provided

  Parameters:

    table - string of the table to search
    params - hash or attributes to use as conditions within the search

  Returns: An Array of hashes corresponding to the records in the database that matched
  the search query.

  Example Usage:
  records = this.find('players', { conditions : ['`login` = ? AND `id` = ? AND `armored` = ?', 'heavysixer', 1, true], limit : 1})
  records # => [{ login : 'heavysixer', email : 'foo@bar.com' ... id : 1}]

*/
PassiveRecord.prototype.find = function(table, params) {
    return this.db.find_records(table, params);
};

PassiveRecord.prototype.find_all = function(table, params) {
    return this.find(table, params);
};

/*
  Function: create
  Insert a new record into the database.

  Parameters:

    table - string of the table to update
    params - hash of attributes to insert in the table

  Example Usage:
    var player = { attributes : {"armor":391,"datapoints":2275,"secondary_association":"Bedouin","st_nicks":119,"login":"heavysixer","tertiary_association":"Pathmaker","level":14,"mines":0,"next_level":15,"user_id":"91dc43e4-946f-11dc-a79b-00163e4ab66d","level_percentage":98,"avatar_mini":"/system/image_assets/0000/0000/0000/8932/mark_elliott_IR_mini.jpg","armored":true,"lightposts":98,"crates":346,"skin":"classic","primary_association":"Seer"} }
    this.create('players', player)
*/
PassiveRecord.prototype.create = function(table, params) {
    var obj = this.validate(table, params);
    if (obj.valid) {
        this.db.create_record(table, params);
    }

    // Extend obj with a simple error reporting function.
    obj.errors_to_sentence = function() {
        str = "";
        for (var x in this.attributes) {
            str = this.attributes[x].errors.join('. ');
        }
        return str;
    };
    return obj;
};

/*
  Function: update
  Update records matching the attributes condition param
*/
PassiveRecord.prototype.update = function(table, params) {
    return this.db.update_records(table, params);
};

/*
  Function: destroy
  Delete a record in the database

  Parameters:

    table - string of the table to update
    params - hash of attributes to use to find the record.

  Example Usage:
    this.result = this.db.destroy('whitelists', { conditions: ["`id` = ? ", id] })
*/
PassiveRecord.prototype.destroy = function(table, params) {
    return this.db.delete_records(table, params);
};

/*
  Function: validate
  Validates the record using validates defined in the schema for the table in question

  Parameters:

    table - string of the table to consult for validations
    params - hash of attributes to validate
*/
PassiveRecord.prototype.validate = function(table, params) {
    var obj = {
        attributes: {}
    };
    obj.valid = true;
    try {
        if (PassiveRecord.Schema[table]) {
            if (PassiveRecord.Schema[table].validations) {
                for (var v in PassiveRecord.Schema[table].validations) {
                    var validation = PassiveRecord.Schema[table].validations[v];
                    switch (validation.type) {
                    case 'uniqueness':
                        obj.attributes[validation.name] = this.validate_uniqueness_of(table, validation, params);
                        if (obj.attributes[validation.name].errors.length > 0) {
                          obj.valid = false;
                        }
                        break;
                    }
                }
            }
        }
        return obj;
    } catch(e) {
        // Pmog.logger.error(e, "Error trying to validate params");
    }
    return undefined;
};

/*
  Function: validate_uniqueness_of
  Ensure that only one record appears in a specific table using a specific column

  Parameters:

    table - string of the table to consult for validations
    validation - hash of params that define how the validation is to be run.
    params - hash of attributes to validate

  Returns:
  A hash containing errors for the validation if there are any.
*/
PassiveRecord.prototype.validate_uniqueness_of = function(table, validation, params) {
    var obj = {
        errors: []
    };
    if (params.attributes[validation.name]) {
        var query = {
            conditions: ['`' + validation.name + '` = ?', params.attributes[validation.name]],
            limit: 1
        };
        exists = this.find(table, query);
        // Pmog.logger.debug(Pmog.to_string(exists));
        if (exists.length > 0) {
            if (validation.message) {
                obj.errors.push(validation.message);
            } else {
                obj.errors.push(validation.name + " is already taken.");
            }
        }
    }
    return obj;
};

/*
  Function: bootstrap
  Load the schema file into the db

  Parameters:

    param - boolean if true then existing tables are dropped and recreated.

  Example Usage:
    this.bootstrap(true); // This will destroy the existing tables and recreate them
    this.bootstrap(); // will only create the table if it doesn't already exist.
*/
PassiveRecord.prototype.bootstrap = function(param) {
    var _force;
    if (param === true) {
        _force = true;
    } else {
        _force = false;
    }

    // Check for the correct version of the schema, and update recursively if out of date
    // example: http://code.google.com/apis/gears/gears_faq.html#versionDBSchema    
    if(!_force) {

    }
    
    for (var table in PassiveRecord.Schema) {
        this.db.create_table(PassiveRecord.Schema[table], {
            force: _force
        });
    }
};

/*
  Constant: Schema
  This constant is meant to emulate the schema file found in most rails application.
  The typical location of this file is db/config/schema
  
  Also like ActiveRecord the id field is automatically added to each table as the 
  unique auto-incrementing index.
*/
PassiveRecord.Schema = {
  players : { table_name : 'players', columns :[
    { name: 'armor',                 type : 'integer' },
    { name: 'armored',               type : 'boolean' },
    { name: 'dodge',                 type : 'boolean' },
    { name: 'disarm',                type : 'boolean' },
    { name: 'auth_token',            type : 'string'  },
    { name: 'authenticity_token',    type : 'string'  },
    { name: 'avatar_mini',           type : 'string'  },
    { name: 'classpoints',           type : 'integer' },
    { name: 'crates',                type : 'integer' },
    { name: 'datapoints',            type : 'integer', defaulted : 0 },
    { name: 'level',                 type : 'integer' },
    { name: 'level_percentage',      type : 'integer' },
    { name: 'levelup_requirements',  type : 'string'  },
    { name: 'lightposts',            type : 'integer' },
    { name: 'login',                 type : 'string'  },
    { name: 'mines',                 type : 'integer' },
    { name: 'grenades',              type : 'integer' },
    { name: 'next_level',            type : 'integer' },
    { name: 'portals',               type : 'integer' },
    { name: 'primary_association',   type : 'string'  },
    { name: 'secondary_association', type : 'string'  },
    { name: 'sound_preference',      type : 'boolean' },
    { name: 'skin',                  type : 'string'  },
    { name: 'skeleton_keys',         type : 'integer' },
    { name: 'st_nicks',              type : 'integer' },
    { name: 'tertiary_association',  type : 'string'  },
    { name: 'user_id',               type : 'string'  },
    { name: 'created_at',            type : 'datetime'},
    { name: 'updated_at',            type : 'datetime'}]
  },
  whitelists : { 
    table_name : 'whitelists', 
    columns:[
    { name: 'url', type : 'string' },
    { name: 'created_at', type : 'datetime' },
    { name: 'updated_at', type : 'datetime'},
    { name: 'block_all_pages', type : 'boolean', defaulted : false }
    ],
    validations: [{ name : "url", type: "uniqueness", message : 'That site is already blocked.' }]
  }
};
/*
 Possible ActiveRecord Methods we might want to include (cribbed from Rails).
*  ==
* ===
* []
* []=
* abstract_class?
* attr_accessible
* attr_protected
* attr_readonly
* attribute_for_inspect
* attribute_names
* attribute_present?
* attributes
* attributes=
* attributes_before_type_cast
* base_class
* becomes
* benchmark
* class_of_active_record_descendant
* clear_active_connections!
* clear_reloadable_connections!
* clone
* column_for_attribute
* column_names
* columns
* columns_hash
* compute_type
* connected?
* connection
* connection
* content_columns
* count_by_sql
* create
* decrement
* decrement!
* decrement_counter
* delete
* delete_all
* descends_from_active_record?
* destroy
* destroy
* destroy_all
* eql?
* establish_connection
* exists?
* find
* find_by_sql
* freeze
* frozen?
* has_attribute?
* hash
* id
* id=
* increment
* increment!
* increment_counter
* inheritance_column
* inspect
* inspect
* new
* new_record?
* primary_key
* readonly!
* readonly?
* readonly_attributes
* reload
* remove_connection
* require_mysql
* reset_column_information
* sanitize_sql_array
* sanitize_sql_for_assignment
* sanitize_sql_for_conditions
* sanitize_sql_hash_for_assignment
* sanitize_sql_hash_for_conditions
* save
* save!
* serialize
* serialized_attributes
* set_inheritance_column
* set_primary_key
* set_sequence_name
* set_table_name
* silence
* table_exists?
* table_name
* to_param
* toggle
* toggle!
* update
* update_all
* update_attribute
* update_attributes
* update_attributes!
* update_counters
* with_exclusive_scope
* with_scope
*/

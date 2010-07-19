/*
  Class: ObjectParser
  This class converts an object into a variety of differnt formats.
*/

/*
  Constructor: ObjectParser
  Initializes the Object
*/
ObjectParser = function(obj) {
    this.obj = null;
    if (obj) {
        this.obj = this.to_object(obj);
    }
};

/*
  Function: to_object
  Convert the string that is formatted like an object into an actual object.

  Parameters:

    obj - String that is formatted like an object.
*/
ObjectParser.prototype.to_object = function(obj) {
    if (typeof(obj) != 'object') {
        return new Function("return " + obj)();
    } else {
        return obj;
    }
};

/*
  Function: to_param
  This function will format a string serveral differnt ways depending on 
  the parameters provided.
  If no v parameter is provided it returns
  > bar&
  If there is a containing property then it returns
  > foo[bar]=baz&
  Otherwise it returns
  > bar=baz&

  Parameters:

   p - string representing the property to use in the query string
   v - string representing the value of the property.
   containing_property - used if the p and v variables are part of an array.

  Returns:
   partial query string
*/
ObjectParser.prototype.to_param = function(p, v, containing_property) {
    if (!v) {
        // returns bar&
        return escape(p) + "&";
    } else {
        if (containing_property) {
            // returns foo[bar]=baz&
            return containing_property + '[' + p + ']' + "=" + escape(v) + "&";
        } else {
            // returns bar=baz&
            return p + "=" + escape(v) + "&";
        }
    }
};

/*
 Function: to_query_string
 This function takes an object and explodes it into a query string as a 
 web post would expect.
*/
ObjectParser.prototype.to_query_string = function() {
    var qs = this.parse_object(this.obj);
    return qs.substring(0, qs.length - 1);
    // remove the last ampersand.
};

/*
  Function: parse_object
  Create a recursive iteration over the objects and add them to a query 
  string.

  Parameters:

    obj - is the object to parse
    containg_property - is a string used to add pretty formatting to query
    strings for sub-objects.
*/
ObjectParser.prototype.parse_object = function(obj, containing_property) {
    var qs = '';
    if (obj) {
        for (var p in obj) {
            if (typeof obj[p] != "function") {
                var v = obj[p];
                if (typeof(v) == "object") {
                    qs += this.parse_object(v, p);
                } else {
                    if (v != undefined) {
                        qs += this.to_param(p, v, containing_property);
                    }
                }
            }
        }
    }
    return qs;
};
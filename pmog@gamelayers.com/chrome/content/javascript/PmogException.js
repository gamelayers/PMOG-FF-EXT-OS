function PmogException(message) {
  this.message = message;
  this.name = "PmogException";
} 

// Make the exception convert to a pretty string when used as
// a string (e.g. by the error console)
PmogException.prototype.toString = function () {
  return this.name + ': "' + this.message + '"';
};
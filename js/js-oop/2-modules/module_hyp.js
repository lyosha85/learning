// Module pattern
// Hypothetical Example

var jill = (function(){

  // private variables that cant be accessed outside this function
  var first_name = "jill";
  var last_name = "tylor";
  age = 28;
  interests = [];

  function get_public_age() {
    return age - 5;
  }

  // only to be accessed after the function has been returned
  return {
    full_name: function(){
      return first_name + ' ' + last_name
    },
    age: get_public_age
  };
});

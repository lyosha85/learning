// Module pattern
// Hypothetical Example

var jill = (function(){

  // private variables that cant be accessed outside this function
  var first_name = "jill",
      last_name = "tylor",
      age = 28,
      interests = [];

  function get_public_age() {
    return age - 5;
  }

  // only to be accessed after the function has been returned
  return {
    full_name: function(){
      return first_name + ' ' + last_name
    },
    age: get_public_age,
    greet: function() {
      return "hello, my name is " + this.full_name() + "I am " + get_public_age()
    },
    interests: function() {
      return interests;
    },
    add_interests: function() {
      for(var i = 0; i < arguments.length; i++){
        interests.push(arguments[i]);
      }
    }
  };
}());

console.log(jill.full_name());
console.log(jill.age());
console.log(jill.interests());
jill.add_interests("web design", "skating");
console.log(jill.interests());

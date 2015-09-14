// prototype pattern

function Person (first, last, age){
  if (this == window) {
    return new Person(first, last, age)
  } // best not to depend on this, and use the new keyword
  this.first_name = first;
  this.last_name  = last;
  this._age       = age;
  // this refers to the new object
  // just like this = {}

  // return {} ; // has to be an object
}

var jill = Person("Jill", "Tylor", 28); // looks similar to java


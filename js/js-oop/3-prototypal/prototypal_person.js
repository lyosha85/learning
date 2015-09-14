// prototype pattern

function Person (first, last, age){
  if (this === window) {
    return new Human(first, last, power)
  }

  this.first_name = first;
  this.last_name  = last;
  this._age       = age;
  this.interests  = [];
}

Person.prototype.age = function(age){
  if (age){
    this._age = age;
    return this
  }
  return this._age - 5
}

Person.prototype.add_interest = function () {
  for(var i = 0; i < arguments.length; i++) {
    this.interests.push(arguments[i]);
  }
  return this;
}

var jill = new Person("Jill", "Tylor", 28); // looks similar to java

console.log(jill.age());

// inheritance

function SuperHuman (first, last, power) {
  if (this === window) {
    return new SuperHuman(first, last, power)
  }
  this.first_name = first;
  this.last_name = last;
  this.power = power;
  // too many idential properties
}

SuperHuman.prototype = new Person();
SuperHuman.prototype.constructor = SuperHuman;
SuperHuman.prototype.wield_power = function () {
    return this.power.toUpperCase() + " to the rescue!!!";
}

var jo = new SuperHuman("Joe", "Plumber", "Draino");
console.log('hai');
console.log(jo.power);
jo.add_interest("plumbing");
console.log(jo.interests);
console.log(jo.wield_power());

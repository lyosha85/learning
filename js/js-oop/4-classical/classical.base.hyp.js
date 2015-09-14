// Classical Inheritance (with Base)
// Hypothetical Example


var Person = Base.extend({
    constructor: function (first, last, age) {
        this.first_name = first;
        this.last_name = last;
        this._age = age;
        this.interests = [];
    },
    age : function (age) {
        if (age) {
            this._age = age;
            return this;
        }
        return this._age - 5;
    },
    add_interests : function () {
        for (var i = 0; i < arguments.length; i++) {
            this.interests.push(arguments[i]);
        }
        return this;
    }
});

var bill = new Person("Bill", "Parker", 59);


console.log(bill);

var SuperHuman = Person.extend({
    constructor: function (first, last, power) {
        this.base(first, last);
        this.power = power;
        this.add_interests(power);
     },
    wield_power : function () {

        return this.power.toUpperCase()  + " to the rescue!";
                  }
});



var bob = new SuperHuman("Bob", "Smith", 'typing');

console.log(bob);

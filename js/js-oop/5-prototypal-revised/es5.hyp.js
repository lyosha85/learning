// ECMAScript 5 Pattern
// Hypothetical Example

if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    }
}

var person = {
    first_name : "john",
    last_name  : "doe",
    _age       : 20,
    //interests  : [],
    age        : function (age) {
        if (age) {
            this._age = age;
            return age - 5;
        }
        return this._age - 5;
    },
    add_interests : function () {
        this.interests = (this.interests) ? this.interests : [];
        for (var i = 0; i < arguments.length; i++ ){
            this.interests.push(arguments[i]);
        }
    }
};

var jill = Object.create(person);

jill.first_name = "Jill";
jill.last_name = "Taylor";
jill.age(28);
jill.add_interests("Hiking");

console.log(jill.first_name + " " + jill.last_name);
console.log(jill.age());
console.log(jill.interests);

var superHuman = Object.create(person);
superHuman.wield_power = function () {
    return this.power.toUpperCase() + " to the resuce!!!1!!!1";
}

var jane = Object.create(superHuman);

jane.first_name = "Jane";
jane.power = "Hugs";
jane.add_interests("Hugs");


console.log(jane.interests);
console.log(jane.wield_power());

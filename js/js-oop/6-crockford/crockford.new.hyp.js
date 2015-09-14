
var person = new_constructor(Object, function (first, last, age) {
    this.first_name = first;
    this.last_name = last;
    this._age = age;
    this.interests = [];
},
{
    age : function (age) {
        if (age) {
            this._age = age;
            return age - 5;
        }
        return this._age - 5;
    },
    add_interests : function () {
        for (var i = 0; i < arguments.length; i++) {
            this.interests.push(arguments[i]);
        }
    }
});

var bob = person("Bob", "Bills", 40);

console.log(bob.first_name +  " " + bob.last_name);
console.log(bob.age());

bob.add_interests("bungee jumping", "snowboarding");

console.log(bob.interests);

var superHuman = new_constructor(person, function (first, last, power) {
    this.first_name = first;
    this.last_name = last;
    this.power = power;
    this.interests = [];
    this.add_interests(power);
},
{
    wield_power : function () {
        return this.power.toUpperCase() + " to the rescue!!1!!1";
    }
});


var bill = superHuman("Bill", "Smith", "thunder");

console.log(bill.first_name + " " + bill.last_name);
console.log(bill.interests);
console.log(bill.wield_power());



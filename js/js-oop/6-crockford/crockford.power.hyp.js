

function make_person (first, last, age) {
    function set_get_age (new_age) {
        if (new_age) {
            age = new_age;
        }
        return age - 5;
    }

    return {
        first_name : first,
        last_name : last,
        age      : set_get_age,
        interests : [],
        add_interests : function () {
            for (var i = 0; i < arguments.length; i++) {
                this.interests.push(arguments[i]);
            }
            return this.interests;
        }
    };
}

var fred = make_person("Fred", "Flintstone", 50);

console.log(fred.first_name + " " + fred.last_name);

console.log(fred.age());

console.log(fred.add_interests("bowling"));

function make_superhuman(first, last, power) {
    var ret = make_person(first, last);

    ret.power = power;
    ret.add_interests(power);
    ret.wield_power = function () {
        return this.power.toUpperCase() + " to the rescue!!1!!1!";
    }
    return ret;
}


var barney = make_superhuman("Barney", "Rubble", "Driving a Dinosaur");

console.dir(barney);

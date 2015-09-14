# OOP + JS === FTW!
## What is OOP
* Using objects to design software
* Patterns and philosophies rather then how its written
## Object
ex:
* an auto-copmleting search box
* a "coda" slider
* tooltop
* ajax connection

Code for an object is self contained
* easy to reuse
* include in any project

## Why OOP?
* Easy to re-use - no rewriting (or hacking around)
* Easy to update - fewer bugs (fix 1 file, fix all!)
* Easy to use APIs - fewer mistakes (expose right amount of functionality)

## OOP Concepts
* Creation - making instances via classes, functions, duplication
* Inheritance - Kinda prototypal "forced classical", prototypal
* Encapsulation - closure (show user what they need to know)
* Polymorphism - over-writing methods of "parents" with for more appropriate (yet familiar) functionality
** all do same general task, but not specific task

## JS examples

var o = new Object(); // not recommended, we can use literal
o.name = "jo"; // name is a property
o.say_hi = function() { return "hi!"; } // say_hi is a method

console.dir(o); //in firebug:

// using object literal
var o = {
  name: "Alex",
  say_hi:  function() {
    return "hi";
  },
  0 : "some val"
  1 : {
    prop: "val"
  }
}

## Scope
Everything declared has scope. If declared in the file, its global scope, if in a function, its in the functions scope.
Everything in the global scope, is accessible from anywhere.
Everything in a function scope, will be available inside that function, not outside. its limited tot he function's scope
When we nest functions, we can access the inside function variables

primitive values - str or a num, when u assign 2 variables tot eh same thing
a = "test"
b = a
a = "something else"
b returns "test"

but.. reference values point to the same object in memory
a = { name: "Alex"}
b = a
a = { name: "Hai"}
b.name returns "Hai"


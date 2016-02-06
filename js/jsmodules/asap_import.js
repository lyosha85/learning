import asap from "asap";

asap(function(){
  console.log("hello async world!")
})

// named imports

import { later } from "asap";

later(function(){
  console.log("Running after other network events. ");
})

// to import both at the same time do this:
// import asap, { later } from "asap";

// renaming imports
import { unlink as rm } from "fs";

rm(filename, function(err) { /* check errors */ });

//importing into namespace
import * as fs from "fs";

fs.unlink(filename, function(err) { /* check errors */ });

//Shorter named exports
// You can make any declaration in JavaScript (like var or function) a named export by prefixing it with export.

// exports this function as "requestAnimationFrame"
export function requestAnimationFrame() {
  // cross-browser requestAnimationFrame
}

// exports document.location as "location"
export var location = document.location;

// This also works with new declarations, like class and let.

// exports this class as "File"
export class File() { /* implementation */ }

// exports "0.6.3" as "VERSION"
export let VERSION = "0.6.3";


// Grouping named exports
// You can export any number of local variables together.

export { getJSON, postJSON, animate };

function getJSON() {
  // implementation
}

function postJSON() {
  // implementation
}

function animate() {
  // implementation
}

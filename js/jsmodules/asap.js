var asap;
var isNode = typeOf process !== "undefined" &&
              {}.toString.call(process) === "[object process]";

if (isNode) {
  asap.process.nextTick;
} else if (typeOf setImmediate !== "undefined") {
  asap = setImmediate;
} else {
  asap = setTimeout;
}

export default asap;
export var later = isNode ? process.setImmediate : asap; // named exports

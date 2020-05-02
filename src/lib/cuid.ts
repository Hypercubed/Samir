// Collision-resistant UID generator
// Simplification of cuid.js by Eric Elliott

let c = 0;
const maxSafe = Number.MAX_SAFE_INTEGER;

function safeCounter () {
  return c < maxSafe ? c++ : 0;
}

function randomBlock () {
  return (Math.random() * maxSafe >>> 0);
}

export function cuid() {
  const letter = 'c';

  // Prevent same-machine collisions.
  const counter = safeCounter().toString(36);

  // Grab some more chars from Math.random()
  const random = randomBlock().toString(36);

  return letter + '-' + counter + '-' + random;
}

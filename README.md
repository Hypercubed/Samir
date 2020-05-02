# Samir

*OK, I'll do it.*

![](https://i.imgflip.com/3ykd0c.jpg)

## Goals

Samir uses an incremental implementation of the MurmurHash3 (32-bit) hashing algorithm and a plugable processing system to convert JS values and objects to a non-cryptographic hash.  Co-worker of [Smykowski](https://github.com/Hypercubed/smykowski) and [Milton](https://github.com/Hypercubed/milton).

## Features

- Extensible
- Incremental

## Install

```bash
npm i @hypercubed/samir
```

## Usage

```js
import { Samir, defaultPlugins } from '@hypercubed/samir';

const hasher = new Samir();
hasher.use(defaultPlugins);

const obj: any = {
  null: null,
  numbers: [
    3.14159,
    NaN,
    Infinity,
    -Infinity,
    -0
  ],
  strings: {
    empty: '',
    string: 'foo',
    multiline: `
    This
    is
    multiline
    `
  },
  arrays: {
    empty: [],
    array: [ 'one', 'two', 'three' ]
  },
  nested: { hello: 'hapi' },
  false: false,
  true: true,
  undef: undefined,
  regexp: /.*\n/g,
  function: function Yes() { /* noop */ },
  map: new Map([['key1', 'value1'], ['key2', 'value2']]),
  set: new Set([1, 2, 3]),
  date: new Date('1972-02-12T03:24:00'),
  objects: {
    class: Samir,
    instance: hasher
  }
};

obj.self = obj;
console.log(hasher.hash(obj));
```

prints:

```
1394490113
```

Incremtental hashing:

```js
hasher
  .reset()                // resets the hash
  .update('Hello');

// Sometime later

hasher
  .update(' World!');

console.log(hasher.result());  // Same as hasher.hash('Hello World')
```

## Description

`Samir` is an interface for hashing JS objects and values.  In `Samir` we have a concept of plugins and presets. Plugins are functions that define a "replacer" functions.  Replacer functions accept each value and returns a stringified result (or the original value).  The value returned by the replacer function replaces the original value in the hashed result. Values returned from one replacer are passed down to the next untill the replacer returns a string.  Once a string is returned this string value is incrementally added to the hash.

Plugins are added using the `.add` method on a `Samir` instance.  The order of the plugins does matter.  The first plugin to return a string wins.

Presets are ordered sets of plugins.  You may use a preset by invoking the `.use` method on a `Samir` instance. 

```ascii
| .............................. hash ................................ |
        | .................... preset ................... |
        | ... plugin ... |

           +----------+     +----------+     +----------+
Input  --> | Replacer | --> | Replacer | --> | Replacer | --> Output
           +----------+     +----------+     +----------+

```

Presets and plugins may be used together:

```ts
const hasher = new Samir();
hasher
  .use(defaultPlugins)
  .add(myPlugin);
```

## Presets

- `defaultPlugins` - includes all plugins below, in the order listed, with defualt settings.

(see [presets.ts](https://github.com/Hypercubed/samir/blob/master/src/lib/presets.ts) for more)

## Plugins

- `primitives` - Generates hashes for primitive JS values, by default `number`, `boolean`, `bigint`, `undefined`, and `null`.
- `symbols` - Generates hashes for symbols.  Global symbols generate repeatable hashes.  Ordinary symbols are unique and generate random hashes (repeatable within a JS environment)
- `functions` - Genertates hases for functions based on toString.  Native functions use the native function name.
- `dataTypes` - Handles JS object types like `Date` (based on getTime), `Error` (based on stack) and `RegExp` (based on toString).
- `buffer` - Generates hashes for  `Buffer`s
- `reference` - Captures and replaces repeated object references.  Improves hashing speed by not decending repeated itmes and allows cirecular objects and arrays.
- `arrayDecender` - Recursively processes arrays
- `objectDecender` - Recursively processes enumerable keys on objects, key order agnostic.
- `setMap` - Recursively processes `Map`s and `Set`.  Map is key order agnostic.

(see [plugins.ts](https://github.com/Hypercubed/samir/blob/master/src/lib/plugins.ts) for more)

## Writing Plugins and Presets

A plugin is a function that accepts an options object, the root value (the first value passed to the `samir#hash` or `samir#update` method), and a "continue" function used for recursion.  Each plugin must return a replacer/visitor function that is called (recursively) on each value to be hashed.

For example here is very simple plugin that will handle a hypothetical `Decimal` class:

```ts
const decimalPlugin = () => (s: any) => {
  if (s instanceof Decimal) {
    return `$float#${s.toString()}`;
  }
  return s;
};
```

It is importrant that the replacer function return the input value if it is unaltered.

(see [plugins.ts](https://github.com/Hypercubed/samir/blob/master/src/lib/plugins.ts) for more)

Presets are functions that add plugins to a `samir` instance in a desiered order.  For example:

```ts
function mySamirPlugins(_: samir) {
  _.add(decimalPlugin);
  _.add(primitives);

  _.add(reference);

  _.add(arrayDecender);
  _.add(objectDecender);

  return _;
}
```

## API

### Class `Samir`

Creates a new `Samir` instance with it's own Murmur3 incremental hasher

`new Samir()`

#### Method `samir.add(plugin[, options])`

Adds a plugin to a `Samir` instance

```ts
add(plugin: Plugin, options?: any): this
```

* `plugin` - A function that initializes and returns a replacer
* `options` (optional, default = null) — Configuration for plugin

#### Method `samir.use(preset)`

Adds a preset (set of plugins) to a `Samir` instance

```ts
use(preset: Preset, ...args?: any[]): this
```

* `preset` - A adds plugins to a samir instance in the desired order
* `args` - Arguments taht are passed to the preset on initialization

#### Method `samir.reset(seed)`

Resets the state object and using (optionally) the given seed (defaults to 0).

```ts
reset(seed?: number = 0): this
```

* `seed` (optional, default = 0)  - the hashing seed

#### Method `samir.update(value)`

Pass the value through the `add`ed replacers, incrementally adding the resulting string to the hash.

```ts
update(value: any): this
```

* `value` - any value/object to hash as supported by the plugins

#### Method `samir.result()`

Get the result of the hash as a 32-bit positive integer.

```ts
result(): number
```

#### Method `samir.hash(value, seed)`

Reset the hash, update with a value, return the result.  Calling `instance.hash(value, seed)` is the same as `instance.reset(seed).update(value).result()`.

```ts
hash(value: any, seed?: number = 0): number
```

* `value` - any value/object to hash as supported by the plugins
* `seed` (optional, default = 0) - the hashing seed

### `Replacer`

```ts
type Replacer = (s: any, p: Path, value: any) => any ;
```

### `Plugin`

```ts
type Plugin = (options: any, root: any, cont: StringifyFunction) => Replacer;
```

### `Preset`

```ts
type Preset = (samir: samir) => samir;
```

## License

This project is licensed under the MIT License - see the LICENSE file for details
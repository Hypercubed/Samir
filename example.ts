#!/usr/bin/env ts-node
import { Samir } from './src/lib/samir';
import { defaultPlugins } from './src/lib/presets';

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
  error: new Error('bad'),
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

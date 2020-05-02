#!/usr/bin/env node

const assert = require('assert');
const suite = require('chuhai');
const objectHash = require('object-hash');
const hashObject = require('hash-obj');
const MurmurHash3 = require('imurmurhash');
const { sha1 } = require('hash-anything');
const { Milton, jsonValues, arrayDecender: miltonArrayDecender, objectDecender: miltonObjectDecender } = require('@hypercubed/milton');

const { Samir, primitives, objectDecender, arrayDecender } = require('../build/main/index');

const hasher = new Samir();
hasher.add(primitives);
hasher.add(objectDecender);
hasher.add(arrayDecender);

const milton = new Milton();
milton.add(jsonValues);
milton.add(miltonArrayDecender);
milton.add(miltonObjectDecender);

const murmurHash3 = new MurmurHash3();

suite('hash object', s => {
  const obj = { 
    arr: new Array(100).map(() => { 
      return {
        strings:  '' + Math.random(),
        numbers: Math.random()
      };
    })
  };

  let ans = null;

  s.cycle(() => {
    assert(typeof ans === 'number' || typeof ans === 'string');

    obj.arr = new Array(100).map(() => { 
      return {
        strings:  '' + Math.random(),
        numbers: Math.random()
      };
    });

    ans = null;
  });

  s.burn('burn each', () => {
    ans =  JSON.stringify(obj);
    ans += hasher.hash(obj);
    ans += objectHash(obj);
    ans += hashObject(obj);
    ans += sha1(obj);
    ans += milton.stringify(obj);
  });

  s.bench('JSON stringify', () => {
    ans =  murmurHash3.reset().hash(JSON.stringify(obj)).result();
  });

  s.bench('Samir', () => {
    ans = hasher.hash(obj);
  });

  s.bench('objectHash', () => {
    ans = objectHash(obj);
  });

  s.bench('hashObject', () => {
    ans = hashObject(obj);
  });

  s.bench('hash-anything sha1', () => {
    ans = sha1(obj);
  });

  s.bench('Milton', () => {
    ans = murmurHash3.reset().hash(milton.stringify(obj)).result();
  });
});

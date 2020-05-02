import { cuid } from './cuid';

export type Path = Array<string | number>;
export type StringifyFunction = (v: unknown, path?: Path) => any;
export type Replacer = (
  s: unknown,
  p: Path,
  value: unknown
) => unknown | string;
export type Plugin = (
  options: any,
  root: any,
  get: StringifyFunction
) => Replacer;

const { toString } = Object.prototype;
const circularError =
  ' plugin does not accept circular structures.  Missing the `circular` plugin?';

const defaultPrimitivesOptions = {
  types: ['number', 'boolean', 'bigint', 'undefined']
};

/**
 * Processes primitive JS values,
 * generates a hash using the type and the stringified value
 */
export const primitives = (_options: any = defaultPrimitivesOptions, _v: any, h: StringifyFunction) => {
  _options = {
    ...defaultPrimitivesOptions,
    _options
  };
  return (s: any) => {
    const t = typeof s;
    if (_options.types.includes(t) || s === null) {
      h(t);
      return String(s);
    }
    return s;
  };
};


let symbolMap: Map<symbol, string>;

/**
 * Processes symbols,
 * Global symbols are repeatable,
 * Ordinary symbols are repeatable within an environment
 */
export const symbols = (_options: any, _v: any, h: StringifyFunction) => {
  symbolMap = symbolMap || new Map();
  return (s: any) => {
    if (typeof s === 'symbol') {
      // Global symbols are repeatable
      const key = Symbol.keyFor(s);
      if (key) {
        h('global_symbol');
        return key;
      }
      // Symbols are not
      h('symbol');
      const symbolSalt = symbolMap.get(s) || cuid();
      symbolMap.set(s, symbolSalt);
      return symbolSalt;
    }
    return s;
  };
};

/**
 * Processes functions,
 * generates a hash using the stringified value
 * Native functions use the native function name
 */
export const functions = (_options: any, _v: any, h: StringifyFunction) => {
  return (s: any) => {
    const t = typeof s;
    if (t === 'function') {
      h(t);
      const str = String(s);
      if (str === 'function () { [native code] }') {
        h(s.name);
      }
      return str;
    }
    return s;
  };
};

/**
 * Handles JS object types,
 * `Date` based on getTime
 * `Error` based on stack
 * `RegExp` based on toString
 */
export const dataTypes = (_options: any, _v: any, h: StringifyFunction) => {
  return (s: any) => {
    if (typeof s === 'object') {
      const t = toString.call(s);
      switch (t) {
        // @ts-ignore-next-line
        case '[object Date]':
          h(t);
          return String(s.getTime());
        case '[object Error]':
          h(t);
          return s.stack;
        case '[object RegExp]':
          h(t);
          return String(s);
      }
    }
    return s;
  };
};

/**
 * Recursively processes arrays,
 * throws on circular references
 */
export const arrayDecender = (_options: any, _v: any, h: StringifyFunction) => {
  const seen: any[][] = [];
  return (s: any, path: Path) => {
    if (seen.includes(s)) {
      throw new TypeError('arrayDecender' + circularError);
    }
    seen.push(s);
    const t = toString.call(s);
    if (t === '[object Array]') {
      s.forEach((vv: any, i: number) => {
        h(String(i));
        h(vv, [...path, i]);
      });
      return t;
    }
    seen.pop();
    return s;
  };
};

/**
 * Recursively processes objects by enumerable keys on objects
 * keys are sorted
 * throws on circular references
 */
export const objectDecender = (
  _options: any,
  _v: any,
  h: StringifyFunction
) => {
  const seen: object[] = [];
  return (s: any, path: Path) => {
    const t = toString.call(s);
    if (t === '[object Object]') {
      if (seen.includes(s)) {
        throw new TypeError('objectDecender' + circularError);
      }
      seen.push(s);
      const keys = Object.keys(s).sort();
      keys.forEach((k: any) => {
        h(k);
        h(s[k], [...path, k]);
      });
      seen.pop();
      return t;
    }
    return s;
  };
};

/**
 * Captures and replaces repeated object references
 */
export const reference = (_options: any, _v: any, h: StringifyFunction) => {
  const repeated = new WeakMap();
  return (s: any, path: any) => {
    if (s !== null && typeof s === 'object') {
      if (repeated.has(s)) {
        h(repeated.get(s));
        return 'reference';
      }
      repeated.set(s, path);
    }
    return s;
  };
};

/**
 * Recursively processes `Map`s and `Set`.
 * Map keys are sorted
 */
export const setMap = (_options: any, _root: any, h: StringifyFunction) => {
  const seen: Array<Map<any, any> | Set<any>> = [];
  return (s: any, path: Path) => {
    if (s instanceof Map) {
      if (seen.includes(s)) {
        throw new TypeError('setMap' + circularError);
      }
      seen.push(s);
      const keys = Array.from(s.keys()).sort();
      keys.forEach((k: any) => {
        h(k);
        h(s.get(k), [...path, k]);
      });
      seen.pop();
      return 'Map';
    }
    if (s instanceof Set) {
      if (seen.includes(s)) {
        throw new TypeError('setMap' + circularError);
      }
      seen.push(s);
      Array.from(s).forEach((vv: any, i: number) => {
        h(String(i));
        h(vv, [...path, i]);
      });
      seen.pop();
      return 'Set';
    }
    return s;
  };
};

export const buffer = (_options: any, _root: any, h: StringifyFunction) => (
  s: any
) => {
  if (Buffer.isBuffer(s)) {
    for (const value of s.values()) {
      h(String(value));
    }
    return 'buffer';
  }
  return s;
};

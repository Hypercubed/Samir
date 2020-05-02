import { Samir } from './samir';
import {
  primitives,
  objectDecender,
  arrayDecender,
  reference,
  setMap,
  dataTypes,
  buffer,
  functions,
  symbols
} from './plugins';

describe('without plugins', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
  });

  test('hash a well known string', () => {
    expect(hasher.hash('')).toBe(0);
    expect(hasher.hash('Hello World!')).toBe(3691591037);
  });

  test('hash a well known string with a seed', () => {
    expect(hasher.hash('', 1)).toBe(1364076727);
    expect(hasher.hash('Hello World!', 1)).toBe(3893830601);
  });

  test('incremental hash', () => {
    hasher.update('Hello');
    hasher.update(' World!');
    expect(hasher.result()).toBe(3691591037);
  });

  test('incremental hash with reset seed', () => {
    hasher.update('Something');
    hasher.reset(1);
    hasher.update('Hello');
    hasher.update(' World!');
    expect(hasher.result()).toBe(3893830601);
  });

  test('cloned hashers copy internal state', () => {
    hasher.update('Hello');
    const h2 = hasher.clone();
    h2.reset();
    expect(hasher.result()).toBe(316307400);
    expect(h2.result()).toBe(0);
  });

  test('cloned hashers do not interfere', () => {
    hasher.update('Hello');
    const h2 = hasher.clone();
    h2.update(' World!');
    expect(hasher.result()).toBe(316307400);
    expect(h2.result()).toBe(3691591037);
  });

  test('calling results does not prevent from calling update again', () => {
    hasher.update('Hello');
    expect(hasher.result()).toBe(316307400);
    hasher.update(' World!');
    expect(hasher.result()).toBe(3691591037);
  });

  test('throws error on unknown types', () => {
    expect(() => {
      hasher.hash(5);
    }).toThrow('Unable to compute hash for this type');
  });
});

describe('primitives plugin', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(primitives);
  });

  test('repeatable', () => {
    expect(hasher.hash(42)).toMatchInlineSnapshot(`842428900`);
    expect(hasher.hash(null)).toMatchInlineSnapshot(`1736475640`);
    expect(hasher.hash(true)).toMatchInlineSnapshot(`1022586449`);
    expect(hasher.hash(false)).toMatchInlineSnapshot(`139152011`);
    expect(hasher.hash(undefined)).toBe(hasher.hash(void 0));
    expect(hasher.hash(0n)).toMatchInlineSnapshot(`807208787`);
    expect(hasher.hash(NaN)).toMatchInlineSnapshot(`2074002154`);
  });

  test('equivalent values', () => {
    expect(hasher.hash(42)).toBe(hasher.hash(84 / 2));
    expect(hasher.hash(42)).toBe(hasher.hash(Number(42)));
    expect(hasher.hash(undefined)).toBe(hasher.hash(void 0));
    expect(hasher.hash(42n)).toBe(hasher.hash(BigInt(42)));
  });

  test('different values', () => {
    expect(hasher.hash('')).not.toBe(hasher.hash(0));
    expect(hasher.hash('')).not.toBe(hasher.hash(null));
    expect(hasher.hash(0)).not.toBe(hasher.hash(null));
    expect(hasher.hash(undefined)).not.toBe(hasher.hash(null));
    expect(hasher.hash(42)).not.toBe(hasher.hash(43));
    expect(hasher.hash(42n)).not.toBe(hasher.hash(42));
    expect(hasher.hash(0n)).not.toBe(hasher.hash(1n));

    expect(hasher.hash('42')).not.toBe(hasher.hash(42));
    expect(hasher.hash(42n)).not.toBe(hasher.hash(42));
  });
});

describe('symbols plugin', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(symbols);
  });

  test('repeatable', () => {
    expect(hasher.hash(Symbol.for('abc'))).toMatchInlineSnapshot(`4191118755`);

    const sym = Symbol('abc');
    expect(hasher.hash(sym)).toBe(hasher.hash(sym));
  });

  test('equivalent values', () => {
    expect(hasher.hash(Symbol.for('abc'))).toBe(hasher.hash(Symbol.for('abc')));
  });

  test('different values', () => {
    expect(hasher.hash(Symbol.for('abc'))).not.toBe(
      hasher.hash(Symbol.for('def'))
    );
    expect(hasher.hash(Symbol.for('abc'))).not.toBe(hasher.hash(Symbol('abc')));

    expect(hasher.hash(Symbol('abc'))).not.toBe(hasher.hash(Symbol('abc')));
    expect(hasher.hash(Symbol('abc'))).not.toBe(hasher.hash('abc'));
  });
});

describe('objectDecender plugin', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(primitives);
    hasher.add(functions);
    hasher.add(objectDecender);
  });

  test('repeatable', () => {
    expect(hasher.hash({})).toMatchInlineSnapshot(`1515928286`);
    expect(hasher.hash({ x: 'one' })).toMatchInlineSnapshot(`3474699887`);

    class Foo {
      //
    }

    expect(hasher.hash(new Foo())).toMatchInlineSnapshot(`1515928286`);
  });

  test('hashes are key order independent', () => {
    expect(hasher.hash({ x: 'one', y: 'two' })).toBe(
      hasher.hash({ y: 'two', x: 'one' })
    );
  });

  test('equivalent values', () => {
    const x = 'one';
    expect(hasher.hash({ x: 'one' })).toBe(hasher.hash({ x }));

    class Foo {
      constructor(public y: number) {}
    }

    expect(hasher.hash(new Foo(1))).toBe(hasher.hash(new Foo(1)));
  });

  test('objectDecender only check enumerable keys', () => {
    class Foo {
      constructor(public z: number) {}
    }

    expect(hasher.hash(new Foo(1))).toBe(hasher.hash({ z: 1 }));

    const x = { a: 1, [Symbol('z')]: 2 };
    const y = { a: 1 };
    expect(hasher.hash(x)).toBe(hasher.hash(y));
  });

  test('different values', () => {
    expect(hasher.hash({ x: 'one' })).not.toBe(hasher.hash({ x: 'two' }));
    expect(hasher.hash({ y: 'one' })).not.toBe(hasher.hash({ x: 'one' }));

    class Foo {
      constructor(public x: number) {}
    }

    expect(hasher.hash(new Foo(1))).not.toBe(hasher.hash(new Foo(2)));
  });

  test('throws error on circular objects', () => {
    expect(() => {
      const x: any = {};
      x.x = x;
      hasher.hash(x);
    }).toThrow('objectDecender plugin does not accept circular structures');
  });
});

describe('arrayDecender plugin', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(primitives);
    hasher.add(arrayDecender);
  });

  test('repeatable', () => {
    expect(hasher.hash([])).toMatchInlineSnapshot(`3645249672`);
    expect(hasher.hash([1, 2, 3])).toMatchInlineSnapshot(`2891512699`);
  });

  test('equivalent values', () => {
    const x = [2, 3];
    expect(hasher.hash([1, 2, 3])).toBe(hasher.hash([1, ...x]));
  });

  test('different values', () => {
    expect(hasher.hash([])).not.toBe(hasher.hash(['']));
    expect(hasher.hash([1, 2, 3])).not.toBe(hasher.hash([1, 2, 3, 4]));
    expect(hasher.hash([1, 2, 3])).not.toBe(hasher.hash([3, 2, 1]));
  });

  test('throws error on circular objects', () => {
    expect(() => {
      const x: any = [];
      x[0] = x;
      hasher.hash(x);
    }).toThrow('arrayDecender plugin does not accept circular structures');
  });
});

describe('reference plugin', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(reference);
    hasher.add(arrayDecender);
    hasher.add(objectDecender);
  });

  test('repeatable', () => {
    const x: any = [];
    x[0] = x;
    expect(hasher.hash(x)).toMatchInlineSnapshot(`3990476481`);
    expect(hasher.hash({ x })).toMatchInlineSnapshot(`3679080892`);
  });
});

describe('setMap plugin', () => {
  let hasher: Samir;

  const x: any = ['1', '2'];
  const y: any = ['3', '4'];

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(setMap);
  });

  test('repeatable', () => {
    expect(hasher.hash(new Set([]))).toMatchInlineSnapshot(`4052666192`);
    expect(hasher.hash(new Set(x))).toMatchInlineSnapshot(`939336504`);
    expect(hasher.hash(new Map([]))).toMatchInlineSnapshot(`1142698207`);
    expect(hasher.hash(new Map([x, y]))).toMatchInlineSnapshot(`3120772102`);
  });

  test('equivalent values', () => {
    expect(hasher.hash(new Set(['1', '2', '3', '4']))).toBe(
      hasher.hash(new Set([...x, ...y]))
    );
    expect(hasher.hash(new Map([x, y]))).toBe(hasher.hash(new Map([y, x]))); // keys are ordered
  });

  test('different values', () => {
    expect(hasher.hash(new Set([]))).not.toBe(hasher.hash(new Set([''])));
    expect(hasher.hash(new Map([['1', '2']]))).not.toBe(
      hasher.hash(new Map([['2', '1']]))
    );
  });

  test('throws error on circular objects', () => {
    expect(() => {
      const s = new Set();
      s.add(s);
      hasher.hash(s);
    }).toThrow('setMap plugin does not accept circular structures');
  });
});

describe('other types', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(dataTypes);
    hasher.add(buffer);
  });

  test('repeatable', () => {
    expect(
      hasher.hash(new Date('1990-01-01T00:00:00.000Z'))
    ).toMatchInlineSnapshot(`3209449372`);
    expect(hasher.hash(Buffer.from([]))).toMatchInlineSnapshot(`1850275112`);
    expect(hasher.hash(Buffer.from([1, 2, 3]))).toMatchInlineSnapshot(
      `3273394080`
    );
    const e = new Error();
    expect(hasher.hash(e)).toBe(hasher.hash(e));
  });

  test('equivalent values', () => {
    expect(hasher.hash(new Date('1990-01-01T00:00:00.000Z'))).toBe(
      hasher.hash(new Date(631152000000))
    );
    expect(hasher.hash(/./)).toBe(hasher.hash(new RegExp('.')));
    expect(hasher.hash(Buffer.from([]))).toBe(hasher.hash(Buffer.from([])));
  });

  test('different values', () => {
    expect(hasher.hash(new Date('1990-01-01T00:00:00.000Z'))).not.toBe(
      hasher.hash(new Date('1990-01-01T00:00:00.001Z'))
    );
    expect(hasher.hash(new Error(''))).not.toBe(hasher.hash(new Error('abc')));
    expect(hasher.hash(new Error(''))).not.toBe(hasher.hash(new Error()));
    expect(hasher.hash(/./)).not.toBe(hasher.hash(/\./));
    expect(hasher.hash(/./)).not.toBe(hasher.hash(/./g));
    expect(hasher.hash(Buffer.from([]))).not.toBe(
      hasher.hash(Buffer.from(['']))
    );
  });
});

describe('functions plugin', () => {
  let hasher: Samir;

  beforeEach(() => {
    hasher = new Samir();
    hasher.add(functions);
  });

  test('repeatable', () => {
    const fn = function() {
      //
    };

    expect(hasher.hash(fn)).toMatchInlineSnapshot(`2670109981`);
    expect(hasher.hash(() => '')).toMatchInlineSnapshot(`205230035`);

    class Foo {
      //
    }

    expect(hasher.hash(Foo)).toMatchInlineSnapshot(`2177253051`);
  });

  test('equivalent values', () => {
    const fn = function() {
      //
    };

    const fn2 = function() {
      //
    };

    expect(hasher.hash(fn)).toBe(hasher.hash(fn2));

    const foo = class {};
    const bar = class {};

    expect(hasher.hash(foo)).toBe(hasher.hash(bar));
  });

  test('can hash native functions', () => {
    expect(typeof hasher.hash(console.log)).toBe('number');
    expect(typeof hasher.hash(Error)).toBe('number');
    expect(typeof hasher.hash(Map)).toBe('number');
    expect(typeof hasher.hash(Set)).toBe('number');
  });

  test('different values', () => {
    const fn = function() {
      //
    };

    const fn2 = function named() {
      //
    };

    expect(hasher.hash(fn)).not.toBe(hasher.hash(fn2));

    class Foo {
      //
    }

    class Bar {
      //
    }

    expect(hasher.hash(Foo)).not.toBe(hasher.hash(Bar));

    expect(hasher.hash(console.log)).not.toBe(hasher.hash(console.error));
  });
});

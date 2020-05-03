import MurmurHash3 from 'imurmurhash';

import { Path, Plugin, Replacer, StringifyFunction } from './plugins';
import { Preset } from './presets';

type PluginWithOptions = (root: any, get: StringifyFunction) => Replacer;

const { toString } = Object.prototype;

export class Samir {
  protected _plugins: PluginWithOptions[] = [];
  private _m: InstanceType<typeof MurmurHash3>;

  constructor() {
    this._m = new MurmurHash3();
  }

  reset(seed: number = 0) {
    this._m.reset(seed);
    return this;
  }

  result() {
    return this._m.result();
  }

  update(value: any) {
    const len = this._plugins.length;

    const _h = (s: any, path: Path = []) => {
      let t = typeof s;
      if (t === 'string') { // fast path for strings
        this._m.hash(s);
        return;
      }

      let v = s;
      let i = 0;
      while (i < len && t !== 'string') {
        // tslint:disable-next-line: tsr-detect-unsafe-properties-access
        v = replacers[i++](v, path, s);
        t = typeof v;
      }
      if (t !== 'string') {
        throw new Error(
          `Unable to compute hash for this type (${
            t === 'object' ? toString.call(v) : t
          }). Missing a plugin?`
        );
      }
      this._m.hash(v);
    };

    const replacers = this._plugins.map(p => p(value, _h));

    _h(value, []);

    return this;
  }

  hash(value: any, seed: number = 0): any {
    return this.reset(seed)
      .update(value)
      .result();
  }

  clone() {
    const n = new Samir();
    n._plugins = [...this._plugins];
    Object.assign(n._m, { ...this._m });
    return n;
  }

  add(plugin: Plugin, options?: any) {
    this._plugins.push(plugin.bind(this, options || null));
    return this;
  }

  use(preset: Preset, ...args: any) {
    preset(this, ...args);
    return this;
  }
}

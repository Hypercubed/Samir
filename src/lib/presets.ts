import { Samir } from './samir';

import {
  primitives,
  objectDecender,
  arrayDecender,
  reference,
  setMap,
  dataTypes,
  buffer,
  symbols,
  functions
} from './plugins';

export type Preset = (_: Samir, ...args: any) => Samir;

export function defaultPlugins(_: Samir) {
  _.add(primitives);
  _.add(symbols);
  _.add(functions);
  _.add(dataTypes);
  _.add(buffer);

  _.add(reference);
  _.add(objectDecender);
  _.add(arrayDecender);
  _.add(setMap);
  return _;
}

import * as fc from 'fast-check';
import * as t from 'io-ts';
import { getArbitrary, SupportedType } from '../src';

function test<T extends SupportedType>(type: T): void {
  it(type.name, () => {
    fc.assert(fc.property(getArbitrary(type), type.is));
  });
}

test(t.unknown);
test(t.undefined);
test(t.null);
test(t.string);
test(t.number);
test(t.boolean);
test(t.type({ foo: t.string, bar: t.number }));
test(t.partial({ foo: t.string, bar: t.number }));
test(t.union([t.undefined, t.string, t.type({ foo: t.string })]));
test(t.exact(t.type({ foo: t.string, bar: t.number })));
test(t.array(t.type({ foo: t.string })));
test(t.tuple([t.string, t.number, t.type({ foo: t.boolean })]));
// @ts-ignore
test(t.keyof({ foo: null, bar: null }));
test(t.intersection([t.Int, t.number]));
test(t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.number })]));
test(t.intersection([t.type({ foo: t.string }), t.type({ bar: t.number })]));
test(t.intersection([t.array(t.string), t.array(t.number)]));

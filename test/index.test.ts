import * as fc from 'fast-check';
import * as t from 'io-ts';
import { getArbitrary, HasArbitrary } from '../src';
import { date } from 'io-ts-types/lib/date';

// pass
const overrides = { Date: fc.date() };

function test<T extends HasArbitrary>(codec: T): void {
  it(codec.name, () => {
    fc.assert(fc.property(getArbitrary(codec, overrides), codec.is));
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
// @ts-ignore :(
test(t.keyof({ foo: null, bar: null }));
test(t.intersection([t.Int, t.number]));
test(t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.number })]));
test(t.intersection([t.type({ foo: t.string }), t.type({ bar: t.number })]));
test(t.intersection([t.array(t.string), t.array(t.number)]));
test(t.record(t.string, t.number));
test(t.type({ date }));

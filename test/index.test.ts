import * as fc from 'fast-check';
import { either } from 'fp-ts/lib/Either';
import { none, some, Option } from 'fp-ts/lib/Option';
import * as t from 'io-ts';
import { getArbitrary } from '../src';

function test<T extends t.Any>(
  type: T,
  customArbitrary?: <C extends t.Any>(codec: C) => Option<fc.Arbitrary<C['_A']>>
): void {
  it(type.name, () => {
    fc.assert(fc.property(getArbitrary(type, customArbitrary), type.is));
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

const DateFromString = new t.Type<Date, string, unknown>(
  'DateFromString',
  (u): u is Date => u instanceof Date,
  (u, c) =>
    either.chain(t.string.validate(u, c), s => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? t.failure(u, c) : t.success(d);
    }),
  a => a.toISOString()
);

function customDateFromStringArbitrary<C extends t.Any>(codec: C): Option<fc.Arbitrary<C['_A']>> {
  return codec.name === 'DateFromString'
    ? some(
        fc
          .integer()
          .filter(n => n > 0)
          .map(n => new Date(n))
      )
    : none;
}

test(DateFromString, customDateFromStringArbitrary);

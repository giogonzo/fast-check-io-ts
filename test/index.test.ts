import * as fc from 'fast-check';
import * as t from 'io-ts';
import * as E from 'fp-ts/Either';
import { getArbitrary, getArbitraryWithFallbacks, HasArbitrary } from '../src';
import { date } from 'io-ts-types/lib/date';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';
import { DateFromUnixTime } from 'io-ts-types/lib/DateFromUnixTime';

function test<T extends HasArbitrary>(codec: T): void {
  it(codec.name, () => {
    fc.assert(fc.property(getArbitrary(codec), codec.is));
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

const overrides = { Date: fc.date(), DateFromISOString: fc.date() };

function testWithFallbacks<T extends HasArbitrary>(codec: T): void {
  it(`${codec.name} with fallbacks`, () => {
    const eitherArbitrary = getArbitraryWithFallbacks(codec, overrides);
    if (E.isLeft(eitherArbitrary)) {
      throw new Error(`${eitherArbitrary.left}`);
    }
    fc.assert(fc.property((eitherArbitrary as E.Right<any>).right, codec.is));
  });
}

testWithFallbacks(t.unknown);
testWithFallbacks(t.undefined);
testWithFallbacks(t.null);
testWithFallbacks(t.string);
testWithFallbacks(t.number);
testWithFallbacks(t.boolean);
testWithFallbacks(t.type({ foo: t.string, bar: t.number }));
testWithFallbacks(t.partial({ foo: t.string, bar: t.number }));
testWithFallbacks(t.union([t.undefined, t.string, t.type({ foo: t.string })]));
testWithFallbacks(t.exact(t.type({ foo: t.string, bar: t.number })));
testWithFallbacks(t.array(t.type({ foo: t.string })));
testWithFallbacks(t.tuple([t.string, t.number, t.type({ foo: t.boolean })]));
// @ts-ignore :(
testWithFallbacks(t.keyof({ foo: null, bar: null }));
testWithFallbacks(t.intersection([t.Int, t.number]));
testWithFallbacks(t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.number })]));
testWithFallbacks(t.intersection([t.type({ foo: t.string }), t.type({ bar: t.number })]));
testWithFallbacks(t.intersection([t.array(t.string), t.array(t.number)]));
testWithFallbacks(t.record(t.string, t.number));
testWithFallbacks(t.type({ date }));
testWithFallbacks(t.type({ date: DateFromISOString }));

it(`Returns Left with error when fallback cannot be found`, () => {
  const codec = t.type({ name: DateFromUnixTime });
  const eitherArbitrary = getArbitraryWithFallbacks(codec, overrides);
  expect(E.isLeft(eitherArbitrary)).toBeTruthy();
});

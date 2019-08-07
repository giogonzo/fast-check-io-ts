# fast-check-io-ts

[io-ts](https://github.com/gcanti/io-ts) codecs mapped to [fast-check](https://github.com/dubzzz/fast-check) arbitraries.

## Usage

```ts
import * as fc from 'fast-check';
import * as t from 'io-ts';
import { getArbitrary } from 'fast-check-io-ts';

const NonEmptyString = t.brand(
  t.string,
  (s): s is t.Branded<string, { readonly NonEmptyString: symbol }> => s.length > 0,
  'NonEmptyString'
);
const User = t.type({
  name: t.string,
  status: t.union([t.literal('active'), t.literal('inactive')]),
  handle: NonEmptyString
});

const userArb = getArbitrary(User);

console.log(fc.sample(userArb, 1)[0]); // { name: '', status: 'inactive', handle: 'M.y?>A/' }
```

## Usage with custom io-ts codecs

```ts
import * as fc from 'fast-check';
import * as t from 'io-ts';
import { getArbitrary } from 'fast-check-io-ts';

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

const dateFromStringArb = getArbitrary(DateFromString, customDateFromStringArbitrary);

console.log(fc.sample(dateFromStringArb, 1)[0]); // 1970-01-08T07:46:47.384Z
```

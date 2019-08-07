# fast-check-io-ts

[io-ts](https://github.com/gcanti/io-ts) codecs mapped to [fast-check](https://github.com/dubzzz/fast-check) arbitraries.

## Usage

```ts
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

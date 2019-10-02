import * as t from 'io-ts';
import { getArbitrary } from '../../src';

getArbitrary(t.keyof({ foo: null, bar: null })); // $ExpectError

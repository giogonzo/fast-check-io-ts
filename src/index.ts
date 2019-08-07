import * as fc from 'fast-check';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as R from 'fp-ts/lib/Record';
import * as t from 'io-ts';

type SupportedType =
  | t.StringType
  | t.VoidType
  | t.ArrayType<any>
  | t.BooleanType
  | t.ExactType<any>
  | t.KeyofType<any>
  | t.NullType
  | t.TupleType<Array<t.Any>>
  | t.UnknownType
  | t.UndefinedType
  | t.LiteralType<string | number | boolean>
  | t.NumberType
  | t.InterfaceType<unknown>
  | t.PartialType<unknown>
  | t.UnionType<Array<any>>
  | t.RefinementType<t.Any>
  | t.IntersectionType<Array<t.Any>>;

const objectTypes = ['ExactType', 'InterfaceType', 'PartialType'];

export function getArbitrary<T extends t.Any>(
  codec: T,
  customArbitrary?: <C extends t.Any>(codec: C) => O.Option<fc.Arbitrary<C['_A']>>
): fc.Arbitrary<T['_A']> {
  return pipe(
    O.fromNullable(customArbitrary),
    O.chain(ca => ca(codec)),
    O.getOrElse(() => {
      const type: SupportedType = codec as any;
      switch (type._tag) {
        case 'StringType':
          return fc.string();
        case 'UndefinedType':
          return fc.constant(undefined);
        case 'NumberType':
          return fc.float();
        case 'BooleanType':
          return fc.boolean();
        case 'LiteralType':
          return fc.constant(type.value);
        case 'InterfaceType':
          return fc.record(R.record.map(type.props as Record<string, T>, prop => getArbitrary(prop, customArbitrary)));
        case 'PartialType':
          return fc.record(
            R.record.map(type.props as Record<string, SupportedType>, type =>
              getArbitrary(t.union([t.undefined, type]), customArbitrary)
            )
          );
        case 'UnionType':
          return fc.oneof(...type.types.map(t => getArbitrary(t, customArbitrary)));
        case 'KeyofType':
          return fc.oneof(...Object.keys(type.keys).map(fc.constant));
        case 'NullType':
          return fc.constant(null);
        case 'TupleType':
          return (fc.tuple as any)(...type.types.map(t => getArbitrary(t, customArbitrary)));
        case 'UnknownType':
          return fc.anything();
        case 'VoidType':
          return fc.constant(undefined);
        case 'ArrayType':
          return fc.array(getArbitrary(type.type, customArbitrary));
        case 'ExactType':
          return getArbitrary(type.type, customArbitrary);
        case 'RefinementType':
          return getArbitrary(type.type, customArbitrary).filter(type.predicate);
        case 'IntersectionType':
          const isObjectIntersection = objectTypes.includes((type.types[0] as any)._tag as SupportedType['_tag']);
          return isObjectIntersection
            ? (fc.tuple as any)(...type.types.map(t => getArbitrary(t, customArbitrary)))
                .map((values: Array<object>) => Object.assign({}, ...values))
                .filter(type.is)
            : fc.oneof(...type.types.map(t => getArbitrary(t, customArbitrary))).filter(type.is);
      }

      throw new Error(`Codec not supported: ${codec}`);
    })
  );
}

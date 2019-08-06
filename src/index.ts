import * as fc from 'fast-check';
import * as R from 'fp-ts/lib/Record';
import * as t from 'io-ts';

export type SupportedType =
  | t.StringType
  | t.VoidType
  | t.ArrayType<any>
  | t.BooleanType
  | t.ExactType<any>
  | t.IntersectionType<Array<any>>
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
  | t.RefinementType<t.Any>;

export function getArbitrary<T extends t.Mixed>(codec: T): fc.Arbitrary<T['_A']> {
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
      return fc.record(R.record.map(type.props as Record<string, SupportedType>, getArbitrary));
    case 'PartialType':
      return fc.record(
        R.record.map(type.props as Record<string, SupportedType>, type => getArbitrary(t.union([t.undefined, type])))
      );
    case 'UnionType':
      return fc.oneof(...type.types.map(getArbitrary));
    case 'IntersectionType':
      throw new Error(`Codec not supported: ${codec}`);
    case 'KeyofType':
      return fc.oneof(...Object.keys(type.keys).map(fc.constant));
    case 'NullType':
      return fc.constant(null);
    case 'TupleType':
      return (fc.tuple as any)(...type.types.map(getArbitrary));
    case 'UnknownType':
      return fc.anything();
    case 'VoidType':
      return fc.constant(undefined);
    case 'ArrayType':
      return fc.array(getArbitrary(type.type));
    case 'ExactType':
      return getArbitrary(type.type);
    case 'RefinementType':
      return getArbitrary(type.type).filter(type.predicate);
  }

  throw new Error(`Codec not supported: ${codec}`);
}

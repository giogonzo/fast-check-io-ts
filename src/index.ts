import * as fc from 'fast-check';
import { record, keys } from 'fp-ts/lib/Record';
import * as t from 'io-ts';

interface ArrayType extends t.ArrayType<HasArbitrary> {}
interface RecordType extends t.DictionaryType<t.StringType, HasArbitrary> {}
interface StructType extends t.InterfaceType<Record<string, t.TypeOf<HasArbitrary>>> {}
interface ExactType extends t.ExactType<HasArbitrary> {}
interface TupleType extends t.TupleType<Array<HasArbitrary>> {}
interface PartialType extends t.PartialType<Record<string, HasArbitrary>> {}
interface UnionType extends t.UnionType<Array<HasArbitrary>> {}
interface IntersectionType extends t.IntersectionType<Array<HasArbitrary>> {}
interface BrandedType extends t.RefinementType<HasArbitrary> {}

export type HasArbitrary =
  | t.UnknownType
  | t.UndefinedType
  | t.NullType
  | t.VoidType
  | t.StringType
  | t.NumberType
  | t.BooleanType
  | t.KeyofType<any>
  | t.LiteralType<any>
  | ArrayType
  | RecordType
  | StructType
  | ExactType
  | PartialType
  | TupleType
  | UnionType
  | IntersectionType
  | BrandedType;

function getProps(codec: t.InterfaceType<any> | t.ExactType<any> | t.PartialType<any>): t.Props {
  switch (codec._tag) {
    case 'InterfaceType':
    case 'PartialType':
      return codec.props;
    case 'ExactType':
      return getProps(codec.type);
  }
}

const objectTypes = ['ExactType', 'InterfaceType', 'PartialType'];

export function getArbitrary<T extends HasArbitrary>(codec: T): fc.Arbitrary<t.TypeOf<T>> {
  const type: HasArbitrary = codec as any;
  switch (type._tag) {
    case 'UnknownType':
      return fc.anything();
    case 'UndefinedType':
    case 'VoidType':
      return fc.constant(undefined) as any;
    case 'NullType':
      return fc.constant(null) as any;
    case 'StringType':
      return fc.string() as any;
    case 'NumberType':
      return fc.float() as any;
    case 'BooleanType':
      return fc.boolean() as any;
    case 'KeyofType':
      return fc.oneof(...keys(type.keys).map(fc.constant)) as any;
    case 'LiteralType':
      return fc.constant(type.value);
    case 'ArrayType':
      return fc.array(getArbitrary(type.type)) as any;
    case 'DictionaryType':
      return fc.dictionary(getArbitrary(type.domain), getArbitrary(type.codomain)) as any;
    case 'InterfaceType':
    case 'PartialType':
    case 'ExactType':
      return fc.record(record.map(getProps(type), getArbitrary as any) as any) as any;
    case 'TupleType':
      return (fc.tuple as any)(...type.types.map(getArbitrary));
    case 'UnionType':
      return fc.oneof(...type.types.map(getArbitrary)) as any;
    case 'IntersectionType':
      const isObjectIntersection = objectTypes.includes(type.types[0]._tag);
      return isObjectIntersection
        ? (fc.tuple as any)(...type.types.map(t => getArbitrary(t)))
            .map((values: Array<object>) => Object.assign({}, ...values))
            .filter(type.is)
        : fc.oneof(...type.types.map(t => getArbitrary(t))).filter(type.is);
    case 'RefinementType':
      return getArbitrary(type.type).filter(type.predicate) as any;
  }
}

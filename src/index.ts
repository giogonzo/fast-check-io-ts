import * as fc from 'fast-check';
import { pipe } from 'fp-ts/function';
import * as Rec from 'fp-ts/lib/Record';
import { Functor as RecordFunctor, keys } from 'fp-ts/lib/Record';
import * as t from 'io-ts';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Apply';

interface ArrayType extends t.ArrayType<HasArbitrary> {}
interface RecordType extends t.DictionaryType<t.StringType, HasArbitrary> {}
interface StructType extends t.InterfaceType<{ [K: string]: t.TypeOf<HasArbitrary> }> {}
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

interface Overrides {
  [key: string]: fc.Arbitrary<any>;
}

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
      return fc.anything() as any;
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
      return fc.record(RecordFunctor.map(getProps(type), getArbitrary as any) as any) as any;
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

type HasArbitraryWithOverrides = HasArbitrary | t.Any;

export function getArbitraryWithFallbacks<T extends HasArbitraryWithOverrides>(
  type: T,
  overrides: Overrides
): E.Either<string, fc.Arbitrary<t.TypeOf<T>>> {
  if ('_tag' in type) {
    // built-in codecs
    const sequenceT = A.sequenceT(E.Apply);
    switch (type._tag) {
      case 'UnknownType':
        return E.right(fc.anything());
      case 'UndefinedType':
      case 'VoidType':
        return E.right(fc.constant(undefined));
      case 'NullType':
        return E.right(fc.constant(null));
      case 'StringType':
        return E.right(fc.string());
      case 'NumberType':
        return E.right(fc.float());
      case 'BooleanType':
        return E.right(fc.boolean());
      case 'KeyofType':
        return E.right(fc.oneof(...keys(type.keys).map(fc.constant)));
      case 'LiteralType':
        return E.right(fc.constant(type.value));
      case 'ArrayType':
        return pipe(getArbitraryWithFallbacks(type.type, overrides), E.map(fc.array));
      case 'DictionaryType':
        // traverse both arbs
        return pipe(
          sequenceT(
            getArbitraryWithFallbacks(type.domain, overrides),
            getArbitraryWithFallbacks(type.codomain, overrides)
          ),
          E.map(([domain, codomain]) => fc.dictionary(domain, codomain))
        );
      case 'InterfaceType':
      case 'PartialType':
      case 'ExactType':
        const recordSequence = Rec.sequence(E.Applicative);
        return pipe(
          Rec.Functor.map(getProps(type), prop => getArbitraryWithFallbacks(prop as HasArbitrary, overrides)),
          recordSequence,
          E.map(fc.record)
        );
      case 'TupleType':
        return pipe(
          type.types.map(codec => getArbitraryWithFallbacks(codec, overrides)),
          E.sequenceArray,
          E.map(arbs => fc.tuple(...arbs))
        );
      case 'UnionType':
        return pipe(
          type.types.map(codec => getArbitraryWithFallbacks(codec, overrides)),
          E.sequenceArray,
          E.map(arbs => fc.oneof(...arbs))
        );
      case 'IntersectionType':
        const isObjectIntersection = objectTypes.includes(type.types[0]._tag);
        return isObjectIntersection
          ? pipe(
              type.types.map(codec => getArbitraryWithFallbacks(codec, overrides)),
              E.sequenceArray,
              E.map(arbs =>
                fc
                  .tuple(...arbs)
                  .map((values: Array<object>) => Object.assign({}, ...values))
                  .filter(type.is)
              )
            )
          : pipe(
              type.types.map(codec => getArbitraryWithFallbacks(codec, overrides)),
              E.sequenceArray,
              E.map(arbs => fc.oneof(...arbs).filter(type.is))
            );

      case 'RefinementType':
        return pipe(
          getArbitraryWithFallbacks(type.type, overrides),
          E.map(arb => arb.filter(type.predicate))
        );
    }
  }
  if ('name' in type) {
    // if we cannot find the type, check whether it has been passed as an
    // override and use that instead
    const typeName = type.name;
    if (typeName && overrides[typeName] !== undefined) {
      return E.right(overrides[typeName]);
    }
    return E.left(`Could not create an Arbitrary for ${typeName}. Consider passing in a custom override?`);
  }
  return E.left(`Could not create an Arbitrary. Consider passing in a custom override?`);
}

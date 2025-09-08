import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
  deviceSecret(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
}

export type ImpureCircuits<T> = {
  claim(context: __compactRuntime.CircuitContext<T>,
        latE6_0: bigint,
        lonE6_0: bigint): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  claim(context: __compactRuntime.CircuitContext<T>,
        latE6_0: bigint,
        lonE6_0: bigint): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly round: bigint;
  readonly eventId: Uint8Array;
  readonly latMin: bigint;
  readonly latMax: bigint;
  readonly lonMin: bigint;
  readonly lonMax: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>,
               eventId__0: Uint8Array,
               latMin__0: bigint,
               latMax__0: bigint,
               lonMin__0: bigint,
               lonMax__0: bigint): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;

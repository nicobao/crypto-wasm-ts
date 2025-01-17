import { generateRandomFieldElement, initializeWasm } from '@docknetwork/crypto-wasm';
import {
  IInitialElementsStore,
  Accumulator,
  PositiveAccumulator,
  UniversalAccumulator,
  MembershipWitness,
  WitnessUpdatePublicInfo,
  AccumulatorParams,
  AccumulatorKeypair
} from '../src';
import {
  InMemoryInitialElementsStore,
  InMemoryState,
  InMemoryUniversalState
} from '../src/accumulator/in-memory-persistence';
import { stringToBytes } from './utils';

function getAccum(accumulator: any): PositiveAccumulator | UniversalAccumulator {
  const accumulated = accumulator.accumulated;
  let tempAccumulator;
  if (accumulator instanceof PositiveAccumulator) {
    tempAccumulator = PositiveAccumulator.fromAccumulated(accumulated);
  } else {
    tempAccumulator = UniversalAccumulator.fromAccumulated(accumulated);
  }
  return tempAccumulator;
}

async function runCommonTests(
  keypair: AccumulatorKeypair,
  params: AccumulatorParams,
  accumulator: PositiveAccumulator | UniversalAccumulator,
  state: InMemoryState,
  store?: IInitialElementsStore
) {
  const sk = keypair.sk;
  const pk = keypair.pk;

  const e1 = Accumulator.encodePositiveNumberAsAccumulatorMember(101);
  const e2 = Accumulator.encodePositiveNumberAsAccumulatorMember(102);

  expect(state.state.size).toEqual(0);
  await expect(state.has(e1)).resolves.toEqual(false);

  await accumulator.add(e1, sk, state, store);

  expect(state.state.size).toEqual(1);
  await expect(state.has(e1)).resolves.toEqual(true);

  await expect(accumulator.add(e1, sk, state, store)).rejects.toThrow();

  await expect(accumulator.remove(e2, sk, state)).rejects.toThrow();

  await accumulator.add(e2, sk, state, store);

  expect(state.state.size).toEqual(2);
  await expect(state.has(e2)).resolves.toEqual(true);

  await accumulator.remove(e2, sk, state, store);

  expect(state.state.size).toEqual(1);
  await expect(state.has(e2)).resolves.toEqual(false);

  const e3 = Accumulator.encodePositiveNumberAsAccumulatorMember(103);
  const e4 = Accumulator.encodePositiveNumberAsAccumulatorMember(104);

  await accumulator.addBatch([e3, e4], sk, state, store);

  expect(state.state.size).toEqual(3);
  await expect(state.has(e3)).resolves.toEqual(true);
  await expect(state.has(e4)).resolves.toEqual(true);

  await expect(accumulator.addBatch([e3, e4], sk, state, store)).rejects.toThrow();

  expect(state.state.size).toEqual(3);

  await accumulator.removeBatch([e3, e4], sk, state, store);
  expect(state.state.size).toEqual(1);
  await expect(state.has(e3)).resolves.toEqual(false);
  await expect(state.has(e4)).resolves.toEqual(false);

  await expect(accumulator.removeBatch([e3, e4], sk, state, store)).rejects.toThrow();
  expect(state.state.size).toEqual(1);

  const e5 = Accumulator.encodePositiveNumberAsAccumulatorMember(105);
  const e6 = Accumulator.encodePositiveNumberAsAccumulatorMember(106);

  await accumulator.addRemoveBatches([e5, e6], [e1], sk, state, store);
  expect(state.state.size).toEqual(2);
  await expect(state.has(e5)).resolves.toEqual(true);
  await expect(state.has(e6)).resolves.toEqual(true);
  await expect(state.has(e1)).resolves.toEqual(false);

  const accumulated = accumulator.accumulated;
  let tempAccumulator = getAccum(accumulator);

  expect(
    tempAccumulator.verifyMembershipWitness(e5, await accumulator.membershipWitness(e5, sk, state), pk, params)
  ).toEqual(true);
  expect(
    tempAccumulator.verifyMembershipWitness(e6, await accumulator.membershipWitness(e6, sk, state), pk, params)
  ).toEqual(true);

  const wits = await accumulator.membershipWitnessesForBatch([e5, e6], sk, state);
  expect(tempAccumulator.verifyMembershipWitness(e5, wits[0], pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, wits[1], pk, params)).toEqual(true);

  const e7 = Accumulator.encodePositiveNumberAsAccumulatorMember(107);
  const e8 = Accumulator.encodePositiveNumberAsAccumulatorMember(108);

  await accumulator.addBatch([e7, e8], sk, state, store);

  // Witness updates by accumulator manager using secret key
  const newWits = MembershipWitness.updateMultiplePostBatchUpdates(wits, [e5, e6], [e7, e8], [], accumulated, sk);

  tempAccumulator = getAccum(accumulator);
  expect(tempAccumulator.verifyMembershipWitness(e5, newWits[0], pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, newWits[1], pk, params)).toEqual(true);

  // Witness update info created by accumulator manager
  const witnessUpdInfo = WitnessUpdatePublicInfo.new(accumulated, [e7, e8], [], sk);

  // Witness can be updated without secret key using public info
  wits[0].updateUsingPublicInfoPostBatchUpdate(e5, [e7, e8], [], witnessUpdInfo);
  wits[1].updateUsingPublicInfoPostBatchUpdate(e6, [e7, e8], [], witnessUpdInfo);

  expect(tempAccumulator.verifyMembershipWitness(e5, wits[0], pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, wits[1], pk, params)).toEqual(true);

  const e5Wit = await accumulator.membershipWitness(e5, sk, state);
  const e6Wit = await accumulator.membershipWitness(e6, sk, state);

  let e5WitTemp = new MembershipWitness(e5Wit.value);
  let e6WitTemp = new MembershipWitness(e6Wit.value);

  const e9 = Accumulator.encodePositiveNumberAsAccumulatorMember(109);
  const e10 = Accumulator.encodePositiveNumberAsAccumulatorMember(110);
  const e11 = Accumulator.encodePositiveNumberAsAccumulatorMember(111);
  const e12 = Accumulator.encodePositiveNumberAsAccumulatorMember(112);
  const e13 = Accumulator.encodePositiveNumberAsAccumulatorMember(113);
  const e14 = Accumulator.encodePositiveNumberAsAccumulatorMember(114);
  const e15 = Accumulator.encodePositiveNumberAsAccumulatorMember(115);

  const additions = [
    [e9, e10],
    [e11, e12],
    [e13, e14, e15]
  ];
  const removals = [[e7, e8], [e9], []];

  const witUpd1 = WitnessUpdatePublicInfo.new(accumulator.accumulated, additions[0], removals[0], sk);
  await accumulator.addRemoveBatches(additions[0], removals[0], sk, state);

  tempAccumulator = getAccum(accumulator);
  e5WitTemp.updateUsingPublicInfoPostBatchUpdate(e5, additions[0], removals[0], witUpd1);
  e6WitTemp.updateUsingPublicInfoPostBatchUpdate(e6, additions[0], removals[0], witUpd1);
  expect(tempAccumulator.verifyMembershipWitness(e5, e5WitTemp, pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, e6WitTemp, pk, params)).toEqual(true);

  const witUpd2 = WitnessUpdatePublicInfo.new(accumulator.accumulated, additions[1], removals[1], sk);
  await accumulator.addRemoveBatches(additions[1], removals[1], sk, state);

  tempAccumulator = getAccum(accumulator);
  e5WitTemp.updateUsingPublicInfoPostBatchUpdate(e5, additions[1], removals[1], witUpd2);
  e6WitTemp.updateUsingPublicInfoPostBatchUpdate(e6, additions[1], removals[1], witUpd2);
  expect(tempAccumulator.verifyMembershipWitness(e5, e5WitTemp, pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, e6WitTemp, pk, params)).toEqual(true);

  const witUpd3 = WitnessUpdatePublicInfo.new(accumulator.accumulated, additions[2], removals[2], sk);
  await accumulator.addRemoveBatches(additions[2], removals[2], sk, state);

  tempAccumulator = getAccum(accumulator);
  e5WitTemp.updateUsingPublicInfoPostBatchUpdate(e5, additions[2], removals[2], witUpd3);
  e6WitTemp.updateUsingPublicInfoPostBatchUpdate(e6, additions[2], removals[2], witUpd3);
  expect(tempAccumulator.verifyMembershipWitness(e5, e5WitTemp, pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, e6WitTemp, pk, params)).toEqual(true);

  const witUpds = [witUpd1, witUpd2, witUpd3];

  e5Wit.updateUsingPublicInfoPostMultipleBatchUpdates(e5, additions, removals, witUpds);
  e6Wit.updateUsingPublicInfoPostMultipleBatchUpdates(e6, additions, removals, witUpds);

  tempAccumulator = getAccum(accumulator);

  expect(tempAccumulator.verifyMembershipWitness(e5, e5Wit, pk, params)).toEqual(true);
  expect(tempAccumulator.verifyMembershipWitness(e6, e6Wit, pk, params)).toEqual(true);
}

describe('Accumulators type', () => {
  beforeAll(async () => {
    await initializeWasm();
  });

  it('State update', async () => {
    const params = PositiveAccumulator.generateParams();
    const keypair = PositiveAccumulator.generateKeypair(params);
    const posAccumulator = PositiveAccumulator.initialize(params);
    const state = new InMemoryState();

    const members1 = [generateRandomFieldElement(), generateRandomFieldElement(), generateRandomFieldElement()];
    await posAccumulator.addBatch(members1, keypair.secretKey, state);

    const members2 = [generateRandomFieldElement(), generateRandomFieldElement()];
    await posAccumulator.addRemoveBatches(members2, members1, keypair.secretKey, state);
  });

  it('Positive accumulator', async () => {
    const label = stringToBytes('Accumulator params');
    const params = PositiveAccumulator.generateParams(label);
    const keypair = PositiveAccumulator.generateKeypair(params);
    const accumulator = PositiveAccumulator.initialize(params);
    const state = new InMemoryState();
    await runCommonTests(keypair, params, accumulator, state);
  });

  it('Universal accumulator', async () => {
    const params = UniversalAccumulator.generateParams();
    const keypair = UniversalAccumulator.generateKeypair(params);
    const store = new InMemoryInitialElementsStore();
    const maxSize = 20;
    const accumulator1 = await UniversalAccumulator.initialize(maxSize, params, keypair.secretKey, store);

    const fixed = UniversalAccumulator.fixedInitialElements();
    expect(store.store.size).toEqual(maxSize + fixed.length + 1);
    for (const i of fixed) {
      await expect(store.has(i)).resolves.toEqual(true);
    }
    const state1 = new InMemoryUniversalState();
    await runCommonTests(keypair, params, accumulator1, state1, store);

    const nm1 = Accumulator.encodePositiveNumberAsAccumulatorMember(500);
    const nm1Wit = await accumulator1.nonMembershipWitness(nm1, state1, keypair.secretKey, params, store, 2);

    let tempAccumulator = getAccum(accumulator1) as UniversalAccumulator;
    expect(tempAccumulator.verifyNonMembershipWitness(nm1, nm1Wit, keypair.publicKey, params)).toEqual(true);

    const nm2 = Accumulator.encodePositiveNumberAsAccumulatorMember(501);
    const nm3 = Accumulator.encodePositiveNumberAsAccumulatorMember(502);

    const [nm2Wit, nm3Wit] = await accumulator1.nonMembershipWitnessesForBatch(
      [nm2, nm3],
      state1,
      keypair.secretKey,
      params,
      store,
      3
    );
    expect(tempAccumulator.verifyNonMembershipWitness(nm2, nm2Wit, keypair.publicKey, params)).toEqual(true);
    expect(tempAccumulator.verifyNonMembershipWitness(nm3, nm3Wit, keypair.publicKey, params)).toEqual(true);
  });
});

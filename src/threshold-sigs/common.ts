import { BytearrayWrapper } from '../bytearray-wrapper';
import { generateGadgetVectorForThresholdSig } from '@docknetwork/crypto-wasm';

export class GadgetVector extends BytearrayWrapper {
  static generate(label: Uint8Array): GadgetVector {
    return new GadgetVector(generateGadgetVectorForThresholdSig(label))
  }
}

export class ThresholdPublicKey extends BytearrayWrapper {}

export class ThresholdBbsPlusSignatureShare extends BytearrayWrapper {}

export class ThresholdBbsSignatureShare extends BytearrayWrapper {}

export class BaseOTOutput extends BytearrayWrapper {}

export class Commitments extends BytearrayWrapper {}

export class CommitmentsForZeroSharing extends BytearrayWrapper {}

export class Shares extends BytearrayWrapper {}

export class ZeroShares extends BytearrayWrapper {}

export class Message1 extends BytearrayWrapper {}

export class Message2 extends BytearrayWrapper {}

export abstract class ThresholdSigner {
  // Id of this signer
  readonly id: number;
  readonly others: Set<number>;
  // Number of signatures to be produces in this execution of threshold signing
  readonly sigBatchSize: number;
  // Id of this execution of the threshold signing. Use different ids in different protocol executions.
  readonly protocolId: Uint8Array;

  comms?: Commitments;
  commsForZero?: Map<number, CommitmentsForZeroSharing>;

  msg1s?: Map<number, Message1>;
  msg2s?: Map<number, Message2>;

  private round1State?: Uint8Array;
  protected round1Output?: Uint8Array;
  private round2State?: Uint8Array;
  protected round2Output?: Uint8Array;

  constructor(id: number, others: Set<number>, sigBatchSize: number, protocolId: Uint8Array) {
    this.id = id;
    this.others = others;
    this.sigBatchSize = sigBatchSize;
    this.protocolId = protocolId;
  }

  startRound1(): [Commitments, Map<number, CommitmentsForZeroSharing>] {
    const r = this.startRound1Func()(this.sigBatchSize, this.id, this.others, this.protocolId);
    this.round1State = r[0];
    this.comms = new Commitments(r[1]);
    this.commsForZero = new Map();
    for (const [i, c] of r[2]) {
      this.commsForZero.set(i, new CommitmentsForZeroSharing(c));
    }
    return [this.comms, this.commsForZero]
  }

  processReceivedCommitments(senderId: number, comms: Commitments, commsZeroShare: CommitmentsForZeroSharing) {
    this.ensureRound1Started();
    this.round1State = this.processCommFunc()(this.round1State as Uint8Array, senderId, comms.value, commsZeroShare.value)
  }

  getSharesForOtherSigner(signerId: number): [Shares, ZeroShares] {
    this.ensureRound1Started();
    const [s, z] = this.getSharesForOtherFunc()(this.round1State as Uint8Array, signerId);
    return [new Shares(s), new ZeroShares(z)];
  }

  getSharesForOtherSigners(signerIds: number[]): [Shares, ZeroShares][] {
    this.ensureRound1Started();
    const lst = this.getSharesForOthersFunc()(this.round1State as Uint8Array, signerIds);
    return lst.map(([s, z]) => [new Shares(s), new ZeroShares(z)]);
  }

  processReceivedShares(senderId: number, shares: Shares, zeroShares: ZeroShares) {
    this.ensureRound1Started();
    this.round1State = this.processSharesFunc()(this.round1State as Uint8Array, senderId, shares.value, zeroShares.value)
  }

  startRound2(baseOTOut: BaseOTOutput, gadgetVector: GadgetVector): Map<number, Message1> {
    this.ensureRound1Finished();
    const r = this.startRound2Func()(this.id, this.others, this.round1Output as Uint8Array, baseOTOut.value, gadgetVector.value);
    this.round2State = r[0];
    this.msg1s = new Map();
    for (const [i, m] of r[1]) {
      this.msg1s.set(i, new Message1(m));
    }
    return this.msg1s
  }

  processReceivedMsg1(senderId: number, msg: Message1, gadgetVector: GadgetVector): Message2 {
    this.ensureRound2Started();
    const r = this.recvMsg1Func()(this.round2State as Uint8Array, senderId, msg.value, gadgetVector.value);
    this.round2State = r[0];
    const m = new Message2(r[1]);
    if (this.msg2s === undefined) {
      this.msg2s = new Map();
    }
    this.msg2s.set(senderId, m);
    return m;
  }

  processReceivedMsg2(senderId: number, msg: Message2, gadgetVector: GadgetVector) {
    this.ensureRound2Started();
    this.round2State = this.recvMsg2Func()(this.round2State as Uint8Array, senderId, msg.value, gadgetVector.value);
  }

  finishRound2() {
    this.ensureRound2Started();
    this.round2Output = this.finishRound2Func()(this.round2State as Uint8Array);
  }

  protected finishR1(secretKey: Uint8Array) {
    this.ensureRound1Started();
    this.round1Output = this.finishRound1Func()(this.round1State as Uint8Array, secretKey)
  }

  hasStarted(): boolean {
    return this.round1State !== undefined
  }

  hasFinishedRound1(): boolean {
    return this.round1Output !== undefined
  }

  hasStartedRound2(): boolean {
    return this.round2State !== undefined
  }

  hasFinishedRound2(): boolean {
    return this.round2Output !== undefined
  }

  ensureRound1Started() {
    if (!this.hasStarted()) {
      throw new Error(`Round 1 has not started yet`);
    }
  }

  ensureRound1Finished() {
    if (!this.hasFinishedRound1()) {
      throw new Error(`Round 1 has not finished yet`);
    }
  }

  ensureRound2Started() {
    if (!this.hasStartedRound2()) {
      throw new Error(`Round 2 has not started yet`);
    }
  }

  ensureRound2Finished() {
    if (!this.hasFinishedRound2()) {
      throw new Error(`Round 2 has not finished yet`);
    }
  }

  protected abstract startRound1Func(): (sigBatchSize: number, participantId: number, others: Set<number>, protocolId: Uint8Array) => [Uint8Array, Uint8Array, Map<number, Uint8Array>];

  protected abstract processCommFunc(): (phase1: Uint8Array, senderId: number, commitments: Uint8Array, commitmentsZeroShare: Uint8Array) => Uint8Array;

  protected abstract getSharesForOtherFunc(): (phase1: Uint8Array, otherId: number) => [Uint8Array, Uint8Array];

  protected abstract getSharesForOthersFunc(): (phase1: Uint8Array, otherIds: number[]) => [Uint8Array, Uint8Array][];

  protected abstract processSharesFunc(): (phase1: Uint8Array, senderId: number, shares: Uint8Array, zeroShares: Uint8Array) => Uint8Array;

  protected abstract finishRound1Func(): (phase1: Uint8Array, secretKey: Uint8Array) => Uint8Array;

  protected abstract startRound2Func(): (participantId: number, others: Set<number>, phase1Output: Uint8Array, baseOTOutput: Uint8Array, gadgetVector: Uint8Array) => [Uint8Array, Map<number, Uint8Array>];

  protected abstract recvMsg1Func(): (phase2: Uint8Array, senderId: number, message: Uint8Array, gadgetVector: Uint8Array) => [Uint8Array, Uint8Array];

  protected abstract recvMsg2Func(): (phase2: Uint8Array, senderId: number, message: Uint8Array, gadgetVector: Uint8Array) => Uint8Array;

  protected abstract finishRound2Func(): (phase2: Uint8Array) => Uint8Array;
}

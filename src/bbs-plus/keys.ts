import {
  bbsPlusGenerateKeyPairG1,
  bbsPlusGenerateKeyPairG2,
  bbsPlusGeneratePublicKeyG2,
  bbsPlusGeneratePublicKeyG1,
  bbsPlusIsPublicKeyG2Valid,
  bbsPlusIsPublicKeyG1Valid
} from '@docknetwork/crypto-wasm';
import { BBSPlusSignatureParamsG1, BBSPlusSignatureParamsG2 } from './params';
import { BytearrayWrapper } from '../bytearray-wrapper';

export abstract class BBSPlusPublicKey extends BytearrayWrapper {
  abstract isValid(): boolean;
}

export class BBSPlusPublicKeyG1 extends BBSPlusPublicKey {
  isValid(): boolean {
    return bbsPlusIsPublicKeyG1Valid(this.value);
  }
}

export class BBSPlusPublicKeyG2 extends BBSPlusPublicKey {
  isValid(): boolean {
    return bbsPlusIsPublicKeyG2Valid(this.value);
  }
}

export class BBSPlusSecretKey extends BytearrayWrapper {
  generatePublicKeyG1(params: BBSPlusSignatureParamsG2): BBSPlusPublicKeyG1 {
    return new BBSPlusPublicKeyG1(bbsPlusGeneratePublicKeyG1(this.value, params.value));
  }

  generatePublicKeyG2(params: BBSPlusSignatureParamsG1): BBSPlusPublicKeyG2 {
    return new BBSPlusPublicKeyG2(bbsPlusGeneratePublicKeyG2(this.value, params.value));
  }
}

export abstract class BBSPlusKeypair {
  sk: BBSPlusSecretKey;
  pk: BBSPlusPublicKey;

  constructor(sk: BBSPlusSecretKey, pk: BBSPlusPublicKey) {
    this.sk = sk;
    this.pk = pk;
  }

  get secretKey(): BBSPlusSecretKey {
    return this.sk;
  }

  get publicKey(): BBSPlusPublicKey {
    return this.pk;
  }
}

export class BBSPlusKeypairG1 extends BBSPlusKeypair {
  static generate(params: BBSPlusSignatureParamsG2, seed?: Uint8Array): BBSPlusKeypairG1 {
    const keypair = bbsPlusGenerateKeyPairG1(params.value, seed);
    return new BBSPlusKeypairG1(new BBSPlusSecretKey(keypair.secret_key), new BBSPlusPublicKeyG1(keypair.public_key));
  }
}

export class BBSPlusKeypairG2 extends BBSPlusKeypair {
  static generate(params: BBSPlusSignatureParamsG1, seed?: Uint8Array): BBSPlusKeypairG2 {
    const keypair = bbsPlusGenerateKeyPairG2(params.value, seed);
    return new BBSPlusKeypairG2(new BBSPlusSecretKey(keypair.secret_key), new BBSPlusPublicKeyG2(keypair.public_key));
  }
}

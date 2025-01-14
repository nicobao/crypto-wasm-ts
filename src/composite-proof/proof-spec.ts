import { MetaStatements, Statements } from './statement';
import { SetupParam } from './setup-param';
import { generateProofSpecG1, isProofSpecG1Valid } from '@docknetwork/crypto-wasm';

/**
 * The specification used to construct the proof. This contains all the statements and the meta statements.
 * If you have a lot of `Statements` or `SetupParam`s or they have a large size like for SNARKs, use `QuasiProofSpecG1`
 */
export class ProofSpecG1 {
  value: Uint8Array;

  constructor(
    statements: Statements,
    metaStatements: MetaStatements,
    setupParams?: SetupParam[],
    context?: Uint8Array
  ) {
    const params = (setupParams ?? new Array<SetupParam>()).map((s) => s.value);
    this.value = generateProofSpecG1(statements.values, metaStatements.values, params, context);
  }

  /**
   * Check if the proof spec is valid.
   * @returns
   */
  isValid(): boolean {
    return isProofSpecG1Valid(this.value);
  }
}

/**
 * The specification used to construct the proof. This contains all the statements and the meta statements.
 * The difference between this and `ProofSpecG1` that this does not call WASM to generate a `ProofSpecG1` object that
 * corresponds to the `ProofSpec` struct in Rust. This WASM call be expensive due to the serialization overhead and thus
 * it's advised to use this when there are a lot of `Statements` or `SetupParam`s.
 */
export class QuasiProofSpecG1 {
  statements: Statements;
  metaStatements: MetaStatements;
  setupParams: SetupParam[];
  context?: Uint8Array;

  constructor(
    statements?: Statements,
    metaStatements?: MetaStatements,
    setupParams?: SetupParam[],
    context?: Uint8Array
  ) {
    this.statements = statements || new Statements();
    this.metaStatements = metaStatements || new MetaStatements();
    this.setupParams = setupParams || new Array<SetupParam>();
    this.context = context;
  }

  addStatement(statement: Uint8Array): number {
    return this.statements.add(statement);
  }

  addMetaStatement(metaStatement: Uint8Array): number {
    return this.metaStatements.add(metaStatement);
  }

  addSetupParam(setupParam: SetupParam): number {
    this.setupParams.push(setupParam);
    return this.setupParams.length - 1;
  }

  setContext(context: Uint8Array) {
    this.context = context;
  }

  toProofSpec(): ProofSpecG1 {
    return new ProofSpecG1(this.statements, this.metaStatements, this.setupParams, this.context);
  }
}

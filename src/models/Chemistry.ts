import { ChemicalSymbol, Coefficient } from './common'

export type Type = 'error'|'element'|'bracket'|'compound'|'ion'|'term'|'expr'|'statement'|'electron';
export type State = ''|'(s)'|'(l)'|'(g)'|'(m)'|'(aq)';
export type Arrow = 'SArr'|'DArr';
export type Molecule = Element | Compound;
export type Result = Statement | Expression | Term | ParseError;

interface ASTNode {
    type: Type;
}

export interface ParseError extends ASTNode {
    type: 'error';
    value: string;
    expected: string[];
    loc: [number, number];
}

export interface Element extends ASTNode {
    type: 'element';
    value: ChemicalSymbol;
    coeff: number;
}

export interface Bracket extends ASTNode {
    type: 'bracket';
    compound: Compound;
    coeff: number;
}

export interface Compound extends ASTNode {
    type: 'compound';
    head: Element | Bracket;
    tail: Element | Bracket | Compound;
}

export interface Ion extends ASTNode {
    type: 'ion';
    molecule: Molecule;
    charge: number;
    chain?: Ion;
}

// Internal interface to make typing easier
interface Electron extends ASTNode {
    type: 'electron';
}

export interface Term extends ASTNode {
    type: 'term';
    value: Ion | Compound | Electron;
    coeff: Coefficient;
    state: State;
    hydrate: number;
    isElectron: boolean;
    isHydrate: boolean;
}

export interface Expression extends ASTNode {
    type: 'expr';
    term: Term;
    rest: Expression | Term;
}

export interface Statement extends ASTNode {
    type: 'statement';
    left: Expression | Term;
    right: Expression | Term;
    arrow: Arrow;
}

export interface ChemAST {
    result: Result;
}

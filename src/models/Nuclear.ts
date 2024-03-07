import { ChemicalSymbol, Coefficient } from './common'

export type ParticleString = 'alphaparticle'|'betaparticle'|'gammaray'|'gammaray'|'neutrino'|'antineutrino'|'electron'|'positron'|'neutron'|'proton';
export type Type = 'error'|'particle'|'isotope'|'term'|'expr'|'statement';
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
export function isParseError(node: ASTNode): node is ParseError {
    return node.type === 'error';
}

export interface Particle extends ASTNode {
    type: 'particle';
    particle: ParticleString;
    mass: number;
    atomic: number;
}
export function isParticle(node: ASTNode): node is Particle {
    return node.type === 'particle';
}

export interface Isotope extends ASTNode {
    type: 'isotope';
    element: ChemicalSymbol;
    mass: number;
    atomic: number;
    charge: number;
}
export function isIsotope(node: ASTNode): node is Isotope {
    return node.type === 'isotope';
}

export interface Term extends ASTNode {
    type: 'term';
    value: Isotope | Particle;
    coeff: Coefficient;
    isParticle: boolean;
}
export function isTerm(node: ASTNode): node is Term {
    return node.type === 'term';
}

export interface Expression extends ASTNode {
    type: 'expr';
    term: Term;
    rest: Expression | Term;
}
export function isExpression(node: ASTNode): node is Expression {
    return node.type === 'expr';
}

export interface Statement extends ASTNode {
    type: 'statement';
    left: Expression | Term;
    right: Expression | Term;
}
export function isStatement(node: ASTNode): node is Statement {
    return node.type === 'statement';
}

export interface NuclearAST {
    result: Result;
}

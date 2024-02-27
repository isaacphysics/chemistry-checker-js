import { ChemicalSymbol, Coefficient } from './common'

export type ParticleString = 'alphaparticle'|'betaparticle'|'gammaray'|'gammaray'|'neutrino'|'antineutrino'|'electron'|'positron'|'neutron'|'proton';
export type Type = 'error'|'particle'|'isotope'|'term'|'expr'|'statement';
export type Result = Statement | Expression | Term;

interface ASTNode {
    type: Type;
}

export interface ParseError extends ASTNode {
    type: 'error';
    value: string;
    loc: [number, number];
}

export interface Particle extends ASTNode {
    type: 'particle';
    particle: ParticleString;
    mass: number;
    atomic: number;
}

export interface Isotope extends ASTNode {
    type: 'isotope';
    element: ChemicalSymbol;
    mass: number;
    atomic: number;
    charge: number;
}

export interface Term extends ASTNode {
    type: 'term';
    value: Isotope | Particle;
    coeff: Coefficient;
    isParticle: boolean;
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
}

export interface ChemAST {
    result: Result;
}

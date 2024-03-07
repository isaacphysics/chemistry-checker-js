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
    rest?: Expression | Term;
    terms?: Term[];
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

function flattenNode<T extends ASTNode>(node: T): T {
    // The if statements signal to the type checker what we already know
    switch (node.type) {
        case "expr": {
            if(isExpression(node)) {
                let terms: Term[] = [];

                // Recursively flatten
                if (node.rest) {
                    const flatTerms: Expression | Term = flattenNode(node.rest);

                    if (isExpression(flatTerms)) {
                        terms = flatTerms.terms ?? [];
                    } else {
                        terms = [flatTerms];
                    }

                    // Append the current term
                    terms.push(node.term);

                    // Update and return the node
                    node.terms = terms;
                    delete node.rest;
                    return node;
                }
            }
        }

        // Nodes with subtrees but no lists
        case "statement": {
            if (isStatement(node)) {
                node.left = flattenNode(node.left);
                node.right = flattenNode(node.right);
                return node;
            }
        }

        // Leaves of the AST
        case "term": // Term doesn't have subtrees that could be flattened
        case "error":
        case "particle":
        case "isotope": return node;
    }
}

export function flatten(ast: NuclearAST): NuclearAST {
    const flatResult: Result = flattenNode(ast.result);
    return { result: flatResult };
}

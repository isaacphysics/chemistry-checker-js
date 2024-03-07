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
export function isParseError(node: ASTNode): node is ParseError {
    return node.type === 'error';
}

export interface Element extends ASTNode {
    type: 'element';
    value: ChemicalSymbol;
    coeff: number;
}
export function isElement(node: ASTNode): node is Element {
    return node.type === 'element';
}

export interface Bracket extends ASTNode {
    type: 'bracket';
    compound: Compound;
    coeff: number;
}
export function isBracket(node: ASTNode): node is Bracket {
    return node.type === 'bracket';
}

export interface Compound extends ASTNode {
    type: 'compound';
    head: Element | Bracket;
    tail?: Element | Bracket | Compound;
    elements?: (Element | Bracket)[];
}
export function isCompound(node: ASTNode): node is Compound {
    return node.type === 'compound';
}

export interface Ion extends ASTNode {
    type: 'ion';
    molecule: Molecule;
    charge: number;
    chain?: Ion;
    molecules?: Molecule[];
    charges?: number[];
}
export function isIon(node: ASTNode): node is Ion {
    return node.type === 'ion';
}

// Internal interface to make typing easier
interface Electron extends ASTNode {
    type: 'electron';
}
export function isElectron(node: ASTNode): node is Electron {
    return node.type === 'electron';
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
    arrow: Arrow;
}
export function isStatement(node: ASTNode): node is Statement {
    return node.type === 'statement';
}

export interface ChemAST {
    result: Result;
}

function flattenNode<T extends ASTNode>(node: T): T {
    // The if statements signal to the type checker what we already know
    switch (node.type) {
        case "compound": {
            if (isCompound(node)) {
                // Recursively flatten
                let elements: (Element | Bracket)[] = [];
                if (node.tail) {
                    const flatTail: Element | Bracket | Compound = flattenNode(node.tail);

                    if (isCompound(flatTail)) {
                        elements = flatTail.elements ?? [];
                    } else {
                        elements = [flatTail]
                    }
                }

                // Append the current element
                elements.push(node.head)

                // Update and return the node
                node.elements = elements;
                delete node.tail;
                return node;
            }
        }
        case "ion": {
            if (isIon(node)) {
                let molecules: Molecule[] = [];
                let charges: number[] = [];

                // Recursively flatten
                if (node.chain) {
                    const flatChain: Ion = flattenNode(node.chain);
                    molecules = flatChain.molecules ?? [];
                    charges = flatChain.charges ?? [];
                }

                // Append the current values
                molecules.push(node.molecule);
                charges.push(node.charge);

                // Update and return the node
                node.molecules = molecules;
                node.charges = charges;
                delete node.chain;
                return node;
            }
        }
        case "expr": {
            if (isExpression(node)) {
                let terms: Term[] = [];

                // Recursively flatten
                if (node.rest) {
                    const flatTerms: Expression | Term = flattenNode(node.rest);

                    if (isExpression(flatTerms)) {
                        terms = flatTerms.terms ?? [];
                    }
                }

                // Append the current term
                terms.push(node.term);

                // Update and return the node
                node.terms = terms;
                delete node.rest;
                return node;
            }
        }

        // Nodes that do not need flattening but have subtrees
        case "bracket": {
            if (isBracket(node)) {
                node.compound = flattenNode(node.compound);
                return node;
            }
        }
        case "term": {
            if (isTerm(node)) {
                node.value = flattenNode(node.value);
                return node;
            }
        }
        case "statement": {
            if (isStatement(node)) {
                node.left = flattenNode(node.left);
                node.right = flattenNode(node.right);
                return node;
            }
        }

        // Leaves of the AST
        case "error":
        case "element":
        case "electron": return node;
    }
}

export function flatten(ast: ChemAST): ChemAST {
    const flatResult: Result = flattenNode(ast.result);
    return { result: flatResult };
}

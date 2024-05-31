import { CheckerResponse, ChemicalSymbol, Coefficient, listComparison } from './common'
import isEqual from "lodash/isEqual";

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
    molecules?: [Molecule, number][];
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

                let flatHead: Element | Bracket = flattenNode(node.head);

                // Append the current flattened head
                elements.push(flatHead)

                // Update and return the node
                node.elements = elements;
                delete node.tail;
                return node;
            }
        }
        case "ion": {
            if (isIon(node)) {
                let molecules: [Molecule, number][] = [];

                // Recursively flatten
                if (node.chain) {
                    const flatChain: Ion = flattenNode(node.chain);
                    molecules = flatChain.molecules ?? [];
                }

                const flatMolecule: Molecule = flattenNode(node.molecule)

                // Append the current values
                molecules.push([flatMolecule, node.charge]);

                // Update and return the node
                node.molecules = molecules;
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
                    } else {
                        terms = [flatTerms];
                    }
                }

                const flatTerm: Term = flattenNode(node.term);

                // Append the current flattened term
                terms.push(flatTerm);

                // Update and return the node
                node.terms = terms;
                delete node.rest;
                return node;
            }
        }

        // Nodes that do not need flattening but have subtrees
        case "bracket": {
            if(isBracket(node)) {
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

function checkCoefficient(coeff1: Coefficient, coeff2: Coefficient): boolean {
    if (coeff1.denominator === 0 || coeff2.denominator === 0) {
        console.error("[server] divide by 0 encountered returning false!");
        return false;
    }
    // a/b = c/d <=> ad = bc given b != 0 and d != 0
    // Comparing integers is far better than floats
    return coeff1.numerator * coeff2.denominator === coeff2.numerator * coeff1.denominator;
}

function typesMatch(compound1: (Element | Bracket)[], compound2: (Element | Bracket)[]): boolean {
    let numElementsDifferent: number = 0;
    let numMoleculesDifferent: number = 0;

    for (let item of compound1) {
        switch (item.type) {
            case "element": {
                numElementsDifferent += 1;
                break;
            }
            case "bracket": {
                numMoleculesDifferent += 1;
                break;
            }
        }
    }

    for (let item of compound2) {
        switch (item.type) {
            case "element": {
                numElementsDifferent -= 1;
                break;
            }
            case "bracket": {
                numMoleculesDifferent -= 1;
                break;
            }
        }
    }

    return numElementsDifferent === 0 && numMoleculesDifferent === 0;
}

function checkNodesEqual(test: ASTNode, target: ASTNode, response: CheckerResponse): CheckerResponse {
    if (isElement(test) && isElement(target)) {
        response.isEqual = response.isEqual &&
            test.value === target.value &&
            test.coeff === target.coeff;
        response.sameCoefficient = response.sameCoefficient && test.coeff === target.coeff;

        if (response.atomCount) {
            response.atomCount[test.value] = (response.atomCount[test.value] ?? 0) + test.coeff;
        } else {
            response.atomCount = {} as Record<ChemicalSymbol, number | undefined>;
            response.atomCount[test.value] = test.coeff;
        }
        return response;
    }
    else if (isBracket(test) && isBracket(target)) {
        const newResponse = checkNodesEqual(test.compound, target.compound, response);

        newResponse.sameCoefficient = newResponse.sameCoefficient && test.coeff === target.coeff;
        newResponse.isEqual = newResponse.isEqual && test.coeff === target.coeff;

        if (newResponse.atomCount) {
            for (const [key, value] of Object.entries(newResponse.atomCount)) {
                newResponse.atomCount[key as ChemicalSymbol] = (value ?? 0) * test.coeff;
            };
        }

        return newResponse;
    }
    else if (isCompound(test) && isCompound(target)) {
        if (test.elements && target.elements) {
            // TODO: allow different expansions

            if (test.elements.length !== target.elements.length) {
                // fail early if molecule lengths not the same
                response.isEqual = false;
                return response;
            }
            if (!typesMatch(test.elements, target.elements)) {
                // fail early if the number of brackets and elements don't match
                response.isEqual = false;
                return response;
            }

            return listComparison(test.elements, target.elements, response, checkNodesEqual);
        } else {
            console.error("[server] Encountered unflattened AST. Returning error");
            response.containsError = true;
            response.error = { message: "Received unflattened AST during checking process." };
            return response;
        }
    }
    else if (isIon(test) && isIon(target)) {
        if (test.molecules && target.molecules) {
            if (test.molecules.length !== target.molecules.length) {
                // fail early if molecule lengths not the same
                response.isEqual = false;
                return response;
            }

            const comparator = (test: [Molecule, number], target: [Molecule, number], response: CheckerResponse): CheckerResponse => {
                const newResponse = checkNodesEqual(test[0], target[0], response);
                newResponse.isEqual = newResponse.isEqual && test[1] === target[1];
                newResponse.chargeCount = (newResponse.chargeCount ?? 0) + test[1];
                return newResponse;
            }
            return listComparison(test.molecules, target.molecules, response, comparator);

        } else {
            console.error("[server] Encountered unflattened AST. Returning error");
            response.containsError = true;
            response.error = { message: "Received unflattened AST during checking process." };
            return response;
        }
    }
    else if (isElectron(test) && isElectron(target)) {
        return response;
    }
    else if (isTerm(test) && isTerm(target)) {
        const newResponse = checkNodesEqual(test.value, target.value, response);

        const coefficientsMatch: boolean = checkCoefficient(test.coeff, target.coeff);
        newResponse.sameCoefficient = newResponse.sameCoefficient && coefficientsMatch;
        newResponse.isEqual = newResponse.isEqual && coefficientsMatch;

        if (!test.isElectron && !target.isElectron) {
            newResponse.sameState = newResponse.sameState && test.state === target.state;
            newResponse.isEqual = newResponse.isEqual && test.state === target.state;
        } // else the 'isEqual' will already be false from the checkNodesEqual above

        if (test.isHydrate && target.isHydrate) {
            // TODO: add a new property stating the hydrate was wrong?
            newResponse.isEqual = newResponse.isEqual && test.hydrate === target.hydrate;
        } // else the 'isEqual' will already be false from the checkNodesEqual above

        return newResponse;
    }
    else if (isExpression(test) && isExpression(target)) {
        if (test.terms && target.terms) {
            if (test.terms.length !== target.terms.length) {
                // TODO: add a new property stating the number of terms was wrong
                // fail early if term lengths not the same
                response.isEqual = false;
                return response;
            }

            return listComparison(test.terms, target.terms, response, checkNodesEqual);
        } else {
            console.error("[server] Encountered unflattened AST. Returning error");
            response.containsError = true;
            response.error = { message: "Received unflattened AST during checking process." };
            return response;
        }
    }
    else if (isStatement(test) && isStatement(target)) {
        const leftResponse = checkNodesEqual(test.left, target.left, response);

        const leftBalanceCount = structuredClone(leftResponse.atomCount);
        const leftChargeCount = structuredClone(leftResponse.chargeCount);
        leftResponse.atomCount = {} as Record<ChemicalSymbol, number>;
        leftResponse.chargeCount = 0;

        const finalResponse = checkNodesEqual(test.right, target.right, leftResponse);

        finalResponse.isEqual = finalResponse.isEqual && test.arrow === target.arrow;
        finalResponse.sameArrow = test.arrow === target.arrow;
        finalResponse.isBalanced = isEqual(leftBalanceCount, finalResponse.atomCount)
        finalResponse.balancedCharge = leftChargeCount === finalResponse.chargeCount;

        return finalResponse;
    } else {
        // There was a type mismatch
        response.isEqual = false;
        return response;
    }
}

export function check(test: ChemAST, target: ChemAST): CheckerResponse {
    const response = {
        containsError: false,
        error: { message: "" },
        expectedType: target.result.type,
        receivedType: test.result.type,
        typeMismatch: false,
        sameState: true,
        sameCoefficient: true,
        isBalanced: true,
        isEqual: true,
        isNuclear: false,
        balanceCount: {} as Record<ChemicalSymbol, number | undefined>,
        chargeCount: 0
    }
    // Return shortcut response
    if (target.result.type === "error" || test.result.type === "error") {
        const message =
            isParseError(target.result) ?
                target.result.value :
                (isParseError(test.result) ? test.result.value : "No error found");

        response.containsError = true;
        response.error = { message: message };
        response.isEqual = false;
        return response;
    }
    if (test.result.type !== target.result.type) {
        response.expectedType = target.result.type;
        response.typeMismatch = true;
        response.isEqual = false;
        return response;
    }

    const newResponse = checkNodesEqual(test.result, target.result, response);
    delete newResponse.chargeCount;
    delete newResponse.atomCount;
    return newResponse;
}

export const exportedForTesting = {
    flattenNode,
    checkNodesEqual
}

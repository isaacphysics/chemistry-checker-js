import { AddFrac, CheckerResponse, ChemicalSymbol, ChemistryOptions, Fraction, listComparison, MultFrac } from './common'
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
    bracketed?: boolean;
    compounded?: boolean;
}
export function isElement(node: ASTNode): node is Element {
    return node.type === 'element';
}

export interface Bracket extends ASTNode {
    type: 'bracket';
    bracket: 'round' | 'square';
    compound: Compound;
    coeff: number;
}
export function isBracket(node: ASTNode): node is Bracket {
    return node.type === 'bracket';
}

export interface Compound extends ASTNode {
    type: 'compound';
    head: Element | Bracket;
    bracketed?: boolean;
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
    chain?: Ion | Molecule;
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
    coeff: Fraction;
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

const STARTING_COEFFICIENT: Fraction = { numerator: 0, denominator: 1 };
const EQUAL_COEFFICIENT: Fraction = { numerator: 1, denominator: 1 };

function augmentNode<T extends ASTNode>(node: T): T {
    // The if statements signal to the type checker what we already know
    switch (node.type) {
        case "compound": {
            if (isCompound(node)) {
                // Recursively augment (preprocess the tree)
                let elements: (Element | Bracket)[] = [];
                if (node.tail) {
                    const augmentedTail: Element | Bracket | Compound = augmentNode(node.tail);

                    if (isCompound(augmentedTail)) {
                        elements = augmentedTail.elements ?? [];
                    } else {
                        elements = [augmentedTail]
                    }
                }

                let augmentedHead: Element | Bracket = augmentNode(node.head);

                // Append the current augmented head
                elements.push(augmentedHead)

                for (let element of elements) {
                    if (isElement(element)) {
                        element.compounded = true;
                    } 

                    if (node.bracketed)  {
                        if (isCompound(element) || isElement(element)) {
                            element.bracketed = true;
                        }
                        else {
                            const errorNode = {
                                type: "error",
                                value: "Received nested brackets during checking process.", 
                            };
                            return errorNode as unknown as T;
                        }
                    }
                }

                // Update and return the node
                node.elements = elements;
                delete node.tail;
                return node;
            }
        }
        case "ion": {
            if (isIon(node)) {
                let molecules: [Molecule, number][] = [];

                // Recursively augmented
                if (node.chain) {
                    const augmentedChain = augmentNode(node.chain);

                    if (isIon(augmentedChain)) {
                        molecules = augmentedChain.molecules ?? [];
                    } else {
                        molecules = [[augmentedChain, 0]]
                    }
                }

                const augmentedMolecule: Molecule = augmentNode(node.molecule)

                // Append the current values
                molecules.push([augmentedMolecule, node.charge]);

                // Update and return the node
                node.molecules = molecules;
                delete node.chain;
                return node;
            }
        }
        case "expr": {
            if (isExpression(node)) {
                let terms: Term[] = [];

                // Recursively augmented
                if (node.rest) {
                    const augmentedTerms: Expression | Term = augmentNode(node.rest);

                    if (isExpression(augmentedTerms)) {
                        terms = augmentedTerms.terms ?? [];
                    } else {
                        terms = [augmentedTerms];
                    }
                }

                const augmentedTerm: Term = augmentNode(node.term);

                // Append the current augmented term
                terms.push(augmentedTerm);

                // Update and return the node
                node.terms = terms;
                delete node.rest;
                return node;
            }
        }

        // Nodes that do not need  to be augmented but have subtrees
        case "bracket": {
            if(isBracket(node)) {
                node.compound.bracketed = true;
                node.compound = augmentNode(node.compound);
                return node;
            }
        }
        case "term": {
            if (isTerm(node)) {
                node.value = augmentNode(node.value);
                return node;
            }
        }
        case "statement": {
            if (isStatement(node)) {
                node.left = augmentNode(node.left);
                node.right = augmentNode(node.right);
                return node;
            }
        }

        // Leaves of the AST
        case "error":
        case "element":
        case "electron": return node;
    }
}

export function augment(ast: ChemAST): ChemAST {
    if (ast) {
        return { result: augmentNode(ast.result) };
    } else {
        return { result: {
            type: 'error',
            value: "The provided AST is empty.",
            expected: [""],
            loc: [0,0]
        }};
    }
}

function checkCoefficient(coeff1: Fraction, coeff2: Fraction): Fraction {
    if (coeff1.denominator === 0 || coeff2.denominator === 0) {
        console.error("[server] divide by 0 encountered returning false!");
        throw new Error("Division by zero is undefined!");
    }

    // a/b = c/d <=> ad = bc given b != 0 and d != 0
    // Comparing integers is far better than floats
    const equalCoefficients = coeff1.numerator * coeff2.denominator === coeff2.numerator * coeff1.denominator; 
    if (equalCoefficients) { return EQUAL_COEFFICIENT; }
    else { return { numerator: coeff1.numerator * coeff2.denominator, denominator: coeff2.numerator * coeff1.denominator }; }
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
        if (!response.options?.allowPermutations || !test.compounded) {
            response.sameElements = response.sameElements && test.value === target.value && test.coeff === target.coeff;
            response.isEqual = response.isEqual && response.sameElements;
        }

        if (test.bracketed) {
            if (response.bracketAtomCount) {
                response.bracketAtomCount[0][test.value] = (response.bracketAtomCount[0][test.value] ?? 0) + test.coeff;
            } else {
                response.bracketAtomCount = [{}] as Record<ChemicalSymbol, number | undefined>[];
                response.bracketAtomCount[0][test.value] = test.coeff;
            }
        } else {
            if (response.termAtomCount) {
                response.termAtomCount[test.value] = (response.termAtomCount[test.value] ?? 0) + test.coeff;
            } else {
                response.termAtomCount = {} as Record<ChemicalSymbol, number | undefined>;
                response.termAtomCount[test.value] = test.coeff;
            }
        }
        return response;
    }
    else if (isBracket(test) && isBracket(target)) {
        const newResponse = checkNodesEqual(test.compound, target.compound, response);

        newResponse.sameBrackets = newResponse.sameBrackets && test.bracket === target.bracket;
        newResponse.sameElements = newResponse.sameElements && test.coeff === target.coeff;
        newResponse.isEqual = newResponse.isEqual && newResponse.sameElements;

        if (newResponse.bracketAtomCount) {
            for (const [key, value] of Object.entries(newResponse.bracketAtomCount[0])) {
                if (newResponse.termAtomCount) {
                    newResponse.termAtomCount[key as ChemicalSymbol] = (newResponse.termAtomCount[key as ChemicalSymbol] ?? 0) + (value ?? 0) * test.coeff;
                }
                else {
                    newResponse.termAtomCount = {} as Record<ChemicalSymbol, number | undefined>;
                    newResponse.termAtomCount[key as ChemicalSymbol] = (value ?? 0) * test.coeff;
                }
            };
            newResponse.bracketAtomCount = [{}] as Record<ChemicalSymbol, number | undefined>[];
        }

        return newResponse;
    }
    else if (isCompound(test) && isCompound(target)) {
        if (test.elements && target.elements) {

            if (!response.options?.allowPermutations) {
                if (!isEqual(test, target)) {
                    if (test.elements.length !== target.elements.length || !typesMatch(test.elements, target.elements)) {
                        // TODO: Implement special cases for certain permutations e.g. reverse of an ion chain
                        response.sameElements = false;
                        response.isEqual = false;             
                    }
                    else {
                        response.isEqual = false;
                    }
                }
            } 

            if (response.options?.allowPermutations && !response.checkingPermutations) {
                const permutationResponse = structuredClone(response);
                permutationResponse.checkingPermutations = true;
                const testResponse = listComparison(test.elements, test.elements, permutationResponse, checkNodesEqual);
                const targetResponse = listComparison(target.elements, target.elements, permutationResponse, checkNodesEqual);

                response.isEqual = response.isEqual && isEqual(testResponse.atomCount, targetResponse.atomCount) 
                                && isEqual(testResponse.termAtomCount, targetResponse.termAtomCount);
                return response
            } 
            
            return listComparison(test.elements, target.elements, response, checkNodesEqual);
        } else {
            console.error("[server] Encountered unaugmented AST. Returning error");
            response.containsError = true;
            response.error = "Received unaugmented AST during checking process.";
            return response;
        }
    }
    else if (isIon(test) && isIon(target)) {
        if (test.molecules && target.molecules) {
            if (test.molecules.length !== target.molecules.length) {
                // fail early if molecule lengths not the same
                response.sameElements = false;
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
            console.error("[server] Encountered unaugmented AST. Returning error");
            response.containsError = true;
            response.error = "Received unaugmented AST during checking process.";
            return response;
        }
    }
    else if (isElectron(test) && isElectron(target)) {
        return response;
    }
    else if (isTerm(test) && isTerm(target)) {
        const newResponse = checkNodesEqual(test.value, target.value, response);

        if (response.options?.allowScalingCoefficients) {
            try {
                const coefficientScalingValue: Fraction = checkCoefficient(test.coeff, target.coeff);

                // If first term: set the scaling value, and coefficients are equal.
                if (isEqual(newResponse.coefficientScalingValue, STARTING_COEFFICIENT)) {
                    newResponse.coefficientScalingValue = coefficientScalingValue; 
                }
                // If not first term: coefficients are equal only if multiplied by an equivalent scaling value.
                else {
                    const scalingValueRatio: Fraction = newResponse.coefficientScalingValue ? checkCoefficient(newResponse.coefficientScalingValue, coefficientScalingValue) : EQUAL_COEFFICIENT;
                    const coefficientsMatch = isEqual(scalingValueRatio, EQUAL_COEFFICIENT)
                    newResponse.sameCoefficient = newResponse.sameCoefficient && coefficientsMatch;
                }
            }
            catch (e) {
                response.containsError = true;
                response.error = (e as Error).message;
                response.isEqual = false;
                return response;
            }
        } else {
            // If coefficients are not allowed to be scaled, they must be exactly equal.
            newResponse.sameCoefficient = newResponse.sameCoefficient && isEqual(test.coeff, target.coeff);
        }

        if (!test.isElectron && !target.isElectron) {
            newResponse.sameState = newResponse.sameState && test.state === target.state;
        } 

        // TODO: add a new property stating the hydrate was wrong?

        if (newResponse.termAtomCount) {
            for (const [key, value] of Object.entries(newResponse.termAtomCount)) {
                if (newResponse.atomCount) {
                    newResponse.atomCount[key as ChemicalSymbol] = AddFrac((newResponse.atomCount[key as ChemicalSymbol] ?? STARTING_COEFFICIENT), MultFrac({numerator: value ?? 0, denominator: 1}, test.coeff));
                }
                else {
                    newResponse.atomCount = {} as Record<ChemicalSymbol, Fraction | undefined>;
                    newResponse.atomCount[key as ChemicalSymbol] = MultFrac({numerator: value ?? 0, denominator: 1}, test.coeff)
                } 
            };
            newResponse.termAtomCount = {} as Record<ChemicalSymbol, number | undefined>;
        }

        return newResponse;
    }
    else if (isExpression(test) && isExpression(target)) {
        if (test.terms && target.terms) {
            if (test.terms.length !== target.terms.length) {
                response.sameElements = false;
                response.isEqual = false;
                return response;
            }

            return listComparison(test.terms, target.terms, response, checkNodesEqual);
        } else {
            console.error("[server] Encountered unaugmented AST. Returning error");
            response.containsError = true;
            response.error = "Received unaugmented AST during checking process.";
            return response;
        }
    }
    else if (isStatement(test) && isStatement(target)) {
        const leftResponse = checkNodesEqual(test.left, target.left, response);

        const leftAtomCount = structuredClone(leftResponse.atomCount);
        const leftChargeCount = structuredClone(leftResponse.chargeCount);
        leftResponse.atomCount = undefined;
        leftResponse.chargeCount = 0;

        const finalResponse = checkNodesEqual(test.right, target.right, leftResponse);

        finalResponse.isEqual = finalResponse.isEqual && test.arrow === target.arrow;
        finalResponse.sameArrow = test.arrow === target.arrow;
        finalResponse.isBalanced = isEqual(leftAtomCount, finalResponse.atomCount);
        
        finalResponse.balancedCharge = leftChargeCount === finalResponse.chargeCount;

        if (finalResponse.sameElements && !finalResponse.isBalanced && !finalResponse.sameCoefficient) { 
            finalResponse.isBalanced = true;
        }

        return finalResponse;
    } else {
        // There was a type mismatch
        response.sameElements = false;
        response.isEqual = false;
        // We must still check the children of the node to get a complete atom acount
        if (test.type == "error") {
            return response;
        } else {
            return checkNodesEqual(test, test, response);
        }
    }
}

export function check(test: ChemAST, target: ChemAST, options: ChemistryOptions): CheckerResponse {
    const response: CheckerResponse = {
        containsError: false,
        expectedType: target.result.type,
        receivedType: test.result.type,
        typeMismatch: false,
        sameState: true,
        sameCoefficient: true,
        sameArrow: true,
        sameBrackets: true,
        sameElements: true,
        isBalanced: true,
        isEqual: true,
        isNuclear: false,
        chargeCount: 0,
        options: options,
        coefficientScalingValue: STARTING_COEFFICIENT,
    }
    // Return shortcut response
    if (test.result.type === "error") {
        const message =
            isParseError(target.result) ?
                target.result.value :
                (isParseError(test.result) ? test.result.value : "No error found");

        response.containsError = true;
        response.error = message;
        response.isEqual = false;
        return response;
    }
    if (target.result.type === "error") {
        // If the target (provided answer in Content) is a syntax error and the student's answer does not match it exactly,
        // then we cannot check further and the student's answer is assumed incorrect
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
    newResponse.isEqual = newResponse.isEqual && newResponse.sameState && newResponse.sameCoefficient && (newResponse.sameBrackets == true);

    delete newResponse.chargeCount;
    delete newResponse.termAtomCount;
    delete newResponse.bracketAtomCount;
    delete newResponse.atomCount;
    return newResponse;
}

export const exportedForTesting = {
    augmentNode,
    checkNodesEqual
}

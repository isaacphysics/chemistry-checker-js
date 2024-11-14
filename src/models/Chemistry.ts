import { AddFrac, CheckerResponse, ChemicalSymbol, ChemistryOptions, Fraction, listComparison, mergeResponses, MultFrac, removeAggregates } from './common'
import isEqual from "lodash/isEqual";

export type Type = 'error'|'element'|'bracket'|'compound'|'ion'|'term'|'expr'|'statement'|'electron';
export type State = ''|'(s)'|'(l)'|'(g)'|'(m)'|'(aq)';
export type Arrow = 'SArr'|'DArr';
export type Molecule = Element | Compound;
export type Result = Statement | Expression | Term | ParseError;

export interface ASTNode {
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
    bracketed?: number;
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
    bracketed?: number;
}
export function isBracket(node: ASTNode): node is Bracket {
    return node.type === 'bracket';
}

export interface Compound extends ASTNode {
    type: 'compound';
    head: Element | Bracket;
    bracketed?: number;
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
    bracketed?: number;
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

export const STARTING_COEFFICIENT: Fraction = { numerator: 0, denominator: 1 };
const EQUAL_COEFFICIENT: Fraction = { numerator: 1, denominator: 1 };

const STARTING_RESPONSE: (options?: ChemistryOptions, coefficientScalingValue?: Fraction) => CheckerResponse = (options, coefficientScalingValue) => { return {
    isNuclear: false,
    containsError: false,
    isBalanced: true,
    isEqual: true,
    typeMismatch: false,
    sameCoefficient: true,
    sameElements: true,
    sameState: true,
    sameHydrate: true,
    sameCharge: true,
    sameArrow: true,
    sameBrackets: true,
    isChargeBalanced: true,
    options: options ?? {},
    coefficientScalingValue: coefficientScalingValue ?? STARTING_COEFFICIENT,
} };

function augmentNode<T extends ASTNode>(node: T): T {
    // The if statements signal to the type checker what we already know
    switch (node.type) {
        case "compound": {
            if (isCompound(node)) {
                // Recursively augment (preprocess the tree)
                let elements: (Element | Bracket)[] = [];
                if (node.tail) {
                    node.tail.bracketed = node.bracketed;
                    const augmentedTail: Element | Bracket | Compound = augmentNode(node.tail);

                    if (isCompound(augmentedTail)) {
                        elements = augmentedTail.elements ?? [];
                    } else {
                        elements = [augmentedTail]
                    }
                }

                node.head.bracketed = node.bracketed;
                let augmentedHead: Element | Bracket = augmentNode(node.head);

                // Append the current augmented head
                elements.push(augmentedHead)

                for (let element of elements) {
                    if (isElement(element)) {
                        element.compounded = true;
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
                    node.chain.bracketed = node.bracketed;
                    const augmentedChain = augmentNode(node.chain);

                    if (isIon(augmentedChain)) {
                        molecules = augmentedChain.molecules ?? [];
                    } else {
                        molecules = [[augmentedChain, 0]]
                    }
                }

                node.molecule.bracketed = node.bracketed;
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
        case "bracket": {
            if(isBracket(node)) {
                // node.bracketed defined the layer of brackets the node is in. If it in unbracketed, node.bracketed is undefined.
                node.compound.bracketed = (node.bracketed ?? 0) + 1
                node.compound = augmentNode(node.compound);
                return node;
            }
        }

        // Nodes that do not need to be augmented but have subtrees
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
        if (item.type === "element") {
            numElementsDifferent += 1;
        } else if (item.type === "bracket") {
            numMoleculesDifferent += 1;
        }
    }

    for (let item of compound2) {
        if (item.type === "element") {
            numElementsDifferent -= 1;
        } else if (item.type === "bracket") {
            numMoleculesDifferent -= 1;
        }
    }

    return numElementsDifferent === 0 && numMoleculesDifferent === 0;
}

function checkNodesEqual(test: ASTNode, target: ASTNode, response: CheckerResponse): CheckerResponse {
    if (isElement(test) && isElement(target)) {
        // If permutations are disallowed or if the element is its own (uncompounded) term, we can directly compare the elements
        if (!response.options?.allowPermutations || !test.compounded) {
            response.sameElements = response.sameElements && test.value === target.value && test.coeff === target.coeff;
            response.isEqual = response.isEqual && response.sameElements;
        }

        // Add the element to the atomCount of the revelent bracket level
        if (test.bracketed) {
            const bracketIndex = test.bracketed - 1;
            if (!response.bracketAtomCount) {
                response.bracketAtomCount = [];
            }

            for (let i = response.bracketAtomCount.length; i <= bracketIndex; i++) {
                response.bracketAtomCount.push({} as Record<ChemicalSymbol, number | undefined>);
            }

            response.bracketAtomCount[bracketIndex][test.value] = (response.bracketAtomCount[bracketIndex][test.value] ?? 0) + test.coeff;
        } else {
            if (!response.termAtomCount) {
                response.termAtomCount = {} as Record<ChemicalSymbol, number | undefined>;
            }

            response.termAtomCount[test.value] = (response.termAtomCount[test.value] ?? 0) + test.coeff;
            response.termChargeCount = (response.termChargeCount ?? 0);
        }
        
        return response;
    }
    else if (isBracket(test) && isBracket(target)) {
        // Check the bracket's children
        const newResponse = checkNodesEqual(test.compound, target.compound, response);
        const bracketIndex = test.compound.bracketed ? test.compound.bracketed - 1 : 0;

        // Set a flag for sameBrackets here, but apply the isEqual check at the end (because of listComparison)
        newResponse.sameBrackets = newResponse.sameBrackets && test.bracket === target.bracket;
        newResponse.sameElements = newResponse.sameElements && test.coeff === target.coeff;
        newResponse.isEqual = newResponse.isEqual && newResponse.sameElements;

        // Add the element to the atomCount of the revelent bracket level
        if (newResponse.bracketAtomCount) {
            for (const [key, value] of Object.entries(newResponse.bracketAtomCount[bracketIndex])) {
                if (bracketIndex > 0) {
                    newResponse.bracketAtomCount[bracketIndex-1][key as ChemicalSymbol] = (newResponse.bracketAtomCount[bracketIndex-1][key as ChemicalSymbol] ?? 0) + (value ?? 0) * test.coeff;
                } else {
                    if (!newResponse.termAtomCount) {
                        newResponse.termAtomCount = {} as Record<ChemicalSymbol, number | undefined>;
                    }
                    newResponse.termAtomCount[key as ChemicalSymbol] = (newResponse.termAtomCount[key as ChemicalSymbol] ?? 0) + (value ?? 0) * test.coeff;
                }
            }

            newResponse.bracketAtomCount.pop();
        }

        // Add the charge to the chargeCount of the revelent bracket level
        if (newResponse.bracketChargeCount) {
            if (bracketIndex > 0) {
                newResponse.bracketChargeCount[bracketIndex-1] = (newResponse.bracketChargeCount[bracketIndex-1] ?? 0) + (newResponse.bracketChargeCount[bracketIndex] ?? 0) * test.coeff;
            } else {
                newResponse.termChargeCount = (newResponse.termChargeCount ?? 0) + (newResponse.bracketChargeCount[bracketIndex] ?? 0) * test.coeff;
            }

            newResponse.bracketChargeCount.pop();
        }
        return newResponse;
    }
    else if (isCompound(test) && isCompound(target)) {
        if (test.elements && target.elements) {
            // If permutations are disallowed, we can attempt to directly compare the elements at this level
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

            // If permutations are allowed, we instead compare the atomCounts of the elements
            if (response.options?.allowPermutations && !response.checkingPermutations) {
                const permutationResponse = structuredClone(response);
                permutationResponse.checkingPermutations = true;

                const testResponse = listComparison(test.elements, test.elements, permutationResponse, checkNodesEqual);
                const targetResponse = listComparison(target.elements, target.elements, permutationResponse, checkNodesEqual);

                response.isEqual = response.isEqual && isEqual(testResponse.atomCount, targetResponse.atomCount) && isEqual(testResponse.termAtomCount, targetResponse.termAtomCount);
                return response
            } 
            
            // Check all permutations of the compound until we get a match
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
            // If permutations are disallowed, we can attempt to directly compare the elements at this level
            if (!response.options?.allowPermutations) {
                if (!isEqual(test, target)) {
                    if (test.molecules.length !== target.molecules.length) {
                        // TODO: Implement special cases for certain permutations e.g. reverse of an ion chain
                        response.sameElements = false;
                        response.isEqual = false;
                    }
                    else {
                        response.isEqual = false;
                    }
                }
            } 

            const comparator = (test: [Molecule, number], target: [Molecule, number], response: CheckerResponse): CheckerResponse => {
                const newResponse = checkNodesEqual(test[0], target[0], response);
                newResponse.sameCharge = newResponse.sameCharge && test[1] === target[1];
                newResponse.isEqual = newResponse.isEqual && (newResponse.sameCharge === true);
                
                if (!test[0].bracketed) {
                    // If not bracketed, add the charge directly to the chargeCount of the term
                    newResponse.termChargeCount = (newResponse.termChargeCount ?? 0) + test[1];
                } else {
                    // If bracketed, add the charge to the chargeCount of the revelent bracket level
                    const bracketIndex = test[0].bracketed - 1;
                    if (!newResponse.bracketChargeCount) {
                        newResponse.bracketChargeCount = []; 
                    }

                    for (let i = newResponse.bracketChargeCount.length; i <= bracketIndex; i++) {
                        newResponse.bracketChargeCount.push(0);
                    }
        
                    newResponse.bracketChargeCount[bracketIndex] = (newResponse.bracketChargeCount[bracketIndex] ?? 0) + test[1];
                }
            
                return newResponse;
            }

            // Check all permutations of the ion chain until we get a match
            return listComparison(test.molecules, target.molecules, response, comparator);
        } else {
            console.error("[server] Encountered unaugmented AST. Returning error");
            response.containsError = true;
            response.error = "Received unaugmented AST during checking process.";
            return response;
        }
    }
    else if (isElectron(test) && isElectron(target)) {
        // There is no need to check electrons, they are always equal
        return response;
    }
    else if (isTerm(test) && isTerm(target)) {
        // Check the term's children
        const newResponse = checkNodesEqual(test.value, target.value, response);

        if (response.options?.allowScalingCoefficients) {
            // If coefficients are allowed to be scaled, the scaling factor must be equivalent for all terms
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

        newResponse.sameState = newResponse.sameState && test.state === target.state;
        newResponse.sameHydrate = newResponse.sameHydrate && test.isHydrate === target.isHydrate && test.hydrate === target.hydrate;

        // Add the term's atomCount (* coefficient) to the overall expression atomCount
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

        // Add the term's chargeCount (* coefficient) to the overall expression chargeCount
        if (newResponse.termChargeCount) {
            if (newResponse.chargeCount) {
                newResponse.chargeCount = AddFrac(newResponse.chargeCount, MultFrac({numerator: newResponse.termChargeCount ?? 0, denominator: 1}, test.coeff));
            }
            else {
                newResponse.chargeCount = MultFrac({numerator: newResponse.termChargeCount ?? 0, denominator: 1}, test.coeff)
            } 
            newResponse.termChargeCount = 0;
        }

        return newResponse;
    }
    else if (isExpression(test) && isExpression(target)) {
        if (test.terms && target.terms) {
            // If the number of terms in the expression is wrong, there is no way they can be equivalent
            if (test.terms.length !== target.terms.length) {
                response.sameElements = false;
                response.isEqual = false;
            }

            // Check all permutations of the expression until we get a match
            return listComparison(test.terms, target.terms, response, checkNodesEqual);
        } else {
            console.error("[server] Encountered unaugmented AST. Returning error");
            response.containsError = true;
            response.error = "Received unaugmented AST during checking process.";
            return response;
        }
    }
    else if (isStatement(test) && isStatement(target)) {
        // Determine responses for both the left and right side of the statement
        let leftResponse = checkNodesEqual(test.left, target.left, response);
        let rightResponse = STARTING_RESPONSE(leftResponse.options, leftResponse.coefficientScalingValue);
        rightResponse = checkNodesEqual(test.right, target.right, rightResponse);

        // Merge the responses so that the final response contains all the information
        const finalResponse = mergeResponses(leftResponse, rightResponse);

        finalResponse.sameArrow = test.arrow === target.arrow;
        finalResponse.isBalanced = isEqual(leftResponse.atomCount, rightResponse.atomCount);
        finalResponse.isChargeBalanced = isEqual(leftResponse.chargeCount, rightResponse.chargeCount);
        // If the equation is imbalanced due to the coefficients, we'd rather give direct feedback about the coefficients
        if (finalResponse.sameElements && !finalResponse.isBalanced && !finalResponse.sameCoefficient) {
            finalResponse.isBalanced = true;
        }

        finalResponse.isEqual = finalResponse.isEqual && finalResponse.sameArrow && finalResponse.isBalanced && finalResponse.isChargeBalanced;

        return finalResponse;
    } else {
        // There was a type mismatch
        response.sameElements = false;
        response.isEqual = false;
        // We must still check the children of the node to get complete aggregate counts
        if (test.type == "error") {
            response.containsError = true;
            response.error = "Error type encountered during checking process.";
            return response;
        } else {
            return checkNodesEqual(test, test, response);
        }
    }
}

export function check(test: ChemAST, target: ChemAST, options: ChemistryOptions): CheckerResponse {
    const response = STARTING_RESPONSE(options);
    response.expectedType = target.result.type;
    response.receivedType = test.result.type;

    if (isEqual(test.result, target.result) && !options.keepAggregates) {
        return response;
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
        response.typeMismatch = true;
        response.isEqual = false;
        return response;
    }

    let newResponse = checkNodesEqual(test.result, target.result, response);
    // We set flags for these properties in checkNodesEqual, but we only apply the isEqual check here due to listComparison
    newResponse.isEqual = newResponse.isEqual && newResponse.sameCoefficient && (newResponse.sameState === true) && (newResponse.sameBrackets === true) && (newResponse.sameHydrate === true);

    if (!newResponse.options?.keepAggregates) {
        newResponse = removeAggregates(newResponse);
    }
    return newResponse;
}

export const exportedForTesting = {
    augmentNode,
    checkNodesEqual
}

import { CheckerResponse, ChemicalSymbol, chemicalSymbol, ChemistryOptions, listComparison, mergeResponses, removeAggregates } from './common'

export type ParticleString = 'alphaparticle'|'betaparticle'|'gammaray'|'neutrino'|'antineutrino'|'electron'|'positron'|'neutron'|'proton';
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
}
export function isIsotope(node: ASTNode): node is Isotope {
    return node.type === 'isotope';
}

export interface Term extends ASTNode {
    type: 'term';
    value: Isotope | Particle;
    coeff: number;
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

function augmentNode<T extends ASTNode>(node: T): T {
    // The if statements signal to the type checker what we already know
    switch (node.type) {
        case "expr": {
            if(isExpression(node)) {
                let terms: Term[] = [];

                // Recursively augment
                if (node.rest) {
                    const augmentedTerms: Expression | Term = augmentNode(node.rest);

                    if (isExpression(augmentedTerms)) {
                        terms = augmentedTerms.terms ?? [];
                    } else {
                        terms = [augmentedTerms];
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
                node.left = augmentNode(node.left);
                node.right = augmentNode(node.right);
                return node;
            }
        }

        // Leaves of the AST
        case "term": // Term doesn't have subtrees that could be augmented
        case "error":
        case "particle":
        case "isotope": return node;
    }
}

export function augment(ast: NuclearAST): NuclearAST {
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

function isValidAtomicNumber(test: Particle | Isotope): boolean {
    if (isIsotope(test)) {
        return chemicalSymbol.indexOf(test.element) + 1 === test.atomic &&
            test.mass > test.atomic;
    }
    switch(test.particle) {
        case "alphaparticle":
            return test.mass === 4 &&
                test.atomic === 2;
        case "betaparticle":
            return test.mass === 0 &&
                test.atomic === -1;
        case "gammaray":
            return test.mass === 0 &&
                test.atomic === 0;
        case "neutrino":
            return test.mass === 0 &&
                test.atomic === 0;
        case "antineutrino":
            return test.mass === 0 &&
                test.atomic === 0;
        case "electron":
            return test.mass === 0 &&
                test.atomic === -1;
        case "positron":
            return test.mass === 0 &&
                test.atomic === 1;
        case "neutron":
            return test.mass === 1 &&
                test.atomic === 0;
        case "proton":
            return test.mass === 1 &&
                test.atomic === 1;
    }
}

function checkParticlesEqual(test: Particle, target: Particle): boolean {
    if (test.particle === "betaparticle" || test.particle === "electron") {
        return target.particle === "betaparticle" || target.particle === "electron";
    } else {
        return test.particle === target.particle;
    }
}

const STARTING_RESPONSE: (options?: ChemistryOptions) => CheckerResponse = (options) => { return {
    isNuclear: true,
    containsError: false,
    isEqual: true,
    isBalanced: true,
    typeMismatch: false,
    sameCoefficient: true,
    sameElements: true,
    validAtomicNumber: true,
    options: options ?? {},
} };

function checkNodesEqual(test: ASTNode, target: ASTNode, response: CheckerResponse): CheckerResponse {
    if (isParticle(test) && isParticle(target)) {
        // Answers can be entered without a mass or atomic number. However, this is always wrong so we throw an error
        if (test.mass === null || test.atomic === null) {
            response.containsError = true;
            response.error = "Check that all atoms have a mass and atomic number!"
            response.isEqual = false;
            return response;
        }

        response.validAtomicNumber = (response.validAtomicNumber ?? true) && isValidAtomicNumber(test);
        response.sameElements = response.sameElements && checkParticlesEqual(test, target);
        response.isEqual = response.isEqual && response.sameElements && response.validAtomicNumber;

        // Add the term's nucleon counts to the term's nucleon count
        if (response.termNucleonCount) {
            response.termNucleonCount = [
                response.termNucleonCount[0] + test.atomic,
                response.termNucleonCount[1] + test.mass
            ];
        } else {
            response.termNucleonCount = [test.atomic, test.mass];
        }

        return response;
    } else if (isIsotope(test) && isIsotope(target)) {
        // Answers can be entered without a mass or atomic number. However, this is always wrong so we throw an error
        if (test.mass === null || test.atomic === null) {
            response.containsError = true;
            response.error = "Check that all atoms have a mass and atomic number!"
            response.isEqual = false;
            return response;
        }

        response.validAtomicNumber = (response.validAtomicNumber ?? true) && isValidAtomicNumber(test) && test.mass === target.mass && test.atomic === target.atomic;
        response.sameElements = response.sameElements && test.element === target.element;
        response.isEqual = response.isEqual && response.sameElements && response.validAtomicNumber;

        // Add the term's nucleon counts to the term's nucleon count
        if (response.termNucleonCount) {
            response.termNucleonCount = [
                response.termNucleonCount[0] + test.atomic,
                response.termNucleonCount[1] + test.mass
            ];
        } else {
            response.termNucleonCount = [test.atomic, test.mass];
        }

        return response;
    } else if (isTerm(test) && isTerm(target)) {
        // If we have a particle-atom mismatch, the elements are not equivalent
        if (test.isParticle !== target.isParticle) {
            response.sameElements = false;
            response.isEqual = false;
        }

        const newResponse = checkNodesEqual(test.value, target.value, response);
        // Set a flag for sameCoefficient here, but apply the isEqual check at the end (because of listComparison)
        newResponse.sameCoefficient = test.coeff === target.coeff;

        // Add the term's nucleon counts to the overall expression nucleon count
        if (newResponse.nucleonCount) {
            newResponse.nucleonCount = [
                newResponse.nucleonCount[0] + (newResponse.termNucleonCount ?? [0,0])[0] * test.coeff,
                newResponse.nucleonCount[1] + (newResponse.termNucleonCount ?? [0,0])[1] * test.coeff,
            ]
        }

        return newResponse;
    } else if (isExpression(test) && isExpression(target)) {
        if (test.terms && target.terms) {
            // If the number of terms in the expression is wrong, there is no way they can be equivalent
            if (test.terms.length !== target.terms.length) {
                response.sameElements = false;
                response.isEqual = false;
            }

            return listComparison(test.terms, target.terms, response, checkNodesEqual);
        } else {
            console.error("[server] Encountered unaugmented AST. Returning error");
            response.containsError = true;
            response.error = "Received unaugmented AST during checking process.";
            return response;
        }
    } else if (isStatement(test) && isStatement(target)) {
        // Determine responses for both the left and right side of the statement
        const leftResponse = checkNodesEqual(test.left, target.left, response); 
        let rightResponse = STARTING_RESPONSE(leftResponse.options);
        rightResponse = checkNodesEqual(test.right, target.right, leftResponse);

        // Merge the responses so that the final response contains all the information
        const finalResponse = mergeResponses(leftResponse, rightResponse);

        // Nuclear question balance is determined by atom/mass count equality
        finalResponse.balancedAtom = leftResponse.nucleonCount && rightResponse.nucleonCount ?
            leftResponse.nucleonCount[0] === rightResponse.nucleonCount[0] : false;
        finalResponse.balancedMass = leftResponse.nucleonCount && rightResponse.nucleonCount ?
            leftResponse.nucleonCount[1] === rightResponse.nucleonCount[1] : false;
        finalResponse.isBalanced = leftResponse.nucleonCount && rightResponse.nucleonCount ?
            finalResponse.balancedAtom && finalResponse.balancedMass : false;
        finalResponse.isEqual = finalResponse.isEqual && finalResponse.isBalanced;

        return finalResponse
    } else {
        // There was a type mismatch
        response.sameElements = false;
        response.isEqual = false;
        // We must still check the children of the node to get a complete nucleon count
        if (test.type == "error") {
            response.containsError = true;
            response.error = "Error type encountered during checking process.";
            return response;
        } else {
            return checkNodesEqual(test, test, response);
        }
    }
}

export function check(test: NuclearAST, target: NuclearAST): CheckerResponse {
    const response = STARTING_RESPONSE();
    response.expectedType = target.result.type;
    response.receivedType = test.result.type;

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
    // We set flags for this properties in checkNodesEqual, but we only apply the isEqual check here due to listComparison
    newResponse.isEqual = newResponse.isEqual && newResponse.sameCoefficient;
    newResponse = removeAggregates(newResponse);
    return newResponse;
}

export const exportedForTesting = {
    checkNodesEqual
}

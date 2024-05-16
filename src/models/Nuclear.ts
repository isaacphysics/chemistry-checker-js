import { CheckerResponse, ChemicalSymbol, ReturnType, chemicalSymbol, listComparison } from './common'

export type ParticleString = 'alphaparticle'|'betaparticle'|'gammaray'|'neutrino'|'antineutrino'|'electron'|'positron'|'neutron'|'proton';
export type Type = 'error'|'particle'|'isotope'|'term'|'expr'|'statement';
export type Result = Statement | Expression | Term | ParseError;

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

function checkNodesEqual(test: ASTNode, target: ASTNode, response: CheckerResponse): CheckerResponse {
    if (isParticle(test) && isParticle(target)) {
        response.isEqual = response.isEqual &&
            test.particle === target.particle &&
            isValidAtomicNumber(test);
        response.validAtomicNumber = isValidAtomicNumber(test);

        if (response.nucleonCount) {
            response.nucleonCount = [
                response.nucleonCount[0] + test.atomic,
                response.nucleonCount[1] + test.mass
            ];
        } else {
            response.nucleonCount = [test.atomic, test.mass];
        }

        return response;
    } else if (isIsotope(test) && isIsotope(target)) {
        response.isEqual = response.isEqual &&
            test.element === target.element &&
            isValidAtomicNumber(test);
        response.validAtomicNumber = isValidAtomicNumber(test);

        if (response.nucleonCount) {
            response.nucleonCount = [
                response.nucleonCount[0] + test.atomic,
                response.nucleonCount[1] + test.mass
            ];
        } else {
            response.nucleonCount = [test.atomic, test.mass];
        }

        return response;
    } else if (isTerm(test) && isTerm(target)) {
        if ((test.isParticle && !target.isParticle) ||
            (!test.isParticle && target.isParticle)) {
            response.isEqual = false;
            return response;
        }

        const newResponse = checkNodesEqual(test.value, target.value, response);

        newResponse.isEqual = newResponse.isEqual &&
            test.coeff === target.coeff;
        newResponse.sameCoefficient = test.coeff === target.coeff;

        if (newResponse.nucleonCount) {
            newResponse.nucleonCount = [
                newResponse.nucleonCount[0] * test.coeff,
                newResponse.nucleonCount[1] * test.coeff,
            ]
        }

        return newResponse;
    } else if (isExpression(test) && isExpression(target)) {
        if (test.terms && target.terms) {
            if (test.terms.length !== target.terms.length) {
                // fail early if molecule lengths not the same
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
    } else if (isStatement(test) && isStatement(target)) {
        const leftResponse = checkNodesEqual(test.left, target.left, response);
        const leftNucleonCount = leftResponse.nucleonCount;
        leftResponse.nucleonCount = [0, 0];

        const finalResponse = checkNodesEqual(test.right, target.right, leftResponse);

        finalResponse.isBalanced = leftNucleonCount && finalResponse.nucleonCount ?
            leftNucleonCount[0] === finalResponse.nucleonCount[0] &&
            leftNucleonCount[1] === finalResponse.nucleonCount[1] :
            false;
        finalResponse.balancedAtom = leftNucleonCount && finalResponse.nucleonCount ?
            leftNucleonCount[0] === finalResponse.nucleonCount[0] :
            false;
        finalResponse.balancedMass = leftNucleonCount && finalResponse.nucleonCount ?
            leftNucleonCount[1] === finalResponse.nucleonCount[1] :
            false;

        return finalResponse
    } else {
        response.isEqual = false;
        return response;
    }
}

export function check(test: NuclearAST, target: NuclearAST): CheckerResponse {
    const response = {
        containsError: false,
        error: { message: "" },
        expectedType: "unknown" as ReturnType,
        typeMismatch: false,
        sameState: true,
        sameCoefficient: true,
        isBalanced: true,
        isEqual: true,
        isNuclear: true,
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
    delete newResponse.nucleonCount;
    return newResponse;
}

export const exportedForTesting = {
    checkNodesEqual
}

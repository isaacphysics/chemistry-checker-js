import { iteratee } from "lodash";
import { Particle, Isotope, Term, Expression, Statement, ParseError, check, NuclearAST, exportedForTesting } from "../../src/models/Nuclear";
import { ChemicalSymbol, CheckerResponse, listComparison } from "../../src/models/common";
const { checkNodesEqual } = exportedForTesting;

const original = console.error;

beforeEach(() => {
    console.error = jest.fn();
});

afterEach(() => {
    console.error = original;
})

// TODO: Add augmenting tests

// Generic response object
const response: CheckerResponse = {
    containsError: false,
    error: { message: "" },
    expectedType: "statement",
    typeMismatch: false,
    sameState: true,
    sameCoefficient: true,
    isBalanced: true,
    isEqual: true,
    isNuclear: true,
    receivedType: "statement",
    allowPermutations: false
};
// Alternative response object
const newResponse: CheckerResponse = {
    containsError: false,
    error: { message: "" },
    expectedType: "unknown",
    typeMismatch: false,
    sameState: false,
    sameCoefficient: false,
    isBalanced: true,
    isEqual: true,
    isNuclear: true,
    receivedType: "unknown",
    allowPermutations: false
};

const trueResponse: CheckerResponse = structuredClone(response);
trueResponse.balancedAtom = true;
trueResponse.balancedMass = true;
trueResponse.validAtomicNumber = true;
const falseResponse: CheckerResponse = structuredClone(newResponse);
falseResponse.isEqual = false;

// Default objects
const particle: Particle = { type: "particle", particle: "alphaparticle", mass: 4, atomic: 2 };
const isotope: Isotope = {
    type: "isotope",
    element: "C",
    mass: 13,
    atomic: 6,
};
const term: Term = {
    type: "term",
    value: structuredClone(isotope),
    coeff: 2,
    isParticle: false
};
const particleTerm: Term = {
    type: "term",
    value: structuredClone(particle),
    coeff: 2,
    isParticle: true
};
const expression: Expression = {
    type: "expr",
    term: structuredClone(term),
    terms: [structuredClone(term), structuredClone(particleTerm)]
}
const statement: Statement = {
    type: "statement",
    left: structuredClone(term),
    right: structuredClone(particleTerm),
}

describe("checkNodesEqual Particle", () => {
    it("Returns truthy CheckerResponse when particles match",
        () => {
            // Act
            const particleCopy: Particle = structuredClone(particle)

            const testResponse = checkNodesEqual(particleCopy, particle, structuredClone(response));

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when particles don't match",
        () => {
            // Act
            const valueMismatch: Particle = structuredClone(particle);
            valueMismatch.particle = "betaparticle";
            valueMismatch.mass = 0;
            valueMismatch.atomic = -1;

            const elementIncorrect = checkNodesEqual(valueMismatch, particle, structuredClone(response));

            // Assert
            expect(elementIncorrect.isEqual).toBeFalsy();
            expect(elementIncorrect.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when atomic number is invalid",
        () => {
            // Act
            const nucleonMismatch: Particle = structuredClone(particle);
            nucleonMismatch.particle = "betaparticle";

            const nucleonIncorrect = checkNodesEqual(nucleonMismatch, particle, structuredClone(response));

            // Assert
            expect(nucleonIncorrect.isEqual).toBeFalsy();
            expect(nucleonIncorrect.validAtomicNumber).toBeFalsy();
        }
    );
});

describe("CheckNodesEqual Isotope", () => {
    it("Returns truthy CheckerResponse when isotope match",
        () => {
            // Act
            const isotopeCopy: Isotope = structuredClone(isotope);

            const testResponse = checkNodesEqual(isotopeCopy, isotope, structuredClone(response));

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when isotope do not match",
        () => {
            const elementMismatch: Isotope = structuredClone(isotope);
            elementMismatch.element = "Cl";
            elementMismatch.mass = 35;
            elementMismatch.atomic = 17;

            const elementIncorrect = checkNodesEqual(elementMismatch, isotope, structuredClone(response));

            // Assert
            expect(elementIncorrect.isEqual).toBeFalsy();
            expect(elementIncorrect.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when atomic number is invalid",
        () => {
            const nucleonMismatch: Isotope = structuredClone(isotope);
            nucleonMismatch.element = "Cl";

            const nucleonIncorrect = checkNodesEqual(nucleonMismatch, isotope, structuredClone(response));

            // Assert
            expect(nucleonIncorrect.isEqual).toBeFalsy();
            expect(nucleonIncorrect.validAtomicNumber).toBeFalsy();
        }
    );
});

describe("CheckNodesEqual Term", () => {
    it("Returns truthy CheckerResponse when terms match",
        () => {
            let termCopy: Term = structuredClone(term);

            let testResponse = checkNodesEqual(termCopy, term, structuredClone(response))
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when terms don't match",
        () => {
            // Mismatched coefficients
            let mismatchTerm: Term = structuredClone(term);
            mismatchTerm.coeff = 3;

            expect(checkNodesEqual(mismatchTerm, term, structuredClone(response)).isEqual).toBeFalsy();
            expect(checkNodesEqual(mismatchTerm, term, structuredClone(response)).sameCoefficient).toBeFalsy();

            // Mismatched type
            expect(checkNodesEqual(particleTerm, term, structuredClone(response)).isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Arrange
            const isotopeError: Isotope = structuredClone(isotope);
            isotopeError.mass = 20;
            isotopeError.atomic = 1;

            const particleCopy: Particle = structuredClone(particle);

            const isotopeErrorTerm: Term = structuredClone(term);
            isotopeErrorTerm.value = isotopeError;
            const particleCopyTerm: Term = structuredClone(particleTerm);
            particleCopyTerm.value = particleCopy;

            const isotopeResponse = checkNodesEqual(isotopeError, isotope, structuredClone(response));
            const particleResponse = checkNodesEqual(particleCopy, particle, structuredClone(response));

            const isotopeTermResponse =
                checkNodesEqual(isotopeErrorTerm, term, structuredClone(response))
            const particleTermResponse =
                checkNodesEqual(particleCopyTerm, particleTerm, structuredClone(response))

            // Assert
            expect(isotopeTermResponse.validAtomicNumber).toBe(isotopeResponse.validAtomicNumber);
            expect(particleTermResponse.validAtomicNumber).toBe(particleResponse.validAtomicNumber);
        }
    );
});

describe("CheckNodesEqual Expression", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Act
            const permutedExpression: Expression = structuredClone(expression);
            permutedExpression.terms?.reverse;

            const testResponse: CheckerResponse = checkNodesEqual(permutedExpression, expression, structuredClone(response));
            // Assert
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Act
            const lengthMismatch: Expression = structuredClone(expression);
            lengthMismatch.terms?.push(structuredClone(term));

            const termMismatch: Expression = structuredClone(expression);
            if (termMismatch.terms) termMismatch.terms[1] = structuredClone(term);

            // Assert
            expect(checkNodesEqual(lengthMismatch, expression, structuredClone(response)).isEqual).toBeFalsy();
            expect(checkNodesEqual(termMismatch, expression, structuredClone(response)).isEqual).toBeFalsy();
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            // This is the same as expression just unaugmented
            const unaugmentedExpression: Expression = {
                type: "expr",
                term: structuredClone(term),
                rest: structuredClone(particleTerm)
            }

            // Assert
            expect(checkNodesEqual(unaugmentedExpression, expression, structuredClone(response)).containsError).toBeTruthy();
            expect(checkNodesEqual(unaugmentedExpression, expression, structuredClone(response)).error).toEqual(
                { message: "Received unaugmenttened AST during checking process." }
            );

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("CheckNodesEqual Statement", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Act
            const copy: Statement = structuredClone(statement);

            const copyResult: CheckerResponse = checkNodesEqual(copy, statement, structuredClone(response));

            // Assert
            expect(copyResult.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Act
            const swappedExpressions: Statement = structuredClone(statement);
            const tempExpression = swappedExpressions.left;
            swappedExpressions.left = swappedExpressions.right;
            swappedExpressions.right = tempExpression;

            const swapResult = checkNodesEqual(swappedExpressions, statement, structuredClone(response));

            // Assert
            expect(swapResult.isEqual).toBeFalsy();
        }
    );
    it("Correctly checks whether statements are balanced",
        () => {
            // Arrange
            const balancedStatement: Statement = structuredClone(statement);
            balancedStatement.right = structuredClone(term);

            // Act
            const balancedResponse = checkNodesEqual(balancedStatement, balancedStatement, structuredClone(response));
            const unbalancedResponse = checkNodesEqual(statement, statement, structuredClone(response));

            // Assert
            expect(balancedResponse.isBalanced).toBeTruthy();
            expect(balancedResponse.balancedAtom).toBeTruthy();
            expect(balancedResponse.balancedMass).toBeTruthy();

            expect(unbalancedResponse.isBalanced).toBeFalsy();
            expect(unbalancedResponse.balancedAtom).toBeFalsy();
            expect(unbalancedResponse.balancedMass).toBeFalsy();
        }
    );
});

describe("Check", () => {
    const balancedStatement: Statement = {
        type: "statement",
        left: structuredClone(term),
        right: structuredClone(term),
    }
    const ast: NuclearAST = {
        result: structuredClone(balancedStatement)
    }

    it("Returns error message when given one",
        () => {
            // Act
            const error: ParseError = {
                type: "error",
                value: "Sphinx of black quartz, judge my vow",
                expected: [],
                loc: [0, 0]
            };
            const errorAST: NuclearAST = {
                result: error
            }

            const response: CheckerResponse = check(errorAST, ast);
            // Assert
            expect(response.error).toBeDefined();
            expect(response.error?.message).toBe("Sphinx of black quartz, judge my vow");
            expect(response.expectedType).toBe("statement");
        }
    );
    it("Returns type mismatch when appropriate",
        () => {
            // Act
            const expressionAST: NuclearAST = {
                result: structuredClone(expression)
            }

            const response: CheckerResponse = check(ast, expressionAST);
            // Assert
            expect(response.typeMismatch).toBeTruthy();
            expect(response.expectedType).toBe("expr");
        }
    );
    it("Returns truthy CheckerResponse when ASTs match",
        () => {
            // Act
            const response: CheckerResponse = check(ast, ast);

            // Assert
            expect(response).toEqual(trueResponse);
        }
    );
});

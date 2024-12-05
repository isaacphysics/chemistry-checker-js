import { Particle, Isotope, Term, Expression, Statement, ParseError, check, NuclearAST, exportedForTesting, Result, ASTNode, augmentNode } from "../../src/models/Nuclear";
import { CheckerResponse, ChemistryOptions } from "../../src/models/common";

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
    expectedType: "statement",
    receivedType: "statement",
    typeMismatch: false,
    sameCoefficient: true,
    sameElements: true,
    isBalanced: true,
    isEqual: true,
    isNuclear: true,
    options: {}
}
// Alternative response object
const newResponse: CheckerResponse = {
    containsError: false,
    expectedType: "statement",
    receivedType: "statement",
    typeMismatch: false,
    sameCoefficient: true,
    sameElements: true,
    isBalanced: true,
    isEqual: true,
    isNuclear: true,
    options: {}
}

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
    rest: structuredClone(particleTerm)
}
const augmentedExpression: Expression = augmentNode(structuredClone(expression));

const statement: Statement = {
    type: "statement",
    left: structuredClone(term),
    right: structuredClone(expression),
}
const augmentedStatement: Statement = augmentNode(structuredClone(statement));

function testCheck<T extends ASTNode>(target: T, test: T, options?: ChemistryOptions): CheckerResponse {
    return check({result: augmentNode(structuredClone(target)) as unknown as Result}, {result: augmentNode(structuredClone(test)) as unknown as Result}, options ?? {});
}
function unaugmentedTestCheck<T extends ASTNode>(target: T, test: T, options?: ChemistryOptions): CheckerResponse {
    return check(structuredClone({result: target as unknown as Result}), structuredClone({result: test as unknown as Result}), options ?? {});
}

describe("testCheck Particle", () => {
    it("Returns truthy CheckerResponse when particles match",
        () => {
            // Arrange
            const particleCopy: Particle = structuredClone(particle)

            // Act
            const testResponse = testCheck(particleCopy, particle);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when particles don't match",
        () => {
            // Arrange
            const valueMismatch: Particle = structuredClone(particle);
            valueMismatch.particle = "betaparticle";
            valueMismatch.mass = 0;
            valueMismatch.atomic = -1;

            // Act
            const elementIncorrect = testCheck(valueMismatch, particle);

            // Assert
            expect(elementIncorrect.isEqual).toBeFalsy();
            expect(elementIncorrect.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when atomic number is invalid",
        () => {
            // Arrange
            const nucleonMismatch: Particle = structuredClone(particle);
            nucleonMismatch.particle = "betaparticle";

            // Act
            const nucleonIncorrect = testCheck(nucleonMismatch, particle);

            // Assert
            expect(nucleonIncorrect.isEqual).toBeFalsy();
            expect(nucleonIncorrect.validAtomicNumber).toBeFalsy();
        }
    );
});

describe("testCheck Isotope", () => {
    it("Returns truthy CheckerResponse when isotope match",
        () => {
            // Arrange
            const isotopeCopy: Isotope = structuredClone(isotope);

            // Act
            const testResponse = testCheck(isotopeCopy, isotope);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when isotope do not match",
        () => {
            // Arrange
            const elementMismatch: Isotope = structuredClone(isotope);
            elementMismatch.element = "Cl";
            elementMismatch.mass = 35;
            elementMismatch.atomic = 17;

            // Act
            const elementIncorrect = testCheck(elementMismatch, isotope);

            // Assert
            expect(elementIncorrect.isEqual).toBeFalsy();
            expect(elementIncorrect.validAtomicNumber).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when atomic number is invalid",
        () => {
            // Arrange
            const nucleonMismatch: Isotope = structuredClone(isotope);
            nucleonMismatch.element = "Cl";

            // Act
            const nucleonIncorrect = testCheck(nucleonMismatch, isotope);

            // Assert
            expect(nucleonIncorrect.isEqual).toBeFalsy();
            expect(nucleonIncorrect.validAtomicNumber).toBeFalsy();
        }
    );
});

describe("testCheck Term", () => {
    it("Returns truthy CheckerResponse when terms match",
        () => {
            // Arrange
            const termCopy: Term = structuredClone(term);

            // Act
            const testResponse = testCheck(termCopy, term)

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when terms don't match",
        () => {
            // Arrange
            const mismatchTerm: Term = structuredClone(term);
            mismatchTerm.coeff = 3;

            // Act
            const termIncorrect = testCheck(mismatchTerm, term);
            const typeIncorrect = testCheck(particleTerm, term);

            // Assert
            expect(termIncorrect.isEqual).toBeFalsy();
            expect(termIncorrect.sameCoefficient).toBeFalsy();

            // Mismatched type
            expect(typeIncorrect.isEqual).toBeFalsy();
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

            // Act
            const isotopeResponse = testCheck(isotopeError, isotope);
            const particleResponse = testCheck(particleCopy, particle);

            const isotopeTermResponse = testCheck(isotopeErrorTerm, term)
            const particleTermResponse = testCheck(particleCopyTerm, particleTerm)

            // Assert
            expect(isotopeTermResponse.validAtomicNumber).toBe(isotopeResponse.validAtomicNumber);
            expect(particleTermResponse.validAtomicNumber).toBe(particleResponse.validAtomicNumber);
        }
    );
});

describe("testCheck Expression", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Arrange
            const permutedExpression: Expression = structuredClone(augmentedExpression);
            permutedExpression.terms?.reverse;

            // Act
            const testResponse: CheckerResponse = unaugmentedTestCheck(permutedExpression, augmentedExpression);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Arrange
            const lengthMismatch: Expression = structuredClone(augmentedExpression);
            lengthMismatch.terms?.push(structuredClone(term))

            const termMismatch: Expression = structuredClone(augmentedExpression);
            if (termMismatch.terms) termMismatch.terms[1] = structuredClone(particleTerm);

            // Act
            const lengthIncorrect = unaugmentedTestCheck(lengthMismatch, augmentedExpression);
            const termIncorrect = unaugmentedTestCheck(termMismatch, augmentedExpression);

            // Assert
            expect(lengthIncorrect.isEqual).toBeFalsy();
            expect(termIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const testResponse = unaugmentedTestCheck(expression, expression, { keepAggregates: true });

            // Assert
            expect(testResponse.containsError).toBeTruthy();
            expect(testResponse.error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Statement", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Arrange
            const copy: Statement = structuredClone(statement);

            // Act
            const copyResult: CheckerResponse = testCheck(copy, statement);

            // Assert
            expect(copyResult.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Arrange
            const swappedExpressions: Statement = structuredClone(statement);
            const tempExpression = swappedExpressions.left;
            swappedExpressions.left = swappedExpressions.right;
            swappedExpressions.right = tempExpression;

            // Act
            const swapResult = testCheck(swappedExpressions, statement);

            // Assert
            expect(swapResult.isEqual).toBeFalsy();
        }
    );
    it("Returns truthy CheckerResponse when expressions are balanced",
        () => {
            // Arrange
            const balancedStatement: Statement = structuredClone(statement);
            balancedStatement.right = structuredClone(term);

            // Act
            const balancedResponse = testCheck(balancedStatement, balancedStatement, { keepAggregates: true });

            // Assert
            expect(balancedResponse.isBalanced).toBeTruthy();
            expect(balancedResponse.balancedAtom).toBeTruthy();
            expect(balancedResponse.balancedMass).toBeTruthy();
        }
    )
    it("Returns falsy CheckerResponse when expressions are balanced",
        () => {
            // Arrange
            const balancedStatement: Statement = structuredClone(statement);
            balancedStatement.right = structuredClone(term);

            // Act
            const unbalancedResponse = testCheck(statement, statement, { keepAggregates: true });

            // Assert
            expect(unbalancedResponse.isBalanced).toBeFalsy();
            expect(unbalancedResponse.balancedAtom).toBeFalsy();
            expect(unbalancedResponse.balancedMass).toBeFalsy();
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const testResponse = unaugmentedTestCheck(statement, statement, { keepAggregates: true });
            
            // Assert
            expect(testResponse.containsError).toBeTruthy();
            expect(testResponse.error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
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
            // Arrange
            const error: ParseError = {
                type: "error",
                value: "Sphinx of black quartz, judge my vow",
                expected: [],
                loc: [0, 0]
            };
            const errorAST: NuclearAST = {
                result: error
            }

            // Act
            const response: CheckerResponse = check(errorAST, ast, {});

            // Assert
            expect(response.containsError).toBeTruthy();
            expect(response.error).toBe("Sphinx of black quartz, judge my vow");
            expect(response.expectedType).toBe("statement");
        }
    );
    it("Returns type mismatch when appropriate",
        () => {
            // Arrange
            const expressionAST: NuclearAST = {
                result: structuredClone(expression)
            }

            // Act
            const response: CheckerResponse = check(ast, expressionAST, {});

            // Assert
            expect(response.typeMismatch).toBeTruthy();
            expect(response.expectedType).toBe("expr");
        }
    );
    it("Returns truthy CheckerResponse when ASTs match",
        () => {
            // Act
            const response: CheckerResponse = check(ast, ast, {});

            // Assert
            expect(response).toEqual(trueResponse);
        }
    );
});

import { Bracket, Compound, Element, exportedForTesting, Ion, Term, Expression, Statement, ParseError, check, ChemAST } from "../../src/models/Chemistry";
import type { CheckerResponse } from "../../src/models/common";
const { listComparison, checkNodesEqual } = exportedForTesting;

const original = console.error;

beforeEach(() => {
    console.error = jest.fn();
});

afterEach(() => {
    console.error = original;
})

// TODO: Add flattening tests

// Generic response object
const response: CheckerResponse = {
    containsError: false,
    error: { message: "" },
    expectedType: "unknown",
    typeMismatch: false,
    sameState: true,
    sameCoefficient: true,
    isBalanced: true,
    isEqual: true,
    isNuclear: false
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
    isNuclear: false
};

const trueResponse: CheckerResponse = structuredClone(newResponse);
const falseResponse: CheckerResponse = structuredClone(newResponse);
falseResponse.isEqual = false;

// Default objects
const element: Element = { type: "element", value: "C", coeff: 1 };
const minimalCompound: Compound = {
    type: "compound",
    head: { type: "element", value: "O", coeff: 1 },
    elements: [{ type: "element", value: "O", coeff: 1 }]
};
const bracket: Bracket = {
    type: "bracket",
    compound: structuredClone(minimalCompound),
    coeff: 1
};
const compound: Compound = {
    type: "compound",
    head: structuredClone(element),
    elements: [
        structuredClone(element),
        structuredClone(bracket)
    ]
};
const ion: Ion = {
    type: "ion",
    molecule: structuredClone(compound),
    charge: -1,
    molecules: [
        [structuredClone(compound), -1],
        [{ type: "element", value: "Na", coeff: 1 }, 1]
    ]
};
const term: Term = {
    type: "term",
    value: structuredClone(minimalCompound),
    coeff: { numerator: 3, denominator: 2},
    state: "",
    hydrate: 0,
    isElectron: false,
    isHydrate: false
};

const hydrate: Term = {
    type: "term",
    value: structuredClone(minimalCompound),
    coeff: { numerator: 3, denominator: 2 },
    state: "(aq)",
    hydrate: 7,
    isElectron: false,
    isHydrate: true
};
const hydrate2: Term = structuredClone(hydrate);
hydrate2.coeff = { numerator: 2, denominator: 1};
hydrate2.state = "(l)"
hydrate2.hydrate = 3;

const expression: Expression = {
    type: "expr",
    term: structuredClone(hydrate),
    terms: [structuredClone(hydrate), structuredClone(hydrate2)]
}
const statement: Statement = {
    type: "statement",
    left: structuredClone(hydrate),
    right: structuredClone(hydrate2),
    arrow: "SArr"
}
const ast: ChemAST = {
    result: structuredClone(statement)
}

describe("listComparison", () => {
    function comparatorNumberMock(
        test: number, target: number, response: CheckerResponse
    ): CheckerResponse {
        response.isEqual = test === target;
        return response;
    }

    function comparatorResponseChangeMock(
        test: number, target: number, _response: CheckerResponse
    ): CheckerResponse {
        const returnResponse = structuredClone(newResponse);
        returnResponse.isEqual = test === target;
        return returnResponse;
    }

    it("Returns truthy CheckerResponse when lists match",
        () => {
            // Act
            const l1: number[] = [1, 2, 3, 4];
            const l2: number[] = [2, 4, 1, 3];

            // Assert
            expect(
                listComparison(l1, l2, structuredClone(response), comparatorNumberMock).isEqual
            ).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when lists don't match",
        () => {
            // Act
            const l1: number[] = [1, 2, 3, 4];
            const l2: number[] = [2, 5, 1, 3];

            // Assert
            expect(
                listComparison(l1, l2, structuredClone(response), comparatorNumberMock).isEqual
            ).toBeFalsy();
        }
    );
    it("Returns updated CheckerResponse if it changes",
        () => {
            // Act
            const match1: number[] = [1, 2, 3, 4];
            const match2: number[] = [2, 4, 1, 3];
            const mismatch1: number[] = [1, 2, 3, 4];
            const mismatch2: number[] = [2, 5, 1, 3];

            // Assert
            expect(
                listComparison(match1, match2, structuredClone(response), comparatorResponseChangeMock)
            ).toEqual(trueResponse);
            expect(
                listComparison(
                    mismatch1, mismatch2, structuredClone(response), comparatorResponseChangeMock
                )
            ).toEqual(falseResponse);
        }
    );
});

describe("checkNodesEqual Elements", () => {
    it("Returns truthy CheckerResponse when elements match",
        () => {
            // Act
            const elementCopy: Element = structuredClone(element)

            const testResponse = checkNodesEqual(elementCopy, element, structuredClone(response));

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameCoefficient).toBeTruthy();
            expect(testResponse.balanceCount?.get("C")).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when elements don't match",
        () => {
            // Act
            const valueMismatch: Element = structuredClone(element);
            valueMismatch.value = "O";
            const coefficientMismatch: Element = structuredClone(element);
            coefficientMismatch.coeff = 2;

            const elementIncorrect = checkNodesEqual(valueMismatch, element, structuredClone(response));
            const coeffIncorrect = checkNodesEqual(coefficientMismatch, element, structuredClone(response));

            // Assert
            expect(elementIncorrect.isEqual).toBeFalsy();
            expect(elementIncorrect.sameCoefficient).toBeTruthy();
            expect(elementIncorrect.balanceCount?.get("O")).toBe(1);

            expect(coeffIncorrect.isEqual).toBeFalsy();
            expect(coeffIncorrect.sameCoefficient).toBeFalsy();
            expect(coeffIncorrect.balanceCount?.get("C")).toBe(2);
        }
    );
});

describe("checkNodesEqual Brackets", () => {
    it("Returns truthy CheckerResponse when brackets match",
        () => {
            // Act
            const bracketCopy: Bracket = structuredClone(bracket);

            const testResponse = checkNodesEqual(bracketCopy, bracket, structuredClone(response));

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameCoefficient).toBeTruthy();
            expect(testResponse.balanceCount?.get("C")).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when brackets don't match",
        () => {
            // Act
            const coefficientMismatch: Bracket = structuredClone(bracket);
            coefficientMismatch.coeff = 2;

            const coeffIncorrect = checkNodesEqual(coefficientMismatch, bracket, structuredClone(response));

            // Assert
            expect(coeffIncorrect.isEqual).toBeFalsy();
            expect(coeffIncorrect.sameCoefficient).toBeFalsy();
            expect(coeffIncorrect.balanceCount?.get("O")).toBe(2);
        }
    );
});

describe("checkNodesEqual Compounds", () => {
    it("Returns truthy CheckerResponse when compounds match",
        () => {
            // Act
            const permutedCompound: Compound = structuredClone(compound);
            permutedCompound.elements?.reverse;

            const testResponse = checkNodesEqual(permutedCompound, compound, structuredClone(response));

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.balanceCount?.get("C")).toBe(1)
            expect(testResponse.balanceCount?.get("O")).toBe(1)
        }
    );
    it("Returns falsy CheckerResponse when compounds don't match",
        () => {
            // Act
            const typeMismatch: Compound = structuredClone(compound);
            typeMismatch.elements = [structuredClone(element), structuredClone(element)]
            const lengthMismatch: Compound = structuredClone(compound);
            lengthMismatch.elements?.push(structuredClone(element));

            const typesIncorrect = checkNodesEqual(typeMismatch, compound, structuredClone(response));
            const lengthIncorrect = checkNodesEqual(lengthMismatch, compound, structuredClone(response));

            // Assert
            expect(typesIncorrect.isEqual).toBeFalsy();
            expect(lengthIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Arrange
            const bracketCoeffMismatch: Bracket = structuredClone(bracket);
            bracketCoeffMismatch.coeff = 2;
            const elementCoeffMismatch: Element = structuredClone(element);
            elementCoeffMismatch.coeff = 2;

            const bracketMismatch: Compound = structuredClone(compound);
            if (bracketMismatch.elements) bracketMismatch.elements[1] = bracketCoeffMismatch;
            const elementMismatch: Compound = structuredClone(compound);
            if (elementMismatch.elements) elementMismatch.elements[0] = elementCoeffMismatch;

            const bracketResponse: CheckerResponse = checkNodesEqual(bracketCoeffMismatch, bracket, structuredClone(response));
            const elementResponse: CheckerResponse = checkNodesEqual(elementCoeffMismatch, element, structuredClone(response));

            // Assert
            expect(checkNodesEqual(bracketMismatch, compound, structuredClone(response))).toEqual(bracketResponse);
            expect(checkNodesEqual(elementMismatch, compound, structuredClone(response))).toEqual(elementResponse);
        }
    );
    it("Returns an error if the AST is not flattened",
        () => {
            // Act
            // This is the same as compound just not flattened
            const unflattenedCompound: Compound = {
                type: "compound",
                head: { type: "element", value: "O", coeff: 2 },
                tail: structuredClone(bracket)
            };

            // Assert
            expect(checkNodesEqual(unflattenedCompound, compound, structuredClone(response)).containsError).toBeTruthy();
            expect(checkNodesEqual(unflattenedCompound, compound, structuredClone(response)).error).toEqual(
                { message: "Received unflattened AST during checking process." }
            );

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("CheckNodesEqual Ions", () => {
    it("Returns truthy CheckerResponse when ions match",
        () => {
            // Act
            const permutedIon: Ion = structuredClone(ion);
            permutedIon.molecules?.reverse;

            const testResponse = checkNodesEqual(permutedIon, ion, structuredClone(response));

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.balanceCount?.get("O")).toBe(1);
            expect(testResponse.balanceCount?.get("Na")).toBe(1);
            expect(testResponse.chargeCount).toBe(0);
        }
    );
    it("Returns falsy CheckerResponse when ions do not match",
        () => {
            const moleculeMismatch: Ion = structuredClone(ion);
            if (moleculeMismatch.molecules) {
                moleculeMismatch.molecules[0] = [{ type: "element", value: "Cl", coeff: 1 }, -1];
            }

            const chargeMismatch: Ion = structuredClone(ion);
            if (chargeMismatch.molecules) {
                chargeMismatch.molecules[1] = [{ type: "element", value: "Na", coeff: 1 }, -1];
            }

            const lengthMismatch: Ion = structuredClone(ion);
            lengthMismatch.molecules?.push([structuredClone(element), 1]);

            const moleculeIncorrect = checkNodesEqual(moleculeMismatch, ion, structuredClone(response));
            const chargeIncorrect = checkNodesEqual(chargeMismatch, ion, structuredClone(response));
            const lengthIncorrect = checkNodesEqual(lengthMismatch, ion, structuredClone(response));

            // Assert
            expect(moleculeIncorrect.isEqual).toBeFalsy();
            expect(moleculeIncorrect.typeMismatch).toBeFalsy();
            expect(chargeIncorrect.isEqual).toBeFalsy();
            expect(lengthIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Act
            const ionCopy: Ion = structuredClone(ion);

            const trueResponse: CheckerResponse = structuredClone(newResponse);
            trueResponse.isEqual = true;

            // Assert
            expect(checkNodesEqual(ionCopy, ion, structuredClone(newResponse))).toEqual(trueResponse);
        }
    );
    it("Returns an error if the AST is not flattened",
        () => {
            // Act
            // This is the same as ion just not flattened
            const unflattenedIon: Ion = {
                type: "ion",
                molecule: structuredClone(compound),
                charge: -1,
                chain: {
                    type: "ion",
                    molecule: { type: "element", value: "Na", coeff: 1 },
                    charge: 1
                }
            };

            // Assert
            expect(checkNodesEqual(unflattenedIon, ion, structuredClone(response)).containsError).toBeTruthy();
            expect(checkNodesEqual(unflattenedIon, ion, structuredClone(response)).error).toEqual(
                { message: "Received unflattened AST during checking process." }
            );

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("CheckNodesEqual Term", () => {
    // TODO: Separate into different tests
    it("Returns truthy CheckerResponse when terms match",
        () => {
            // Scalar multiple coefficient
            let perturbedTerm: Term = structuredClone(term);
            perturbedTerm.coeff = { numerator: 6, denominator: 4 };

            let testResponse = checkNodesEqual(perturbedTerm, term, structuredClone(response))
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameState).toBeTruthy();
            expect(testResponse.balanceCount?.get("C")).toBe(1);

            // Term with a state
            perturbedTerm = structuredClone(term);
            perturbedTerm.state = "(aq)";
            let termCopy: Term = structuredClone(perturbedTerm);

            testResponse = checkNodesEqual(perturbedTerm, termCopy, structuredClone(response))
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameState).toBeTruthy();

            // Hydrate term
            perturbedTerm = structuredClone(term);
            termCopy.isHydrate = true;
            termCopy.hydrate = 7;
            termCopy = structuredClone(perturbedTerm);

            expect(checkNodesEqual(termCopy, perturbedTerm, structuredClone(response)).isEqual).toBeTruthy();

            // Electron
            perturbedTerm = structuredClone(term);
            perturbedTerm.isElectron = true
            perturbedTerm.value = { type: "electron" }
            termCopy = structuredClone(perturbedTerm);
            expect(checkNodesEqual(termCopy, perturbedTerm, structuredClone(response)).isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when terms don't match",
        () => {
            // Mismatched coefficients
            let mismatchTerm: Term = structuredClone(term);
            mismatchTerm.coeff = { numerator: 1, denominator: 5 };

            expect(checkNodesEqual(mismatchTerm, term, structuredClone(response)).isEqual).toBeFalsy();
            expect(checkNodesEqual(mismatchTerm, term, structuredClone(response)).sameCoefficient).toBeFalsy();

            // Mismatched state
            let perturbedTerm: Term = structuredClone(term);
            mismatchTerm = structuredClone(term)
            perturbedTerm.state = "(aq)";
            mismatchTerm.state = "(g)";
            expect(checkNodesEqual(perturbedTerm, mismatchTerm, structuredClone(response)).isEqual).toBeFalsy();
            expect(checkNodesEqual(perturbedTerm, mismatchTerm, structuredClone(response)).sameState).toBeFalsy();

            // Mismatched hydrate
            perturbedTerm = structuredClone(term);
            mismatchTerm = structuredClone(term);
            perturbedTerm.isHydrate = true;
            perturbedTerm.hydrate = 7;
            mismatchTerm.isHydrate = true;
            mismatchTerm.hydrate = 1;
            expect(checkNodesEqual(perturbedTerm, mismatchTerm, structuredClone(response)).isEqual).toBeFalsy();

            // Mismatched type
            mismatchTerm = structuredClone(term);
            mismatchTerm.isElectron = true
            mismatchTerm.value = { type: "electron" }
            expect(checkNodesEqual(mismatchTerm, term, structuredClone(response)).isEqual).toBeFalsy();
            expect(checkNodesEqual(mismatchTerm, term, structuredClone(response)).typeMismatch).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Act
            const complexTerm: Term = structuredClone(term);
            complexTerm.value = structuredClone(ion);

            const compoundResponse = checkNodesEqual(ion, ion, structuredClone(response));
            const testResponse = checkNodesEqual(complexTerm, term, structuredClone(response));
            // Assert
            expect(testResponse.balanceCount).toBe(compoundResponse.balanceCount);
            expect(testResponse.chargeCount).toBe(compoundResponse.chargeCount);
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
            expect(testResponse.balanceCount?.get("C")).toBe(2);
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Act
            const lengthMismatch: Expression = structuredClone(expression);
            lengthMismatch.terms?.push(structuredClone(hydrate));

            const termMismatch: Expression = structuredClone(expression);
            if (termMismatch.terms) termMismatch.terms[1] = structuredClone(hydrate);

            // Assert
            expect(checkNodesEqual(lengthMismatch, expression, structuredClone(response)).isEqual).toBeFalsy();
            expect(checkNodesEqual(termMismatch, expression, structuredClone(response)).isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Act
            const mismatchedHydrate: Expression = structuredClone(expression);
            if (mismatchedHydrate.terms) mismatchedHydrate.terms[1] = structuredClone(hydrate);

            const hydrateResponse: CheckerResponse = checkNodesEqual(hydrate, hydrate2, structuredClone(response));

            // Assert
            expect(
                checkNodesEqual(mismatchedHydrate, expression, structuredClone(response))
            ).toEqual(hydrateResponse);
        }
    );
    it("Returns an error if the AST is not flattened",
        () => {
            // Act
            // This is the same as expression just unflattened
            const unflattenedExpression: Expression = {
                type: "expr",
                term: structuredClone(hydrate),
                rest: structuredClone(hydrate2)
            }

            // Assert
            expect(checkNodesEqual(unflattenedExpression, expression, structuredClone(response)).containsError).toBeTruthy();
            expect(checkNodesEqual(unflattenedExpression, expression, structuredClone(response)).error).toEqual(
                { message: "Received unflattened AST during checking process." }
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

            copy.arrow = "DArr";
            const doubleArrowCopy: Statement = structuredClone(copy);
            const arrowResult = checkNodesEqual(copy, doubleArrowCopy, structuredClone(response));
            // Assert
            expect(copyResult.isEqual).toBeTruthy();
            expect(copyResult.sameArrow).toBeTruthy();

            expect(arrowResult.isEqual).toBeTruthy();
            expect(arrowResult.sameArrow).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Act
            const swappedExpressions: Statement = structuredClone(statement);
            const tempExpression = swappedExpressions.left;
            swappedExpressions.left = swappedExpressions.right;
            swappedExpressions.right = tempExpression;

            const doubleArrow: Statement = structuredClone(statement);
            doubleArrow.arrow = "DArr";

            const swapResult = checkNodesEqual(swappedExpressions, statement, structuredClone(response));
            const arrowResult = checkNodesEqual(doubleArrow, statement, structuredClone(response));

            // Assert
            expect(swapResult.isEqual).toBeFalsy();
            expect(swapResult.sameArrow).toBeTruthy();
            expect(arrowResult.isEqual).toBeFalsy();
            expect(arrowResult.sameArrow).toBeFalsy();
        }
    );
    it("Correctly checks whether statements are balanced",
        () => {
            // Arrange
            const unbalancedStatement: Statement = structuredClone(statement);
            // expression has two atoms unlike statements single right expression
            unbalancedStatement.right = structuredClone(expression);

            // Assert
            expect((checkNodesEqual(statement, statement, structuredClone(response))).balancedAtoms).toBeTruthy();
            expect((checkNodesEqual(unbalancedStatement, statement, structuredClone(response))).balancedAtoms).toBeFalsy();
        }
    );
    it("Correctly checks whether charges are balanced",
        () => {
            // Arrange
            const chargedTerm: Term = structuredClone(term);
            chargedTerm.value = structuredClone(ion);

            // expression is otherwise neutral
            const chargedExpr: Expression = structuredClone(expression);
            chargedExpr.terms?.push(chargedTerm);

            const balancedCharges: Statement = structuredClone(statement);
            balancedCharges.left = structuredClone(chargedExpr);
            balancedCharges.right = structuredClone(chargedExpr);
            const unbalancedCharges: Statement = structuredClone(statement);
            unbalancedCharges.left = structuredClone(chargedExpr);

            // Assert
            expect(
                checkNodesEqual(balancedCharges, statement, structuredClone(response)).balancedCharge
            ).toBeTruthy();
            expect(
                checkNodesEqual(unbalancedCharges, statement, structuredClone(response)).balancedCharge
            ).toBeFalsy();
        }
    );
});

describe("Check", () => {
    it("Returns error message when given one",
        () => {
            // Act
            const error: ParseError = {
                type: "error",
                value: "Sphinx of black quartz, judge my vow",
                expected: [],
                loc: [0, 0]
            };
            const errorAST: ChemAST = {
                result: error
            }

            const response: CheckerResponse = check(errorAST, ast);
            // Assert
            expect(response.error).toBeDefined();
            expect(response.error?.message).toBe("Sphinx of black quartz, judge my vow");
            expect(response.expectedType).toBe("unknown");
        }
    );
    it("Returns type mismatch when appropriate",
        () => {
            // Act
            const expressionAST: ChemAST = {
                result: structuredClone(expression)
            }

            const response: CheckerResponse = check(ast, expressionAST);
            // Assert
            expect(response.typeMismatch).toBeTruthy();
            expect(response.expectedType).toBe("expr");
        }
    );
});

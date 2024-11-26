import { Bracket, Compound, Element, exportedForTesting, Ion, Term, Expression, Statement, ParseError, check, ChemAST, augment, STARTING_COEFFICIENT, Result, ASTNode } from "../../src/models/Chemistry";
import { CheckerResponse, listComparison, ChemistryOptions, Fraction, ChemicalSymbol } from "../../src/models/common";
const { augmentNode } = exportedForTesting;
import { parseChemistryExpression } from "inequality-grammar";

const original = console.error;

beforeEach(() => {
    console.error = jest.fn();
});

afterEach(() => {
    console.error = original;
})

// TODO: Add augmenting tests
const options: ChemistryOptions = {
    allowPermutations: false,
    allowScalingCoefficients: false
}

// Generic response object
const response: CheckerResponse = {
    containsError: false,
    expectedType: "statement",
    receivedType: "statement",
    typeMismatch: false,
    sameState: true,
    sameCoefficient: true,
    sameArrow: true,
    sameBrackets: true,
    sameElements: true,
    isBalanced: true,
    isEqual: true,
    isNuclear: false,
    options: options,
    coefficientScalingValue: STARTING_COEFFICIENT,
}
// Alternative response object
const newResponse: CheckerResponse = {
    containsError: false,
    error: "",
    expectedType: "statement",
    receivedType: "statement",
    typeMismatch: false,
    sameState: true,
    sameCoefficient: true,
    sameArrow: true,
    sameBrackets: true,
    sameElements: true,
    isBalanced: true,
    isEqual: true,
    isNuclear: false,
    options: options,
    coefficientScalingValue: STARTING_COEFFICIENT,
}

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
    coeff: 1,
    bracket: "round"
};
const compound: Compound = {
    type: "compound",
    head: structuredClone(element),
    tail: structuredClone(bracket)
};
const ion: Ion = {
    type: "ion",
    molecule: structuredClone(compound),
    charge: -1,
    chain: { type: "ion", molecule: {type: "element", value: "Na", coeff: 1 }, charge: 1 }
};
const augmentedIon = augmentNode(structuredClone(ion));

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
hydrate2.coeff = { numerator: 6, denominator: 4 };
hydrate2.state = "(l)"
hydrate2.hydrate = 3;

const expression: Expression = {
    type: "expr",
    term: structuredClone(hydrate),
    rest: structuredClone(hydrate2)
}
const augmentedExpression: Expression = augmentNode(structuredClone(expression));
const statement: Statement = {
    type: "statement",
    left: structuredClone(hydrate),
    right: structuredClone(hydrate2),
    arrow: "SArr"
}
const ast: ChemAST = {
    result: structuredClone(statement)
}

function testCheck<T extends ASTNode>(target: T, test: T, options?: ChemistryOptions): CheckerResponse {
    return check({result: augmentNode(structuredClone(target)) as unknown as Result}, {result: augmentNode(structuredClone(test)) as unknown as Result}, options ?? {});
}

function unaugmentedTestCheck<T extends ASTNode>(target: T, test: T, options?: ChemistryOptions): CheckerResponse {
    return check({result: target as unknown as Result}, {result: test as unknown as Result}, options ?? {});
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

            const matchResponse = listComparison(match1, match2, structuredClone(response), comparatorResponseChangeMock);
            const mismatchResponse = listComparison(mismatch1, mismatch2, structuredClone(response), comparatorResponseChangeMock);

            // Assert
            expect(matchResponse).toEqual(trueResponse);
            expect(mismatchResponse).toEqual(falseResponse);
        }
    );
});

describe("testCheck Elements", () => {
    it("Returns truthy CheckerResponse when elements match",
        () => {
            // Act
            const elementCopy: Element = structuredClone(element)

            const testResponse = testCheck(elementCopy, element, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameCoefficient).toBeTruthy();
            expect(testResponse.termAtomCount?.C).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when elements don't match",
        () => {
            // Act
            const valueMismatch: Element = structuredClone(element);
            valueMismatch.value = "O";
            const coefficientMismatch: Element = structuredClone(element);
            coefficientMismatch.coeff = 2;

            const elementIncorrect = testCheck(valueMismatch, element, { keepAggregates: true });
            const coeffIncorrect = testCheck(coefficientMismatch, element, { keepAggregates: true });

            // Assert
            expect(elementIncorrect.isEqual).toBeFalsy();
            expect(elementIncorrect.termAtomCount?.O).toBe(1);

            expect(coeffIncorrect.isEqual).toBeFalsy();
            expect(coeffIncorrect.termAtomCount?.C).toBe(2);
        }
    );
});

describe("testCheck Brackets", () => {
    it("Returns truthy CheckerResponse when brackets match",
        () => {
            // Act
            const bracketCopy: Bracket = structuredClone(bracket);

            const testResponse = testCheck(bracketCopy, bracket, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termAtomCount?.O).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when brackets don't match",
        () => {
            // Act
            const coefficientMismatch: Bracket = structuredClone(bracket);
            coefficientMismatch.coeff = 2;

            const coeffIncorrect = testCheck(coefficientMismatch, bracket, { keepAggregates: true });

            // Assert
            expect(coeffIncorrect.isEqual).toBeFalsy();
            expect(coeffIncorrect.termAtomCount?.O).toBe(2);
        }
    );
});

describe("testCheck Compounds", () => {
    it("Returns truthy CheckerResponse when compounds match",
        () => {
            // Act
            const compoundCopy: Compound = structuredClone(compound);

            const testResponse = testCheck(compoundCopy, structuredClone(compound), { keepAggregates: true});

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termAtomCount?.C).toBe(1)
            expect(testResponse.termAtomCount?.O).toBe(1)
        }
    );
    it("Returns truthy CheckerResponse when a permutation of compounds match with allowPermutations",
        () => {
            // Act
            const permutedCompound: Compound = structuredClone(compound);
            permutedCompound.elements?.reverse;
            
            const permutationsOptions = { allowPermutations: true };

            const testResponse = testCheck(permutedCompound, structuredClone(compound), permutationsOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when compounds don't match",
        () => {
            // Act
            const typeMismatch: Compound = structuredClone(compound);
            typeMismatch.elements = [structuredClone(element),structuredClone(element)];
            const lengthMismatch: Compound = augmentNode(structuredClone(compound));
            lengthMismatch.elements?.push(structuredClone(element));

            const typesIncorrect = unaugmentedTestCheck(typeMismatch, augmentNode(structuredClone(compound)));
            const lengthIncorrect = unaugmentedTestCheck(lengthMismatch, augmentNode(structuredClone(compound)));

            // Assert
            expect(typesIncorrect.isEqual).toBeFalsy();
            expect(lengthIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Arrange
            // If the lengths or types are different the wrong thing will fail
            // So create a single bracket compound to test bracket mismatches
            const minimalBracketCompound: Compound = structuredClone(minimalCompound);
            minimalBracketCompound.elements = [structuredClone(bracket)];

            const bracketCoeffMismatch: Bracket = structuredClone(bracket);
            bracketCoeffMismatch.coeff = 2;
            const elementCoeffMismatch: Element = structuredClone(element);
            elementCoeffMismatch.coeff = 2;

            const bracketMismatch: Compound = structuredClone(compound);
            bracketMismatch.elements = [bracketCoeffMismatch];
            const elementMismatch: Compound = structuredClone(compound);
            elementMismatch.elements = [elementCoeffMismatch];

            const bracketResponse: CheckerResponse = testCheck(bracketCoeffMismatch, structuredClone(bracket));
            const elementResponse: CheckerResponse = testCheck(elementCoeffMismatch, structuredClone(element));

            // Assert
            expect(testCheck(bracketMismatch, minimalBracketCompound)).toEqual({...bracketResponse, expectedType: "compound", receivedType: "compound"});
            expect(testCheck(elementMismatch, minimalCompound)).toEqual({...elementResponse, expectedType: "compound", receivedType: "compound"});
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            // This is the same as compound just not augmented
            const unaugmentedCompound: Compound = {
                type: "compound",
                head: { type: "element", value: "O", coeff: 2 },
                tail: structuredClone(bracket)
            };

            // Assert
            expect(unaugmentedTestCheck(unaugmentedCompound, compound, { keepAggregates: true }).containsError).toBeTruthy();
            expect(unaugmentedTestCheck(unaugmentedCompound, compound, { keepAggregates: true }).error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Ions", () => {
    it("Returns truthy CheckerResponse when ions match",
        () => {
            // Act
            const ionClone: Ion = structuredClone(ion);

            const testResponse = testCheck(structuredClone(ion), ionClone, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termAtomCount?.O).toBe(1);
            expect(testResponse.termAtomCount?.Na).toBe(1);
            expect(testResponse.termAtomCount?.C).toBe(1);
            expect(testResponse.termChargeCount).toBe(0);
        }
    );
    it("Returns truthy CheckerResponse when a permutation of ions match with allowPermutations",
        () => {
            // Act
            const permutedIon: Ion = structuredClone(ion);
            permutedIon.molecules?.reverse;

            const permutationsOptions = { allowPermutations: true, keepAggregates: true };

            const testResponse = testCheck(permutedIon, structuredClone(ion), permutationsOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termChargeCount).toBe(0);
        }
    );
    it("Returns falsy CheckerResponse when ions do not match",
        () => {
            const moleculeMismatch: Ion = structuredClone(augmentedIon);
            if (moleculeMismatch.molecules) {
                moleculeMismatch.molecules[0] = [{ type: "element", value: "Cl", coeff: 1 }, -1];
            }

            const chargeMismatch: Ion = structuredClone(augmentedIon);
            if (chargeMismatch.molecules) {
                chargeMismatch.molecules[0] = [{ type: "element", value: "Na", coeff: 1 }, -1]
            }

            const lengthMismatch: Ion = structuredClone(augmentedIon);
            lengthMismatch.molecules?.push([structuredClone(element), 1]);

            const moleculeIncorrect = unaugmentedTestCheck(moleculeMismatch, structuredClone(augmentedIon), { keepAggregates: true });
            const chargeIncorrect = unaugmentedTestCheck(chargeMismatch, structuredClone(augmentedIon), { keepAggregates: true });
            const lengthIncorrect = unaugmentedTestCheck(lengthMismatch, structuredClone(augmentedIon));

            // Assert
            expect(moleculeIncorrect.isEqual).toBeFalsy();
            expect(moleculeIncorrect.typeMismatch).toBeFalsy();
            expect(moleculeIncorrect.termAtomCount?.Cl).toBe(1);
            expect(chargeIncorrect.isEqual).toBeFalsy();
            expect(chargeIncorrect.termChargeCount).toBe(-2);
            expect(lengthIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const unaugmentedIon: Ion = {
                type: "ion",
                molecule: structuredClone(compound),
                charge: -1,
                chain: {
                    type: "ion",
                    molecule: { type: "element", value: "Cl", coeff: 1 },
                    charge: -1
                }
            };

            // Assert
            expect(unaugmentedTestCheck(unaugmentedIon, ion).containsError).toBeTruthy();
            expect(unaugmentedTestCheck(unaugmentedIon, ion).error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Term", () => {
    // TODO: Separate into different tests
    it("Returns truthy CheckerResponse when terms match with allowScalingCoefficients", 
        () => {
            // Act   
            const scaledOptions = { allowScalingCoefficients: true, keepAggregates: true };

            const perturbedTerm: Term = structuredClone(term);
            perturbedTerm.coeff = { numerator: 6, denominator: 4 };

            const testResponse = testCheck(perturbedTerm, structuredClone(term), scaledOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameState).toBeTruthy();
            expect(testResponse.atomCount?.O).toEqual({"numerator": 3, "denominator": 2});
        }
    );
    it("Returns truthy CheckerResponse when terms have equal states", 
        () => {
            // Act
            const stateTerm = structuredClone(term);
            stateTerm.state = "(aq)";
            let stateTermCopy: Term = structuredClone(stateTerm);

            const testResponse = testCheck(stateTerm, stateTermCopy)

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameState).toBeTruthy();
        }
    );
    it("Returns truthy CheckerResponse when terms has equal hydrates", 
        () => {
            // Act
            const hydratedTerm = structuredClone(term);
            hydratedTerm.isHydrate = true;
            hydratedTerm.hydrate = 7;
            const hydratedTermCopy = structuredClone(hydratedTerm);

            // Assert
            expect(testCheck(hydratedTermCopy, hydratedTerm).isEqual).toBeTruthy();
        }
    );
    it("Returns truthy CheckerResponse when electron terms match",
        () => {
            // Act
            const electronTerm = structuredClone(term);
            electronTerm.isElectron = true
            electronTerm.value = { type: "electron" }
            const electronTermCopy = structuredClone(electronTerm);

            // Assert
            expect(testCheck(electronTermCopy, electronTerm).isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when terms don't match",
        () => {
            // Mismatched coefficients
            let mismatchTerm: Term = structuredClone(term);
            mismatchTerm.coeff = { numerator: 1, denominator: 5 };

            expect(testCheck(mismatchTerm, structuredClone(term)).isEqual).toBeFalsy();
            expect(testCheck(mismatchTerm, structuredClone(term)).sameCoefficient).toBeFalsy();

            // Mismatched state
            let perturbedTerm: Term = structuredClone(term);
            mismatchTerm = structuredClone(term);
            perturbedTerm.state = "(aq)";
            mismatchTerm.state = "(g)";
            expect(testCheck(perturbedTerm, mismatchTerm).isEqual).toBeFalsy();
            expect(testCheck(perturbedTerm, mismatchTerm).sameState).toBeFalsy();

            // Mismatched hydrate
            perturbedTerm = structuredClone(term);
            mismatchTerm = structuredClone(term);
            perturbedTerm.isHydrate = true;
            perturbedTerm.hydrate = 7;
            mismatchTerm.isHydrate = true;
            mismatchTerm.hydrate = 1;
            expect(testCheck(perturbedTerm, mismatchTerm).isEqual).toBeFalsy();

            // Mismatched type
            mismatchTerm = structuredClone(term);
            mismatchTerm.isElectron = true;
            mismatchTerm.value = { type: "electron" };
            expect(testCheck(mismatchTerm, structuredClone(term)).isEqual).toBeFalsy();
            expect(testCheck(mismatchTerm, structuredClone(term)).typeMismatch).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Act
            const complexTerm: Term = structuredClone(term);
            complexTerm.value = structuredClone(compound);

            const testResponse = testCheck(complexTerm, structuredClone(term));
            const compoundResponse = testCheck(structuredClone(compound), minimalCompound);

            // Assert
            expect(testResponse).toEqual({...compoundResponse, expectedType: "term", receivedType: "term"});
        }
    );
});

describe("testCheck Expression", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Act
            const permutedExpression: Expression = structuredClone(augmentedExpression);
            permutedExpression.terms?.reverse;
            permutedExpression.term = permutedExpression.terms ? permutedExpression.terms[0] : permutedExpression.term;

            const testResponse: CheckerResponse = unaugmentedTestCheck(permutedExpression, augmentedExpression, { keepAggregates: true });
            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.atomCount?.O).toEqual({"numerator": 3, "denominator": 1});
        }
    );
    it("Returns falsy CheckerResponse when expressions do not match",
        () => {
            // Act
            const lengthMismatch: Expression = structuredClone(augmentedExpression);
            lengthMismatch.terms?.push(structuredClone(hydrate));

            const termMismatch: Expression = structuredClone(augmentedExpression);
            if (termMismatch.terms) termMismatch.terms[1] = structuredClone(hydrate);

            // Assert
            expect(unaugmentedTestCheck(lengthMismatch, augmentedExpression).isEqual).toBeFalsy();
            expect(unaugmentedTestCheck(termMismatch, augmentedExpression).isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Act
            const adjustedExpression: Expression = structuredClone(expression);
            adjustedExpression.term = structuredClone(hydrate);
            adjustedExpression.terms = [structuredClone(hydrate)];

            const mismatchedHydrate: Expression = structuredClone(expression);
            mismatchedHydrate.term = structuredClone(hydrate2);
            mismatchedHydrate.terms = [structuredClone(hydrate2)];

            const hydrateResponse: CheckerResponse = testCheck(hydrate, hydrate2);

            // Assert
            expect(testCheck(mismatchedHydrate, adjustedExpression)).toEqual({...hydrateResponse, expectedType: "expr", receivedType: "expr"});
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const unaugmentedExpression: Expression = {
                type: "expr",
                term: structuredClone(hydrate),
                rest: structuredClone(hydrate)
            }

            // Assert
            expect(unaugmentedTestCheck(unaugmentedExpression, expression).containsError).toBeTruthy();
            expect(unaugmentedTestCheck(unaugmentedExpression, expression).error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Statement", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Act
            const copy: Statement = structuredClone(statement);

            const copyResult: CheckerResponse = testCheck(copy, statement);

            copy.arrow = "DArr";
            const doubleArrowCopy: Statement = structuredClone(copy);
            const arrowResult = testCheck(copy, doubleArrowCopy);
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

            const swapResult = testCheck(swappedExpressions, statement);
            const arrowResult = testCheck(doubleArrow, statement);

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
            expect((testCheck(statement, unbalancedStatement)).isBalanced).toBeTruthy();
            expect((testCheck(unbalancedStatement, statement)).isBalanced).toBeFalsy();
        }
    );
    it("Correctly checks whether charges are balanced",
        () => {
            // Arrange
            const chargedIon: Ion = augmentedIon;
            chargedIon.molecules = [[structuredClone(element), 1]];

            const chargedTerm: Term = augmentNode(structuredClone(term));
            chargedTerm.value = chargedIon;

            // expression is otherwise neutral
            const chargedExpr: Expression = augmentedExpression;
            chargedExpr.terms?.push(chargedTerm);

            const balancedCharges: Statement = augmentNode(structuredClone(statement));
            balancedCharges.left = structuredClone(chargedExpr);
            balancedCharges.right = structuredClone(chargedExpr);

            const unbalancedCharges: Statement = augmentNode(structuredClone(statement));
            unbalancedCharges.left = structuredClone(chargedExpr);

            // Assert
            expect(unaugmentedTestCheck(balancedCharges, unbalancedCharges).isChargeBalanced).toBeTruthy();
            expect(unaugmentedTestCheck(unbalancedCharges, balancedCharges).isChargeBalanced).toBeFalsy();
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

            const response: CheckerResponse = check(errorAST, ast, options);
            // Assert
            expect(response.containsError).toBeTruthy();
            expect(response.error).toBe("Sphinx of black quartz, judge my vow");
            expect(response.expectedType).toBe("statement");
        }
    );
    it("Returns type mismatch when appropriate",
        () => {
            // Act
            const expressionAST: ChemAST = {
                result: structuredClone(expression)
            }

            const response: CheckerResponse = check(ast, expressionAST, options);
            // Assert
            expect(response.typeMismatch).toBeTruthy();
            expect(response.expectedType).toBe("expr");
        }
    );

    it("Allows molecule permutations when allowPermutations set", () => { 
        // Act
        const unchangedAST: ChemAST = augment(parseChemistryExpression("C10H22")[0]);
        const permutedAST: ChemAST = augment(parseChemistryExpression("CH3(CH2)8CH3")[0]);

        const permutedResponse: CheckerResponse = check(unchangedAST, permutedAST, { ...options, allowPermutations: true });
        const unpermutedResponse: CheckerResponse = check(unchangedAST, permutedAST, options);
        // Assert
        expect(permutedResponse.isEqual).toBeTruthy();
        expect(unpermutedResponse.isEqual).toBeFalsy();
    });
});

import { Bracket, Compound, Element, exportedForTesting, Ion, Term, Expression, Statement, ParseError, check, ChemAST, augment, STARTING_COEFFICIENT, Result, ASTNode, isExpression } from "../../src/models/Chemistry";
import { CheckerResponse, listComparison, ChemistryOptions } from "../../src/models/common";
const { augmentNode } = exportedForTesting;
import { parseChemistryExpression } from "inequality-grammar";

const original = console.error;

beforeEach(() => {
    console.error = jest.fn();
});

afterEach(() => {
    console.error = original;
})


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
const augmentedCompound: Compound = augmentNode(structuredClone(compound));

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
    left: structuredClone(expression),
    right: structuredClone(expression),
    arrow: "SArr"
}
if ("rest" in statement.right && statement.right.rest && "hydrate" in statement.right.rest) {
    statement.right.rest.hydrate = 1;
}
const augmentedStatement: Statement = augmentNode(structuredClone(statement));

const ast: ChemAST = {
    result: structuredClone(statement)
}

function testCheck<T extends ASTNode>(target: T, test: T, options?: ChemistryOptions): CheckerResponse {
    return check({result: augmentNode(structuredClone(target)) as unknown as Result}, {result: augmentNode(structuredClone(test)) as unknown as Result}, options ?? {});
}

function unaugmentedTestCheck<T extends ASTNode>(target: T, test: T, options?: ChemistryOptions): CheckerResponse {
    return check(structuredClone({result: target as unknown as Result}), structuredClone({result: test as unknown as Result}), options ?? {});
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
            // Arrange
            const l1: number[] = [1, 2, 3, 4];
            const l2: number[] = [2, 4, 1, 3];

            // Act
            const testComparison = listComparison(l1, l2, structuredClone(response), comparatorNumberMock)

            // Assert
            expect(testComparison.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when lists don't match",
        () => {
            // Arrange
            const l1: number[] = [1, 2, 3, 4];
            const l2: number[] = [2, 5, 1, 3];

            // Act
            const testComparison = listComparison(l1, l2, structuredClone(response), comparatorNumberMock)

            // Assert
            expect(testComparison.isEqual).toBeFalsy();
        }
    );
    it("Returns updated CheckerResponse if it changes",
        () => {
            // Arrange
            const match1: number[] = [1, 2, 3, 4];
            const match2: number[] = [2, 4, 1, 3];
            const mismatch1: number[] = [1, 2, 3, 4];
            const mismatch2: number[] = [2, 5, 1, 3];

            // Act
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
            // Arrange
            const elementCopy: Element = structuredClone(element)

            // Act
            const testResponse = testCheck(elementCopy, element, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameCoefficient).toBeTruthy();
            expect(testResponse.termAtomCount?.C).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when elements don't match",
        () => {
            // Arrange
            const valueMismatch: Element = structuredClone(element);
            valueMismatch.value = "O";
            const coefficientMismatch: Element = structuredClone(element);
            coefficientMismatch.coeff = 2;

            // Act
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
            // Arrange
            const bracketCopy: Bracket = structuredClone(bracket);

            // Act
            const testResponse = testCheck(bracketCopy, bracket, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termAtomCount?.O).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when brackets don't match",
        () => {
            // Arrange
            const coefficientMismatch: Bracket = structuredClone(bracket);
            coefficientMismatch.coeff = 2;

            // Act
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
            // Arrange
            const compoundCopy: Compound = structuredClone(compound);

            // Act
            const testResponse = testCheck(compound, compoundCopy, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termAtomCount?.C).toBe(1)
            expect(testResponse.termAtomCount?.O).toBe(1)
        }
    );
    it("Returns truthy CheckerResponse when a permutation of compounds match with allowPermutations",
        () => {
            // Arrange
            const permutedCompound: Compound = structuredClone(compound);
            permutedCompound.elements?.reverse;

            const hydrocarbonCompound: ASTNode = structuredClone(parseChemistryExpression("C10H22")[0].result);
            const permutedHydrocarbonCompound: ASTNode = structuredClone(parseChemistryExpression("CH3(CH2)8CH3")[0].result);
            
            const permutationsOptions = { allowPermutations: true };

            // Act
            const testResponse = testCheck(permutedCompound, compound, permutationsOptions);
            const hydrocarbonResponse = testCheck(hydrocarbonCompound, permutedHydrocarbonCompound, permutationsOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(hydrocarbonResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns falsy CheckerResponse when compounds have mismatched type",
        () => {
            // Arrange
            const typeMismatch: Compound = structuredClone(compound);
            typeMismatch.elements = [structuredClone(element), structuredClone(element)];

            // Act
            const typesIncorrect = unaugmentedTestCheck(typeMismatch, augmentedCompound);

            // Assert
            expect(typesIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Returns falsy CheckerResponse when compounds have mismatched length",
        () => {
            // Arrange
            const lengthMismatch: Compound = augmentNode(structuredClone(compound));
            lengthMismatch.elements?.push(structuredClone(element));

            // Act
            const lengthIncorrect = unaugmentedTestCheck(lengthMismatch, augmentedCompound);

            // Assert
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

            // Act
            const bracketResponse: CheckerResponse = testCheck(bracketCoeffMismatch, bracket);
            const elementResponse: CheckerResponse = testCheck(elementCoeffMismatch, element);

            // Assert
            expect(testCheck(bracketMismatch, minimalBracketCompound)).toEqual({...bracketResponse, expectedType: "compound", receivedType: "compound"});
            expect(testCheck(elementMismatch, minimalCompound)).toEqual({...elementResponse, expectedType: "compound", receivedType: "compound"});
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const testResponse = unaugmentedTestCheck(compound, augmentedCompound, { keepAggregates: true });
            
            // Assert
            expect(testResponse.containsError).toBeTruthy();
            expect(testResponse.error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Ions", () => {
    it("Returns truthy CheckerResponse when ions match",
        () => {
            // Arrange
            const ionClone: Ion = structuredClone(ion);

            // Act
            const testResponse = testCheck(ion, ionClone, { keepAggregates: true });

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
            // Arrange
            const permutedIon: Ion = structuredClone(ion);
            permutedIon.molecules?.reverse;

            const permutationsOptions = { allowPermutations: true, keepAggregates: true };

            // Act
            const testResponse = testCheck(permutedIon, ion, permutationsOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.termChargeCount).toBe(0);
        }
    );
    it("Returns falsy CheckerResponse when ions have mismatched molecules",
        () => {
            // Arrange
            const moleculeMismatch: Ion = structuredClone(augmentedIon);
            if (moleculeMismatch.molecules) {
                moleculeMismatch.molecules[0] = [{ type: "element", value: "Cl", coeff: 1 }, -1];
            }

            // Act
            const moleculeIncorrect = unaugmentedTestCheck(moleculeMismatch, augmentedIon, { keepAggregates: true });

            // Assert
            expect(moleculeIncorrect.isEqual).toBeFalsy();
            expect(moleculeIncorrect.typeMismatch).toBeFalsy();
            expect(moleculeIncorrect.termAtomCount?.Cl).toBe(1);
        }
    );
    it("Returns falsy CheckerResponse when ions have mismatched charges",
        () => {
            // Arrange
            const chargeMismatch: Ion = structuredClone(augmentedIon);
            if (chargeMismatch.molecules) {
                chargeMismatch.molecules[0] = [{ type: "element", value: "Na", coeff: 1 }, -1]
            }

            // Act
            const chargeIncorrect = unaugmentedTestCheck(chargeMismatch, augmentedIon, { keepAggregates: true });

            // Assert
            expect(chargeIncorrect.isEqual).toBeFalsy();
            expect(chargeIncorrect.termChargeCount).toBe(-2);
        }
    );
    it("Returns falsy CheckerResponse when ions have mismatched length",
        () => {
            // Arrange
            const lengthMismatch: Ion = structuredClone(augmentedIon);
            lengthMismatch.molecules?.push([structuredClone(element), 1]);

            // Act
            const lengthIncorrect = unaugmentedTestCheck(lengthMismatch, augmentedIon, { keepAggregates: true});

            // Assert
            expect(lengthIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const testResponse = unaugmentedTestCheck(ion, augmentedIon);

            // Assert
            expect(testResponse.containsError).toBeTruthy();
            expect(testResponse.error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Term", () => {
    it("Returns truthy CheckerResponse when terms have equal states", 
        () => {
            // Arrange
            const stateTerm = structuredClone(term);
            stateTerm.state = "(aq)";
            const stateTermCopy: Term = structuredClone(stateTerm);

            // Act
            const testResponse = testCheck(stateTerm, stateTermCopy)

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.sameState).toBeTruthy();
        }
    );
    it("Returns truthy CheckerResponse when terms has equal hydrates", 
        () => {
            // Arrange
            const hydratedTerm = structuredClone(term);
            hydratedTerm.isHydrate = true;
            hydratedTerm.hydrate = 7;
            const hydratedTermCopy = structuredClone(hydratedTerm);

            // Act
            const testResponse = testCheck(hydratedTermCopy, hydratedTerm);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns truthy CheckerResponse when electron terms match",
        () => {
            // Arrange
            const electronTerm = structuredClone(term);
            electronTerm.isElectron = true
            electronTerm.value = { type: "electron" }
            const electronTermCopy = structuredClone(electronTerm);

            // Act
            const testResponse = testCheck(electronTermCopy, electronTerm);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
        }
    );
    it("Returns truthy CheckerResponse when terms match with allowScalingCoefficients", 
        () => {
            // Arrange  
            const scaledOptions = { allowScalingCoefficients: true, keepAggregates: true };

            const perturbedTerm: Term = structuredClone(term);
            perturbedTerm.coeff = { numerator: 6, denominator: 4 };

            // Act
            const testResponse = testCheck(perturbedTerm, term, scaledOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.atomCount?.O).toEqual({"numerator": 3, "denominator": 2});
        }
    );
    it("Returns falsy CheckerResponse when terms have mismatched coefficients", // to seperate (working on it)
        () => {
            // Arrange
            const mismatchTerm: Term = structuredClone(term);
            mismatchTerm.coeff = { numerator: 1, denominator: 5 };

            // Act
            const testResponse = testCheck(mismatchTerm, term);

            // Assert
            expect(testResponse.isEqual).toBeFalsy();
            expect(testResponse.sameCoefficient).toBeFalsy();
        }
    )
    it("Returns falsy CheckerResponse when terms have mismatched states",
        () => {
            // Arrange
            const perturbedTerm: Term = structuredClone(term);
            const mismatchTerm = structuredClone(term);

            perturbedTerm.state = "(aq)";
            mismatchTerm.state = "(g)";

            // Act
            const testResponse = testCheck(perturbedTerm, mismatchTerm);

            // Assert
            expect(testResponse.isEqual).toBeFalsy();
            expect(testResponse.sameState).toBeFalsy();
        }
    )
    it("Returns falsy CheckerResponse when terms have mismatched hydrates",
        () => {
            // Arrange
            const perturbedTerm = structuredClone(term);
            const mismatchTerm = structuredClone(term);

            perturbedTerm.isHydrate = true;
            perturbedTerm.hydrate = 7;

            mismatchTerm.isHydrate = true;
            mismatchTerm.hydrate = 1;

            // Act
            const testResponse = testCheck(perturbedTerm, mismatchTerm);

            // Assert
            expect(testResponse.isEqual).toBeFalsy();
        }
    )
    it("Returns falsy CheckerResponse when terms have mismatched types",
        () => {
            // Arrange
            const mismatchTerm = structuredClone(term);
            mismatchTerm.isElectron = true;
            mismatchTerm.value = { type: "electron" };

            // Act
            const testResponse = testCheck(mismatchTerm, term);

            // Assert
            expect(testResponse.isEqual).toBeFalsy();
            expect(testResponse.typeMismatch).toBeTruthy();
        }
    )
    it("Retains CheckerResponse properties",
        () => {
            // Arrange
            const complexTerm: Term = structuredClone(term);
            complexTerm.value = structuredClone(compound);

            // Act
            const testResponse = testCheck(complexTerm, term);
            const compoundResponse = testCheck(compound, minimalCompound);

            // Assert
            expect(testResponse).toEqual({...compoundResponse, expectedType: "term", receivedType: "term"});
        }
    );
});

describe("testCheck Expression", () => {
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Arrange
            const permutedExpression: Expression = structuredClone(augmentedExpression);
            permutedExpression.terms?.reverse;
            permutedExpression.term = permutedExpression.terms ? permutedExpression.terms[0] : permutedExpression.term;

            // Act
            const testResponse: CheckerResponse = unaugmentedTestCheck(permutedExpression, augmentedExpression, { keepAggregates: true });

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.atomCount?.O).toEqual({"numerator": 3, "denominator": 1});
        }
    );
    it("Returns truthy CheckerResponse when expressions match with allowScalingCoefficients", 
        () => {
            // Arrange 
            const scaledOptions = { allowScalingCoefficients: true, keepAggregates: true };

            const perturbedExpression: Expression = structuredClone(augmentedExpression);
            if (perturbedExpression.terms) {
                perturbedExpression.terms = [{...perturbedExpression.terms[0], coeff: { numerator: 10, denominator: 5} }, 
                                             {...perturbedExpression.terms[1], coeff: { numerator: 16, denominator: 8} }];
            }

            // Act
            const testResponse = unaugmentedTestCheck(perturbedExpression, augmentedExpression, scaledOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.atomCount?.O).toEqual({"numerator": 4, "denominator": 1});
        }
    );
    it("Returns falsy CheckerResponse when expressions have mismatched terms",
        () => {
            // Arrange
            const termMismatch: Expression = structuredClone(augmentedExpression);
            if (termMismatch.terms) termMismatch.terms[1] = structuredClone(hydrate);

            // Act
            const termIncorrect = unaugmentedTestCheck(termMismatch, augmentedExpression);

            // Assert
            expect(termIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Returns falsy CheckerResponse when expressions have mismatched length",
        () => {
            // Arrange
            const lengthMismatch: Expression = structuredClone(augmentedExpression);
            lengthMismatch.terms?.push(structuredClone(hydrate));

            // Act
            const lengthIncorrect = unaugmentedTestCheck(lengthMismatch, augmentedExpression);

            // Assert
            expect(lengthIncorrect.isEqual).toBeFalsy();
        }
    );
    it("Retains CheckerResponse properties",
        () => {
            // Arrange
            const adjustedExpression: Expression = structuredClone(expression);
            adjustedExpression.term = structuredClone(hydrate);
            adjustedExpression.terms = [structuredClone(hydrate)];

            const mismatchedHydrate: Expression = structuredClone(expression);
            mismatchedHydrate.term = structuredClone(hydrate2);
            mismatchedHydrate.terms = [structuredClone(hydrate2)];

            // Act
            const hydrateResponse: CheckerResponse = testCheck(hydrate, hydrate2);

            // Assert
            expect(testCheck(mismatchedHydrate, adjustedExpression)).toEqual({...hydrateResponse, expectedType: "expr", receivedType: "expr"});
        }
    );
    it("Returns an error if the AST is not augmented",
        () => {
            // Act
            const testResponse = unaugmentedTestCheck(expression, augmentedExpression);

            // Assert
            expect(testResponse.containsError).toBeTruthy();
            expect(testResponse.error).toEqual("Received unaugmented AST during checking process.");

            expect(console.error).toHaveBeenCalled();
        }
    );
});

describe("testCheck Statement", () => {
    const chargedIon: Ion = structuredClone(augmentedIon);
    chargedIon.molecules = [[structuredClone(element), 1]];

    const chargedTerm: Term = augmentNode(structuredClone(term));
    chargedTerm.value = chargedIon;

    const chargedExpr: Expression = structuredClone(augmentedExpression);
    chargedExpr.terms?.push(chargedTerm);
    it("Returns truthy CheckerResponse when expressions match",
        () => {
            // Arrange
            const copy: Statement = structuredClone(statement);

            const doubleArrowCopy: Statement = structuredClone(copy);
            doubleArrowCopy.arrow = "DArr";

            // Act
            const copyResult: CheckerResponse = testCheck(copy, statement, { keepAggregates: true });
            const arrowResult: CheckerResponse = testCheck(doubleArrowCopy, doubleArrowCopy, { keepAggregates: true });

            // Assert
            expect(copyResult.isEqual).toBeTruthy();
            expect(copyResult.sameArrow).toBeTruthy();

            expect(arrowResult.isEqual).toBeTruthy();
            expect(arrowResult.sameArrow).toBeTruthy();
        }
    );
    it("Returns truthy CheckerResponse when statements match with allowScalingCoefficients", 
        () => {
            // Arrange
            const scaledOptions = { allowScalingCoefficients: true, keepAggregates: true };

            const perturbedStatement: Statement = structuredClone(augmentedStatement);
            if (isExpression(perturbedStatement.left) && perturbedStatement.left.terms && isExpression(perturbedStatement.right) && perturbedStatement.right.terms) {
                perturbedStatement.left.terms  = [{...perturbedStatement.left.terms[0],  coeff: { numerator: 1, denominator: 3} }, 
                                                  {...perturbedStatement.left.terms[1],  coeff: { numerator: 2, denominator: 6} }];
                perturbedStatement.right.terms = [{...perturbedStatement.right.terms[0], coeff: { numerator: 3, denominator: 9} },
                                                  {...perturbedStatement.right.terms[1],  coeff: { numerator: 1, denominator: 3} }];                         
            }

            // Act
            const testResponse = unaugmentedTestCheck(perturbedStatement, augmentedStatement, scaledOptions);

            // Assert
            expect(testResponse.isEqual).toBeTruthy();
            expect(testResponse.atomCount?.O).toEqual({"numerator": 2, "denominator": 3});
        }
    );
    it("Returns falsy CheckerResponse when expressions don't match",
        () => {
            // Arrange
            const swappedExpressions: Statement = structuredClone(statement);
            const tempExpression = swappedExpressions.left;
            swappedExpressions.left = swappedExpressions.right;
            swappedExpressions.right = tempExpression;

            const doubleArrow: Statement = structuredClone(statement);
            doubleArrow.arrow = "DArr";

            // Act
            const swapResult = testCheck(swappedExpressions, statement);
            const arrowResult = testCheck(doubleArrow, statement);

            // Assert
            expect(swapResult.isEqual).toBeFalsy();
            expect(swapResult.sameArrow).toBeTruthy();
            expect(arrowResult.isEqual).toBeFalsy();
            expect(arrowResult.sameArrow).toBeFalsy();
        }
    );
    it("Returns truthy CheckerResponse when statements are balanced", 
        () => {
            // Act
            const balancedCheck = testCheck(statement, statement, { keepAggregates: true});

            // Asssert
            expect(balancedCheck.isEqual).toBeTruthy();
            expect(balancedCheck.isBalanced).toBeTruthy();
            expect(balancedCheck.atomCount?.O).toEqual({"numerator": 3, "denominator": 1});
        }
    );
    it("Returns falsy CheckerResponse when statements are unbalanced", 
        () => {
            // Arrange
            const unbalancedStatement: Statement = structuredClone(statement);
            // expression has two atoms unlike statements single right expression
            unbalancedStatement.right = structuredClone(hydrate);

            // Act
            const unbalancedCheck = testCheck(unbalancedStatement, statement, { keepAggregates: true});

            // Asssert
            expect(unbalancedCheck.isEqual).toBeFalsy();
            expect(unbalancedCheck.isBalanced).toBeFalsy();
            expect(unbalancedCheck.atomCount?.O).toEqual({"numerator": 3, "denominator": 1});
        }
    );
    it("Returns truthy CheckerResponse when statements charges are balanced", 
        () => {
            // Arrange
            const balancedCharges: Statement = structuredClone(augmentedStatement);
            balancedCharges.left = structuredClone(chargedExpr);
            balancedCharges.right = structuredClone(chargedExpr);

            // Act
            const balancedCheck = unaugmentedTestCheck(balancedCharges, balancedCharges, { keepAggregates: true });

            // Assert
            expect(balancedCheck.isEqual).toBeTruthy();
            expect(balancedCheck.isChargeBalanced).toBeTruthy();
            expect(balancedCheck.chargeCount).toEqual({"numerator": 3, "denominator": 2});
        }
    );
    it("Returns falsy CheckerResponse when statements charges are unbalanced",
        () => {
            // Arrange
            const unbalancedCharges: Statement = structuredClone(augmentedStatement);
            unbalancedCharges.left = structuredClone(chargedExpr);

            // Act
            const unbalancedCheck = unaugmentedTestCheck(unbalancedCharges, unbalancedCharges, { keepAggregates: true});

            // Assert
            expect(unbalancedCheck.isEqual).toBeFalsy();
            expect(unbalancedCheck.isChargeBalanced).toBeFalsy();
            expect(unbalancedCheck.chargeCount).toEqual({"numerator": 3, "denominator": 2});
        }
    );
});

describe("Check", () => {
    it("Returns error message when given one",
        () => {
            // Arrange
            const error: ParseError = {
                type: "error",
                value: "Sphinx of black quartz, judge my vow",
                expected: [],
                loc: [0, 0]
            };
            const errorAST: ChemAST = {
                result: error
            }

            // Act
            const response: CheckerResponse = check(errorAST, ast, options);

            // Assert
            expect(response.containsError).toBeTruthy();
            expect(response.error).toBe("Sphinx of black quartz, judge my vow");
            expect(response.expectedType).toBe("statement");
        }
    );
    it("Returns type mismatch when types are different",
        () => {
            // Arrange
            const expressionAST: ChemAST = {
                result: structuredClone(expression)
            }

            // Act
            const response: CheckerResponse = check(ast, expressionAST, options);

            // Assert
            expect(response.typeMismatch).toBeTruthy();
            expect(response.expectedType).toBe("expr");
        }
    );
});

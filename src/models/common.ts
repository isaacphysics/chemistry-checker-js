export const chemicalSymbol = ['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'] as const;
export type ChemicalSymbol = typeof chemicalSymbol[number];

export type ReturnType = 'term'|'expr'|'statement'|'error'|'unknown';

type Aggregates = 'atomCount' | 'chargeCount' | 'nucleonCount';

export interface Coefficient {
    numerator: number;
    denominator: number;
}

export interface ChemistryOptions {
    allowPermutations: boolean;
    allowScalingCoefficients: boolean;
    allowStateSymbols: boolean;
}

export interface CheckerResponse {
    containsError: boolean;
    error: { message: string; };
    expectedType: ReturnType;
    receivedType: ReturnType;
    isBalanced: boolean;
    isEqual: boolean;
    isNuclear: boolean;
    typeMismatch: boolean;
    sameState: boolean;
    sameCoefficient: boolean;
    sameElements: boolean;
    options: ChemistryOptions;
    // properties dependent on type
    sameArrow?: boolean;
    sameBrackets?: boolean;
    balancedCharge?: boolean;
    validAtomicNumber?: boolean;
    balancedAtom?: boolean;
    balancedMass?: boolean;
    // book keeping
    checkingPermutations? : boolean;
    termAtomCount?: Record<ChemicalSymbol, number | undefined>;
    bracketAtomCount?: Record<ChemicalSymbol, number | undefined>;
    atomCount?: Record<ChemicalSymbol, number | undefined>;
    chargeCount?: number;
    nucleonCount?: [number, number];
}

export function listComparison<T>(
    testList: T[],
    targetList: T[],
    response: CheckerResponse,
    comparator: (test: T, target: T, response: CheckerResponse) => CheckerResponse
): CheckerResponse {
    // TODO: look at a more efficient method of comparison
    const indices: number[] = []; // the indices on which a match was made
    let possibleResponse = structuredClone(response);

    // Get aggregates
    // TODO: discuss and see if a better solution exists
    let aggregatesResponse = structuredClone(response);
    for (let item of testList) {
        // This will always pass, this is to get the accurate aggregate bookkeeping values
        aggregatesResponse = comparator(item, item, aggregatesResponse);
    }

    for (let testItem of testList) {
        let index = 0;
        let failed = true;
        let currResponse: CheckerResponse | undefined;

        for (let targetItem of targetList) {
            // If a match has already occurred on an index can't match on it again
            if (!indices.includes(index)) {
                // Recursively check equality (avoiding side effects on possibleResponse)
                currResponse = comparator(testItem, targetItem, structuredClone(possibleResponse));

                if (currResponse.isEqual) {
                    // If a match was found record that and repeat for remaining items
                    failed = false;
                    possibleResponse = currResponse;
                    indices.push(index);
                    break;
                }
            }
            index += 1;
        }

        if (failed) {
            // Try to get some new information otherwise use the passed response
            const returnResponse = currResponse ?? structuredClone(response);
            returnResponse.isEqual = false;

            // Attach actual aggregate values
            returnResponse.chargeCount = aggregatesResponse.chargeCount;
            returnResponse.bracketAtomCount = aggregatesResponse.bracketAtomCount;
            returnResponse.termAtomCount = aggregatesResponse.termAtomCount;
            returnResponse.atomCount = aggregatesResponse.atomCount;
            returnResponse.nucleonCount = aggregatesResponse.nucleonCount;

            return returnResponse;
        }
    }

    // If this point is reached the correct aggregate values have been found
    return possibleResponse
}


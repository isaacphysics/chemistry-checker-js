export const chemicalSymbol = ['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og'] as const;
export type ChemicalSymbol = typeof chemicalSymbol[number];

export type ReturnType = 'term'|'expr'|'statement'|'error'|'unknown';

export interface Fraction {
    numerator: number;
    denominator: number;
}

export interface ChemistryOptions {
    allowPermutations?: boolean;
    allowScalingCoefficients?: boolean;
    keepAggregates?: boolean;
}

export interface CheckerResponse {
    isNuclear: boolean;
    containsError: boolean;
    isBalanced: boolean;
    isEqual: boolean;
    typeMismatch: boolean;
    sameCoefficient: boolean;
    sameElements: boolean;
    // properties dependent on type
    sameState?: boolean;
    sameHydrate?: boolean;
    sameCharge?: boolean;
    sameArrow?: boolean;
    sameBrackets?: boolean;
    validAtomicNumber?: boolean;
    isChargeBalanced?: boolean;
    balancedAtom?: boolean;
    balancedMass?: boolean;
    coefficientScalingValue?: Fraction;
    error?: string;
    // book keeping
    expectedType?: ReturnType;
    receivedType?: ReturnType;
    checkingPermutations? : boolean;
    termAtomCount?: Record<ChemicalSymbol, number | undefined>;
    bracketAtomCount?: Record<ChemicalSymbol, number | undefined>[];
    atomCount?: Record<ChemicalSymbol, Fraction | undefined>;
    termChargeCount?: number;
    bracketChargeCount?: number[];
    chargeCount?: Fraction;
    termNucleonCount?: [number, number];
    nucleonCount?: [number, number];
    options?: ChemistryOptions;
}

export function mergeResponses(response1: CheckerResponse, response2: CheckerResponse): CheckerResponse {
    const newResponse = structuredClone(response1);

    if (response2.containsError && !response1.containsError) {
        newResponse.containsError = response2.containsError;
        newResponse.error = response2.error;
    }
    newResponse.isEqual = response1.isEqual && response2.isEqual;
    newResponse.typeMismatch = response1.typeMismatch || response2.typeMismatch;
    newResponse.sameCoefficient = response1.sameCoefficient && response2.sameCoefficient;
    newResponse.sameElements = response1.sameElements && response2.sameElements;
    if (!response1.isNuclear) {
        newResponse.sameCharge = response1.sameCharge && response2.sameCharge;
        newResponse.sameHydrate = response1.sameHydrate && response2.sameHydrate;
        newResponse.sameState = response1.sameState && response2.sameState;
        newResponse.sameBrackets = response1.sameBrackets && response2.sameBrackets;
    } else {
        newResponse.validAtomicNumber = response1.validAtomicNumber && response2.validAtomicNumber;
    }

    return newResponse;
}

export function removeAggregates(response: CheckerResponse): CheckerResponse {
    delete response.bracketChargeCount;
    delete response.termChargeCount;
    delete response.chargeCount;
    delete response.bracketAtomCount;
    delete response.termAtomCount;
    delete response.atomCount;
    delete response.termNucleonCount;
    delete response.nucleonCount;
    return response;
}

export function linearComparison<T>(
    testList: T[],
    targetList: T[],
    response: CheckerResponse,
    comparator: (test: T, target: T, response: CheckerResponse) => CheckerResponse
): CheckerResponse {
    let possibleResponse = structuredClone(response);

    if (testList.length !== targetList.length) {
        possibleResponse.sameElements = false;
        possibleResponse.isEqual = false;
        return possibleResponse;
    }

    for (let i = 0; i < testList.length; i++) {
        possibleResponse = comparator(testList[i], targetList[i], structuredClone(possibleResponse));
    }

    return possibleResponse;
}

export function listComparison<T>(
    testList: T[],
    targetList: T[],
    response: CheckerResponse,
    comparator: (test: T, target: T, response: CheckerResponse) => CheckerResponse
): CheckerResponse {
    const indices: number[] = []; // the indices on which a match was made
    let possibleResponse = structuredClone(response);

    // Get aggregates
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
            returnResponse.bracketChargeCount = aggregatesResponse.bracketChargeCount;
            returnResponse.termChargeCount = aggregatesResponse.termChargeCount;
            returnResponse.chargeCount = aggregatesResponse.chargeCount;
            returnResponse.bracketAtomCount = aggregatesResponse.bracketAtomCount;
            returnResponse.termAtomCount = aggregatesResponse.termAtomCount;
            returnResponse.atomCount = aggregatesResponse.atomCount;
            returnResponse.termNucleonCount = aggregatesResponse.termNucleonCount;
            returnResponse.nucleonCount = aggregatesResponse.nucleonCount;

            return returnResponse;
        }
    }

    // If this point is reached the correct aggregate values have been found
    return possibleResponse
}

const SimplifyFrac = (frac: Fraction): Fraction => {
    let gcd = function gcd(a: number, b:number): number{
      return b ? gcd(b, a%b) : a;
    };
    const divisor = gcd(frac.numerator, frac.denominator);
    return {numerator: frac.numerator / divisor, denominator: frac.denominator / divisor};
}
  
export const AddFrac = (frac1: Fraction, frac2: Fraction): Fraction => {
    return SimplifyFrac({numerator: frac1.numerator * frac2.denominator + frac2.numerator * frac1.denominator, denominator: frac1.denominator * frac2.denominator});
}

export const MultFrac = (frac1: Fraction, frac2: Fraction): Fraction => {
    return SimplifyFrac({numerator: frac1.numerator * frac2.numerator, denominator: frac1.denominator * frac2.denominator});
}

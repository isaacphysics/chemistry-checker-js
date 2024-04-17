export type ChemicalSymbol = 'H'|'He'|'Li'|'Be'|'B'|'C'|'N'|'O'|'F'|'Ne'|'Na'|'Mg'|'Al'|'Si'|'P'|'S'|'Cl'|'Ar'|'K'|'Ca'|'Sc'|'Ti'|'V'|'Cr'|'Mn'|'Fe'|'Co'|'Ni'|'Cu'|'Zn'|'Ga'|'Ge'|'As'|'Se'|'Br'|'Kr'|'Rb'|'Sr'|'Y'|'Zr'|'Nb'|'Mo'|'Tc'|'Ru'|'Rh'|'Pd'|'Ag'|'Cd'|'In'|'Sn'|'Sb'|'Te'|'I'|'Xe'|'Cs'|'Ba'|'La'|'Ce'|'Pr'|'Nd'|'Pm'|'Sm'|'Eu'|'Gd'|'Tb'|'Dy'|'Ho'|'Er'|'Tm'|'Yb'|'Lu'|'Hf'|'Ta'|'W'|'Re'|'Os'|'Ir'|'Pt'|'Au'|'Hg'|'Tl'|'Pb'|'Bi'|'Po'|'At'|'Rn'|'Fr'|'Ra'|'Ac'|'Th'|'Pa'|'U'|'Np'|'Pu'|'Am'|'Cm'|'Bk'|'Cf'|'Es'|'Fm'|'Md'|'No'|'Lr'|'Rf'|'Db'|'Sg'|'Bh'|'Hs'|'Mt'|'Ds'|'Rg'|'Cn'|'Nh'|'Fl'|'Mc'|'Lv'|'Ts'|'Og';

export type ReturnType = 'term'|'expr'|'statement'|'unknown';

export interface Coefficient {
    numerator: number;
    denominator: number;
}

export interface CheckerResponse {
    containsError: boolean;
    error: { message: string; };
    expectedType: ReturnType;
    isBalanced: boolean;
    isEqual: boolean;
    isNuclear: boolean;
    typeMismatch: boolean;
    sameState: boolean;
    sameCoefficient: boolean;
    validAtomicNumber?: boolean;
    balanceCount?: {[element: string]: number};
    chargeCount?: number
}

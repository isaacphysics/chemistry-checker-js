declare type ChemAST = import('../../src/models/Chemistry').ChemAST;
declare type NuclearAST = import('../../src/models/Nuclear').NuclearAST;

declare module "inequality-grammar" {
    export function parseChemistryExpression(expression: string): ChemAST[];
    export function parseNuclearExpression(expression: string): NuclearAST[];
}

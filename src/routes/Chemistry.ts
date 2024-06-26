import { Request, Response, Router } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import { parseChemistryExpression } from "inequality-grammar";
import { check, flatten } from "../models/Chemistry";
import { CheckerResponse } from "../models/common";

const router = Router();

const checkValidationRules: ValidationChain[] = [
    body('target').notEmpty().withMessage("Target mhChem expression is required."),
    body('test').notEmpty().withMessage("mhChem expression is required."),
    body('description').optional().isString().withMessage("When provided the description must be a string.")
];
const parseValidationRules: ValidationChain[] = [
    body('test').notEmpty().withMessage("mhChem expression is required."),
    body('description').optional().isString().withMessage("When provided the description must be a string.")
];


router.post('/check', checkValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const target: ChemAST = flatten(parseChemistryExpression(req.body.target)[0]);
    const test: ChemAST = flatten(parseChemistryExpression(req.body.test)[0]);
    const result: CheckerResponse = check(test, target);

    res.status(201).send(result);

    const str: string = JSON.stringify(result, null, 4);
    console.log(`[server]: checker response ${str}`);
});

router.post('/parse', parseValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const parse: ChemAST = parseChemistryExpression(req.body.test)[0];
    const flattened: ChemAST = flatten(parse);

    res.status(201).send(flattened);

    const str: string = JSON.stringify(flattened, null, 4);
    const request: string = req.body.description ? " '" + req.body.description + "'" : "";
    console.log(`[server]: Parsed request${request}`);
    console.log(`[server]: \n${str}`);
});

export default router;

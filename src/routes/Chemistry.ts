import { Request, Response, Router } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import { parseChemistryExpression } from "inequality-grammar";
import { check, augment } from "../models/Chemistry";
import { CheckerResponse, ChemistryOptions } from "../models/common";

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

    const target: ChemAST = augment(parseChemistryExpression(req.body.target)[0]);
    const test: ChemAST = augment(parseChemistryExpression(req.body.test)[0]);
    const options: ChemistryOptions = {
        // The API sends attachments as a string hashmap, so we need to convert them to boolean
        allowPermutations: req.body.allowPermutations === "true",
        allowScalingCoefficients: req.body.allowScalingCoefficients === "true",
    }
    const result: CheckerResponse = check(test, target, options);

    res.status(201).send(result);

    const resultStr: string = JSON.stringify(result, null, 4);

    console.log(`[server]: question ID: ${req.body.questionID}`);
    console.log(`[server]: target expression: ${req.body.target}`);
    console.log(`[server]: test expression: ${req.body.test}`);
    console.log(`[server]: checker response: ${resultStr}`);
});

router.post('/parse', parseValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const parse: ChemAST = parseChemistryExpression(req.body.test)[0];
    const augmented: ChemAST = augment(parse);

    res.status(201).send(augmented);

    const str: string = JSON.stringify(augmented, null, 4);
    const request: string = req.body.description ? " '" + req.body.description + "'" : "";
    console.log(`[server]: Parsed request${request}`);
    console.log(`[server]: \n${str}`);
});

export default router;

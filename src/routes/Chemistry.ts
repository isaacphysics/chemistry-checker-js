import { Request, Response, Router } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import { parseChemistryExpression } from "inequality-grammar";

const router = Router();

const checkValidationRules: ValidationChain[] = [];
const parseValidationRules: ValidationChain[] = [
    body('test').notEmpty().withMessage("mhChem expression is required."),
    body('description').optional().isString().withMessage("When provided the descrition must be a string.")
];


router.post('/check', checkValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const str: string = JSON.stringify(req.body, null, 4);
    console.log(`[server]: /chem recieved ${str}`);
    res.status(501).send("Not Implemented");
});

router.post('/parse', parseValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const parse: ChemAST = parseChemistryExpression(req.body.test)[0];
    res.status(201).send(parse);

    const str: string = JSON.stringify(parse, null, 4);
    const request: string = req.body.description ? " '" + req.body.description + "'" : "";
    console.log(`[server]: Parsed request${request}`);
    console.log(`[server]: \n${str}`);
});

export default router;

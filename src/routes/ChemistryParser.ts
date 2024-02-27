import { Request, Response, Router } from "express";
import { ValidationChain, validationResult } from "express-validator";

const router = Router();

const chemValidationRules: ValidationChain[] = [];

router.post('/', chemValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const str: string = JSON.stringify(req.body, null, 4);
    console.log(`[server]: /chem-parser recieved ${str}`);
    res.status(501).send("Not Implemented\n");
});

export default router;

import { Request, Response, Router } from "express";
import { ValidationChain, validationResult } from "express-validator";

const router = Router();

const nuclearValidationRules: ValidationChain[] = [];

router.post('/', nuclearValidationRules, (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const str: string = JSON.stringify(req.body, null, 4);
    console.log(`[server]: /nuclear recieved ${str}`);
    res.status(501).send("Not Implemented\n");
});

export default router;

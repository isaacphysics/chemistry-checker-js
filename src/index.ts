import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Loaded from `.env` file
const port = process.env.PORT;

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
      res.send('The Nu-Chem Checker');
});

// Return internal server error if an error occurs
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong');
})

app.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
});

import express from 'express';
import cors from 'cors';
import { router } from './api/routes.mjs';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

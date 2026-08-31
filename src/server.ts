import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

// health check route
app.get('/health', (_req, res) => {
  res
    .status(200)
    .json({ status: 'UP', message: 'Campus Assistant Server Running' });
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:', PORT);
});

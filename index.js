import dotenv from 'dotenv';
import app from './src/app.js';

dotenv.config();

const rawPort = process.env.PORT || '5000';
// Extract only digits from the port string to handle "5000A" or similar typos
const PORT = parseInt(rawPort.toString().replace(/\D/g, '')) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

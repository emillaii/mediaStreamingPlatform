import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import bcrypt from 'bcryptjs';
import { pool, verifyConnection } from '../src/db/pool.js';

const rl = readline.createInterface({ input, output });

const prompt = async (question, mask = false) => {
  if (!mask) {
    return rl.question(question);
  }

  // simple masking by turning off echo
  return new Promise((resolve) => {
    const stdin = process.openStdin();
    process.stdout.write(question);
    let value = '';

    const onData = (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(value);
          break;
        case '\u0003':
          process.stdout.write('\n');
          process.exit();
          break;
        default:
          process.stdout.write('*');
          value += char;
          break;
      }
    };

    stdin.on('data', onData);
  });
};

const main = async () => {
  try {
    await verifyConnection();

    const email = (await prompt('Admin email: ')).trim().toLowerCase();
    const password = await prompt('Admin password: ', true);

    if (!email || !password) {
      console.error('Email and password are required.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO super_admins (email, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email, created_at
    `;

    const { rows } = await pool.query(query, [email, passwordHash]);

    console.log('Super admin ready:', rows[0]);
  } catch (error) {
    console.error('Failed to create super admin:', error);
  } finally {
    await rl.close();
    await pool.end();
  }
};

main();

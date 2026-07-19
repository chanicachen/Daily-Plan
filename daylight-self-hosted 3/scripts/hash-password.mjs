import { randomBytes, scryptSync } from "node:crypto";

let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/[\r\n]+$/, "");
if (password.length < 10) {
  console.error("Please choose a password with at least 10 characters.");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
console.log(`scrypt:${salt}:${hash}`);

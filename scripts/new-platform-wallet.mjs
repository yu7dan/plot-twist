// Creates the platform hot wallets (one EVM key for the six EVM networks, one Solana key)
// and appends them to .env.local if they aren't there yet. Never commit .env.local.
import crypto from "crypto";
import { existsSync, readFileSync, appendFileSync } from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const FILE = ".env.local";
const env = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";
const has = (k) => new RegExp(`^${k}=.+`, "m").test(env);
const add = [];

if (!has("SESSION_SECRET")) add.push(`SESSION_SECRET=${crypto.randomBytes(32).toString("base64url")}`);
if (!has("PLATFORM_EVM_KEY")) add.push(`PLATFORM_EVM_KEY=${generatePrivateKey()}`);
if (!has("PLATFORM_SOLANA_KEY")) add.push(`PLATFORM_SOLANA_KEY=${bs58.encode(Keypair.generate().secretKey)}`);
if (add.length) appendFileSync(FILE, (env.endsWith("\n") || !env ? "" : "\n") + add.join("\n") + "\n");

const all = readFileSync(FILE, "utf8");
const get = (k) => all.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
console.log("EVM platform address (Base, Polygon, Avalanche, Arc, Tempo, Robinhood):", privateKeyToAccount(get("PLATFORM_EVM_KEY")).address);
console.log("Solana platform address:", Keypair.fromSecretKey(bs58.decode(get("PLATFORM_SOLANA_KEY"))).publicKey.toBase58());
console.log(add.length ? `Added ${add.length} value(s) to ${FILE}.` : "Nothing new; keys already in .env.local.");

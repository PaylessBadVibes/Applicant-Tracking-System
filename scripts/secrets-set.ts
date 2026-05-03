import readline from "node:readline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import keytar from "keytar";

const KEYTAR_SERVICE = "ATS";

async function readFromStdin(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise<string>((resolve) => {
    rl.once("line", (line) => {
      rl.close();
      resolve(line);
    });
  });
}

async function main() {
  const args = await yargs(hideBin(process.argv))
    .option("key", { type: "string", demandOption: true })
    .option("value", { type: "string" })
    .option("from-stdin", { type: "boolean", default: false })
    .strict()
    .parse();

  const key = args.key;
  let value = args.value;

  if (!value && !args["from-stdin"]) {
    value = await readFromStdin(`Enter value for "${key}" (input is echoed; clear your scrollback when done):\n> `);
  } else if (!value && args["from-stdin"]) {
    value = await readFromStdin("");
  }

  if (!value) {
    console.error("Empty value supplied; aborting.");
    process.exit(2);
  }

  await keytar.setPassword(KEYTAR_SERVICE, key, value);
  console.log(`Stored "${key}" in Windows Credential Manager (service: ${KEYTAR_SERVICE}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

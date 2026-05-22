import fs from "node:fs";

function usage() {
  console.error(
    "Usage: node scripts/apply-pgmeta-sql.mjs <endpoint> <apiKey> <sqlFile>",
  );
  process.exit(1);
}

const [, , endpoint, apiKey, sqlFile] = process.argv;

if (!endpoint || !apiKey || !sqlFile) {
  usage();
}

const sql = fs.readFileSync(sqlFile, "utf8");

function splitSqlStatements(input) {
  const statements = [];
  let buffer = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];
    const next = input[index + 1] ?? "";

    if (inLineComment) {
      buffer += current;
      if (current === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      buffer += current;
      if (current === "*" && next === "/") {
        buffer += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (dollarTag) {
      buffer += current;
      if (current === "$" && input.startsWith(dollarTag, index)) {
        const remainder = dollarTag.slice(1);
        buffer += remainder;
        index += remainder.length;
        dollarTag = null;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && current === "-" && next === "-") {
      buffer += current + next;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && current === "/" && next === "*") {
      buffer += current + next;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && current === "$") {
      const match = input.slice(index).match(/^\$[A-Za-z0-9_]*\$/u);
      if (match) {
        dollarTag = match[0];
        buffer += match[0];
        index += match[0].length - 1;
        continue;
      }
    }

    if (!inDoubleQuote && current === "'" && input[index - 1] !== "\\") {
      inSingleQuote = !inSingleQuote;
      buffer += current;
      continue;
    }

    if (!inSingleQuote && current === '"' && input[index - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      buffer += current;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && current === ";") {
      const statement = buffer.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      buffer = "";
      continue;
    }

    buffer += current;
  }

  const finalStatement = buffer.trim();
  if (finalStatement.length > 0) {
    statements.push(finalStatement);
  }

  return statements;
}

const statements = splitSqlStatements(sql);

for (const [index, statement] of statements.entries()) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: apiKey,
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: `${statement};` }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Statement ${index + 1} failed:\n${statement}\n\n${text}`);
    process.exit(1);
  }

  process.stdout.write(`Applied ${index + 1}/${statements.length}\n`);
}

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const schemaPath = path.join(rootDir, "schema", "grades-data.schema.json");

function listJsonFiles(dirPath) {
  const result = [];
  const promotions = fs.readdirSync(dirPath);

  promotions.forEach((promotion) => {
    const promotionDir = path.join(dirPath, promotion);
    if (!fs.statSync(promotionDir).isDirectory()) return;

    fs.readdirSync(promotionDir).forEach((fileName) => {
      if (!fileName.endsWith(".json")) return;
      result.push(path.join(promotionDir, fileName));
    });
  });

  return result;
}

function formatAjvErrors(errors) {
  return errors
    .map((error) => {
      const location = error.instancePath || "/";
      return `  - ${location} ${error.message}`;
    })
    .join("\n");
}

function main() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  const jsonFiles = listJsonFiles(dataDir);
  const failures = [];

  jsonFiles.forEach((filePath) => {
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const valid = validate(content);

    if (!valid) {
      failures.push({
        filePath,
        errors: validate.errors || [],
      });
    }
  });

  if (failures.length > 0) {
    console.error(`Schema validation failed for ${failures.length} file(s):`);
    failures.forEach((failure) => {
      const relativePath = path.relative(rootDir, failure.filePath);
      console.error(`\n${relativePath}`);
      console.error(formatAjvErrors(failure.errors));
    });
    process.exit(1);
  }

  console.log(`Schema validation passed for ${jsonFiles.length} file(s).`);
}

main();

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const script = path.join(__dirname, "probe-db.mjs");
const log = path.join(__dirname, "probe-db.log");
fs.rmSync(log, { force: true });
const res = spawnSync(process.execPath, [script], { encoding: "utf8", timeout: 90000 });
const out = [
  "exit=" + res.status,
  "stdout=" + (res.stdout || ""),
  "stderr=" + (res.stderr || ""),
  "logfile=",
  fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "(no log)",
].join("\n");
fs.writeFileSync(path.join(__dirname, "probe-result.txt"), out, "utf8");
console.log(out);

import { runHeldOutEvaluation } from "./evaluation";

const report = runHeldOutEvaluation();
console.log(JSON.stringify(report, null, 2));
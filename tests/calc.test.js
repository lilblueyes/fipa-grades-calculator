import assert from "assert";

import {
  buildWeightedItems,
  computeWeightedOutcome,
  groupGrades,
  isGradeValid,
  isTargetAverageValid,
} from "../js/calc.js";

function approxEqual(actual, expected, epsilon = 1e-10) {
  assert.ok(Math.abs(actual - expected) < epsilon, `expected ${expected}, got ${actual}`);
}

const tests = [
  {
    name: "compute outcome with missing grade and internal coefficients",
    run() {
      const courses = [
        {
          name: "Analyse",
          coef: 2,
          grades: [
            { name: "Exam", coef: 0.25 },
            { name: "TP", coef: 0.75 },
          ],
        },
        {
          name: "Projet",
          coef: 1,
        },
      ];

      const { items, totalWeight } = buildWeightedItems(courses);
      assert.equal(totalWeight, 3);

      const outcome = computeWeightedOutcome({
        items,
        totalWeight,
        targetAverage: 10,
        valuesById: {
          "course-0-grade-0": 12,
          "course-0-grade-1": null,
          "course-1": 10,
        },
      });

      assert.equal(outcome.missingCount, 1);
      approxEqual(outcome.currentAverage, 10.666666666666666);
      approxEqual(outcome.neededGrade, 9.333333333333334);
    },
  },
  {
    name: "detect impossible target when required grade is above 20",
    run() {
      const courses = [
        { name: "Cours A", coef: 3 },
        { name: "Cours B", coef: 1 },
      ];

      const { items, totalWeight } = buildWeightedItems(courses);
      const outcome = computeWeightedOutcome({
        items,
        totalWeight,
        targetAverage: 12,
        valuesById: {
          "course-0": 5,
          "course-1": null,
        },
      });

      assert.equal(outcome.missingCount, 1);
      assert.ok(outcome.neededGrade > 20);
    },
  },
  {
    name: "ignore grade breakdown with invalid internal coefficients",
    run() {
      const courses = [
        {
          name: "Cours invalide",
          coef: 2,
          grades: [
            { name: "A", coef: 0 },
            { name: "B", coef: 0 },
          ],
        },
        {
          name: "Cours valide",
          coef: 1,
        },
      ];

      const { items, totalWeight } = buildWeightedItems(courses);

      assert.equal(totalWeight, 1);
      assert.equal(items.length, 1);
      assert.equal(items[0].id, "course-1");
    },
  },
  {
    name: "validate target average boundaries",
    run() {
      assert.equal(isTargetAverageValid(10), true);
      assert.equal(isTargetAverageValid(0), true);
      assert.equal(isTargetAverageValid(20), true);
      assert.equal(isTargetAverageValid(-1), false);
      assert.equal(isTargetAverageValid(21), false);
      assert.equal(isTargetAverageValid(Number.NaN), false);
    },
  },
  {
    name: "compute final average when all grades are provided",
    run() {
      const courses = [
        { name: "Cours A", coef: 2 },
        { name: "Cours B", coef: 1 },
      ];

      const { items, totalWeight } = buildWeightedItems(courses);
      const outcome = computeWeightedOutcome({
        items,
        totalWeight,
        targetAverage: 11,
        valuesById: {
          "course-0": 10,
          "course-1": 14,
        },
      });

      assert.equal(outcome.missingCount, 0);
      approxEqual(outcome.finalAverage, 11.333333333333334);
      assert.equal(outcome.neededGrade, null);
    },
  },
  {
    name: "scale grades noted out of 5 to 20 (mini-quiz)",
    run() {
      const courses = [
        {
          name: "Systèmes d'exploitation",
          coef: 1,
          grades: [
            { name: "TP", coef: 4 },
            { name: "Q1", coef: 1.2, group: "Mini-quiz", max: 5 },
            { name: "Q2", coef: 1.2, group: "Mini-quiz", max: 5 },
            { name: "Q3", coef: 1.2, group: "Mini-quiz", max: 5 },
            { name: "Q4", coef: 1.2, group: "Mini-quiz", max: 5 },
            { name: "Q5", coef: 1.2, group: "Mini-quiz", max: 5 },
            { name: "QCM", coef: 10 },
          ],
        },
      ];

      const { items, totalWeight } = buildWeightedItems(courses);
      const valuesById = {};
      items.forEach((item, position) => {
        valuesById[item.id] = [14, 5, 5, 5, 5, 5, 12][position];
      });

      const outcome = computeWeightedOutcome({ items, valuesById, totalWeight, targetAverage: 10 });

      // (4 × 14 + 6 × 20 + 10 × 12) / 20 : cinq mini-quiz à 5/5 valent 6 points sur 20
      approxEqual(outcome.finalAverage, 14.8);
      assert.equal(outcome.missingCount, 0);
    },
  },
  {
    name: "validate grades against their own maximum",
    run() {
      assert.equal(isGradeValid(5, 5), true);
      assert.equal(isGradeValid(5.5, 5), false);
      assert.equal(isGradeValid(18), true);
      assert.equal(isGradeValid(21), false);
    },
  },
  {
    name: "group consecutive grades sharing the same group",
    run() {
      const grades = [
        { name: "TP", coef: 4 },
        { name: "Q1", coef: 1.2, group: "Mini-quiz", max: 5 },
        { name: "Q2", coef: 1.2, group: "Mini-quiz", max: 5 },
        { name: "QCM", coef: 10 },
      ];

      const groups = groupGrades(grades);
      assert.equal(groups.length, 3);
      assert.equal(groups[1].name, "Mini-quiz");
      assert.deepEqual(groups[1].gradeIndexes, [1, 2]);
      approxEqual(groups[1].coef, 2.4);
      assert.equal(groups[2].name, "QCM");
    },
  },
];

let passed = 0;
for (const testCase of tests) {
  try {
    testCase.run();
    passed += 1;
    console.log(`ok - ${testCase.name}`);
  } catch (error) {
    console.error(`not ok - ${testCase.name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);
if (passed !== tests.length) {
  process.exitCode = 1;
}

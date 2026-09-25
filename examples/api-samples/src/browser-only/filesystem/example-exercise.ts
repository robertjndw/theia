// *****************************************************************************
// Copyright (C) 2025 Robert Jandow and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

export const exerciseFiles: { name: string, content: string }[] = [
    {
        name: 'bubblesort.ts',
        content: `export default class BubbleSort {
    // TODO: implement in performSort(Array<Date>)
}
`},
    {
        name: 'client.ts',
        content: `import Context from "./context";

const ITERATIONS = 10;
const DATES_LENGTH_MIN = 5;
const DATES_LENGTH_MAX = 15;

/**
 * Main function.
 * Add code to demonstrate your implementation here.
 */
function main() {
    // TODO: Init Context and Policy
    let context = new Context()

    // Run multiple times to simulate different sorting strategies
    for (let i = 0; i < ITERATIONS; i++) {
        const dates = createRandomDates();

        // TODO: Configure context

        console.log('Unsorted Array of dates:');
        console.log(dates);

        // TODO: Sort dates

        console.log('Sorted Array of dates:');
        console.log(dates);
    }
}

/**
 * Generates an Array of random Date objects with random Array length between
 * {@link DATES_LENGTH_MIN} and {@link DATES_LENGTH_MAX}.
 *
 * @return an Array of random Date objects
 */
function createRandomDates(): Array<Date> {
    const length = randomIntegerWithin(DATES_LENGTH_MIN, DATES_LENGTH_MAX);

    const lowestDate = new Date('2024-09-15');
    const highestDate = new Date('2025-01-15');

    return Array.from(Array(length), () => randomDateWithin(lowestDate, highestDate));
}

/**
 * Creates a random Date within the given range.
 *
 * @param low {Date} the lower bound
 * @param high {Date} the upper bound
 * @return {Date} random Date within the given range
 */
function randomDateWithin(low: Date, high: Date): Date {
    const randomTimestamp = randomIntegerWithin(low.valueOf(), high.valueOf());
    return new Date(randomTimestamp);
}

/**
 * Creates a random int within the given range.
 *
 * @param low {number} the lower bound
 * @param high {number} the upper bound
 * @returns {number} random int within the given range
 */
function randomIntegerWithin(low: number, high: number): number {
    return Math.floor(Math.random() * (high - low + 1)) + low;
}

main();
    `
    },
    {
        name: 'context.ts',
        content: `export default class Context {
    // TODO: Create and implement a Context class according to the UML class diagram
}`
    },
    {
        name: 'mergesort.ts',
        content: `export default class MergeSort {
    // TODO: implement in performSort(Array<Date>)
}`
    },
    {
        name: 'policy.ts',
        content: `export default class Policy {
    // TODO: Create and implement a Policy class as described in the problem statement
}`
    },
    {
        name: 'sortstrategy.ts',
        content: `export default interface SortStrategy {
    // TODO: Create a SortStrategy interface according to the UML class diagram
}`
    }
];

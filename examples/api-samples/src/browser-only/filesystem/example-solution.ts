export const solutionFiles = [
    {
        name: "bubblesort.ts",
        content: `import SortStrategy from './sortstrategy';
import Comparable from './comparable';

export default class BubbleSort<T extends Comparable = Date> implements SortStrategy<T> {
    /**
     * Sorts objects with BubbleSort.
     *
     * @param input {Array<T>} the array of objects to be sorted
     */
    performSort(input: Array<T>) {
        for (let i = input.length - 1; i >= 0; i--) {
            for (let j = 0; j < i; j++) {
                if (input[j].valueOf() > input[j + 1].valueOf()) {
                    const temp = input[j];
                    input[j] = input[j + 1];
                    input[j + 1] = temp;
                }
            }
        }
    }
}
`},
    {
        name: "client.ts",
        content: `import Context from './context';
import Policy from './policy';

const ITERATIONS = 10;
const DATES_LENGTH_MIN = 5;
const DATES_LENGTH_MAX = 15;

/**
 * Main function.
 * Add code to demonstrate your implementation here.
 */
function main() {
    // Init Context and Policy
    const context = new Context();
    const policy = new Policy(context);

    // Run multiple times to simulate different sorting strategies
    for (let i = 0; i < ITERATIONS; i++) {
        const dates = createRandomDates();

        context.dates = dates;
        policy.configure();

        console.log('Unsorted Array of dates:');
        console.log(dates);

        context.sort();

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

main();`
    },
    {
        name: "comparable.ts",
        content: `eexport default interface Comparable {
    valueOf(): number;
}`
    },
    {
        name: "context.ts",
        content: `import type SortStrategy from './sortstrategy';

        export default class Context {
            private _sortAlgorithm: SortStrategy | null = null;

            private _dates: Array<Date> = [];

            /**
             * Runs the configured sort algorithm.
             */
            sort() {
                this._sortAlgorithm?.performSort(this._dates);
            }

    get sortAlgorithm(): SortStrategy | null {
                return this._sortAlgorithm;
            }

    set sortAlgorithm(sortAlgorithm: SortStrategy) {
                this._sortAlgorithm = sortAlgorithm;
            }

    get dates(): Array<Date> {
                return this._dates;
            }

    set dates(dates: Array<Date>) {
                this._dates = dates;
            }
        }`
    },
    {
        name: "mergesort.ts",
        content: `import SortStrategy from './sortstrategy';
import Comparable from './comparable';

export default class MergeSort<T extends Comparable> implements SortStrategy<T> {
    /**
     * Wrapper method for the real MergeSort algorithm.
     *
     * @template T
     * @param input {Array<T>} the array of objects to be sorted
     */
    performSort(input: Array<T>) {
        mergesort(input, 0, input.length - 1);
    }
}

/**
 * Recursive merge sort function
 *
 * @template T
 * @param input {Array<T>}
 * @param low {number}
 * @param high {number}
 */
function mergesort<T extends Comparable>(input: Array<T>, low: number, high: number) {
    if (low >= high) {
        return;
    }
    const mid = Math.floor((low + high) / 2);
    mergesort(input, low, mid);
    mergesort(input, mid + 1, high);
    merge(input, low, mid, high);
}

/**
 * Merge function
 *
 * @template T
 * @param input {Array<T>}
 * @param low {number}
 * @param middle {number}
 * @param high {number}
 */
function merge<T extends Comparable>(input: Array<T>, low: number, middle: number, high: number) {
    const temp = new Array<T>(high - low + 1);

    let leftIndex = low;
    let rightIndex = middle + 1;
    let wholeIndex = 0;

    while (leftIndex <= middle && rightIndex <= high) {
        if (input[leftIndex].valueOf() <= input[rightIndex].valueOf()) {
            temp[wholeIndex] = input[leftIndex++];
        } else {
            temp[wholeIndex] = input[rightIndex++];
        }
        wholeIndex++;
    }

    while (leftIndex <= middle) {
        temp[wholeIndex++] = input[leftIndex++];
    }
    while (rightIndex <= high) {
        temp[wholeIndex++] = input[rightIndex++];
    }

    for (wholeIndex = 0; wholeIndex < temp.length; wholeIndex++) {
        input[wholeIndex + low] = temp[wholeIndex];
    }
} `
    },
    {
        name: "policy.ts",
        content: `import BubbleSort from './bubblesort';
import MergeSort from './mergesort';
import Context from './context';

const DATES_LENGTH_THRESHOLD = 10;

export default class Policy {
    constructor(private _context: Context) { }

    /**
     * Chooses a strategy depending on the number of date objects.
     */
    configure() {
        if (this._context.dates.length > DATES_LENGTH_THRESHOLD) {
            this._context.sortAlgorithm = new MergeSort();
        } else {
            this._context.sortAlgorithm = new BubbleSort();
        }
    }

    get context(): Context {
        return this._context;
    }

    set context(context: Context) {
        this._context = context;
    }
} `
    },
    {
        name: "sortstrategy.ts",
        content: `import Comparable from './comparable';

export default interface SortStrategy<T extends Comparable = Date> {
    performSort(dates: Array<T>): void;
}`
    }
];

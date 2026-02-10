"use strict";
/**
 * 動作確認用のサンプルコード
 */
function greet(name) {
    if (name === '') {
        return 'Hello, World!';
    }
    else {
        return `Hello, ${name}!`;
    }
}
function calculateSum(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum = sum + i;
    }
    return sum;
}
const factorial = (n) => {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
};
function processData(data) {
    let i = 0;
    while (i < data.length) {
        const value = data[i];
        console.log(value);
        i = i + 1;
    }
}
//# sourceMappingURL=sample.js.map
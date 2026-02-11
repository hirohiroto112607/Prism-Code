/**
 * 動作確認用のサンプルコード
 */

function greet(name: string): string {
  if (name === '') {
    return 'Hello, World!';
  } else {
    return `Hello, ${name}!`;
  }
}

function calculateSum(n: number): number {
  let sum = 0;

  for (let i = 1; i <= n; i++) {
    sum = sum + i;
  }

  return sum;
}

const factorial = (n: number): number => {
  if (n <= 1) {
    return 1;
  }

  return n * factorial(n - 1);
};

function processData(data: number[]): void {
  let i = 0;

  while (i < data.length) {
    const value = data[i];
    console.log(value);
    i = i + 1;
  }
}
console.log(greet('Alice'));
console.log(calculateSum(10));
console.log(factorial(5));
processData([1, 2, 3, 4, 5]);
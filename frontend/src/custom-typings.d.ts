// custom-typings.d.ts

// xirr package types
declare module 'xirr' {
  export interface XirrCashFlow {
    amount: number;
    when: Date;
  }
  export function xirr(cashflows: XirrCashFlow[], guess?: number): number;
}

// Add more custom module/interface declarations below as needed

declare module 'newton-raphson-method' {
  type NewtonFn = (x: number) => number;
  type NewtonOptions = {
    tolerance?: number;
    maxIterations?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  function newton(
    valueFn: NewtonFn,
    derivativeFn: NewtonFn,
    guess: number,
    options?: NewtonOptions
  ): number | false;
  export default newton;
}

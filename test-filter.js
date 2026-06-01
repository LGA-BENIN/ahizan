const price = 10000;
const listPrice = price * 1.25; 
const discount = Math.round((1 - price / listPrice) * 100);
console.log(discount);

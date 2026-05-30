import { parsePhoneNumberFromString } from 'libphonenumber-js';

const cases = [
  '+5511999999999',
  '5511999999999',
  '11999999999',
  '(11) 99999-9999',
  '91982935558',
  '5591982935558'
];

cases.forEach(c => {
  const p = parsePhoneNumberFromString(c, 'BR');
  console.log(`${c} -> ${p ? p.format('E.164') : 'INVALID'}`);
});

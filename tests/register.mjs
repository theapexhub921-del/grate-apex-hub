// Registers the "@/" alias loader before the tests run:
//   node --import ./tests/register.mjs --test tests/
import { register } from 'node:module';

register('./alias-loader.mjs', import.meta.url);

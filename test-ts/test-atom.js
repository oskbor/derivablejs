"use strict";
var atom_1 = require('../src-ts/atom');
var a = new atom_1.Atom(5);
console.log("a is 5:", a.get());
var twoa = a.derive(function (a) { return a * 2; });
console.log("twoa is 10:", twoa.get());
console.log("a is still 5:", a.get());

// import {assignPolyfill} from '../../src/util';
// import {expect} from 'chai';

"use strict";

var expect = require('chai').expect;
var assignPolyfill = require('../../src/util').assignPolyfill;

describe('the assign function polyfill', () => {
  it('merges objects together', () => {
    const caps = {a: "A", b: "B"};
    const lower = {a: "a", b: "b", c: "c"};
    const init = {};
    expect(assignPolyfill(init, lower, caps)).to.eql(init);
    expect(init).to.deep.equal({
      a: "A", b: "B", c: "c"
    });
  });
});
/**
 *  Copyright (c) 2015, David Sheldrick.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { ATOM, DERIVATION, LENS, REACTION } from './gc'
import { createAtomPrototype, constructAtom, transact } from './atom'
import { createDerivationPrototype, createDerivation } from './derivation'
import { createLensPrototype, createLens } from './lens'
import { createDerivablePrototype } from './derivable'
import { createMutablePrototype } from './mutable'
import { equals, extend, withPrototype } from './util'
import { Reaction } from './reaction'

const defaultConfig = { equals };

export default function havelock (config={}) {
  config = extend({}, defaultConfig, config);

  const Havelock = {
    transact,
    Reaction,
    isAtom:       x => x && x._type === ATOM,
    isDerivation: x => x && (x._type === DERIVATION || x._type === LENS),
    isLens:       x => x && x._type === LENS,
    isReaction:   x => x && x._type === REACTION,
  };

  Havelock.isDerivable  = x => Havelock.isDerivation(x) || Havelock.isAtom(x);

  let Derivable  = createDerivablePrototype(Havelock, config);
  let Mutable    = createMutablePrototype(Havelock, config);

  let Atom       = extend({}, Mutable, Derivable,
                          createAtomPrototype(Havelock, config));

  let Derivation = extend({}, Derivable,
                          createDerivationPrototype(Havelock, config));

  let Lens       = extend({}, Mutable, Derivation,
                          createLensPrototype(Havelock, config));


  /**
   * Constructs a new atom whose state is the given value
   */
  Havelock.atom = val => constructAtom(Object.create(Atom), val);

  /**
   * Sets the e's state to be f applied to e's current state and args
   */
  Havelock.swap = (e, f, args) => e.set(f.apply(null, [e.get()].concat(args)));

  /**
   * Creates a new derivation. Can also be used as a template string tag.
   */
  Havelock.derive = function (a, b, c, d, e) {
    if (a instanceof Array) {
      return deriveString.apply(null, arguments);
    }
    var n = arguments.length;
    switch (n) {
      case 0:
        throw new Error("Wrong arity for derive. Expecting 1+ args");
      case 1:
        return createDerivation(Object.create(Derivation), a);
      case 2:
        return Havelock.derive(() => b(a.get()));
      case 3:
        return Havelock.derive(() => c(a.get(), b.get()));
      case 4:
        return Havelock.derive(() => d(a.get(), b.get(), c.get()));
      case 5:
        return Havelock.derive(() => e(a.get(), b.get(), c.get(), d.get()));
      default:
        var args = Array.prototype.slice.call(arguments, 0, n-1);
        var f = arguments[n-1];
        return Havelock.derive(() => f.apply(null, args.map(a => a.get())));
    }
  };

  function deriveString (parts, ...args) {
    return Havelock.derive(() => {
      let s = "";
      for (let i=0; i<parts.length; i++) {
        s += parts[i];
        if (i < args.length) {
          s += Havelock.unpack(args[i]);
        }
      }
      return s;
    });
  }

  /**
   * creates a new lens
   */
  Havelock.lens = (parent, descriptor) => {
    let lens = Object.create(Lens);
    return createLens(createDerivation(lens,
                                       () => descriptor.get(parent.get())),
                      parent,
                      descriptor);
  };

  /**
   * dereferences a thing if it is dereferencable, otherwise just returns it.
   */
  Havelock.unpack = thing => {
    if (Havelock.isDerivable(thing)) {
      return thing.get();
    } else {
      return thing;
    }
  };

  /**
   * lifts a non-monadic function to work on derivables
   */
  Havelock.lift = f => {
    return function () {
      let args = arguments;
      return Havelock.derive(function () {
        return f.apply(this, Array.prototype.map.call(args, Havelock.unpack));
      });
    }
  };

  /**
   * sets a to v, returning v
   */
  Havelock.set = (a, v) => a.set(v);

  Havelock.get = d => d.get();

  function deepUnpack (thing) {
    if (Havelock.isDerivable(thing)) {
      return thing.get();
    } else if (thing instanceof Array) {
      return thing.map(deepUnpack);
    } else if (thing.constructor === Object) {
      let result = {};
      for (let prop of Object.keys(thing)) {
        result[prop] = deepUnpack(thing[prop]);
      }
      return result;
    } else {
      return thing;
    }
  }

  Havelock.struct = arg => Havelock.derive(() => deepUnpack(arg));

  Havelock.ifThenElse = (a, b, c) => a.then(b, c);

  Havelock.or = (...args) => Havelock.derive(() => {
    let val;
    for (let arg of args) {
      val = Havelock.unpack(arg);
      if (val) {
        break;
      }
    }
    return val;
  });

  Havelock.and = (...args) => Havelock.derive(() => {
    let val;
    for (let arg of args) {
      val = Havelock.unpack(arg);
      if (!val) {
        break;
      }
    }
    return val;
  });

  Havelock.not = x => x.not();

  Havelock.switchCase = (x, ...args) => Derivable.switch.apply(x, args);

  return Havelock;
}
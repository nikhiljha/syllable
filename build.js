(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var syllable = require('syllable');

var $input = document.getElementsByTagName('textarea')[0];
var $output = document.getElementsByTagName('output')[0];

$input.addEventListener('input', oninputchange);

oninputchange();

function oninputchange() {
  $output.textContent = $input.value.split(/\s+/g).map(syllable).reduce(sum);
}

function sum(a, b) {
  return a + b;
}

},{"syllable":6}],2:[function(require,module,exports){
var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],3:[function(require,module,exports){
var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":2}],4:[function(require,module,exports){
var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":3}],5:[function(require,module,exports){
/* global define */

(function (root, pluralize) {
  /* istanbul ignore else */
  if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
    // Node.
    module.exports = pluralize();
  } else if (typeof define === 'function' && define.amd) {
    // AMD, registers as an anonymous module.
    define(function () {
      return pluralize();
    });
  } else {
    // Browser global.
    root.pluralize = pluralize();
  }
})(this, function () {
  // Rule storage - pluralize and singularize need to be run sequentially,
  // while other rules can be optimized using an object for instant lookups.
  var pluralRules = [];
  var singularRules = [];
  var uncountables = {};
  var irregularPlurals = {};
  var irregularSingles = {};

  /**
   * Title case a string.
   *
   * @param  {string} str
   * @return {string}
   */
  function toTitleCase (str) {
    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
  }

  /**
   * Sanitize a pluralization rule to a usable regular expression.
   *
   * @param  {(RegExp|string)} rule
   * @return {RegExp}
   */
  function sanitizeRule (rule) {
    if (typeof rule === 'string') {
      return new RegExp('^' + rule + '$', 'i');
    }

    return rule;
  }

  /**
   * Pass in a word token to produce a function that can replicate the case on
   * another word.
   *
   * @param  {string}   word
   * @param  {string}   token
   * @return {Function}
   */
  function restoreCase (word, token) {
    // Upper cased words. E.g. "HELLO".
    if (word === word.toUpperCase()) {
      return token.toUpperCase();
    }

    // Title cased words. E.g. "Title".
    if (word[0] === word[0].toUpperCase()) {
      return toTitleCase(token);
    }

    // Lower cased words. E.g. "test".
    return token.toLowerCase();
  }

  /**
   * Interpolate a regexp string.
   *
   * @param  {string} str
   * @param  {Array}  args
   * @return {string}
   */
  function interpolate (str, args) {
    return str.replace(/\$(\d{1,2})/g, function (match, index) {
      return args[index] || '';
    });
  }

  /**
   * Sanitize a word by passing in the word and sanitization rules.
   *
   * @param  {String}   token
   * @param  {String}   word
   * @param  {Array}    collection
   * @return {String}
   */
  function sanitizeWord (token, word, collection) {
    // Empty string or doesn't need fixing.
    if (!token.length || uncountables.hasOwnProperty(token)) {
      return word;
    }

    var len = collection.length;

    // Iterate over the sanitization rules and use the first one to match.
    while (len--) {
      var rule = collection[len];

      // If the rule passes, return the replacement.
      if (rule[0].test(word)) {
        return word.replace(rule[0], function (match, index, word) {
          var result = interpolate(rule[1], arguments);

          if (match === '') {
            return restoreCase(word[index - 1], result);
          }

          return restoreCase(match, result);
        });
      }
    }

    return word;
  }

  /**
   * Replace a word with the updated word.
   *
   * @param  {Object}   replaceMap
   * @param  {Object}   keepMap
   * @param  {Array}    rules
   * @return {Function}
   */
  function replaceWord (replaceMap, keepMap, rules) {
    return function (word) {
      // Get the correct token and case restoration functions.
      var token = word.toLowerCase();

      // Check against the keep object map.
      if (keepMap.hasOwnProperty(token)) {
        return restoreCase(word, token);
      }

      // Check against the replacement map for a direct word replacement.
      if (replaceMap.hasOwnProperty(token)) {
        return restoreCase(word, replaceMap[token]);
      }

      // Run all the rules against the word.
      return sanitizeWord(token, word, rules);
    };
  }

  /**
   * Pluralize or singularize a word based on the passed in count.
   *
   * @param  {String}  word
   * @param  {Number}  count
   * @param  {Boolean} inclusive
   * @return {String}
   */
  function pluralize (word, count, inclusive) {
    var pluralized = count === 1
      ? pluralize.singular(word) : pluralize.plural(word);

    return (inclusive ? count + ' ' : '') + pluralized;
  }

  /**
   * Pluralize a word.
   *
   * @type {Function}
   */
  pluralize.plural = replaceWord(
    irregularSingles, irregularPlurals, pluralRules
  );

  /**
   * Singularize a word.
   *
   * @type {Function}
   */
  pluralize.singular = replaceWord(
    irregularPlurals, irregularSingles, singularRules
  );

  /**
   * Add a pluralization rule to the collection.
   *
   * @param {(string|RegExp)} rule
   * @param {string}          replacement
   */
  pluralize.addPluralRule = function (rule, replacement) {
    pluralRules.push([sanitizeRule(rule), replacement]);
  };

  /**
   * Add a singularization rule to the collection.
   *
   * @param {(string|RegExp)} rule
   * @param {string}          replacement
   */
  pluralize.addSingularRule = function (rule, replacement) {
    singularRules.push([sanitizeRule(rule), replacement]);
  };

  /**
   * Add an uncountable word rule.
   *
   * @param {(string|RegExp)} word
   */
  pluralize.addUncountableRule = function (word) {
    if (typeof word === 'string') {
      uncountables[word.toLowerCase()] = true;
      return;
    }

    // Set singular and plural references for the word.
    pluralize.addPluralRule(word, '$0');
    pluralize.addSingularRule(word, '$0');
  };

  /**
   * Add an irregular word definition.
   *
   * @param {String} single
   * @param {String} plural
   */
  pluralize.addIrregularRule = function (single, plural) {
    plural = plural.toLowerCase();
    single = single.toLowerCase();

    irregularSingles[single] = plural;
    irregularPlurals[plural] = single;
  };

  /**
   * Irregular rules.
   */
  [
    // Pronouns.
    ['I', 'we'],
    ['me', 'us'],
    ['he', 'they'],
    ['she', 'they'],
    ['them', 'them'],
    ['myself', 'ourselves'],
    ['yourself', 'yourselves'],
    ['itself', 'themselves'],
    ['herself', 'themselves'],
    ['himself', 'themselves'],
    ['themself', 'themselves'],
    ['is', 'are'],
    ['was', 'were'],
    ['has', 'have'],
    ['this', 'these'],
    ['that', 'those'],
    // Words ending in with a consonant and `o`.
    ['echo', 'echoes'],
    ['dingo', 'dingoes'],
    ['volcano', 'volcanoes'],
    ['tornado', 'tornadoes'],
    ['torpedo', 'torpedoes'],
    // Ends with `us`.
    ['genus', 'genera'],
    ['viscus', 'viscera'],
    // Ends with `ma`.
    ['stigma', 'stigmata'],
    ['stoma', 'stomata'],
    ['dogma', 'dogmata'],
    ['lemma', 'lemmata'],
    ['schema', 'schemata'],
    ['anathema', 'anathemata'],
    // Other irregular rules.
    ['ox', 'oxen'],
    ['axe', 'axes'],
    ['die', 'dice'],
    ['yes', 'yeses'],
    ['foot', 'feet'],
    ['eave', 'eaves'],
    ['goose', 'geese'],
    ['tooth', 'teeth'],
    ['quiz', 'quizzes'],
    ['human', 'humans'],
    ['proof', 'proofs'],
    ['carve', 'carves'],
    ['valve', 'valves'],
    ['looey', 'looies'],
    ['thief', 'thieves'],
    ['groove', 'grooves'],
    ['pickaxe', 'pickaxes'],
    ['whiskey', 'whiskies']
  ].forEach(function (rule) {
    return pluralize.addIrregularRule(rule[0], rule[1]);
  });

  /**
   * Pluralization rules.
   */
  [
    [/s?$/i, 's'],
    [/([^aeiou]ese)$/i, '$1'],
    [/(ax|test)is$/i, '$1es'],
    [/(alias|[^aou]us|tlas|gas|ris)$/i, '$1es'],
    [/(e[mn]u)s?$/i, '$1s'],
    [/([^l]ias|[aeiou]las|[emjzr]as|[iu]am)$/i, '$1'],
    [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1i'],
    [/(alumn|alg|vertebr)(?:a|ae)$/i, '$1ae'],
    [/(seraph|cherub)(?:im)?$/i, '$1im'],
    [/(her|at|gr)o$/i, '$1oes'],
    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, '$1a'],
    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)(?:a|on)$/i, '$1a'],
    [/sis$/i, 'ses'],
    [/(?:(kni|wi|li)fe|(ar|l|ea|eo|oa|hoo)f)$/i, '$1$2ves'],
    [/([^aeiouy]|qu)y$/i, '$1ies'],
    [/([^ch][ieo][ln])ey$/i, '$1ies'],
    [/(x|ch|ss|sh|zz)$/i, '$1es'],
    [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, '$1ices'],
    [/(m|l)(?:ice|ouse)$/i, '$1ice'],
    [/(pe)(?:rson|ople)$/i, '$1ople'],
    [/(child)(?:ren)?$/i, '$1ren'],
    [/eaux$/i, '$0'],
    [/m[ae]n$/i, 'men'],
    ['thou', 'you']
  ].forEach(function (rule) {
    return pluralize.addPluralRule(rule[0], rule[1]);
  });

  /**
   * Singularization rules.
   */
  [
    [/s$/i, ''],
    [/(ss)$/i, '$1'],
    [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(?:sis|ses)$/i, '$1sis'],
    [/(^analy)(?:sis|ses)$/i, '$1sis'],
    [/(wi|kni|(?:after|half|high|low|mid|non|night|[^\w]|^)li)ves$/i, '$1fe'],
    [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, '$1f'],
    [/ies$/i, 'y'],
    [/\b([pl]|zomb|(?:neck|cross)?t|coll|faer|food|gen|goon|group|lass|talk|goal|cut)ies$/i, '$1ie'],
    [/\b(mon|smil)ies$/i, '$1ey'],
    [/(m|l)ice$/i, '$1ouse'],
    [/(seraph|cherub)im$/i, '$1'],
    [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|tlas|gas|(?:her|at|gr)o|ris)(?:es)?$/i, '$1'],
    [/(e[mn]u)s?$/i, '$1'],
    [/(movie|twelve)s$/i, '$1'],
    [/(cris|test|diagnos)(?:is|es)$/i, '$1is'],
    [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1us'],
    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|quor)a$/i, '$1um'],
    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)a$/i, '$1on'],
    [/(alumn|alg|vertebr)ae$/i, '$1a'],
    [/(cod|mur|sil|vert|ind)ices$/i, '$1ex'],
    [/(matr|append)ices$/i, '$1ix'],
    [/(pe)(rson|ople)$/i, '$1rson'],
    [/(child)ren$/i, '$1'],
    [/(eau)x?$/i, '$1'],
    [/men$/i, 'man']
  ].forEach(function (rule) {
    return pluralize.addSingularRule(rule[0], rule[1]);
  });

  /**
   * Uncountable rules.
   */
  [
    // Singular words with no plurals.
    'advice',
    'adulthood',
    'agenda',
    'aid',
    'alcohol',
    'ammo',
    'athletics',
    'bison',
    'blood',
    'bream',
    'buffalo',
    'butter',
    'carp',
    'cash',
    'chassis',
    'chess',
    'clothing',
    'commerce',
    'cod',
    'cooperation',
    'corps',
    'digestion',
    'debris',
    'diabetes',
    'energy',
    'equipment',
    'elk',
    'excretion',
    'expertise',
    'flounder',
    'fun',
    'gallows',
    'garbage',
    'graffiti',
    'headquarters',
    'health',
    'herpes',
    'highjinks',
    'homework',
    'housework',
    'information',
    'jeans',
    'justice',
    'kudos',
    'labour',
    'literature',
    'machinery',
    'mackerel',
    'mail',
    'media',
    'mews',
    'moose',
    'music',
    'news',
    'pike',
    'plankton',
    'pliers',
    'pollution',
    'premises',
    'rain',
    'research',
    'rice',
    'salmon',
    'scissors',
    'series',
    'sewage',
    'shambles',
    'shrimp',
    'species',
    'staff',
    'swine',
    'trout',
    'traffic',
    'transporation',
    'tuna',
    'wealth',
    'welfare',
    'whiting',
    'wildebeest',
    'wildlife',
    'you',
    // Regexes.
    /pox$/i, // "chickpox", "smallpox"
    /ois$/i,
    /deer$/i, // "deer", "reindeer"
    /fish$/i, // "fish", "blowfish", "angelfish"
    /sheep$/i,
    /measles$/i,
    /[^aeiou]ese$/i // "chinese", "japanese"
  ].forEach(pluralize.addUncountableRule);

  return pluralize;
});

},{}],6:[function(require,module,exports){
/**
 * @author Titus Wormer
 * @copyright 2014 Titus Wormer
 * @license MIT
 * @module syllable
 * @fileoverview Count syllables in English words.
 */

'use strict';

/* Dependencies. */
var has = require('has');
var pluralize = require('pluralize');
var problematic = require('./problematic');

/* Expose. */
module.exports = syllable;

/* Two expressions of occurrences which normally would
 * be counted as two syllables, but should be counted
 * as one. */
var EXPRESSION_MONOSYLLABIC_ONE = new RegExp(
  'cia(l|$)|' +
  'tia|' +
  'cius|' +
  'cious|' +
  '[^aeiou]giu|' +
  '[aeiouy][^aeiouy]ion|' +
  'iou|' +
  'sia$|' +
  'eous$|' +
  '[oa]gue$|' +
  '.[^aeiuoycgltdb]{2,}ed$|' +
  '.ely$|' +
  '^jua|' +
  'uai|' +
  'eau|' +
  '^busi$|' +
  '(' +
    '[aeiouy]' +
    '(' +
      'b|' +
      'c|' +
      'ch|' +
      'dg|' +
      'f|' +
      'g|' +
      'gh|' +
      'gn|' +
      'k|' +
      'l|' +
      'lch|' +
      'll|' +
      'lv|' +
      'm|' +
      'mm|' +
      'n|' +
      'nc|' +
      'ng|' +
      'nch|' +
      'nn|' +
      'p|' +
      'r|' +
      'rc|' +
      'rn|' +
      'rs|' +
      'rv|' +
      's|' +
      'sc|' +
      'sk|' +
      'sl|' +
      'squ|' +
      'ss|' +
      'th|' +
      'v|' +
      'y|' +
      'z' +
    ')' +
    'ed$' +
  ')|' +
  '(' +
    '[aeiouy]' +
    '(' +
      'b|' +
      'ch|' +
      'd|' +
      'f|' +
      'gh|' +
      'gn|' +
      'k|' +
      'l|' +
      'lch|' +
      'll|' +
      'lv|' +
      'm|' +
      'mm|' +
      'n|' +
      'nch|' +
      'nn|' +
      'p|' +
      'r|' +
      'rn|' +
      'rs|' +
      'rv|' +
      's|' +
      'sc|' +
      'sk|' +
      'sl|' +
      'squ|' +
      'ss|' +
      'st|' +
      't|' +
      'th|' +
      'v|' +
      'y' +
    ')' +
    'es$' +
  ')',
  'g'
);

var EXPRESSION_MONOSYLLABIC_TWO = new RegExp(
  '[aeiouy]' +
  '(' +
    'b|' +
    'c|' +
    'ch|' +
    'd|' +
    'dg|' +
    'f|' +
    'g|' +
    'gh|' +
    'gn|' +
    'k|' +
    'l|' +
    'll|' +
    'lv|' +
    'm|' +
    'mm|' +
    'n|' +
    'nc|' +
    'ng|' +
    'nn|' +
    'p|' +
    'r|' +
    'rc|' +
    'rn|' +
    'rs|' +
    'rv|' +
    's|' +
    'sc|' +
    'sk|' +
    'sl|' +
    'squ|' +
    'ss|' +
    'st|' +
    't|' +
    'th|' +
    'v|' +
    'y|' +
    'z' +
  ')' +
  'e$',
  'g'
);

/* Four expression of occurrences which normally would be
 * counted as one syllable, but should be counted as two. */
var EXPRESSION_DOUBLE_SYLLABIC_ONE = new RegExp(
  '(' +
    '(' +
      '[^aeiouy]' +
    ')\\2l|' +
    '[^aeiouy]ie' +
    '(' +
      'r|' +
      'st|' +
      't' +
    ')|' +
    '[aeiouym]bl|' +
    'eo|' +
    'ism|' +
    'asm|' +
    'thm|' +
    'dnt|' +
    'uity|' +
    'dea|' +
    'gean|' +
    'oa|' +
    'ua|' +
    'eings?|' +
    '[aeiouy]sh?e[rsd]' +
  ')$',
  'g'
);

var EXPRESSION_DOUBLE_SYLLABIC_TWO = new RegExp(
  '[^gq]ua[^auieo]|' +
  '[aeiou]{3}|' +
  '^(' +
    'ia|' +
    'mc|' +
    'coa[dglx].' +
  ')',
  'g'
);

var EXPRESSION_DOUBLE_SYLLABIC_THREE = new RegExp(
  '[^aeiou]y[ae]|' +
  '[^l]lien|' +
  'riet|' +
  'dien|' +
  'iu|' +
  'io|' +
  'ii|' +
  'uen|' +
  'real|' +
  'iell|' +
  'eo[^aeiou]|' +
  '[aeiou]y[aeiou]',
  'g'
);

var EXPRESSION_DOUBLE_SYLLABIC_FOUR = /[^s]ia/;

/* Expression to match single syllable pre- and suffixes. */
var EXPRESSION_SINGLE = new RegExp(
  '^' +
  '(' +
    'un|' +
    'fore|' +
    'ware|' +
    'none?|' +
    'out|' +
    'post|' +
    'sub|' +
    'pre|' +
    'pro|' +
    'dis|' +
    'side' +
  ')' +
  '|' +
  '(' +
    'ly|' +
    'less|' +
    'some|' +
    'ful|' +
    'ers?|' +
    'ness|' +
    'cians?|' +
    'ments?|' +
    'ettes?|' +
    'villes?|' +
    'ships?|' +
    'sides?|' +
    'ports?|' +
    'shires?|' +
    'tion(ed)?' +
  ')' +
  '$',
  'g'
);

/* Expression to match double syllable pre- and suffixes. */
var EXPRESSION_DOUBLE = new RegExp(
  '^' +
  '(' +
    'above|' +
    'anti|' +
    'ante|' +
    'counter|' +
    'hyper|' +
    'afore|' +
    'agri|' +
    'infra|' +
    'intra|' +
    'inter|' +
    'over|' +
    'semi|' +
    'ultra|' +
    'under|' +
    'extra|' +
    'dia|' +
    'micro|' +
    'mega|' +
    'kilo|' +
    'pico|' +
    'nano|' +
    'macro' +
  ')' +
  '|' +
  '(' +
    'fully|' +
    'berry|' +
    'woman|' +
    'women' +
  ')' +
  '$',
  'g'
);

/* Expression to match triple syllable suffixes. */
var EXPRESSION_TRIPLE = /(ology|ologist|onomy|onomist)$/g;

/* Expression to remove non-alphabetic characters from
 * a given value. */
var EXPRESSION_NONALPHABETIC = /[^a-z]/g;

/**
 * Get syllables in a given value.
 *
 * @param {string} value
 * @return {number}
 */
function syllable(value) {
  var count = 0;
  var index;
  var length;
  var singular;
  var parts;
  var addOne;
  var subtractOne;

  value = String(value)
    .toLowerCase()
    .replace(EXPRESSION_NONALPHABETIC, '');

  if (!value.length) {
    return count;
  }

  /* Return early when possible. */
  if (value.length < 3) {
    return 1;
  }

  /* If `value` is a hard to count, it might be
   * in `problematic`. */
  if (has(problematic, value)) {
    return problematic[value];
  }

  /* Additionally, the singular word might be
   * in `problematic`. */
  singular = pluralize(value, 1);

  if (has(problematic, singular)) {
    return problematic[singular];
  }

 /**
  * Define scoped counters, to be used
  * in `String#replace()` calls.
  *
  * The scoped counter removes the matched value
  * from the input.
  *
  * @param {number} addition
  * @return {function(): string}
  */
  function countFactory(addition) {
    return function () {
      count += addition;
      return '';
    };
  }

 /**
  * Define scoped counters, to be used
  * in `String#replace()` calls.
  *
  * The scoped counter does not remove the matched
  * value from the input.
  *
  * @param {number} addition
  * @return {function(): string}
  */
  function returnFactory(addition) {
    return function ($0) {
      count += addition;
      return $0;
    };
  }

  addOne = returnFactory(1);
  subtractOne = returnFactory(-1);

  /* Count some prefixes and suffixes, and remove
   * their matched ranges. */
  value = value
    .replace(EXPRESSION_TRIPLE, countFactory(3))
    .replace(EXPRESSION_DOUBLE, countFactory(2))
    .replace(EXPRESSION_SINGLE, countFactory(1));

  /* Count multiple consonants. */
  parts = value.split(/[^aeiouy]+/);
  index = -1;
  length = parts.length;

  while (++index < length) {
    if (parts[index] !== '') {
      count++;
    }
  }

  /* Subtract one for occurrences which should be
   * counted as one (but are counted as two). */
  value
    .replace(EXPRESSION_MONOSYLLABIC_ONE, subtractOne)
    .replace(EXPRESSION_MONOSYLLABIC_TWO, subtractOne);

  /* Add one for occurrences which should be counted
   * as two (but are counted as one). */
  value
    .replace(EXPRESSION_DOUBLE_SYLLABIC_ONE, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_TWO, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_THREE, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_FOUR, addOne);

  /* Make sure at least on is returned. */
  return count || 1;
}

},{"./problematic":7,"has":4,"pluralize":5}],7:[function(require,module,exports){
module.exports={
  "abalone": 4,
  "abare": 3,
  "abed": 2,
  "abruzzese": 4,
  "abbruzzese": 4,
  "aborigine": 5,
  "acreage": 3,
  "adame": 3,
  "adieu": 2,
  "adobe": 3,
  "anemone": 4,
  "apache": 3,
  "aphrodite": 4,
  "apostrophe": 4,
  "ariadne": 4,
  "cafe": 2,
  "calliope": 4,
  "catastrophe": 4,
  "chile": 2,
  "chloe": 2,
  "circe": 2,
  "coyote": 3,
  "epitome": 4,
  "forever": 3,
  "gethsemane": 4,
  "guacamole": 4,
  "hyperbole": 4,
  "jesse": 2,
  "jukebox": 2,
  "karate": 3,
  "machete": 3,
  "maybe": 2,
  "people": 2,
  "recipe": 3,
  "sesame": 3,
  "shoreline": 2,
  "simile": 3,
  "syncope": 3,
  "tamale": 3,
  "yosemite": 4,
  "daphne": 2,
  "eurydice": 4,
  "euterpe": 3,
  "hermione": 4,
  "penelope": 4,
  "persephone": 4,
  "phoebe": 2,
  "zoe": 2
}

},{}]},{},[1]);

![Node.js CI](https://github.com/delonnewman/conveyor/workflows/Node.js%20CI/badge.svg)
![npm](https://img.shields.io/npm/v/@delonnewman/conveyor)
[![dependencies Status](https://david-dm.org/delonnewman/conveyor/status.svg)](https://david-dm.org/delonnewman/conveyor)
[![devDependencies Status](https://david-dm.org/delonnewman/conveyor/dev-status.svg)](https://david-dm.org/delonnewman/conveyor?type=dev)

Conveyor.js
===========

Buffered and coordinated IO.

Synopsis
========

```javascript
var io = conveyor();

function addItemToPage(item) {
  return function() {
    // DOM interactions
  };
}

function saveItemtoDatabase(item) {
  return function() {
    return Promise...;
  };
}

function handleServiceError(resultFromPromise) {
  // error handling
}

function doAddTodoItem(item) {
  io.do(
      addItemToPage(item),
      saveItemToDatabase(item),
      handleServiceError
  );
}

```

Install
=======

    > npm install @delonnewman/conveyor

Annotated Source
================

[Conveyor.js](https://delonnewman.github.io/conveyor)

See Also
========

- [Clojure core.async](https://github.com/clojure/core.async)
- [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language))

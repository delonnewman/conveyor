![Node.js CI](https://github.com/delonnewman/conveyor/workflows/Node.js%20CI/badge.svg)
![npm](https://img.shields.io/npm/v/conveyorjs)
[![dependencies Status](https://david-dm.org/delonnewman/conveyor/status.svg)](https://david-dm.org/delonnewman/conveyor)
[![devDependencies Status](https://david-dm.org/delonnewman/conveyor/dev-status.svg)](https://david-dm.org/delonnewman/conveyor?type=dev)

NAME
====

Conveyor.js - Buffers and coordinates IO.

INSTALL
=======

    > npm install @delonnewman/conveyorjs

DOCUMENTATION
=============

[Conveyor.js](https://delonnewman.github.io/conveyor)

SYNOPSIS
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

AUTHOR
======

Delon Newman <contact@delonnewman.name>

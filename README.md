NAME
====

Conveyor.js - Buffers and coordinates IO.

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

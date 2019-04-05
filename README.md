[![npm version](https://img.shields.io/npm/v/dragonbinder.svg?style=flat)](https://npmjs.org/package/dragonbinder "View this project on npm")
![](https://img.shields.io/bundlephobia/min/dragonbinder.svg?style=flat)
![](https://img.shields.io/bundlephobia/minzip/dragonbinder.svg?style=flat)

[![Build Status](https://travis-ci.org/Masquerade-Circus/dragonbinder.svg?branch=master)](https://travis-ci.org/Masquerade-Circus/dragonbinder)
[![Dependencies](https://img.shields.io/david/masquerade-circus/dragonbinder.svg?style=flat)](https://david-dm.org/masquerade-circus/dragonbinder)
![](https://img.shields.io/github/issues/masquerade-circus/dragonbinder.svg)
![](https://img.shields.io/snyk/vulnerabilities/npm/dragonbinder.svg)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/521f72fc6d61426783692b62d64a3643)](https://www.codacy.com/app/Masquerade-Circus/dragonbinder?utm_source=github.com&utm_medium=referral&utm_content=Masquerade-Circus/dragonbinder&utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/c1263dd7fb4f90194625/maintainability)](https://codeclimate.com/github/Masquerade-Circus/dragonbinder/maintainability)
[![Coverage Status](https://coveralls.io/repos/github/Masquerade-Circus/dragonbinder/badge.svg?branch=master)](https://coveralls.io/github/Masquerade-Circus/dragonbinder?branch=master)
[![License](https://img.shields.io/github/license/masquerade-circus/dragonbinder.svg)](https://github.com/masquerade-circus/dragonbinder/blob/master/LICENSE)

# Dragonbinder

1kb progressive state management library inspired by Vuex.

## Table of Contents

- [Dragonbinder](#dragonbinder)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Features](#features)
  - [Use](#use)
    - [State](#state)
    - [Getters](#getters)
    - [Mutations](#mutations)
    - [Actions](#actions)
    - [Events](#events)
      - [Event types](#event-types)
    - [Nested modules](#nested-modules)
      - [Module local and global state](#module-local-and-global-state)
      - [Namespacing](#namespacing)
    - [Plugins](#plugins)
      - [Using plugins](#using-plugins)
      - [Creating plugins](#creating-plugins)
  - [Development, Build and Tests](#development-build-and-tests)
  - [Contributing](#contributing)
  - [Legal](#legal)

## Install

You can get this library as a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/):

```bash
// With npm
$ npm install dragonbinder
// With yarn
$ yarn add dragonbinder
```

Or you can use it standalone in the browser with: 
`<script src="https://cdn.jsdelivr.net/npm/dragonbinder"></script>`

## Features

-   [x] Immutable state.
-   [x] Getters.
-   [x] Mutations.
-   [x] Actions.
-   [x] Event listeners.
-   [X] Nested modules.
-   [x] Plugins.

## Use

```javascript
const Dragonbinder = require('dragonbinder');

const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
});

store.commit('increment');
console.log(store.state.count) // -> 1
```

### State

Dragonbinder use Proxies to create a state as a "single source of truth" which cannot be changed unless you commit a mutation. 
This means that you cannot delete, modify or add a property directly. This allow us to keep track of all changes we made to the state.

If you don't provide an initial state by the state property Dragonbinder will create one.

```javascript
const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    addProperty(state, value) {
      state.hello = 'world';
    },
    modifyProperty(state) {
      state.count++
    },
    removeProperty(state) {
      delete state.count;
    }
  }
});

// This will throw errors
store.state.hello = 'world';
store.state.count++;
delete state.count;

// This will work as expected
store.commit('addProperty');
store.commit('modifyProperty');
store.commit('removeProperty');
```

### Getters

As with Vue, with Dragonbinder you can create getters to create computed properties based on the state. 
This getters will receive the state as first argument and all other getters as second.

```javascript
const store = new Dragonbinder({
  state: {
    todos: [
      {
        content: 'First',
        completed: false
      }, 
      {
        content: 'Second',
        completed: true
      }
    ]
  },
  getters: {
    completed(state){
      return state.todos.filter(item => item.completed);
    },
    completedCount(state, getters){
      return getters.completed.length;
    }
  }
});

console.log(store.getters.completed); // -> { content: 'Second', completed: true }
console.log(store.getters.completedCount); // -> 1
```

### Mutations

Mutations are the only way to change the state and you must consider the next points when designing mutations.

-   Following the Vuex pattern, mutations must be synchronous.
-   Note that with Dragonbinder the state is deep frozen using `Object.freeze` to prevent direct changes. So, when you are changing the state by using a mutation, you can add, modify or delete only fist level properties, second level properties will be read only.
-   Unlike many other libraries you can pass any number of arguments to a mutation.

```javascript
const store = new Dragonbinder({
  state: {
    hello: {
      name: 'John Doe'
    }
  },
  mutations: {
    changeNameError(state, payload){
      state.hello.name = payload;
    },
    changeNameOk(state, payload){
      state.hello = {...state.hello, name: payload};
    },
    changeNameTo(state, ...args){
      state.hello = {...state.hello, name: args.join(' ')};
    }
  }
});

// This will throw an assign to read only property error
store.commit('changeNameError', 'Jane Doe');

// This will work as expected
store.commit('changeNameOk', 'Jane Doe');

// You can pass any number of arguments as payload
store.commit('changeNameTo', 'Jane', 'Doe');
```

### Actions

If you need to handle async functions you must use actions. And actions will always return a promise as result of calling them. 

```javascript
const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    increment(state){
      return new Promise((resolve) => {
        setTimeout(() => {
          store.commit('increment');
          resolve();
        }, 1000);
      })
    }
  }
});

store.dispatch('increment').then(() => console.log(store.state.count)); // -> 1 after one second
```

### Events

You can register/unregister callbacks to events.

```javascript
const store = new Dragonbinder({
  state: {
    count: 0
  },
  mutations: {
    increment(state) {
      state.count++
    }
  }
});

// Add a named listener
let namedListener = (store, prop, newVal, oldVal) => console.log(`The property ${prop} was changed from ${oldVal} to ${newVal}`);
store.on('set', namedListener);

// Add an anonymous listener
let removeAnonymousListener = store.on('set', () => console.log('Anonymous listener triggered'));

// Committing increment will trigger the listener
store.commit('increment');
// $ The property count was changed from 0 to 1
// $ Anonymous listener triggered

// Remove a named listener 
store.off('set', namedListener);

// Remove an anonyous listener 
removeAnonymousListener();

// Committing increment will do nothing as the listeners are already removed
store.commit('increment'); 
```

#### Event types

All events receive the store as the first argument

| Event name     | Its called when                                    | Params received by place / (1) Store instance                       |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| addlistener    | Add an event listener                              | (2) Event name - (3) Listener added                                 |
| removelistener | Remove an event listener                           | (2) Event name - (3) Listener removed                               |
| set            | A property of the state is added or modified       | (2) The property name - (3) The new value - (4) The old value       |
| delete         | A property of the state is deleted                 | (2) The property name - (3) The old value                           |
| beforecommit   | Commit method called and before apply the mutation | (2) The mutation name - (...n) The arguments passed to the mutation |
| commit         | Commit method called and after apply the mutation  | (2) The mutation name - (...n) The arguments passed to the mutation |
| beforedispatch | Dispatch method called and before apply the action | (2) The action name - (...n) The arguments passed to the action     |
| dispatch       | Dispatch method called and after apply the action  | (2) The action name - (...n) The arguments passed to the action     |
| getter         | A getter is called                                 | (2) The getter name - (3) The value of the getter                   |
| plugin         | A plugin is added                                  | (2) The plugin added - (...n) The options passed to the plugin      |

### Nested modules
Like Vuex, Dragonbinder allows you to divide your store into `modules`. But unlike Vuex, all Dragonbinder modules are namespaced by design. Each module will contain its own store definition including more nested modules.

```javascript 
const moduleA = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
}

const moduleB = {
  state: { ... },
  mutations: { ... },
  actions: { ... },
  getters: { ... }
  modules: {
    a: moduleA
  }
}

const store = new Dragonbinder({
  modules: {
    b: moduleB
  }
});

console.log(store.state.b) // -> `moduleB`'s state
console.log(store.state['b.a']) // -> `moduleA`'s state
```

#### Module local and global state

-- Pending documentation --

#### Namespacing

-- Pending documentation --

### Plugins

Dragonbinder comes with a very simple but very powerfull plugin system.
You can extend its core functionality or change it completely by making use of plugins. 

#### Using plugins

```javascript
let store = new Dragonbinder();
store.use(myPlugin, ...options);
```

#### Creating plugins

A Dragonbinder plugin is a module that exports a single function that will be called
with the store instance as first argument and optionally with the passed options if any.

```javascript
const Dragonbinder = require('dragonbinder');
const myPlugin = (store, ...options) => {

  Dragonbinder.myGlobalMethod = function() {
    // Awesome code here
  };
  Dragonbinder.fn.myPrototypeMethod = function() {
    // Awesome code here
  };

  store.myLocalMethod = function() {
    // Awesome code here
  };
};
```

## Development, Build and Tests

Use `yarn dev` to watch and compile the library on every change to it. 

Use `yarn build` to build the library. 

Use `yarn test` to run tests only once.

Use `yarn dev:test` to run the tests watching changes to library and tests.

Use `yarn dev:test:nyc` to run the tests watching changes and get the test coverage at last.

## Contributing

-   Use prettify and eslint to lint your code.
-   Add tests for any new or changed functionality.
-   Update the readme with an example if you add or change any functionality.

## Legal

Author: [Masquerade Circus](http://masquerade-circus.net). License [Apache-2.0](https://opensource.org/licenses/Apache-2.0)
